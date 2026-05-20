import { Command } from 'commander';
import { HTTP_METHODS, PathResult } from '../types';
import { fetchOpenAPI } from '../services/openapi';
import { extractModule } from '../utils/oas';

export const COMMAND_NAME = 'search-apis';

export const searchApisCommand = new Command(COMMAND_NAME)
  .description('搜索接口')
  .requiredOption('-p, --project-name <name>', '项目名称')
  .requiredOption('-k, --keyword <keyword>', '关键词')
  .option('--module <module>', '模块过滤')
  .option('-m, --method <method>', 'HTTP 方法过滤')
  .action(async (opts) => {
    const oas = await fetchOpenAPI(opts.projectName);
    const paths = oas.paths ?? {};
    const results: PathResult[] = [];
    const keywordLower = (opts.keyword as string).toLowerCase();

    for (const [pathStr, pathItem] of Object.entries(paths)) {
      for (const [method, operation] of Object.entries(pathItem)) {
        if (!(HTTP_METHODS as readonly string[]).includes(method)) continue;
        if (!operation) continue;

        const module = extractModule(pathStr);
        if (opts.module && module !== opts.module) continue;
        if (opts.method && method.toUpperCase() !== (opts.method as string).toUpperCase()) continue;

        const summary = typeof operation.summary === 'string' ? operation.summary : '';
        if (
          pathStr.toLowerCase().includes(keywordLower) ||
          summary.toLowerCase().includes(keywordLower)
        ) {
          results.push({ path: pathStr, method: method.toUpperCase(), module, summary });
        }
      }
    }

    console.log(JSON.stringify({ keyword: opts.keyword, total: results.length, paths: results }, null, 2));
  });
