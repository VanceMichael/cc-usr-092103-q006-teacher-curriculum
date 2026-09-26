// 国外案例可借鉴性:只有本校制度背景满足案例的借鉴条件时才可引用,
// 否则逐维度列出制度差异,防止脱离制度环境照搬。
export function assessCase(localContext, caseItem) {
  const mismatched = {};
  for (const [dimension, required] of Object.entries(caseItem.borrow_conditions)) {
    if (localContext[dimension] !== required) {
      mismatched[dimension] = { required, local: localContext[dimension] ?? null };
    }
  }
  return {
    country: caseItem.country,
    ai_course_strategy: caseItem.ai_course_strategy,
    borrowable: Object.keys(mismatched).length === 0,
    mismatched_conditions: mismatched,
    note: caseItem.note,
  };
}

export function assessCases(comparison) {
  return comparison.cases.map(caseItem => assessCase(comparison.local_context, caseItem));
}
