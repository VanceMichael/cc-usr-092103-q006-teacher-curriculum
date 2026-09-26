// 学分规则变化与补修判定：只有被并轨规则覆盖的届别才需要补修，其余老生老办法。

export function diffCreditRules(fromRules, toRules) {
  const changes = [];
  const keys = new Set([...Object.keys(fromRules), ...Object.keys(toRules)]);
  for (const key of keys) {
    const from = fromRules[key];
    const to = toRules[key];
    if (from !== to) {
      changes.push({
        rule: key,
        from,
        to,
        delta: typeof from === 'number' && typeof to === 'number' ? to - from : null
      });
    }
  }
  return changes;
}

export function programForCohort(programs, cohort) {
  return programs.find((p) => p.cohort === cohort) ?? null;
}

export function latestProgram(programs) {
  return programs.reduce((a, b) => (b.version > a.version ? b : a));
}

// 返回该届的补修要求；若该届不受并轨规则约束则为 null。
export function supplementaryForCohort(programs, cohort) {
  const governing = programForCohort(programs, cohort);
  if (!governing) throw new Error(`未找到 ${cohort} 届的培养方案`);
  const latest = latestProgram(programs);
  if (governing.id === latest.id) return null;
  const transition = latest.transition;
  if (!transition || !transition.applies_to_cohorts.includes(cohort)) return null;
  return {
    cohort,
    from_version: governing.id,
    to_version: latest.id,
    rule_changes: diffCreditRules(governing.credit_rules, latest.credit_rules),
    supplementary: transition.supplementary
  };
}

export function supplementaryByCohort(programs) {
  const cohorts = [...new Set(programs.map((p) => p.cohort))].sort();
  return cohorts.map((c) => supplementaryForCohort(programs, c)).filter(Boolean);
}
