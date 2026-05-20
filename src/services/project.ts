import { ProjectMapEntry } from '../types';

/**
 * 通过项目名称查找项目 ID
 */
export function resolveProjectId(projectName: string): string {
  const mapJson = process.env.APIFOX_PROJECT_MAP;
  if (!mapJson) {
    throw new Error('[FATAL] Missing environment variable APIFOX_PROJECT_MAP. Please configure it and retry.');
  }

  let map: ProjectMapEntry[];
  try {
    map = JSON.parse(mapJson) as ProjectMapEntry[];
  } catch (e) {
    throw new Error(`[FATAL] Invalid JSON format in environment variable APIFOX_PROJECT_MAP: ${(e as Error).message}. Please fix the value and retry.`);
  }

  if (!Array.isArray(map)) {
    throw new Error('[FATAL] Environment variable APIFOX_PROJECT_MAP must be a JSON array.');
  }

  const entry = map.find((item) => item.label === projectName);
  if (!entry) {
    const names = map.map((item) => item.label).join(', ');
    throw new Error(`[ERROR] Project "${projectName}" not found. Available projects: ${names}. Please choose a valid project name and retry.`);
  }

  return String(entry.value);
}
