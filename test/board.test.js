import test from 'node:test';
import assert from 'node:assert/strict';
import { loadDomain } from '../src/domain.js';
import { buildBoard } from '../src/board.js';

const domain = await loadDomain();

test('证据台按角色权限呈现届别范围', () => {
  const reviewer = buildBoard(domain, 'reviewer');
  assert.deepEqual(reviewer.cohorts.map(c => c.cohort), [2024, 2025]);
  assert.deepEqual(reviewer.review_scope, ['P2024', 'P2025']);
  const admin = buildBoard(domain, 'program_admin');
  assert.deepEqual(admin.cohorts.map(c => c.cohort), [2022, 2023, 2024, 2025]);
});

test('未授权角色只见汇总,化名个体记录不外泄', () => {
  const board = buildBoard(domain, 'reviewer');
  assert.ok(!JSON.stringify(board).includes('stu-'));
  const y2025 = board.cohorts.find(c => c.cohort === 2025);
  assert.equal(y2025.student_count, 2);
  assert.equal(y2025.masked_students, 2);
  assert.equal(y2025.students.length, 0);
  assert.equal(y2025.coverage.C4, 0.5);
  assert.ok(board.evidence_gaps_masked.some(g => g.cohort === 2025 && g.competency_id === 'C2' && g.channel === 'practice'));
  assert.equal(board.remediation_pending.length, 0);
  assert.equal(board.remediation_pending_masked_count, 1);
});

test('授权角色看到个体缺口、补修名单与发展路径', () => {
  const board = buildBoard(domain, 'program_admin');
  const gaps = board.evidence_gaps.filter(g => g.student_ref === 'stu-2025-002');
  assert.ok(gaps.some(g => g.competency_id === 'C2' && g.missing_channels.includes('practice')));
  assert.ok(gaps.some(g => g.competency_id === 'C6' && g.missing_channels.includes('development')));
  assert.equal(board.remediation_pending.length, 1);
  assert.equal(board.remediation_pending[0].student_ref, 'stu-2024-002');
  assert.equal(board.pathways['stu-2025-001'].reaches_inservice, true);
  assert.equal(board.pathways['stu-2025-002'].reaches_inservice, false);
});

test('实习导师仅见被指导学生的发展路径', () => {
  const board = buildBoard(domain, 'mentor');
  assert.deepEqual(board.cohorts, []);
  assert.deepEqual(Object.keys(board.pathways), ['stu-2025-001']);
});

test('证据台列出可借鉴与不可借鉴的国外案例', () => {
  const board = buildBoard(domain, 'reviewer');
  assert.equal(board.foreign_cases.borrowable.length, 4);
  assert.equal(board.foreign_cases.not_borrowable.length, 6);
});

test('证据台支持按届过滤', () => {
  const board = buildBoard(domain, 'program_admin', { cohort: 2025 });
  assert.deepEqual(board.cohorts.map(c => c.cohort), [2025]);
  assert.deepEqual(board.reform_impact.map(i => i.cohort), [2025]);
});
