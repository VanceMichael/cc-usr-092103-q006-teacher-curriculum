import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCohortBoard, buildBoard, reformImpact } from '../src/board.js';
import { findRole, createSession } from '../src/access.js';
import { loadData } from './helpers.js';

const data = await loadData();
const byId = (list, id) => list.find((x) => x.competency_id === id);

test('2023届改革影响包含独立设课与学分调整', () => {
  const impact = reformImpact(data.programs, 2023);
  assert.equal(impact.previous_version, 'prog-2022');
  const ethics = impact.design_changes.find((d) => d.competency === 'comp-ai-ethics');
  assert.equal(ethics.change, 'mode-changed');
  assert.equal(ethics.from, 'integrated');
  assert.equal(ethics.to, 'standalone');
  const dataAssessment = impact.design_changes.find((d) => d.competency === 'comp-data-assessment');
  assert.equal(dataAssessment.change, 'added');
  assert.equal(dataAssessment.mode, 'standalone');
  const practice = impact.credit_changes.find((c) => c.rule === 'practice_min');
  assert.equal(practice.delta, 4);
});

test('2022届证据台呈现缺口图而非完成表', () => {
  const board = buildCohortBoard(2022, data);
  assert.equal(board.program_version, 'prog-2022');
  assert.equal(byId(board.competencies, 'comp-ai-classroom').status, 'partial');
  assert.equal(byId(board.competencies, 'comp-data-assessment').status, 'gap');
  assert.equal(byId(board.competencies, 'comp-data-assessment').remediation.status, 'open');
  assert.ok(board.supplementary !== null);
  assert.equal(board.supplementary.cohort, 2022);
});

test('2021届可见从职前延续到入职的补齐经历', () => {
  const board = buildCohortBoard(2021, data);
  const reflective = byId(board.competencies, 'comp-reflective');
  assert.equal(reflective.status, 'gap');
  assert.equal(reflective.remediation.status, 'remediated-in-service');
  assert.equal(board.supplementary, null);
});

test('证据台按角色范围过滤证据引用', () => {
  const external = createSession(findRole(data.roles, 'reviewer-external'));
  const board = buildCohortBoard(2023, data, external);
  const classroom = byId(board.competencies, 'comp-ai-classroom');
  // ev-c008 为受限材料，校外评审看不到引用，但缺口状态不受影响
  assert.ok(!classroom.evidence_ids.includes('ev-c008'));
  assert.ok(classroom.withheld_evidence >= 1);
  assert.equal(classroom.status, 'met');
  assert.ok(board.evidence_visibility.withheld >= 1);
});

test('整台证据板覆盖全部届别', () => {
  const board = buildBoard(data);
  assert.deepEqual(board.cohorts.map((c) => c.cohort), [2021, 2022, 2023]);
});
