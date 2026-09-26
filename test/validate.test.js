import test from 'node:test';
import assert from 'node:assert/strict';
import { validate, assertValid } from '../src/validate.js';

const schema = {
  type: 'object',
  required: ['a'],
  properties: { a: { type: 'integer', minimum: 1 } },
  additionalProperties: false,
};

test('校验器发现缺失字段、越界取值与多余字段', () => {
  assert.deepEqual(validate({}, schema), ['$: 缺少字段 a']);
  assert.ok(validate({ a: 0 }, schema)[0].includes('不得小于'));
  assert.ok(validate({ a: 1, b: 2 }, schema)[0].includes('不允许的字段'));
  assert.deepEqual(validate({ a: 1 }, schema), []);
});

test('校验器检查枚举与嵌套数组', () => {
  const enumSchema = { type: 'array', items: { type: 'string', enum: ['x', 'y'] } };
  assert.deepEqual(validate(['x', 'y'], enumSchema), []);
  assert.ok(validate(['x', 'z'], enumSchema)[0].includes('$[1]'));
});

test('assertValid 抛出带资料名的错误', () => {
  assert.throws(() => assertValid({}, schema, '测试资料'), /测试资料未通过校验/);
  assert.equal(assertValid({ a: 2 }, schema, '测试资料').a, 2);
});
