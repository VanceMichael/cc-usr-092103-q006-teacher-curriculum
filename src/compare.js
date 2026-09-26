// 国际比较：国外案例只有在制度背景相容时才可借鉴。
// 全部条件满足为 borrowable；关键（critical）条件不满足为 not-borrowable；其余为 conditional。

function checkCondition(condition, localContext) {
  const local = localContext[condition.dimension];
  if (condition.equals !== undefined) {
    return { ...condition, local, met: local === condition.equals };
  }
  if (condition.min !== undefined) {
    return { ...condition, local, met: typeof local === 'number' && local >= condition.min };
  }
  if (condition.in !== undefined) {
    return { ...condition, local, met: condition.in.includes(local) };
  }
  throw new Error(`无法识别的借鉴条件: ${JSON.stringify(condition)}`);
}

export function assessBorrowability(caseItem, localContext) {
  const checks = caseItem.requires.map((r) => checkCondition(r, localContext));
  const unmet = checks.filter((c) => !c.met);
  const criticalMiss = unmet.some((c) => c.critical === true);
  const verdict =
    unmet.length === 0 ? 'borrowable' : criticalMiss ? 'not-borrowable' : 'conditional';
  return { case_id: caseItem.id, country: caseItem.country, title: caseItem.title, verdict, unmet_conditions: unmet, checks };
}

export function assessAll(cases, localContext) {
  return cases.map((c) => assessBorrowability(c, localContext));
}

// 十国比较维度矩阵：每个维度一行，每个国家一列，供评审横向对照。
export function dimensionMatrix(countries, dimensions) {
  return dimensions.map((d) => ({
    key: d.key,
    label: d.label,
    by_country: Object.fromEntries(countries.map((c) => [c.code, c.dimensions[d.key]]))
  }));
}
