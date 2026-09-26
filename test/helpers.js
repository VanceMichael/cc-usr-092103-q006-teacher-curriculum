// 测试共享的样例资料加载器。
import { readFile } from 'node:fs/promises';
import {
  parseCompetencies,
  parsePrograms,
  parseCourses,
  parseEvidence,
  parseComparisons,
  parseRoles
} from '../src/entities.js';

export async function loadData() {
  const read = (name) => readFile(new URL(`../fixtures/${name}.json`, import.meta.url), 'utf8');
  return {
    competencies: parseCompetencies(await read('competencies')),
    programs: parsePrograms(await read('programs')),
    courses: parseCourses(await read('courses')),
    evidence: parseEvidence(await read('evidence')),
    comparisons: parseComparisons(await read('comparisons')),
    roles: parseRoles(await read('roles'))
  };
}
