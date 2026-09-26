// 六类领域资料的解析与基础校验，对应 contracts/ 下的契约。
import { parseEnvelope, requireFields, requireEnum } from './load.js';

export const EVIDENCE_TYPES = ['course_record', 'tool_demo', 'internship_task', 'mentor_observation', 'pd_record'];
export const PRIVACY_LEVELS = ['public', 'internal', 'restricted'];
export const PERIODS = ['pre-service', 'in-service'];
export const DESIGN_MODES = ['standalone', 'integrated'];

export function parseCompetencies(raw) {
  const env = parseEnvelope(raw, 'competencies');
  for (const c of env.competencies) {
    requireFields(c, ['id', 'name', 'requires'], '培养目标');
    if (!c.requires.knowledge && !c.requires.practice) {
      throw new Error(`培养目标 ${c.id} 至少需要一个证据通道`);
    }
    for (const [channel, req] of Object.entries(c.requires)) {
      requireFields(req, ['min_items', 'types'], `培养目标 ${c.id} 的 ${channel} 通道`);
      for (const t of req.types) requireEnum(t, EVIDENCE_TYPES, `培养目标 ${c.id} 的证据类型`);
    }
  }
  return env.competencies;
}

export function parsePrograms(raw) {
  const env = parseEnvelope(raw, 'programs');
  for (const p of env.programs) {
    requireFields(p, ['id', 'cohort', 'version', 'credit_rules', 'course_design'], '培养方案');
    if (!Number.isInteger(p.cohort)) throw new Error(`培养方案 ${p.id} 的届别不合法`);
    for (const d of p.course_design) {
      requireFields(d, ['competency', 'mode', 'courses'], `培养方案 ${p.id} 的设课设计`);
      requireEnum(d.mode, DESIGN_MODES, `培养方案 ${p.id} 的设课模式`);
    }
    if (p.transition !== undefined) {
      requireFields(p.transition, ['applies_to_cohorts', 'supplementary'], `培养方案 ${p.id} 的并轨规则`);
    }
  }
  return env.programs;
}

export function parseCourses(raw) {
  const env = parseEnvelope(raw, 'courses');
  for (const c of env.courses) {
    requireFields(c, ['id', 'title', 'credits', 'channel', 'competencies', 'offered_from'], '课程');
    requireEnum(c.channel, ['knowledge', 'practice'], `课程 ${c.id} 的通道`);
  }
  return env.courses;
}

export function parseEvidence(raw) {
  const env = parseEnvelope(raw, 'evidence');
  for (const e of env.evidence) {
    requireFields(e, ['id', 'type', 'competencies', 'cohort', 'period', 'privacy_level', 'source', 'subject_ref', 'summary'], '证据材料');
    requireEnum(e.type, EVIDENCE_TYPES, `证据 ${e.id} 的类型`);
    requireEnum(e.period, PERIODS, `证据 ${e.id} 的阶段`);
    requireEnum(e.privacy_level, PRIVACY_LEVELS, `证据 ${e.id} 的隐私级别`);
    if (!e.subject_ref.startsWith('stu-anon-')) {
      throw new Error(`证据 ${e.id} 的学生引用未匿名化`);
    }
  }
  return env.evidence;
}

export function parseComparisons(raw) {
  const env = parseEnvelope(raw, 'countries');
  requireFields(env, ['dimensions', 'local_context', 'cases'], '国际比较资料');
  const dimensionKeys = new Set(env.dimensions.map((d) => d.key));
  for (const country of env.countries) {
    requireFields(country, ['code', 'name', 'dimensions'], '比较国家');
    for (const key of dimensionKeys) {
      if (country.dimensions[key] === undefined) {
        throw new Error(`国家 ${country.code} 缺少比较维度: ${key}`);
      }
    }
  }
  for (const c of env.cases) {
    requireFields(c, ['id', 'country', 'title', 'requires'], '借鉴案例');
    for (const cond of c.requires) {
      requireFields(cond, ['dimension'], `案例 ${c.id} 的借鉴条件`);
      if (!dimensionKeys.has(cond.dimension)) {
        throw new Error(`案例 ${c.id} 引用了未知维度: ${cond.dimension}`);
      }
      if (cond.equals === undefined && cond.min === undefined && cond.in === undefined) {
        throw new Error(`案例 ${c.id} 的借鉴条件缺少比较运算符`);
      }
    }
  }
  return { dimensions: env.dimensions, local_context: env.local_context, countries: env.countries, cases: env.cases };
}

export function parseRoles(raw) {
  const env = parseEnvelope(raw, 'roles');
  for (const r of env.roles) {
    requireFields(r, ['role', 'label', 'permissions', 'privacy_clearance', 'cohort_scope'], '角色');
    requireEnum(r.privacy_clearance, PRIVACY_LEVELS, `角色 ${r.role} 的隐私级别`);
    if (r.cohort_scope !== 'all' && !Array.isArray(r.cohort_scope)) {
      throw new Error(`角色 ${r.role} 的届别范围不合法`);
    }
    if (r.evidence_period_scope !== undefined) {
      for (const p of r.evidence_period_scope) requireEnum(p, PERIODS, `角色 ${r.role} 的阶段范围`);
    }
  }
  return env.roles;
}
