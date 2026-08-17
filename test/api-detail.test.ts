import { describe, expect, it } from 'vitest';
import { buildApiDetailResult } from '../src/commands/api-detail';
import { OasDocument } from '../src/types';

/** 基础 OAS：/users 下 GET（含 $ref 与 tags），/orders 下 GET+PUT */
function makeOas(): OasDocument {
  return {
    openapi: '3.1.0',
    info: { title: 'test', version: '1.0.0' },
    tags: [{ name: 'user' }, { name: 'order' }],
    servers: [{ url: 'https://api.example.com' }],
    webhooks: { new: { post: { responses: {} } } },
    security: [{ bearer: [] }],
    components: {
      schemas: {
        User: { type: 'object', properties: { id: { type: 'string' } } },
        Order: { type: 'object' },
      },
      responses: { NotFound: { description: 'not found' } },
      securitySchemes: { bearer: { type: 'http', scheme: 'bearer' } },
    },
    paths: {
      '/users': {
        get: {
          tags: ['user'],
          summary: 'ListUsers',
          responses: { '200': { content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } } },
          parameters: [{ name: 'x', in: 'header' }],
        },
        parameters: [{ name: 'path-level', in: 'query' }], // 不应被当作 HTTP 方法
      },
      '/orders': {
        get: {
          tags: ['order'],
          summary: 'GetOrder',
          responses: { '200': { description: 'ok' } },
        },
        put: {
          tags: ['order'],
          summary: 'UpdateOrder',
          responses: { '200': { description: 'ok' } },
        },
      },
    },
  } as unknown as OasDocument;
}

describe('buildApiDetailResult', () => {
  it('唯一方法时自动选择并回写 _autoSelectedMethod', () => {
    const result = buildApiDetailResult(makeOas(), '/users');
    expect(result.paths).toHaveProperty('/users.get');
    expect(result._autoSelectedMethod).toBe('GET');
  });

  it('指定方法时直接使用，不写 _autoSelectedMethod', () => {
    const result = buildApiDetailResult(makeOas(), '/orders', 'PUT');
    expect(result.paths['/orders']).toHaveProperty('put');
    expect(result._autoSelectedMethod).toBeUndefined();
  });

  it('多方法且未指定方法时报错并列出可选方法', () => {
    expect(() => buildApiDetailResult(makeOas(), '/orders')).toThrow(/GET, PUT/);
    expect(() => buildApiDetailResult(makeOas(), '/orders')).toThrow(/--method/);
  });

  it('路径不存在时报错', () => {
    expect(() => buildApiDetailResult(makeOas(), '/missing')).toThrow(/Path "\/missing" not found/);
  });

  it('路径上不存在指定方法时报错', () => {
    expect(() => buildApiDetailResult(makeOas(), '/users', 'DELETE')).toThrow(/Method DELETE does not exist/);
  });

  it('组装 components：schemas + 条件携带 responses / securitySchemes', () => {
    const result = buildApiDetailResult(makeOas(), '/users');
    expect(result.components.schemas).toHaveProperty('User');
    expect(result.components.responses).toHaveProperty('NotFound');
    expect(result.components.securitySchemes).toHaveProperty('bearer');
  });

  it('仅保留 operation 声明的 tags，空 tags 不加该字段', () => {
    const withTags = buildApiDetailResult(makeOas(), '/users');
    expect(withTags.tags).toEqual([{ name: 'user' }]);
  });

  it('顶层 servers / webhooks / security 条件携带', () => {
    const result = buildApiDetailResult(makeOas(), '/users');
    expect(result.servers).toEqual([{ url: 'https://api.example.com' }]);
    expect(result.webhooks).toHaveProperty('new');
    expect(result.security).toEqual([{ bearer: [] }]);
  });

  it('openapi / info 字段缺失时取默认值', () => {
    const oas = makeOas();
    delete oas.openapi;
    delete oas.info;
    const result = buildApiDetailResult(oas, '/users');
    expect(result.openapi).toBe('3.1.0');
    expect(result.info).toEqual({});
  });
});