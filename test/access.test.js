import test from 'node:test';
import assert from 'node:assert/strict';
import { loadDomain } from '../src/domain.js';
import { getRole, canReviewPlan, assertReviewAllowed, studentDataLevel } from '../src/access.js';

const domain = await loadDomain();

test('方案并行评审不能越过权限', () => {
  const reviewer = getRole(domain, 'reviewer');
  assert.ok(canReviewPlan(reviewer, 'P2024'));
  assert.ok(canReviewPlan(reviewer, 'P2025'));
  assert.equal(canReviewPlan(reviewer, 'P2023'), false);
  assert.throws(() => assertReviewAllowed(reviewer, 'P2023'), /越权/);
  assert.doesNotThrow(() => assertReviewAllowed(reviewer, 'P2025'));
});

test('学生隐私只在授权范围内使用', () => {
  const reviewer = getRole(domain, 'reviewer');
  const admin = getRole(domain, 'program_admin');
  const mentor = getRole(domain, 'mentor');
  assert.equal(studentDataLevel(reviewer, 'stu-2025-001'), 'masked');
  assert.equal(studentDataLevel(admin, 'stu-2025-001'), 'pseudonymous');
  assert.equal(studentDataLevel(mentor, 'stu-2025-001'), 'pseudonymous');
  assert.equal(studentDataLevel(mentor, 'stu-2025-002'), 'masked');
});

test('未知角色被拒绝', () => {
  assert.throws(() => getRole(domain, 'outsider'), /未知角色/);
});
