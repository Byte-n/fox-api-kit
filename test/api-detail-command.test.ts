import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Command } from 'commander';

const openapiMocks = vi.hoisted(() => ({ fetchOpenAPI: vi.fn() }));
vi.mock('../src/services/openapi', () => openapiMocks);

import { apiDetailCommand } from '../src/commands/api-detail';
import { OasDocument } from '../src/types';

describe('apiDetailCommand action 接线', () => {
  beforeEach(() => {
    openapiMocks.fetchOpenAPI.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('action 拉取 OAS 后输出 assemble 结果', async () => {
    const oas = {
      openapi: '3.1.0',
      info: { title: 't', version: '1.0.0' },
      components: {
        schemas: { User: { type: 'object', properties: { id: { type: 'string' } } } },
      },
      paths: {
        '/users': {
          get: {
            summary: 'GetUser',
            responses: { '200': { content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } } },
          },
        },
      },
    } as unknown as OasDocument;
    openapiMocks.fetchOpenAPI.mockResolvedValue(oas);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const root = new Command('fox-api-kit').addCommand(apiDetailCommand);
    root.parse(['node', 'test', 'api-detail', '--path', '/users']);
    await new Promise((r) => setTimeout(r, 0));

    const printed = JSON.parse(logSpy.mock.calls.at(-1)![0] as string);
    expect(printed.paths).toHaveProperty('/users.get');
    expect(printed._autoSelectedMethod).toBe('GET');
    expect(printed.components.schemas).toHaveProperty('User');
  });
});