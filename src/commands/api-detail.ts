import { Command } from 'commander';
import { ApiDetailComponents, HTTP_METHODS, OasTag } from '../types';
import { fetchOpenAPI } from '../services/openapi';
import { resolveAllRefs } from '../utils/oas';
import { COMMAND_NAME as SEARCH_APIS_COMMAND_NAME } from './search-apis';

export const COMMAND_NAME = 'api-detail';

export const apiDetailCommand = new Command(COMMAND_NAME)
  .description('获取接口详情（返回完整的 OpenAPI 3.1.0 规范结构，仅包含相关内容）')
  .requiredOption('-p, --project-name <name>', '项目名称')
  .requiredOption('--path <path>', 'API 路径')
  .option('-m, --method <method>', 'HTTP 方法')
  .action(async (opts) => {
    const oas = await fetchOpenAPI(opts.projectName);
    const pathStr = opts.path as string;

    const pathItem = oas.paths?.[pathStr];
    if (!pathItem) {
      throw new Error(`[ERROR] Path "${pathStr}" not found. Use ${SEARCH_APIS_COMMAND_NAME} --keyword <keyword> to search for the correct path.`);
    }

    const availableMethods = Object.keys(pathItem).filter((m) =>
      (HTTP_METHODS as readonly string[]).includes(m.toLowerCase())
    );

    const requestedMethod = (opts.method as string | undefined)?.toLowerCase();
    let method: string;

    if (requestedMethod) {
      method = requestedMethod;
    } else if (availableMethods.length === 1) {
      method = availableMethods[0];
    } else {
      const methodsList = availableMethods.map((m) => m.toUpperCase()).join(', ');
      throw new Error(
        `[ERROR] Path "${pathStr}" has multiple HTTP methods: ${methodsList}. Please specify --method to select one.`
      );
    }

    const operation = pathItem[method];
    if (!operation) {
      const methodsList = availableMethods.map((m) => m.toUpperCase()).join(', ');
      throw new Error(
        `[ERROR] Method ${method.toUpperCase()} does not exist on path "${pathStr}". Available methods: ${methodsList}. Please use a valid method and retry.`
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
          [method]: operation,
        },
      },
      components,
    };

    if (tags.length > 0) result.tags = tags;
    if (oas.servers) result.servers = oas.servers;
    if (oas.webhooks) result.webhooks = oas.webhooks;
    if (oas.security) result.security = oas.security;
    if (!opts.method) result._autoSelectedMethod = method.toUpperCase();

    console.log(JSON.stringify(result, null, 2));
  });
