// 角色范围与隐私授权：并行评审中的每个动作都不得越过权限，
// 学生隐私材料只在角色的授权范围内可见，所有拒绝都会留痕。

const CLEARANCE_ORDER = ['public', 'internal', 'restricted'];

export function findRole(roles, name) {
  const role = roles.find((r) => r.role === name);
  if (!role) throw new Error(`未知角色: ${name}`);
  return role;
}

export function createSession(roleDef) {
  return {
    role: roleDef.role,
    permissions: new Set(roleDef.permissions),
    clearance: roleDef.privacy_clearance,
    cohortScope: roleDef.cohort_scope,
    periodScope: roleDef.evidence_period_scope ?? null,
    denials: []
  };
}

// resource 可携带 id / privacy_level / cohort / period，逐项核对角色范围。
export function authorize(session, action, resource = {}) {
  const deny = (reason) => {
    session.denials.push({ action, resource: resource.id ?? null, reason });
    return { allowed: false, reason };
  };
  if (!session.permissions.has(action)) {
    return deny(`角色 ${session.role} 没有权限: ${action}`);
  }
  if (resource.privacy_level) {
    const need = CLEARANCE_ORDER.indexOf(resource.privacy_level);
    const have = CLEARANCE_ORDER.indexOf(session.clearance);
    if (have < need) {
      return deny(`隐私级别 ${resource.privacy_level} 超出角色 ${session.role} 的授权范围`);
    }
  }
  if (resource.cohort !== undefined && session.cohortScope !== 'all' && !session.cohortScope.includes(resource.cohort)) {
    return deny(`届别 ${resource.cohort} 不在角色 ${session.role} 的评审范围内`);
  }
  if (resource.period && session.periodScope && !session.periodScope.includes(resource.period)) {
    return deny(`阶段 ${resource.period} 不在角色 ${session.role} 的授权范围内`);
  }
  return { allowed: true };
}

// 过滤证据材料：可见的返回，越权的进入 withheld 并留痕。
export function filterEvidence(session, items) {
  const visible = [];
  const withheld = [];
  for (const item of items) {
    const decision = authorize(session, 'read:evidence', item);
    (decision.allowed ? visible : withheld).push(item);
  }
  return { visible, withheld };
}
