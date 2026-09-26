// 教师课程改革证据台:按角色权限汇总届别视图、证据缺口、
// 补修名单、改革影响与可借鉴的国外案例。
import { fileURLToPath } from 'node:url';
import { loadDomain } from './domain.js';
import { getRole, canReviewPlan, studentDataLevel } from './access.js';
import { cohortReport, reformImpact, remediationCases } from './cohorts.js';
import { assessCases } from './comparison.js';
import { buildPathway } from './pathways.js';

export function buildBoard(domain, roleId, { cohort } = {}) {
  const role = getRole(domain, roleId);
  const visiblePlans = domain.plans.plans.filter(plan => canReviewPlan(role, plan.id));
  const reports = visiblePlans
    .map(plan => cohortReport(domain, plan.cohort))
    .filter(report => cohort == null || report.cohort === cohort);

  const evidenceGaps = [];
  const maskedGapCounts = new Map();
  const pathways = {};

  const cohorts = reports.map(report => {
    const rows = report.students.map(student => ({
      ...student,
      level: studentDataLevel(role, student.student_ref),
    }));
    const visible = rows.filter(row => row.level === 'pseudonymous');

    for (const row of visible) {
      pathways[row.student_ref] = buildPathway(domain, row.student_ref);
      for (const gap of row.gaps) {
        evidenceGaps.push({ cohort: report.cohort, student_ref: row.student_ref, ...gap });
      }
    }
    // 未授权的学生只汇入匿名计数,不出现化名引用。
    for (const row of rows.filter(r => r.level !== 'pseudonymous')) {
      for (const gap of row.gaps) {
        for (const channel of gap.missing_channels) {
          const key = `${report.cohort}|${gap.competency_id}|${channel}`;
          maskedGapCounts.set(key, (maskedGapCounts.get(key) ?? 0) + 1);
        }
      }
    }

    return {
      cohort: report.cohort,
      plan_id: report.plan.id,
      title: report.plan.title,
      ai_strategy: report.plan.ai_strategy,
      credits: report.plan.credits,
      required_competencies: report.plan.required_competencies,
      student_count: rows.length,
      coverage: report.coverage,
      students: visible.map(student => ({
        student_ref: student.student_ref,
        achieved: student.results.filter(r => r.status === '达成').map(r => r.competency_id),
        gaps: student.gaps,
      })),
      masked_students: rows.length - visible.length,
    };
  });

  const remediationPending = [];
  let remediationPendingMasked = 0;
  for (const item of remediationCases(domain)) {
    if (item.status !== '待补修') continue;
    if (!visiblePlans.some(plan => plan.cohort === item.cohort)) continue;
    if (studentDataLevel(role, item.student_ref) === 'pseudonymous') {
      remediationPending.push(item);
    } else {
      remediationPendingMasked += 1;
    }
  }

  // 实习导师等角色可在授权范围内查看被指导学生的发展路径。
  for (const ref of role.assigned_students ?? []) {
    if (!pathways[ref] && domain.students.students.some(s => s.ref === ref)) {
      pathways[ref] = buildPathway(domain, ref);
    }
  }

  const cases = assessCases(domain.comparison);
  const visibleCohorts = new Set(reports.map(report => report.cohort));

  return {
    domain: domain.plans.domain,
    version: domain.plans.version,
    generated_for: { role_id: role.id, name: role.name, student_data: role.student_data },
    review_scope: visiblePlans.map(plan => plan.id),
    cohorts,
    evidence_gaps: evidenceGaps,
    evidence_gaps_masked: [...maskedGapCounts.entries()].map(([key, students]) => {
      const [cohortKey, competency_id, channel] = key.split('|');
      return { cohort: Number(cohortKey), competency_id, channel, students };
    }),
    remediation_pending: remediationPending,
    remediation_pending_masked_count: remediationPendingMasked,
    pathways,
    reform_impact: reformImpact(domain).filter(impact => visibleCohorts.has(impact.cohort)),
    foreign_cases: {
      borrowable: cases.filter(c => c.borrowable),
      not_borrowable: cases.filter(c => !c.borrowable),
    },
  };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const [roleId = 'program_admin', cohortArg] = process.argv.slice(2);
  const domain = await loadDomain();
  const board = buildBoard(domain, roleId, cohortArg ? { cohort: Number(cohortArg) } : {});
  console.log(JSON.stringify(board, null, 2));
}
