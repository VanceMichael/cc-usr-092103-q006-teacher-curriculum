import test from 'node:test';
import assert from 'node:assert/strict';
import { parseEvidence, parsePrograms, parseComparisons } from '../src/entities.js';
import { loadData } from './helpers.js';

const envelope = (key, items) => JSON.stringify({ domain: 'teacher-curriculum', version: 1, [key]: items });

test('证据材料拒绝未匿名化的学生引用', () => {
  const bad = envelope('evidence', [
    {
      id: 'ev-bad',
      type: 'course_record',
      competencies: ['comp-ai-concepts'],
      cohort: 2023,
      period: 'pre-service',
      privacy_level: 'internal',
      source: 'course-edu-tech',
      subject_ref: '张三',
      summary: '未匿名化的记录'
    }
  ]);
  assert.throws(() => parseEvidence(bad), /未匿名化/);
});

test('证据材料拒绝未知类型', () => {
  const bad = envelope('evidence', [
    {
      id: 'ev-bad',
      type: 'exam_score',
      competencies: ['comp-ai-concepts'],
      cohort: 2023,
      period: 'pre-service',
      privacy_level: 'internal',
      source: 'course-edu-tech',
      subject_ref: 'stu-anon-09',
      summary: '类型不合法'
    }
  ]);
  assert.throws(() => parseEvidence(bad), /取值不合法/);
});

test('培养方案拒绝未知的设课模式', () => {
  const bad = envelope('programs', [
    {
      id: 'prog-x',
      cohort: 2024,
      version: 4,
      credit_rules: { total: 160, practice_min: 10 },
      course_design: [{ competency: 'comp-ai-ethics', mode: 'optional', courses: ['course-ai-ethics'] }]
    }
  ]);
  assert.throws(() => parsePrograms(bad), /取值不合法/);
});

test('借鉴案例必须引用已定义的比较维度', () => {
  const raw = JSON.stringify({
    domain: 'teacher-curriculum',
    version: 1,
    dimensions: [{ key: 'practicum_weeks', label: '实践周数' }],
    local_context: { practicum_weeks: 18 },
    countries: [{ code: 'FI', name: '芬兰', dimensions: { practicum_weeks: 24 } }],
    cases: [{ id: 'case-x', country: 'FI', title: '案例', requires: [{ dimension: 'unknown_dim', equals: 1 }] }]
  });
  assert.throws(() => parseComparisons(raw), /未知维度/);
});

test('全部样例资料可解析', async () => {
  const data = await loadData();
  assert.equal(data.competencies.length, 5);
  assert.equal(data.programs.length, 3);
  assert.equal(data.courses.length, 5);
  assert.equal(data.evidence.length, 15);
  assert.equal(data.comparisons.countries.length, 10);
  assert.equal(data.roles.length, 5);
});
