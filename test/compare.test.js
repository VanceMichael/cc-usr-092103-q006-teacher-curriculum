import test from 'node:test';
import assert from 'node:assert/strict';
import { assessBorrowability, assessAll, dimensionMatrix } from '../src/compare.js';
import { loadData } from './helpers.js';

const data = await loadData();
const { cases, local_context, countries, dimensions } = data.comparisons;

test('制度背景匹配的案例可借鉴', () => {
  const sg = cases.find((c) => c.id === 'case-sg-standalone-ai');
  const result = assessBorrowability(sg, local_context);
  assert.equal(result.verdict, 'borrowable');
  assert.equal(result.unmet_conditions.length, 0);
});

test('实践周数不足时案例只能有条件借鉴', () => {
  const fi = cases.find((c) => c.id === 'case-fi-clinical-practicum');
  const result = assessBorrowability(fi, local_context);
  assert.equal(result.verdict, 'conditional');
  const unmet = result.unmet_conditions.find((c) => c.dimension === 'practicum_weeks');
  assert.equal(unmet.local, 18);
  assert.equal(unmet.min, 20);
});

test('关键制度条件不满足时案例不可借鉴', () => {
  const us = cases.find((c) => c.id === 'case-us-micro-credential');
  const result = assessBorrowability(us, local_context);
  assert.equal(result.verdict, 'not-borrowable');
  assert.ok(result.unmet_conditions.some((c) => c.dimension === 'ai_curriculum_policy' && c.critical));
});

test('批量评估覆盖全部案例', () => {
  const results = assessAll(cases, local_context);
  assert.equal(results.length, cases.length);
  assert.deepEqual(
    results.map((r) => r.verdict),
    ['borrowable', 'conditional', 'not-borrowable']
  );
});

test('十国比较维度矩阵完整', () => {
  const matrix = dimensionMatrix(countries, dimensions);
  assert.equal(matrix.length, 6);
  for (const row of matrix) {
    assert.equal(Object.keys(row.by_country).length, 10);
  }
  const practicum = matrix.find((r) => r.key === 'practicum_weeks');
  assert.equal(practicum.by_country.FI, 24);
});
