import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateCompetency, evaluateCohort } from '../src/gaps.js';
import { loadData } from './helpers.js';

const data = await loadData();
const byId = (list, id) => list.find((x) => x.competency_id === id);

test('一次工具演示不得冒充实践达成', () => {
  const classroom = data.competencies.find((c) => c.id === 'comp-ai-classroom');
  const items2022 = data.evidence.filter((i) => i.cohort === 2022);
  const result = evaluateCompetency(classroom, items2022);
  // 2022届有实习任务与一次工具演示，但缺少导师观察，实践通道不成立
  assert.equal(result.channels.practice.status, 'gap');
  assert.deepEqual(result.tool_demo_rejected, ['ev-c005']);
  assert.ok(result.channels.practice.missing_types.includes('mentor_observation'));
  assert.equal(result.status, 'partial');
});

test('多项材料可以共同证明一项能力', () => {
  const classroom = data.competencies.find((c) => c.id === 'comp-ai-classroom');
  const items2023 = data.evidence.filter((i) => i.cohort === 2023);
  const result = evaluateCompetency(classroom, items2023);
  // 2023届由实习任务 ev-c008 与导师观察 ev-c009 共同证明实践达成
  assert.equal(result.channels.practice.status, 'met');
  assert.ok(result.channels.practice.matched_ids.includes('ev-c008'));
  assert.ok(result.channels.practice.matched_ids.includes('ev-c009'));
  assert.equal(result.status, 'met');
});

test('工具演示可以支撑知识通道', () => {
  const synthetic = {
    id: 'comp-x',
    requires: { knowledge: { min_items: 1, types: ['course_record', 'tool_demo'] } }
  };
  const demo = { id: 'ev-x', type: 'tool_demo', competencies: ['comp-x'] };
  const result = evaluateCompetency(synthetic, [demo]);
  assert.equal(result.channels.knowledge.status, 'met');
});

test('职前缺口可由入职后研修补齐', () => {
  const evaluated = evaluateCohort(data.competencies, data.evidence, 2021);
  const reflective = byId(evaluated, 'comp-reflective');
  assert.equal(reflective.status, 'gap');
  assert.equal(reflective.remediation.status, 'remediated-in-service');
  assert.deepEqual(reflective.remediation.by, ['ev-c011']);
});

test('未补齐的缺口保持 open', () => {
  const evaluated = evaluateCohort(data.competencies, data.evidence, 2021);
  const ethics = byId(evaluated, 'comp-ai-ethics');
  assert.equal(ethics.status, 'gap');
  assert.equal(ethics.remediation.status, 'open');
});

test('2022届各能力状态符合缺口图预期', () => {
  const evaluated = evaluateCohort(data.competencies, data.evidence, 2022);
  assert.equal(byId(evaluated, 'comp-ai-concepts').status, 'met');
  assert.equal(byId(evaluated, 'comp-ai-ethics').status, 'met');
  assert.equal(byId(evaluated, 'comp-ai-classroom').status, 'partial');
  assert.equal(byId(evaluated, 'comp-data-assessment').status, 'gap');
  assert.equal(byId(evaluated, 'comp-reflective').status, 'met');
});
