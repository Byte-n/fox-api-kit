// ─── 类型定义 ─────────────────────────────────────────────────────────────────

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export interface ProjectMapEntry {
  label: string;
  value: string | number;
}

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
  headers?: Record<string, string>;
  body?: unknown;
}

export interface PathResult {
  path: string;
  method: string;
  module: string;
  summary: string;
}

export interface ApiDetailComponents {
  schemas: Record<string, unknown>;
  responses?: Record<string, JsonValue>;
  securitySchemes?: Record<string, JsonValue>;
}

export const HTTP_METHODS = ['get', 'post', 'put', 'delete', 'patch'] as const;
