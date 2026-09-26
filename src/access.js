// 角色权限:方案并行评审不能越过权限,学生隐私只在授权范围内使用。
export function getRole(domain, roleId) {
  const role = domain.roles.roles.find(r => r.id === roleId);
  if (!role) {
    throw new Error(`未知角色: ${roleId}`);
  }
  return role;
}

export function canReviewPlan(role, planId) {
  return role.review_scope.plan_ids.includes(planId);
}

export function assertReviewAllowed(role, planId) {
  if (!canReviewPlan(role, planId)) {
    throw new Error(`越权:角色 ${role.name} 无权评审方案 ${planId}`);
  }
}

// masked = 仅汇总,不见个体;pseudonymous = 授权范围内可见化名个体记录。
// 带 assigned_students 的角色(如实习导师)仅对被指导学生可见。
export function studentDataLevel(role, studentRef) {
  if (Array.isArray(role.assigned_students)) {
    return role.assigned_students.includes(studentRef) ? 'pseudonymous' : 'masked';
  }
  return role.student_data;
}
