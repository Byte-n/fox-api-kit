// ─── 类型定义 ─────────────────────────────────────────────────────────────────

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export interface OasOperation {
  summary?: string;
  tags?: string[];
  parameters?: JsonValue;
  requestBody?: JsonValue;
  responses?: Record<string, JsonValue>;
}

export interface OasPathItem {
  [method: string]: OasOperation | undefined;
}

export interface OasComponents {
  schemas?: Record<string, JsonValue>;
  responses?: Record<string, JsonValue>;
  securitySchemes?: Record<string, JsonValue>;
}

export interface OasTag {
  name: string;
  description?: string;
}

export interface OasDocument {
  openapi?: string;
  info?: Record<string, JsonValue>;
  paths?: Record<string, OasPathItem>;
  components?: OasComponents;
  tags?: OasTag[];
  servers?: JsonValue[];
  webhooks?: JsonValue;
  security?: JsonValue[];
}

export interface HttpOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  /** 遇到 429（限流）时额外重试次数，默认 0 */
  retries?: number;
  /** 429 重试前的退避时长（毫秒），默认 1000 */
  retryDelayMs?: number;
}

export interface ApifoxTeam {
  id: number;
  name: string;
}

export interface ApifoxProject {
  id: number;
  teamId: number;
  name: string;
}

export interface AccessibleProject {
  id: number;
  name: string;
  teamId: number;
  teamName: string;
}

/** api-tree-list 返回的接口树节点（Web 控制台内部接口） */
export interface ApiTreeNode {
  key: string;
  type: 'apiDetailFolder' | 'apiDetail' | 'apiCase';
  name: string;
  moduleId?: number;
  children?: ApiTreeNode[];
  api?: {
    id: number;
    name: string;
    method: string;
    path: string;
    folderId?: number;
    moduleId?: number;
    tags?: string[];
    status?: string;
  };
  folder?: { id: number; name: string; moduleId?: number; parentId?: number };
}

/** 搜索用接口索引（api-tree-list / http-apis / export-openapi 三种数据源的统一形态） */
export interface ApiIndexItem {
  id: number;
  name: string;
  method: string;
  path: string;
}

/** Apifox 接口索引（GET /v1/projects/{projectId}/http-apis 返回的轻量字段） */
export interface HttpApi {
  id: number;
  name: string;
  method: string;
  path: string;
  folderId?: number;
  moduleId?: number;
}

/** search-apis 聚合搜索结果（含来源项目信息） */
export interface SearchHit {
  projectId: number;
  projectName: string;
  teamId: number;
  teamName: string;
  id: number;
  method: string;
  path: string;
  name: string;
}

export interface ApiDetailComponents {
  schemas: Record<string, unknown>;
  responses?: Record<string, JsonValue>;
  securitySchemes?: Record<string, JsonValue>;
}

export const HTTP_METHODS = ['get', 'post', 'put', 'delete', 'patch'] as const;
