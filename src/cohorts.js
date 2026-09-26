// 届别视图:按届汇总能力覆盖率、证据缺口,并从学分规则变化推导补修名单。
import { evaluateStudent } from './evidence.js';

// 按旧规则入学、按新方案毕业的学生,需补修规则变化产生的差额。
export function remediationCases(domain) {
  const cases = [];
  for (const student of domain.students.students) {
    for (const change of domain.plans.credit_rule_changes) {
      const affected =
        student.enrolled_plan_id === change.from_plan &&
        student.plan_id === change.to_plan &&
        change.applies_to_cohorts.includes(student.cohort);
      if (!affected) continue;
      const completed = (student.remediation_completed ?? []).includes(change.id);
      cases.push({
        student_ref: student.ref,
        cohort: student.cohort,
        change_id: change.id,
        field: change.field,
        missing_amount: change.to - change.from,
        status: completed ? '已补修' : '待补修',
      });
    }
  }
  return cases;
}

export function cohortReport(domain, cohort) {
  const plan = domain.plans.plans.find(p => p.cohort === cohort);
  if (!plan) {
    throw new Error(`未知届别: ${cohort}`);
  }
  const students = domain.students.students
    .filter(s => s.cohort === cohort)
    .map(student => {
      const results = evaluateStudent(domain, student.ref);
      return {
        student_ref: student.ref,
        plan_id: student.plan_id,
        results,
        gaps: results
          .filter(r => r.status === '未达成')
          .map(r => ({ competency_id: r.competency_id, missing_channels: r.missing_channels })),
      };
    });
  const coverage = {};
  for (const cid of plan.required_competencies) {
    const achieved = students.filter(s => s.results.find(r => r.competency_id === cid)?.status === '达成').length;
    coverage[cid] = students.length === 0 ? 0 : achieved / students.length;
  }
  return {
    cohort,
    plan,
    students,
    coverage,
    remediation: remediationCases(domain).filter(c => c.cohort === cohort),
  };
}

// 按届比较相邻方案,呈现改革影响:学分、AI课程策略与必备能力的变化。
export function reformImpact(domain) {
  const plans = [...domain.plans.plans].sort((a, b) => a.cohort - b.cohort);
  return plans.map((plan, index) => {
    const prev = plans[index - 1];
    if (!prev) {
      return { cohort: plan.cohort, plan_id: plan.id, changes: ['首版方案,无比较基准'] };
    }
    const changes = [];
    if (plan.credits.total !== prev.credits.total) {
      changes.push(`总学分 ${prev.credits.total}→${plan.credits.total}`);
    }
    if (plan.credits.practice !== prev.credits.practice) {
      changes.push(`实践学分 ${prev.credits.practice}→${plan.credits.practice}`);
    }
    if (plan.ai_strategy !== prev.ai_strategy) {
      changes.push(`AI课程策略 ${prev.ai_strategy}→${plan.ai_strategy}`);
    }
    const added = plan.required_competencies.filter(c => !prev.required_competencies.includes(c));
    const removed = prev.required_competencies.filter(c => !plan.required_competencies.includes(c));
    if (added.length > 0) changes.push(`新增必备能力 ${added.join('、')}`);
    if (removed.length > 0) changes.push(`移除必备能力 ${removed.join('、')}`);
    if (changes.length === 0) changes.push('无结构性变化');
    return { cohort: plan.cohort, plan_id: plan.id, changes };
  });
}
