import test from 'node:test';
import assert from 'node:assert/strict';
import { loadDomain, checkReferences } from '../src/domain.js';

test('全部样例资料通过契约校验且引用完整', async () => {
  const domain = await loadDomain();
  assert.equal(domain.plans.plans.length, 4);
  assert.equal(domain.courses.courses.length, 7);
  assert.equal(domain.students.students.length, 6);
  assert.equal(domain.evidence.evidence.length, 36);
  assert.equal(domain.comparison.cases.length, 10);
});

test('悬空引用被拒绝', async () => {
  const domain = await loadDomain();
  const broken = structuredClone(domain);
  broken.evidence.evidence[0].plan_id = 'P9999';
  assert.throws(() => checkReferences(broken), /引用不完整/);
});

test('证据届别与学生名册不一致被拒绝', async () => {
  const domain = await loadDomain();
  const broken = structuredClone(domain);
  broken.evidence.evidence[0].cohort = 2099;
  assert.throws(() => checkReferences(broken), /不一致/);
});
