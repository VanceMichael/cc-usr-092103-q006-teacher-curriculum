// 共享的读取与校验工具，沿用 src/context.js 的约定。
export function requireFields(value, fields, label) {
  for (const field of fields) {
    if (value[field] === undefined || value[field] === null) {
      throw new Error(`${label}缺少必要字段: ${field}`);
    }
  }
}

export function requireEnum(value, allowed, label) {
  if (!allowed.includes(value)) {
    throw new Error(`${label}取值不合法: ${value}`);
  }
}

// 所有资料文件共用 domain + version 的信封约定，payloadKey 指向数据集合。
export function parseEnvelope(raw, payloadKey) {
  const value = JSON.parse(raw);
  if (value.domain !== 'teacher-curriculum') {
    throw new Error(`领域标识不符: ${value.domain}`);
  }
  if (!Number.isInteger(value.version) || value.version < 1) {
    throw new Error('版本字段缺失或不合法');
  }
  if (!Array.isArray(value[payloadKey]) || value[payloadKey].length === 0) {
    throw new Error(`缺少数据集合: ${payloadKey}`);
  }
  return value;
}
