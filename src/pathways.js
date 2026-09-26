// 将培养目标、培养方案、课程学习、实习任务、导师观察与毕业后研修
// 连成真实路径,呈现从职前学习延续到入职发展的实际经历。
const AI_STRATEGY_LABELS = {
  integrated: '融入现有课程',
  standalone: '独立设课',
  standalone_plus_integration: '独立设课并融入现有课程',
};

const AI_MODE_LABELS = {
  none: '常规课程',
  standalone: 'AI独立设课',
  integrated_ai: '融入AI内容',
};

export function buildPathway(domain, studentRef) {
  const student = domain.students.students.find(s => s.ref === studentRef);
  if (!student) {
    throw new Error(`未知学生: ${studentRef}`);
  }
  const plan = domain.plans.plans.find(p => p.id === student.plan_id);
  const items = domain.evidence.evidence.filter(e => e.student_ref === studentRef);
  const byType = type => items.filter(e => e.type === type);

  const courseRecords = byType('course_record');
  const toolDemos = byType('tool_demo');
  const courses = courseRecords.map(record => {
    const course = domain.courses.courses.find(c => c.id === record.ref_id);
    return {
      course_id: record.ref_id,
      name: course ? course.name : record.ref_id,
      ai_mode: course ? AI_MODE_LABELS[course.ai_mode] : '常规课程',
      evidence_id: record.id,
    };
  });

  const evidenceStage = (key, label, type) => {
    const hits = byType(type);
    return {
      key,
      label,
      status: hits.length > 0 ? '已达成' : '缺失',
      evidence_ids: hits.map(hit => hit.id),
    };
  };

  const stages = [
    {
      key: 'objectives',
      label: '培养目标',
      status: '已确立',
      detail: plan.objectives,
      evidence_ids: [],
    },
    {
      key: 'plan',
      label: '培养方案',
      status: '已确立',
      detail: `${plan.title} · ${AI_STRATEGY_LABELS[plan.ai_strategy]} · 总学分${plan.credits.total}/实践学分${plan.credits.practice}`,
      evidence_ids: [],
    },
    {
      key: 'coursework',
      label: '课程学习',
      status: courseRecords.length > 0 ? '已达成' : '缺失',
      courses,
      tool_demos: toolDemos.map(demo => ({ id: demo.id, note: '工具演示仅属知识层面,不得冒充实践达成' })),
      evidence_ids: [...courseRecords, ...toolDemos].map(e => e.id),
    },
    evidenceStage('internship', '实习任务', 'internship_task'),
    evidenceStage('mentorship', '导师观察', 'mentor_observation'),
    evidenceStage('postgrad', '毕业后研修(入职发展)', 'postgrad_training'),
  ];

  const postgrad = stages.find(stage => stage.key === 'postgrad');
  return {
    student_ref: studentRef,
    cohort: student.cohort,
    plan_id: plan.id,
    stages,
    reaches_inservice: postgrad.status === '已达成',
    continuity: postgrad.status === '已达成' ? '职前学习延续到入职发展' : '经历止步于职前阶段',
  };
}
