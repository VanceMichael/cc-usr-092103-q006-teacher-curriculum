import test from 'node:test';
import assert from 'node:assert/strict';
import { supplementaryForCohort, supplementaryByCohort, diffCreditRules } from '../src/credits.js';
import { loadData } from './helpers.js';

const data = await loadData();

test('学分规则差异可量化', () => {
  const changes = diffCreditRules({ total: 160, practice_min: 10 }, { total: 162, practice_min: 14 });
  const practice = changes.find((c) => c.rule === 'practice_min');
  assert.equal(practice.delta, 4);
});

test('2022届因并轨需要补修', () => {
  const result = supplementaryForCohort(data.programs, 2022);
  assert.equal(result.from_version, 'prog-2022');
  assert.equal(result.to_version, 'prog-2023');
  assert.equal(result.supplementary.length, 2);
  const modules = result.supplementary.map((s) => s.module);
  assert.ok(modules.includes('course-ai-ethics'));
  assert.ok(modules.includes('course-practicum'));
});

test('2023届执行最新方案无需补修', () => {
  assert.equal(supplementaryForCohort(data.programs, 2023), null);
});

test('2021届未被并轨规则覆盖，老生老办法', () => {
  assert.equal(supplementaryForCohort(data.programs, 2021), null);
});

test('按届汇总只有2022届需要补修', () => {
  const all = supplementaryByCohort(data.programs);
  assert.deepEqual(all.map((r) => r.cohort), [2022]);
});
