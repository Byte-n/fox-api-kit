import { AccessibleProject, ApifoxProject, ApifoxTeam } from '../types';
import { httpRequest } from '../utils/http';
import { APIFOX_BASE_URL, buildApifoxHeaders } from '../utils/apifox';

interface TeamsResponse {
  success: boolean;
  data: ApifoxTeam[];
}

interface ProjectsResponse {
  success: boolean;
  data: ApifoxProject[];
}

/**
 * 通过项目名称解析项目 ID
 *
 * 经由 Apifox 开放 API 获取当前 token 可访问的全部项目（跨团队聚合），再按名称匹配：
 * - 仅有一个可访问项目时，自动使用该项目；
 * - 存在多个项目且未传名称时，提示可选项目并要求指定；
 * - 未匹配到指定名称时，提示可选项目并要求重新选择。
 */
export async function resolveProjectId(projectName?: string): Promise<string> {
  const projects = await fetchAccessibleProjects();

  if (projects.length === 1) {
    return String(projects[0].id);
  }

  if (!projectName) {
    const names = projects.map((item) => item.name).join(', ');
    throw new Error(`[ERROR] Missing --project-name. Available projects: ${names}. Please specify a project name and retry.`);
  }

  const project = projects.find((item) => item.name === projectName);
  if (!project) {
    const names = projects.map((item) => item.name).join(', ');
    throw new Error(`[ERROR] Project "${projectName}" not found. Available projects: ${names}. Please choose a valid project name and retry.`);
  }

  return String(project.id);
}

/**
 * 通过 Apifox 开放 API 获取当前 token 可访问的全部项目（跨团队聚合）
 */
export async function fetchAccessibleProjects(): Promise<AccessibleProject[]> {
  const headers = buildApifoxHeaders();

  const teamsRes = await httpRequest<TeamsResponse>(`${APIFOX_BASE_URL}/teams`, { method: 'GET', headers });
  const teams = teamsRes.data ?? [];

  const projects: AccessibleProject[] = [];
  for (const team of teams) {
    const res = await httpRequest<ProjectsResponse>(`${APIFOX_BASE_URL}/teams/${team.id}/projects`, { method: 'GET', headers });
    for (const project of res.data ?? []) {
      projects.push({
        id: project.id,
        name: project.name,
        teamId: team.id,
        teamName: team.name,
      });
    }
  }

  return projects;
}
