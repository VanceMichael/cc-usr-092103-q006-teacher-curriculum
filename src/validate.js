// 极简 JSON Schema 子集校验器:只支持本仓库 contracts 用到的关键字,
// 避免引入外部依赖;错误信息带 JSON 路径,便于定位 fixtures 中的问题。
const TYPE_CHECKS = {
  object: value => typeof value === 'object' && value !== null && !Array.isArray(value),
  array: Array.isArray,
  string: value => typeof value === 'string',
  integer: Number.isInteger,
  number: value => typeof value === 'number',
  boolean: value => typeof value === 'boolean',
};

export function validate(value, schema, path = '$') {
  const errors = [];
  if (schema.type) {
    const check = TYPE_CHECKS[schema.type];
    if (!check) {
      return [`${path}: 不支持的类型 ${schema.type}`];
    }
    if (!check(value)) {
      return [`${path}: 应为 ${schema.type}`];
    }
  }
  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(`${path}: 取值须属于 ${JSON.stringify(schema.enum)}`);
  }
  if (schema.type === 'string' && schema.minLength != null && value.length < schema.minLength) {
    errors.push(`${path}: 长度不得小于 ${schema.minLength}`);
  }
  if ((schema.type === 'integer' || schema.type === 'number') && schema.minimum != null && value < schema.minimum) {
    errors.push(`${path}: 不得小于 ${schema.minimum}`);
  }
  if (schema.type === 'array') {
    if (schema.minItems != null && value.length < schema.minItems) {
      errors.push(`${path}: 至少需要 ${schema.minItems} 项`);
    }
    if (schema.items) {
      value.forEach((item, index) => {
        errors.push(...validate(item, schema.items, `${path}[${index}]`));
      });
    }
  }
  if (schema.type === 'object') {
    for (const key of schema.required ?? []) {
      if (!(key in value)) {
        errors.push(`${path}: 缺少字段 ${key}`);
      }
    }
    const properties = schema.properties ?? {};
    for (const [key, subSchema] of Object.entries(properties)) {
      if (key in value) {
        errors.push(...validate(value[key], subSchema, `${path}.${key}`));
      }
    }
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(value)) {
        if (!(key in properties)) {
          errors.push(`${path}: 不允许的字段 ${key}`);
        }
      }
    }
  }
  return errors;
}

export function assertValid(value, schema, label = '资料') {
  const errors = validate(value, schema);
  if (errors.length > 0) {
    throw new Error(`${label}未通过校验:\n${errors.join('\n')}`);
  }
  return value;
}
