import test from 'node:test';
import assert from 'node:assert/strict';
import { loadDomain } from '../src/domain.js';
import { buildPathway } from '../src/pathways.js';

const domain = await loadDomain();

test('完整路径从职前学习延续到入职发展', () => {
  const pathway = buildPathway(domain, 'stu-2025-001');
  assert.equal(pathway.stages.every(stage => stage.status !== '缺失'), true);
  assert.equal(pathway.reaches_inservice, true);
  assert.equal(pathway.continuity, '职前学习延续到入职发展');
  const coursework = pathway.stages.find(s => s.key === 'coursework');
  assert.ok(coursework.courses.some(c => c.ai_mode === 'AI独立设课'));
  assert.ok(coursework.courses.some(c => c.ai_mode === '融入AI内容'));
  assert.equal(coursework.tool_demos.length, 1);
});

test('缺口路径止步于职前阶段', () => {
  const pathway = buildPathway(domain, 'stu-2025-002');
  const missing = pathway.stages.filter(s => s.status === '缺失').map(s => s.key);
  assert.deepEqual(missing, ['internship', 'mentorship', 'postgrad']);
  assert.equal(pathway.reaches_inservice, false);
  assert.equal(pathway.continuity, '经历止步于职前阶段');
});

test('路径标注方案选择:独立设课或融入现有课程', () => {
  const pathway = buildPathway(domain, 'stu-2024-001');
  const plan = pathway.stages.find(s => s.key === 'plan');
  assert.ok(plan.detail.includes('独立设课'));
  assert.ok(plan.detail.includes('实践学分10'));
});
