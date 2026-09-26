// 证据台：按届汇总改革影响、证据缺口、补修要求与职前到入职的真实路径。
// 缺口状态基于全部证据评定；向评审者展示的证据引用按其角色范围过滤。
import { evaluateCohort } from './gaps.js';
import { supplementaryForCohort, diffCreditRules } from './credits.js';
import { buildPathway } from './pathways.js';
import { filterEvidence } from './access.js';

// 与上一届方案相比的改革影响：学分规则变化 + 设课设计变化（新增/模式调整/课程调整/移除）。
export function reformImpact(programs, cohort) {
  const program = programs.find((p) => p.cohort === cohort);
  if (!program) throw new Error(`未找到 ${cohort} 届的培养方案`);
  const prev = programs
    .filter((p) => p.cohort < cohort)
    .sort((a, b) => b.cohort - a.cohort)[0];
  if (!prev) {
    return { program_version: program.id, previous_version: null, credit_changes: [], design_changes: [] };
  }
  const designChanges = [];
  for (const d of program.course_design) {
    const before = prev.course_design.find((x) => x.competency === d.competency);
    if (!before) {
      designChanges.push({ competency: d.competency, change: 'added', mode: d.mode, courses: d.courses });
    } else if (before.mode !== d.mode) {
      designChanges.push({ competency: d.competency, change: 'mode-changed', from: before.mode, to: d.mode, courses: d.courses });
    } else if (JSON.stringify(before.courses) !== JSON.stringify(d.courses)) {
      designChanges.push({ competency: d.competency, change: 'courses-changed', from: before.courses, to: d.courses });
    }
  }
  for (const b of prev.course_design) {
    if (!program.course_design.find((x) => x.competency === b.competency)) {
      designChanges.push({ competency: b.competency, change: 'removed' });
    }
  }
  return {
    program_version: program.id,
    previous_version: prev.id,
    credit_changes: diffCreditRules(prev.credit_rules, program.credit_rules),
    design_changes: designChanges
  };
}

export function buildCohortBoard(cohort, data, session = null) {
  const { competencies, programs, courses, evidence } = data;
  const cohortItems = evidence.filter((i) => i.cohort === cohort);
  const access = session ? filterEvidence(session, cohortItems) : { visible: cohortItems, withheld: [] };
  const visibleIds = new Set(access.visible.map((i) => i.id));

  const evaluations = evaluateCohort(competencies, evidence, cohort);
  const competenciesView = evaluations.map((ev) => {
    const competency = competencies.find((c) => c.id === ev.competency_id);
    const pathway = buildPathway(competency, cohort, { programs, courses, evidence });
    const matchedIds = Object.values(ev.channels).flatMap((c) => c.matched_ids);
    return {
      ...ev,
      remediation: { ...ev.remediation, by: ev.remediation.by.filter((id) => visibleIds.has(id)) },
      evidence_ids: matchedIds.filter((id) => visibleIds.has(id)),
      withheld_evidence: matchedIds.filter((id) => !visibleIds.has(id)).length,
      pathway_complete: pathway.complete
    };
  });

  return {
    cohort,
    ...reformImpact(programs, cohort),
    competencies: competenciesView,
    supplementary: supplementaryForCohort(programs, cohort),
    evidence_visibility: session
      ? { visible: access.visible.length, withheld: access.withheld.length }
      : null
  };
}

export function buildBoard(data, session = null) {
  const cohorts = [...new Set(data.programs.map((p) => p.cohort))].sort();
  return { domain: 'teacher-curriculum', cohorts: cohorts.map((c) => buildCohortBoard(c, data, session)) };
}
