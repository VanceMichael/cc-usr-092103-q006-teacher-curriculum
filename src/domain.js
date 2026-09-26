// 读取 fixtures 并按 contracts 校验,再检查跨资料引用是否完整,
// 保证培养目标、方案、课程、证据与学生名册能连成真实路径。
import { readFile } from 'node:fs/promises';
import { assertValid } from './validate.js';

const PARTS = ['competencies', 'plans', 'courses', 'students', 'evidence', 'roles', 'comparison'];

async function readJson(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, import.meta.url), 'utf8'));
}

export async function loadDomain() {
  const domain = {};
  for (const name of PARTS) {
    const [data, schema] = await Promise.all([
      readJson(`../fixtures/${name}.json`),
      readJson(`../contracts/${name}.schema.json`),
    ]);
    domain[name] = assertValid(data, schema, `fixtures/${name}.json`);
  }
  return checkReferences(domain);
}

export function checkReferences(domain) {
  const fail = message => {
    throw new Error(`领域资料引用不完整: ${message}`);
  };
  const planIds = new Set(domain.plans.plans.map(plan => plan.id));
  const competencyIds = new Set(domain.competencies.competencies.map(c => c.id));
  const courseIds = new Set(domain.courses.courses.map(c => c.id));
  const studentsByRef = new Map(domain.students.students.map(s => [s.ref, s]));

  for (const plan of domain.plans.plans) {
    for (const cid of plan.required_competencies) {
      if (!competencyIds.has(cid)) fail(`方案 ${plan.id} 引用了未知能力 ${cid}`);
    }
  }
  for (const change of domain.plans.credit_rule_changes) {
    if (!planIds.has(change.from_plan)) fail(`学分规则变化 ${change.id} 引用了未知方案 ${change.from_plan}`);
    if (!planIds.has(change.to_plan)) fail(`学分规则变化 ${change.id} 引用了未知方案 ${change.to_plan}`);
  }
  for (const course of domain.courses.courses) {
    for (const pid of course.plans) {
      if (!planIds.has(pid)) fail(`课程 ${course.id} 引用了未知方案 ${pid}`);
    }
    for (const support of course.supports) {
      if (!competencyIds.has(support.competency)) fail(`课程 ${course.id} 引用了未知能力 ${support.competency}`);
    }
  }
  for (const student of domain.students.students) {
    if (!planIds.has(student.plan_id)) fail(`学生 ${student.ref} 引用了未知方案 ${student.plan_id}`);
    if (!planIds.has(student.enrolled_plan_id)) fail(`学生 ${student.ref} 引用了未知入学方案 ${student.enrolled_plan_id}`);
  }
  for (const item of domain.evidence.evidence) {
    const student = studentsByRef.get(item.student_ref);
    if (!student) fail(`证据 ${item.id} 引用了未知学生 ${item.student_ref}`);
    if (item.cohort !== student.cohort || item.plan_id !== student.plan_id) {
      fail(`证据 ${item.id} 的届别或方案与学生 ${item.student_ref} 不一致`);
    }
    for (const cid of item.competencies) {
      if (!competencyIds.has(cid)) fail(`证据 ${item.id} 引用了未知能力 ${cid}`);
    }
    if (item.type === 'course_record' && !courseIds.has(item.ref_id)) {
      fail(`证据 ${item.id} 引用了未知课程 ${item.ref_id}`);
    }
  }
  for (const role of domain.roles.roles) {
    for (const pid of role.review_scope.plan_ids) {
      if (!planIds.has(pid)) fail(`角色 ${role.id} 的评审范围包含未知方案 ${pid}`);
    }
    for (const ref of role.assigned_students ?? []) {
      if (!studentsByRef.has(ref)) fail(`角色 ${role.id} 的被指导学生 ${ref} 不存在`);
    }
  }
  return domain;
}
