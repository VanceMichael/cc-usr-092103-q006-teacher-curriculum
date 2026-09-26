import test from 'node:test';
import assert from 'node:assert/strict';
import { findRole, createSession, authorize, filterEvidence } from '../src/access.js';
import { loadData } from './helpers.js';

const data = await loadData();
const sessionFor = (name) => createSession(findRole(data.roles, name));
const ev = (id) => data.evidence.find((i) => i.id === id);

test('校外评审不能读取受限隐私材料', () => {
  const session = sessionFor('reviewer-external');
  const decision = authorize(session, 'read:evidence', ev('ev-c008'));
  assert.equal(decision.allowed, false);
  assert.match(decision.reason, /隐私级别/);
});

test('校外评审不能越过被指派的届别范围', () => {
  const session = sessionFor('reviewer-external');
  const decision = authorize(session, 'read:evidence', ev('ev-c004'));
  assert.equal(decision.allowed, false);
  assert.match(decision.reason, /届别 2022/);
});

test('校内评审在授权范围内可以读取受限材料', () => {
  const session = sessionFor('reviewer-internal');
  const decision = authorize(session, 'read:evidence', ev('ev-c008'));
  assert.equal(decision.allowed, true);
});

test('并行评审中无审批权限的角色不能通过方案', () => {
  const mentor = sessionFor('mentor');
  const decision = authorize(mentor, 'approve:program', { id: 'prog-2023', cohort: 2023 });
  assert.equal(decision.allowed, false);
  assert.match(decision.reason, /没有权限/);
  const reviewer = sessionFor('reviewer-internal');
  assert.equal(authorize(reviewer, 'approve:program', { id: 'prog-2023', cohort: 2023 }).allowed, false);
  const admin = sessionFor('program-admin');
  assert.equal(authorize(admin, 'approve:program', { id: 'prog-2023', cohort: 2023 }).allowed, true);
});

test('校友发展办公室只能看到入职阶段材料', () => {
  const session = sessionFor('alumni-office');
  const { visible, withheld } = filterEvidence(session, data.evidence);
  assert.ok(visible.length > 0);
  assert.ok(visible.every((i) => i.period === 'in-service'));
  assert.ok(withheld.length > 0);
});

test('越权尝试全部留痕', () => {
  const session = sessionFor('reviewer-external');
  authorize(session, 'read:evidence', ev('ev-c008'));
  authorize(session, 'approve:program', { id: 'prog-2023', cohort: 2023 });
  assert.equal(session.denials.length, 2);
});
