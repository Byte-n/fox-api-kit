import { Command } from 'commander';
import { AccessibleProject, ApiIndexItem, HTTP_METHODS, OasDocument, SearchHit } from '../types';
import { fetchApiTree, fetchHttpApis, fetchOpenAPIByProjectId, flattenApiTree } from '../services/openapi';
import { fetchAccessibleProjects } from '../services/project';

export const COMMAND_NAME = 'search-apis';

/** 项目间请求间隔（毫秒），串行拉取避免瞬时调用频次过高 */
const PROJECT_FETCH_INTERVAL_MS = 30;

/** 命中单条：关键字匹配名称或路径（不区分大小写），可按 HTTP 方法过滤 */
export function hit(api: ApiIndexItem, keyword: string, method?: string): boolean {
  const kw = keyword.toLowerCase();
  if (method && api.method.toUpperCase() !== method.toUpperCase()) return false;
  return api.name.toLowerCase().includes(kw) || api.path.toLowerCase().includes(kw);
}

/**
 * 按优先级拉取单个项目的接口索引：
 * 1. api-tree-list（内部接口，无 400105 版本门槛，全项目可读）
 * 2. http-apis（官方 CRUD 接口，部分项目会因内容结构过新报 400105）
 * 3. export-openapi（官方导出，最重但可作最终兜底；不含 Apifox 接口 id）
 * 全部失败则抛出最后一次错误，由调用方 WARN 跳过该项目。
 */
export async function fetchProjectApis(projectId: string): Promise<ApiIndexItem[]> {
  try {
    return flattenApiTree(await fetchApiTree(projectId));
  } catch {
    // api-tree-list 失败：继续尝试 http-apis
  }

  try {
    return await fetchHttpApis(projectId);
  } catch {
    // http-apis 失败：继续尝试 export-openapi
  }

  const oas = await fetchOpenAPIByProjectId(projectId);
  return extractApisFromOas(oas);
}

/** 从 OpenAPI 文档提取接口索引（无 Apifox id，置 0 标记来源） */
export function extractApisFromOas(oas: OasDocument): ApiIndexItem[] {
  const out: ApiIndexItem[] = [];
  for (const [pathStr, pathItem] of Object.entries(oas.paths ?? {})) {
    for (const [method, operation] of Object.entries(pathItem)) {
      if (!(HTTP_METHODS as readonly string[]).includes(method)) continue;
      if (!operation) continue;
      out.push({
        id: 0, // export-openapi 回退不含 Apifox 接口 id
        name: typeof operation.summary === 'string' ? operation.summary : '',
        method: method.toUpperCase(),
        path: pathStr,
      });
    }
  }
  return out;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 聚合结果内 api 项：源数据中的 team/project 冗余已在嵌套层级中体现，故去除 */
type ApiHit = { id: number; method: string; path: string; name: string };

/**
 * 将全部命中按 team > project > api 三级嵌套分组（纯函数，无 I/O）。
 * 返回 { total, teams }，每层带计数（projectCount / apiCount）。
 */
export function groupHitsByTeam(hits: SearchHit[]): {
  total: number;
  teams: Array<{
    teamId: number;
    teamName: string;
    projectCount: number;
    projects: Array<{ projectId: number; projectName: string; apiCount: number; apis: ApiHit[] }>;
  }>;
} {
  const teamMap = new Map<
    number,
    { teamId: number; teamName: string; projects: Map<number, { projectId: number; projectName: string; apis: ApiHit[] }> }
  >();

  for (const h of hits) {
    let team = teamMap.get(h.teamId);
    if (!team) {
      team = { teamId: h.teamId, teamName: h.teamName, projects: new Map() };
      teamMap.set(h.teamId, team);
    }
    let project = team.projects.get(h.projectId);
    if (!project) {
      project = { projectId: h.projectId, projectName: h.projectName, apis: [] };
      team.projects.set(h.projectId, project);
    }
    project.apis.push({ id: h.id, method: h.method, path: h.path, name: h.name });
  }

  return {
    total: hits.length,
    teams: [...teamMap.values()].map((t) => ({
      teamId: t.teamId,
      teamName: t.teamName,
      projectCount: t.projects.size,
      projects: [...t.projects.values()].map((p) => ({
        projectId: p.projectId,
        projectName: p.projectName,
        apiCount: p.apis.length,
        apis: p.apis,
      })),
    })),
  };
}

/**
 * 按项目名称过滤可访问项目列表（纯函数，无 I/O）。
 * - 未指定名称时返回全部项目（跨项目聚合搜索）；
 * - 指定名称时仅保留名称完全匹配的项目（跨团队同名时一并保留）；
 * - 指定名称但无匹配项时抛错并列出可用项目名，错误信息与 resolveProjectId 保持一致。
 */
export function filterProjectsByName(projects: AccessibleProject[], projectName?: string): AccessibleProject[] {
  if (!projectName) return projects;
  const matched = projects.filter((p) => p.name === projectName);
  if (matched.length === 0) {
    const names = projects.map((p) => p.name).join(', ');
    throw new Error(`[ERROR] Project "${projectName}" not found. Available projects: ${names}. Please choose a valid project name and retry.`);
  }
  return matched;
}

export const searchApisCommand = new Command(COMMAND_NAME)
  .description('跨全部项目按关键字模糊搜索接口（匹配接口名称或路径，不区分大小写）')
  .requiredOption('-k, --keyword <keyword>', '关键词（匹配接口名称或路径）')
  .option('-m, --method <method>', 'HTTP 方法过滤')
  .option('-p, --project-name <name>', '仅在指定项目内检索（项目名称；未指定则跨全部可访问项目检索，项目不存在时报错）')
  .action(async (opts) => {
    const keyword = (opts.keyword as string).toLowerCase();
    const method = (opts.method as string | undefined)?.toUpperCase();

    const projects = filterProjectsByName(await fetchAccessibleProjects(), opts.projectName as string | undefined);
    const hits: SearchHit[] = [];

    // 串行拉取各项目接口索引并聚合，项目间加小间隔，避免一次性打高频次请求
    for (let i = 0; i < projects.length; i++) {
      const project = projects[i];

      let apis: ApiIndexItem[];
      try {
        apis = await fetchProjectApis(String(project.id));
      } catch (error) {
        console.error(`[WARN] 拉取项目「${project.name}」接口列表失败：${(error as Error).message}`);
        continue;
      }

      for (const api of apis) {
        if (!hit(api, keyword, method)) continue;
        hits.push({
          projectId: project.id,
          projectName: project.name,
          teamId: project.teamId,
          teamName: project.teamName,
          id: api.id,
          method: api.method.toUpperCase(),
          path: api.path,
          name: api.name,
        });
      }

      if (i < projects.length - 1) await sleep(PROJECT_FETCH_INTERVAL_MS);
    }

    const output = { keyword: opts.keyword, ...groupHitsByTeam(hits) };

    console.log(JSON.stringify(output, null, 2));
  });
