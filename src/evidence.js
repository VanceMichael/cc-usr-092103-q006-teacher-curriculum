// 能力达成评估:多项材料可以共同证明一项能力,
// 但一次工具演示不得冒充实践达成。
export const CHANNEL_LABELS = {
  knowledge: '知识学习',
  practice: '实践实习',
  mentor: '导师观察',
  development: '毕业后研修',
};

// 证据类型可支撑的达成通道。tool_demo 只属于知识层面的接触,
// 即使被标记了需要实践的能力,也永远不计入 practice 通道。
export const TYPE_CHANNELS = {
  course_record: ['knowledge'],
  tool_demo: ['knowledge'],
  internship_task: ['practice'],
  mentor_observation: ['mentor'],
  postgrad_training: ['development'],
};

export function channelsOf(item) {
  const channels = TYPE_CHANNELS[item.type];
  if (!channels) {
    throw new Error(`未知证据类型: ${item.type}`);
  }
  return channels;
}

// 按达成通道汇总相关材料:每个必需通道至少有一项合格证据,能力才算达成。
export function evaluateCompetency(competency, items) {
  const relevant = items.filter(item => item.competencies.includes(competency.id));
  const satisfied = [];
  const evidenceByChannel = {};
  for (const channel of competency.required_channels) {
    const hits = relevant.filter(item => channelsOf(item).includes(channel));
    if (hits.length > 0) {
      satisfied.push(channel);
      evidenceByChannel[channel] = hits.map(hit => hit.id);
    }
  }
  const missing = competency.required_channels.filter(channel => !satisfied.includes(channel));
  return {
    competency_id: competency.id,
    name: competency.name,
    status: missing.length === 0 ? '达成' : '未达成',
    satisfied_channels: satisfied,
    missing_channels: missing,
    evidence_by_channel: evidenceByChannel,
  };
}

// 按学生毕业适用的方案评估其全部必备能力。
export function evaluateStudent(domain, studentRef) {
  const student = domain.students.students.find(s => s.ref === studentRef);
  if (!student) {
    throw new Error(`未知学生: ${studentRef}`);
  }
  const plan = domain.plans.plans.find(p => p.id === student.plan_id);
  const items = domain.evidence.evidence.filter(e => e.student_ref === studentRef);
  const required = domain.competencies.competencies.filter(c => plan.required_competencies.includes(c.id));
  return required.map(competency => evaluateCompetency(competency, items));
}
