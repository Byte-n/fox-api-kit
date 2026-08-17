import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const httpMocks = vi.hoisted(() => ({ httpRequest: vi.fn() }));
vi.mock('../src/utils/http', () => httpMocks);

const projectMocks = vi.hoisted(() => ({ resolveProjectId: vi.fn() }));
vi.mock('../src/services/project', () => projectMocks);

import {
  fetchApiTree,
  fetchHttpApis,
  fetchOpenAPI,
  fetchOpenAPIByProjectId,
  flattenApiTree,
} from '../src/services/openapi';
import { httpRequest } from '../src/utils/http';
import { APIFOX_BASE_URL, APIFOX_CLIENT_VERSION, APIFOX_CRUD_BASE_URL } from '../src/utils/apifox';
import { ApiTreeNode, OasDocument } from '../src/types';

const mockedHttpRequest = vi.mocked(httpRequest);

describe('flattenApiTree', () => {
  const tree: ApiTreeNode[] = [
    {
      key: 'folder-1',
      type: 'apiDetailFolder',
      name: '用户模块',
      children: [
        {
          key: 'api-1',
          type: 'apiDetail',
          name: 'GetUser',
          api: { id: 1, name: 'GetUser', method: 'GET', path: '/users/{id}' },
        },
        {
          key: 'folder-2',
          type: 'apiDetailFolder',
          name: '子模块',
          children: [
            {
              key: 'api-2',
              type: 'apiDetail',
              name: 'PostUser',
              api: { id: 2, name: 'PostUser', method: 'POST', path: '/users' },
            },
          ],
        },
      ],
    },
    {
      key: 'case-1',
      type: 'apiCase',
      name: '用例',
      api: { id: 3, name: 'CaseApi', method: 'GET', path: '/case' },
    },
  ];

  it('深度优先提取 apiDetail 节点，跳过文件夹与用例节点', () => {
    const apis = flattenApiTree(tree);
    expect(apis).toEqual([
      { id: 1, name: 'GetUser', method: 'GET', path: '/users/{id}' },
      { id: 2, name: 'PostUser', method: 'POST', path: '/users' },
    ]);
  });

  it('apiDetail 缺 api 字段时跳过该节点', () => {
    const apis = flattenApiTree([{ key: 'x', type: 'apiDetail', name: 'no-api' }]);
    expect(apis).toEqual([]);
  });

  it('空树返回空数组', () => {
    expect(flattenApiTree([])).toEqual([]);
  });
});
describe('fetchApiTree', () => {
  beforeEach(() => {
    process.env.APIFOX_ACCESS_TOKEN = 'test-token';
    mockedHttpRequest.mockReset();
  });

  afterEach(() => {
    delete process.env.APIFOX_ACCESS_TOKEN;
  });

  it('请求内部接口 api-tree-list 并返回 data 节点', async () => {
    const tree: ApiTreeNode[] = [{ key: '1', type: 'apiDetail', name: 'x', api: { id: 1, name: 'GetUser', method: 'GET', path: '/users' } }];
    mockedHttpRequest.mockResolvedValue({ success: true, data: tree });

    const result = await fetchApiTree('1');

    expect(result).toBe(tree);
    expect(mockedHttpRequest).toHaveBeenCalledWith(
      `${APIFOX_CRUD_BASE_URL}/projects/1/api-tree-list?locale=zh-CN`,
      { method: 'GET', headers: { Authorization: 'Bearer test-token', 'x-client-version': APIFOX_CLIENT_VERSION }, retries: 1 }
    );
  });

  it('data 缺失时兜底为空数组', async () => {
    mockedHttpRequest.mockResolvedValue({ success: true });
    expect(await fetchApiTree('1')).toEqual([]);
  });

  it('缺少 access token 时抛错', async () => {
    delete process.env.APIFOX_ACCESS_TOKEN;
    await expect(fetchApiTree('1')).rejects.toThrow(/APIFOX_ACCESS_TOKEN/);
  });
});

describe('fetchHttpApis', () => {
  beforeEach(() => {
    process.env.APIFOX_ACCESS_TOKEN = 'test-token';
    mockedHttpRequest.mockReset();
  });

  afterEach(() => {
    delete process.env.APIFOX_ACCESS_TOKEN;
  });

  it('请求官方 CRUD 接口 http-apis 并返回 data', async () => {
    mockedHttpRequest.mockResolvedValue({ success: true, data: [{ id: 2, name: 'PostUser', method: 'POST', path: '/users' }] });

    const result = await fetchHttpApis('1');

    expect(result).toEqual([{ id: 2, name: 'PostUser', method: 'POST', path: '/users' }]);
    expect(mockedHttpRequest).toHaveBeenCalledWith(
      `${APIFOX_CRUD_BASE_URL}/projects/1/http-apis`,
      expect.objectContaining({ method: 'GET', retries: 1 })
    );
  });

  it('data 缺失时兜底为数组字面量本身', async () => {
    const raw = [{ id: 3, name: 'DelUser', method: 'DELETE', path: '/users/{id}' }];
    mockedHttpRequest.mockResolvedValue(raw);
    expect(await fetchHttpApis('1')).toBe(raw);
  });
});

describe('fetchOpenAPIByProjectId', () => {
  beforeEach(() => {
    process.env.APIFOX_ACCESS_TOKEN = 'test-token';
    mockedHttpRequest.mockReset();
  });

  afterEach(() => {
    delete process.env.APIFOX_ACCESS_TOKEN;
  });

  it('请求官方 export-openapi（/v1 前缀、POST、携带导出 body）', async () => {
    const oas = { openapi: '3.1.0', info: { title: 't' }, paths: {} };
    mockedHttpRequest.mockResolvedValue(oas);

    const result = await fetchOpenAPIByProjectId('42');

    expect(result).toBe(oas);
    const [url, options] = mockedHttpRequest.mock.calls[0];
    expect(url).toBe(`${APIFOX_BASE_URL}/projects/42/export-openapi?locale=zh-CN`);
    // method 由 httpRequest 内部默认 POST（此处调用未显式指定）
    expect(options.body).toMatchObject({ scope: { type: 'ALL' }, exportFormat: 'JSON' });
  });
});

describe('fetchOpenAPI', () => {
  beforeEach(() => {
    process.env.APIFOX_ACCESS_TOKEN = 'test-token';
    mockedHttpRequest.mockReset();
    projectMocks.resolveProjectId.mockReset();
  });

  afterEach(() => {
    delete process.env.APIFOX_ACCESS_TOKEN;
  });

  it('先解析项目 ID 再导出 OpenAPI', async () => {
    projectMocks.resolveProjectId.mockResolvedValue('42');
    const oas = { openapi: '3.1.0', info: { title: 't' }, paths: {} } as unknown as OasDocument;
    mockedHttpRequest.mockResolvedValue(oas);

    const result = await fetchOpenAPI('proj-name');

    expect(projectMocks.resolveProjectId).toHaveBeenCalledWith('proj-name');
    expect(result).toBe(oas);
    expect(mockedHttpRequest.mock.calls[0][0]).toBe(`${APIFOX_BASE_URL}/projects/42/export-openapi?locale=zh-CN`);
  });
});
