import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OasDocument } from '../src/types';

const mocks = vi.hoisted(() => ({
  fetchApiTree: vi.fn(),
  fetchHttpApis: vi.fn(),
  fetchOpenAPIByProjectId: vi.fn(),
  flattenApiTree: vi.fn((tree: unknown) => tree as never),
}));

vi.mock('../src/services/openapi', () => mocks);

import { extractApisFromOas, fetchProjectApis, hit } from '../src/commands/search-apis';

describe('hit', () => {
  const api = { id: 1, name: 'GetUserList', method: 'GET', path: '/api/v1/users' };

  it('关键字匹配名称（不区分大小写）', () => {
    expect(hit(api, 'user')).toBe(true);
    expect(hit(api, 'GETUSERLIST')).toBe(true);
  });

  it('关键字匹配路径', () => {
    expect(hit(api, '/api/v1/users')).toBe(true);
    expect(hit(api, 'users')).toBe(true);
  });

  it('关键字与方法均不匹配时返回 false', () => {
    expect(hit(api, 'nonexistent')).toBe(false);
  });

  it('method 过滤：匹配则命中，不匹配则排除', () => {
    expect(hit(api, 'user', 'GET')).toBe(true);
    expect(hit(api, 'user', 'get')).toBe(true);
    expect(hit(api, 'user', 'POST')).toBe(false);
  });
});

describe('extractApisFromOas', () => {
  const oas = {
    paths: {
      '/api/v1/users': {
        get: { summary: 'GetUserList' },
        post: { summary: 'CreateUser' },
        parameters: [{ name: 'x', in: 'header' }],
      },
      '/api/v1/orders/{id}': {
        put: {},
      },
    },
  } as unknown as OasDocument;

  it('提取全部接口，id 置 0 标记来源为 export-openapi', () => {
    const apis = extractApisFromOas(oas);
    expect(apis).toHaveLength(3);
    for (const a of apis) {
      expect(a.id).toBe(0);
    }
    expect(apis[0]).toEqual({ id: 0, name: 'GetUserList', method: 'GET', path: '/api/v1/users' });
  });

  it('跳过非 HTTP 方法的路径项（如 parameters）', () => {
    expect(extractApisFromOas(oas).length).toBe(3);
  });

  it('无 summary 时 name 为空字符串', () => {
    const apis = extractApisFromOas(oas);
    expect(apis.find((a) => a.path === '/api/v1/orders/{id}')).toEqual({
      id: 0,
      name: '',
      method: 'PUT',
      path: '/api/v1/orders/{id}',
    });
  });

  it('无 paths 时返回空数组', () => {
    expect(extractApisFromOas({} as OasDocument)).toEqual([]);
  });
});

describe('fetchProjectApis 三级回退链', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('api-tree-list 成功时直接使用其扁平化结果，不再调用后续数据源', async () => {
    const tree = [{ key: '1', type: 'apiDetail', name: 'x', api: { id: 1, name: 'GetUser', method: 'GET', path: '/users' } }];
    mocks.fetchApiTree.mockResolvedValue(tree);

    const apis = await fetchProjectApis('1');

    expect(apis).toBe(tree); // flattenApiTree 被 mock 为恒等函数
    expect(mocks.fetchHttpApis).not.toHaveBeenCalled();
    expect(mocks.fetchOpenAPIByProjectId).not.toHaveBeenCalled();
  });

  it('api-tree-list 失败时回退到 http-apis', async () => {
    mocks.fetchApiTree.mockRejectedValue(new Error('tree failed'));
    mocks.fetchHttpApis.mockResolvedValue([{ id: 2, name: 'PostUser', method: 'POST', path: '/users' }]);

    const apis = await fetchProjectApis('1');

    expect(apis).toEqual([{ id: 2, name: 'PostUser', method: 'POST', path: '/users' }]);
    expect(mocks.fetchOpenAPIByProjectId).not.toHaveBeenCalled();
  });

  it('前两级均失败时回退到 export-openapi', async () => {
    mocks.fetchApiTree.mockRejectedValue(new Error('tree failed'));
    mocks.fetchHttpApis.mockRejectedValue(new Error('http-apis failed'));
    mocks.fetchOpenAPIByProjectId.mockResolvedValue({
      paths: { '/users': { get: { summary: 'GetUser' } } },
    } as unknown as OasDocument);

    const apis = await fetchProjectApis('1');

    expect(apis).toEqual([{ id: 0, name: 'GetUser', method: 'GET', path: '/users' }]);
  });

  it('全部数据源失败时抛出最后一次错误', async () => {
    mocks.fetchApiTree.mockRejectedValue(new Error('tree failed'));
    mocks.fetchHttpApis.mockRejectedValue(new Error('http-apis failed'));
    mocks.fetchOpenAPIByProjectId.mockRejectedValue(new Error('export failed'));

    await expect(fetchProjectApis('1')).rejects.toThrow('export failed');
  });
});