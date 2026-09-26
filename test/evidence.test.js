import test from 'node:test';
import assert from 'node:assert/strict';
import { loadDomain } from '../src/domain.js';
import { evaluateCompetency, evaluateStudent } from '../src/evidence.js';

const domain = await loadDomain();
const competency = id => domain.competencies.competencies.find(c => c.id === id);

test('一次工具演示不得冒充实践达成', () => {
  const items = [
    { id: 'E1', type: 'course_record', competencies: ['C2'] },
    { id: 'E2', type: 'tool_demo', competencies: ['C2'] },
  ];
  const result = evaluateCompetency(competency('C2'), items);
  assert.equal(result.status, '未达成');
  assert.deepEqual(result.missing_channels, ['practice']);
  assert.deepEqual(result.evidence_by_channel.knowledge, ['E1', 'E2']);
  assert.equal(result.evidence_by_channel.practice, undefined);
});

test('多项材料可以共同证明一项能力', () => {
  const items = [
    { id: 'E1', type: 'course_record', competencies: ['C2'] },
    { id: 'E2', type: 'tool_demo', competencies: ['C2'] },
    { id: 'E3', type: 'internship_task', competencies: ['C2'] },
  ];
  const result = evaluateCompetency(competency('C2'), items);
  assert.equal(result.status, '达成');
  assert.deepEqual(result.evidence_by_channel.practice, ['E3']);
});

test('完整证据链的学生全部能力达成,实践通道由实习而非演示支撑', () => {
  const results = evaluateStudent(domain, 'stu-2025-001');
  assert.ok(results.every(r => r.status === '达成'));
  const c2 = results.find(r => r.competency_id === 'C2');
  assert.deepEqual(c2.evidence_by_channel.practice, ['EV-2501-07']);
  assert.ok(!c2.evidence_by_channel.practice.includes('EV-2501-06'));
});

test('只有课程与工具演示的学生呈现实践与持续发展缺口', () => {
  const results = evaluateStudent(domain, 'stu-2025-002');
  const byId = Object.fromEntries(results.map(r => [r.competency_id, r]));
  assert.equal(byId.C1.status, '达成');
  assert.deepEqual(byId.C2.missing_channels, ['practice']);
  assert.deepEqual(byId.C4.missing_channels.sort(), ['mentor', 'practice']);
  assert.deepEqual(byId.C6.missing_channels.sort(), ['development', 'mentor']);
});

test('同一证据在不同届的方案要求下结论不同', () => {
  const old = evaluateStudent(domain, 'stu-2023-001');
  assert.ok(old.every(r => r.status === '达成'));
  assert.ok(!old.some(r => r.competency_id === 'C2'));
});
