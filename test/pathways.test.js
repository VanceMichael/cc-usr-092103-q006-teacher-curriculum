import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPathway } from '../src/pathways.js';
import { loadData } from './helpers.js';

const data = await loadData();
const competency = (id) => data.competencies.find((c) => c.id === id);
const stageOf = (pathway, stage) => pathway.stages.find((s) => s.stage === stage);

test('2023届AI课堂整合路径完整', () => {
  const pathway = buildPathway(competency('comp-ai-classroom'), 2023, data);
  assert.equal(pathway.complete, true);
  assert.equal(pathway.program_version, 'prog-2023');
  const design = stageOf(pathway, 'program-design');
  assert.equal(design.mode, 'integrated');
  assert.ok(design.courses.some((c) => c.title === '学科教学法'));
  const practice = stageOf(pathway, 'practice');
  assert.ok(practice.refs.includes('ev-c008'));
  assert.ok(practice.refs.includes('ev-c009'));
});

test('2022届AI课堂整合路径在实践环节断开', () => {
  const pathway = buildPathway(competency('comp-ai-classroom'), 2022, data);
  assert.equal(pathway.complete, false);
  assert.equal(stageOf(pathway, 'practice').status, 'missing');
  assert.equal(stageOf(pathway, 'knowledge-learning').status, 'documented');
});

test('独立设课选择在路径中可见', () => {
  const pathway = buildPathway(competency('comp-ai-ethics'), 2023, data);
  const design = stageOf(pathway, 'program-design');
  assert.equal(design.mode, 'standalone');
  assert.deepEqual(design.courses.map((c) => c.id), ['course-ai-ethics']);
});

test('方案未覆盖的能力路径从设计环节断开', () => {
  const pathway = buildPathway(competency('comp-data-assessment'), 2021, data);
  assert.equal(pathway.complete, false);
  assert.equal(stageOf(pathway, 'program-design').status, 'missing');
});

test('毕业后研修衔接到路径末端', () => {
  const pathway = buildPathway(competency('comp-reflective'), 2021, data);
  const inservice = stageOf(pathway, 'inservice-development');
  assert.equal(inservice.status, 'documented');
  assert.deepEqual(inservice.refs, ['ev-c011']);
});
