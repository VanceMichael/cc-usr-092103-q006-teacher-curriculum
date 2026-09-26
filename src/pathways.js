// 真实路径：把培养目标、方案中的设课选择、知识学习、
// 实习任务与导师观察、毕业后研修连成一条可核查的链。
import { evaluateCompetency } from './gaps.js';

export function buildPathway(competency, cohort, { programs, courses, evidence }) {
  const program = programs.find((p) => p.cohort === cohort) ?? null;
  const items = evidence.filter((i) => i.cohort === cohort && i.competencies.includes(competency.id));
  const design = program?.course_design.find((d) => d.competency === competency.id) ?? null;
  const evaluation = evaluateCompetency(competency, items);

  const stages = [];
  stages.push({ stage: 'objective', status: 'documented', required: true, refs: [competency.id] });

  stages.push(
    design
      ? {
          stage: 'program-design',
          status: 'documented',
          required: true,
          refs: [program.id],
          mode: design.mode,
          courses: design.courses.map((id) => ({
            id,
            title: courses.find((c) => c.id === id)?.title ?? id
          }))
        }
      : { stage: 'program-design', status: 'missing', required: true, refs: [] }
  );

  const knowledgeItems = items.filter(
    (i) => ['course_record', 'tool_demo'].includes(i.type) && i.period === 'pre-service'
  );
  stages.push(channelStage('knowledge-learning', competency.requires.knowledge, evaluation.channels.knowledge, knowledgeItems));

  const practiceItems = items.filter((i) => ['internship_task', 'mentor_observation'].includes(i.type));
  stages.push(channelStage('practice', competency.requires.practice, evaluation.channels.practice, practiceItems));

  const pdItems = items.filter((i) => i.type === 'pd_record' && i.period === 'in-service');
  stages.push({
    stage: 'inservice-development',
    status: pdItems.length > 0 ? 'documented' : 'missing',
    required: false,
    refs: pdItems.map((i) => i.id)
  });

  const complete = stages.filter((s) => s.required !== false).every((s) => s.status === 'documented');
  return { competency_id: competency.id, cohort, program_version: program?.id ?? null, stages, complete };
}

function channelStage(stage, requirement, channelEval, items) {
  if (!requirement) {
    return { stage, status: 'not-required', required: false, refs: items.map((i) => i.id) };
  }
  return {
    stage,
    status: channelEval.status === 'met' ? 'documented' : 'missing',
    required: true,
    refs: items.map((i) => i.id)
  };
}
