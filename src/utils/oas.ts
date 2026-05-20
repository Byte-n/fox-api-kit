import { OasDocument } from '../types';

/**
 * 提取模块名
 */
export function extractModule(pathStr: string): string {
  const parts = pathStr.replace(/^\//, '').split('/');
  if (parts.length < 2) return 'other';

  if (parts[0] === 'api') {
    if (parts.length >= 4 && parts[1] === 'v3') {
      return `api.${parts[3]}`;
    } else if (parts.length >= 3) {
      return `api.${parts[2]}`;
    }
    return 'api';
  } else if (parts[0] === 'rpc') {
    return parts.length >= 2 ? `rpc.${parts[1]}` : 'rpc';
  }
  return 'other';
}

/**
 * 深度遍历收集所有 $ref
 */
export function collectRefs(node: unknown, refs: Set<string> = new Set()): Set<string> {
  if (!node || typeof node !== 'object') return refs;
  if (Array.isArray(node)) {
    for (const item of node) collectRefs(item, refs);
  } else {
    const obj = node as Record<string, unknown>;
    if (typeof obj['$ref'] === 'string') {
      refs.add(obj['$ref']);
    }
    for (const value of Object.values(obj)) {
      collectRefs(value, refs);
    }
  }
  return refs;
}

/**
 * 将 $ref 路径转为 schema 对象
 */
export function resolveRef(oas: OasDocument, ref: string): unknown {
  const parts = ref.replace(/^#\//, '').split('/');
  return parts.reduce<unknown>((obj, key) => {
    if (obj !== null && typeof obj === 'object' && !Array.isArray(obj)) {
      return (obj as Record<string, unknown>)[key];
    }
    return undefined;
  }, oas);
}

/**
 * 递归解析所有 $ref，支持嵌套引用，防止循环引用
 */
export function resolveAllRefs(oas: OasDocument, sources: unknown[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const pending = new Set<string>();
  const visited = new Set<string>();

  // 收集初始 $ref
  for (const source of sources) {
    for (const ref of collectRefs(source)) {
      pending.add(ref);
    }
  }

  // BFS 递归解析
  while (pending.size > 0) {
    for (const ref of [...pending]) {
      pending.delete(ref);
      if (visited.has(ref)) continue;
      visited.add(ref);

      const schema = resolveRef(oas, ref);
      if (!schema) {
        throw new Error(`[FATAL] $ref "${ref}" references a non-existent schema. Please check the OpenAPI document integrity.`);
      }

      // 提取 schema 名作为 key（最后一段路径）
      const name = ref.split('/').pop();
      if (name) result[name] = schema;

      // 收集该 schema 内部的嵌套 $ref
      for (const nestedRef of collectRefs(schema)) {
        if (!visited.has(nestedRef)) {
          pending.add(nestedRef);
        }
      }
    }
  }

  return result;
}
