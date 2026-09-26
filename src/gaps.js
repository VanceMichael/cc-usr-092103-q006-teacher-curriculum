// 证据缺口评估：判断每项培养目标在某一届是否被证据支撑。
// 规则一：多项材料可以共同证明一项能力（min_items 与 distinct_types 联合判定）。
// 规则二：一次工具演示不得冒充实践达成（tool_demo 永远不计入实践通道）。

export const PRACTICE_BLOCKED_TYPES = ['tool_demo'];

export function evaluateCompetency(competency, items) {
  const channels = {};
  const rejected = [];
  for (const [channel, req] of Object.entries(competency.requires)) {
    const candidates = items.filter((i) => {
      if (!i.competencies.includes(competency.id)) return false;
      if (req.types.includes(i.type)) return true;
      // 工具演示若被拿来冒充实践达成，必须显式拦下并留痕，而不是静默忽略
      return channel === 'practice' && PRACTICE_BLOCKED_TYPES.includes(i.type);
    });
    let matched = candidates;
    if (channel === 'practice') {
      const blocked = candidates.filter((i) => PRACTICE_BLOCKED_TYPES.includes(i.type));
      rejected.push(...blocked.map((i) => i.id));
      matched = candidates.filter((i) => !PRACTICE_BLOCKED_TYPES.includes(i.type));
    }
    const presentTypes = new Set(matched.map((i) => i.type));
    const missingTypes = req.types.filter(
      (t) => !presentTypes.has(t) && !PRACTICE_BLOCKED_TYPES.includes(t)
    );
    const enoughItems = matched.length >= req.min_items;
    const enoughTypes = req.distinct_types ? presentTypes.size >= req.distinct_types : true;
    channels[channel] = {
      status: enoughItems && enoughTypes ? 'met' : 'gap',
      matched_ids: matched.map((i) => i.id),
      missing_types: missingTypes
    };
  }
  const states = Object.values(channels).map((c) => c.status);
  const status = states.every((s) => s === 'met')
    ? 'met'
    : states.some((s) => s === 'met')
      ? 'partial'
      : 'gap';
  return { competency_id: competency.id, status, channels, tool_demo_rejected: rejected };
}

// 职前缺口若在入职后由研修材料补齐，标记为 remediated-in-service，否则保持 open。
export function remediationFor(competencyId, items) {
  const pd = items.filter(
    (i) => i.type === 'pd_record' && i.period === 'in-service' && i.competencies.includes(competencyId)
  );
  return pd.length > 0
    ? { status: 'remediated-in-service', by: pd.map((i) => i.id) }
    : { status: 'open', by: [] };
}

export function evaluateCohort(competencies, items, cohort) {
  const cohortItems = items.filter((i) => i.cohort === cohort);
  return competencies.map((c) => {
    const evaluation = evaluateCompetency(c, cohortItems);
    const remediation =
      evaluation.status === 'met' ? { status: 'not-needed', by: [] } : remediationFor(c.id, cohortItems);
    return { ...evaluation, name: c.name, remediation };
  });
}
