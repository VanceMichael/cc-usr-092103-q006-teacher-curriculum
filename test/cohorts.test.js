import test from 'node:test';
import assert from 'node:assert/strict';
import { loadDomain } from '../src/domain.js';
import { remediationCases, cohortReport, reformImpact } from '../src/cohorts.js';

const domain = await loadDomain();

test('学分规则变化产生补修名单', () => {
  const cases = remediationCases(domain);
  const target = cases.find(c => c.student_ref === 'stu-2024-002');
  assert.equal(target.change_id, 'CR-2024');
  assert.equal(target.missing_amount, 2);
  assert.equal(target.status, '待补修');
  assert.equal(cases.filter(c => c.status === '待补修').length, 1);
  assert.equal(cases.some(c => c.student_ref === 'stu-2024-001'), false);
});

test('按届查看改革影响', () => {
  const impact = reformImpact(domain);
  const y2023 = impact.find(i => i.cohort === 2023);
  assert.deepEqual(y2023.changes, ['无结构性变化']);
  const y2024 = impact.find(i => i.cohort === 2024);
  assert.ok(y2024.changes.includes('实践学分 8→10'));
  assert.ok(y2024.changes.includes('AI课程策略 integrated→standalone'));
  assert.ok(y2024.changes.some(c => c.includes('C2')));
  const y2025 = impact.find(i => i.cohort === 2025);
  assert.ok(y2025.changes.includes('AI课程策略 standalone→standalone_plus_integration'));
});

test('届别报告呈现覆盖率与未补齐的证据', () => {
  const report = cohortReport(domain, 2025);
  assert.equal(report.coverage.C1, 1);
  assert.equal(report.coverage.C4, 0.5);
  const incomplete = report.students.find(s => s.student_ref === 'stu-2025-002');
  assert.ok(incomplete.gaps.some(g => g.competency_id === 'C2' && g.missing_channels.includes('practice')));
  assert.equal(report.remediation.length, 0);
});

test('2024届报告同时呈现导师观察缺口与待补修学生', () => {
  const report = cohortReport(domain, 2024);
  const first = report.students.find(s => s.student_ref === 'stu-2024-001');
  assert.deepEqual(first.gaps, [{ competency_id: 'C4', missing_channels: ['mentor'] }]);
  assert.deepEqual(report.remediation.map(r => r.student_ref), ['stu-2024-002']);
});
