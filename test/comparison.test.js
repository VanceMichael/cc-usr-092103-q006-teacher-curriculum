import test from 'node:test';
import assert from 'node:assert/strict';
import { loadDomain } from '../src/domain.js';
import { assessCases } from '../src/comparison.js';

const domain = await loadDomain();

test('国外案例按制度背景判断可借鉴性', () => {
  const assessed = assessCases(domain.comparison);
  const borrowable = assessed.filter(a => a.borrowable).map(a => a.country).sort();
  assert.deepEqual(borrowable, ['新加坡', '日本', '爱沙尼亚', '韩国'].sort());
});

test('制度背景不满足的案例列出差异维度', () => {
  const assessed = assessCases(domain.comparison);
  const finland = assessed.find(a => a.country === '芬兰');
  assert.equal(finland.borrowable, false);
  assert.equal(finland.mismatched_conditions.qualification.required, '硕士起点研究本位');
  assert.equal(finland.mismatched_conditions.qualification.local, '本科起点+教师资格考试');
  const germany = assessed.find(a => a.country === '德国');
  assert.equal(germany.borrowable, false);
  assert.ok(germany.mismatched_conditions.qualification);
});
