import { ApiIndexItem, ApiTreeNode, HttpApi, OasDocument } from '../types';
import { httpRequest } from '../utils/http';
import {
  APIFOX_BASE_URL,
  APIFOX_CLIENT_VERSION,
  APIFOX_CRUD_BASE_URL,
  buildApifoxHeaders,
} from '../utils/apifox';
import { resolveProjectId } from './project';

/** http-apis 响应包装（data 字段可能缺失，按需兜底为数组本身） */
interface HttpApisResponse {
  success?: boolean;
  data?: HttpApi[];
}

/** api-tree-list 响应包装 */
interface ApiTreeResponse {
  success?: boolean;
  data?: ApiTreeNode[];
}

/**
 * 获取项目接口树（Web 控制台内部接口 api-tree-list）。
 *
 * 鉴权仅需两个请求头：Authorization（开放 API token，走 header）+ x-client-version（固定值）。
 * 相比 http-apis 无 400105「Client version too low」版本门槛，对全部项目可读；
 * 但属非官方私有接口，无文档与稳定性承诺，故仅作数据源优先级最高的一层，
 * 失败时回退到官方 http-apis / export-openapi。
 */
export async function fetchApiTree(projectId: string): Promise<ApiTreeNode[]> {
  const res = await httpRequest<ApiTreeResponse>(
    `${APIFOX_CRUD_BASE_URL}/projects/${projectId}/api-tree-list?locale=zh-CN`,
    { method: 'GET', headers: buildApiTreeHeaders(), retries: 1 }
  );
  return res?.data ?? [];
}

/** api-tree-list 专用请求头：Authorization + 固定的 x-client-version，不带其它私有头 */
function buildApiTreeHeaders(): Record<string, string> {
  const token = process.env.APIFOX_ACCESS_TOKEN;
  if (!token) {
    throw new Error('[FATAL] Missing environment variable APIFOX_ACCESS_TOKEN. Please configure it and retry.');
  }
  return {
    Authorization: `Bearer ${token}`,
    'x-client-version': APIFOX_CLIENT_VERSION,
  };
}

/**
 * 获取项目内全部 HTTP 接口（官方 CRUD 接口 http-apis）。
 *
 * 端点 GET /api/v1/projects/{projectId}/http-apis（注意是 /api/v1 前缀，/v1 会 302）。
 * 不带 perPage 时服务端一次返回全部接口；服务端不支持 name/path 关键字过滤
 * （实测 name=xxx 参数被忽略），模糊匹配需在客户端完成。
 * 部分项目会因内容结构过新而恒定返回 400105「Client version too low」（且无更高 API
 * 版本可用），这时应回退到 fetchApiTree 或 export-openapi。
 * 官方文档未公布频率限制；这里对 429 做一次退避重试，其余情况原样抛出。
 */
export async function fetchHttpApis(projectId: string): Promise<HttpApi[]> {
  const headers = buildApifoxHeaders();
  const url = `${APIFOX_CRUD_BASE_URL}/projects/${projectId}/http-apis`;

  const res = await httpRequest<HttpApisResponse>(url, { method: 'GET', headers, retries: 1 });
  return res?.data ?? (res as unknown as HttpApi[]);
}

/**
 * 获取 OpenAPI 数据（通过项目名称解析项目 ID，供 api-detail 等命令使用）
 */
export async function fetchOpenAPI(projectName?: string): Promise<OasDocument> {
  const projectId = await resolveProjectId(projectName);
  return fetchOpenAPIByProjectId(projectId);
}

/**
 * 导出项目完整 OpenAPI 规范（按 projectId，供搜索回退链使用）
 */
export async function fetchOpenAPIByProjectId(projectId: string): Promise<OasDocument> {
  const headers = buildApifoxHeaders();
  const url = `${APIFOX_BASE_URL}/projects/${projectId}/export-openapi?locale=zh-CN`;

  const body = {
    scope: { type: 'ALL' },
    options: {
      includeApifoxExtensionProperties: false,
      addFoldersToTags: false,
    },
    oasVersion: '3.1',
    exportFormat: 'JSON',
  };

  return httpRequest<OasDocument>(url, { headers, body });
}

/**
 * 从接口树扁平化出接口索引（id/name/method/path）
 */
export function flattenApiTree(tree: ApiTreeNode[], out: ApiIndexItem[] = []): ApiIndexItem[] {
  for (const node of tree) {
    if (node.type === 'apiDetail' && node.api) {
      out.push({
        id: node.api.id,
        name: node.api.name,
        method: node.api.method,
        path: node.api.path,
      });
    }
    if (node.children && node.children.length > 0) {
      flattenApiTree(node.children, out);
    }
  }
  return out;
}
