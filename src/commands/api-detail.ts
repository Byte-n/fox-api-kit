import { Command } from 'commander';
import { ApiDetailComponents, HTTP_METHODS, OasDocument, OasTag } from '../types';
import { fetchOpenAPI } from '../services/openapi';
import { resolveAllRefs } from '../utils/oas';
import { COMMAND_NAME as SEARCH_APIS_COMMAND_NAME } from './search-apis';

export const COMMAND_NAME = 'api-detail';

/**
 * 从 OAS 文档装配单接口的 OpenAPI 3.1.0 规范结构（纯函数，无 I/O）。
 *
 * method 未指定时自动选择唯一可用方法（多个方法时报错）；无对应方法时报错。
 * 未显式指定 method 时额外回写 _autoSelectedMethod 标记实际选择的方法。
 */
export function buildApiDetailResult(oas: OasDocument, pathStr: string, method?: string): Record<string, unknown> {
  const pathItem = oas.paths?.[pathStr];
  if (!pathItem) {
    throw new Error(`[ERROR] Path "${pathStr}" not found. Use ${SEARCH_APIS_COMMAND_NAME} --keyword <keyword> to search for the correct path.`);
  }

  const availableMethods = Object.keys(pathItem).filter((m) =>
    (HTTP_METHODS as readonly string[]).includes(m.toLowerCase())
  );

  const requestedMethod = method?.toLowerCase();
  let selectedMethod: string;

  if (requestedMethod) {
    selectedMethod = requestedMethod;
  } else if (availableMethods.length === 1) {
    selectedMethod = availableMethods[0];
  } else {
    const methodsList = availableMethods.map((m) => m.toUpperCase()).join(', ');
    throw new Error(
      `[ERROR] Path "${pathStr}" has multiple HTTP methods: ${methodsList}. Please specify --method to select one.`
    );
  }

  const operation = pathItem[selectedMethod];
  if (!operation) {
    const methodsList = availableMethods.map((m) => m.toUpperCase()).join(', ');
    throw new Error(
      `[ERROR] Method ${selectedMethod.toUpperCase()} does not exist on path "${pathStr}". Available methods: ${methodsList}. Please use a valid method and retry.`
    );
  }

  // 收集涉及的 Schema
  const sources: unknown[] = [operation.parameters, operation.requestBody, operation.responses];

  const schemas = resolveAllRefs(oas, sources);

  // 收集涉及的 tags
  const tagNames = new Set(operation.tags ?? []);
  const tags: OasTag[] = (oas.tags ?? []).filter((tag) => tagNames.has(tag.name));

  // 构建 OpenAPI 3.1.0 规范结构
  const components: ApiDetailComponents = { schemas };
  if (oas.components?.responses) components.responses = oas.components.responses;
  if (oas.components?.securitySchemes) components.securitySchemes = oas.components.securitySchemes;

  const result: Record<string, unknown> = {
    openapi: oas.openapi ?? '3.1.0',
    info: oas.info ?? {},
    paths: {
      [pathStr]: {
        [selectedMethod]: operation,
      },
    },
    components,
  };

  if (tags.length > 0) result.tags = tags;
  if (oas.servers) result.servers = oas.servers;
  if (oas.webhooks) result.webhooks = oas.webhooks;
  if (oas.security) result.security = oas.security;
  if (!requestedMethod) result._autoSelectedMethod = selectedMethod.toUpperCase();

  return result;
}

export const apiDetailCommand = new Command(COMMAND_NAME)
  .description('获取接口详情（返回完整的 OpenAPI 3.1.0 规范结构，仅包含相关内容）')
  .option('-p, --project-name <name>', '项目名称')
  .requiredOption('--path <path>', 'API 路径')
  .option('-m, --method <method>', 'HTTP 方法')
  .action(async (opts) => {
    const oas = await fetchOpenAPI(opts.projectName);
    const result = buildApiDetailResult(oas, opts.path as string, opts.method as string | undefined);
    console.log(JSON.stringify(result, null, 2));
  });