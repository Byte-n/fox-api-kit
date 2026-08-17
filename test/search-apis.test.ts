import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Command } from 'commander';
import { OasDocument } from '../src/types';

const mocks = vi.hoisted(() => ({
  fetchApiTree: vi.fn(),
  fetchHttpApis: vi.fn(),
  fetchOpenAPIByProjectId: vi.fn(),
  flattenApiTree: vi.fn((tree: unknown) => tree as never),
}));

vi.mock('../src/services/openapi', () => mocks);

const projectMocks = vi.hoisted(() => ({
  fetchAccessibleProjects: vi.fn(),
}));

vi.mock('../src/services/project', () => projectMocks);

import { extractApisFromOas, fetchProjectApis, filterProjectsByName, groupHitsByTeam, hit, searchApisCommand } from '../src/commands/search-apis';
import { AccessibleProject, ApiTreeNode, SearchHit } from '../src/types';

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

describe('groupHitsByTeam', () => {
  it('按 team > project > api 嵌套分组并带去重与计数', () => {
    const hits: SearchHit[] = [
      { projectId: 11, projectName: 'proj-a', teamId: 1, teamName: '团队A', id: 101, method: 'GET', path: '/users', name: 'GetUser' },
      { projectId: 12, projectName: 'proj-b', teamId: 1, teamName: '团队A', id: 201, method: 'POST', path: '/orders', name: 'CreateOrder' },
      { projectId: 11, projectName: 'proj-a', teamId: 1, teamName: '团队A', id: 102, method: 'GET', path: '/users/{id}', name: 'GetUserDetail' },
      { projectId: 21, projectName: 'proj-c', teamId: 2, teamName: '团队B', id: 301, method: 'GET', path: '/health', name: 'Health' },
    ];

    const { total, teams } = groupHitsByTeam(hits);

    expect(total).toBe(4);
    expect(teams).toHaveLength(2);

    const [teamA, teamB] = teams;
    expect(teamA.teamId).toBe(1);
    expect(teamA.teamName).toBe('团队A');
    expect(teamA.projectCount).toBe(2);
    expect(teamA.projects).toHaveLength(2);

    const projA = teamA.projects.find((p) => p.projectId === 11)!;
    expect(projA.projectName).toBe('proj-a');
    expect(projA.apiCount).toBe(2);
    // api 项去除 team/project 冗余字段
    expect(projA.apis[0]).toEqual({ id: 101, method: 'GET', path: '/users', name: 'GetUser' });
    expect(projA.apis[1].name).toBe('GetUserDetail');

    expect(teamB.projects[0].projectName).toBe('proj-c');
    expect(teamB.projects[0].apiCount).toBe(1);
  });

  it('零命中时返回空的 teams 结构', () => {
    const { total, teams } = groupHitsByTeam([]);
    expect(total).toBe(0);
    expect(teams).toEqual([]);
  });
});

describe('filterProjectsByName', () => {
  const projects: AccessibleProject[] = [
    { id: 11, name: 'proj-a', teamId: 1, teamName: '团队A' },
    { id: 12, name: 'proj-b', teamId: 1, teamName: '团队A' },
    { id: 21, name: 'proj-a', teamId: 2, teamName: '团队B' }, // 跨团队同名
  ];

  it('未指定名称时原样返回全部项目', () => {
    expect(filterProjectsByName(projects)).toBe(projects);
  });

  it('指定名称时仅保留名称完全匹配的项目（跨团队同名一并保留）', () => {
    const matched = filterProjectsByName(projects, 'proj-a');
    expect(matched).toHaveLength(2);
    expect(matched.map((p) => p.id)).toEqual([11, 21]);
  });

  it('指定名称但无匹配项时抛错并列出可用项目名', () => {
    expect(() => filterProjectsByName(projects, 'missing')).toThrow(
      /Project "missing" not found.*Available projects: .*proj-b/
    );
  });

  it('指定名称但可访问项目为空时抛错', () => {
    expect(() => filterProjectsByName([], 'missing')).toThrow(/Project "missing" not found/);
  });
});

describe('searchApisCommand action 端到端', () => {
  beforeEach(() => {
    projectMocks.fetchAccessibleProjects.mockReset();
    mocks.fetchApiTree.mockReset();
    // 模拟真实 flattenApiTree：apiDetail 节点映射为 {id,name,method,path}
    mocks.flattenApiTree.mockImplementation((tree: ApiTreeNode[]) =>
      (tree as ApiTreeNode[]).flatMap((node) =>
        node.type === 'apiDetail' && node.api
          ? [{ id: node.api.id, name: node.api.name, method: node.api.method, path: node.api.path }]
          : []
      )
    );
  });

  it('跨项目拉取接口索引、聚合搜索并输出嵌套 JSON', async () => {
    const projects: AccessibleProject[] = [{ id: 11, name: 'proj-a', teamId: 1, teamName: '团队A' }];
    projectMocks.fetchAccessibleProjects.mockResolvedValue(projects);
    mocks.fetchApiTree.mockResolvedValue([
      { key: '1', type: 'apiDetail', name: 'GetUser', api: { id: 1, name: 'GetUser', method: 'GET', path: '/users' } },
      { key: '2', type: 'apiDetail', name: 'CreateOrder', api: { id: 2, name: 'CreateOrder', method: 'POST', path: '/orders' } },
    ]);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const root = new Command('fox-api-kit').addCommand(searchApisCommand);
    root.parse(['node', 'test', 'search-apis', '-k', 'user']);
    // commander 异步 action 在微任务链结束后完成，用一个宏任务收尾
    await new Promise((r) => setTimeout(r, 0));

    const printed = JSON.parse(logSpy.mock.calls.at(-1)![0] as string);
    expect(printed.keyword).toBe('user');
    expect(printed.total).toBe(1);
    expect(printed.teams[0]).toMatchObject({
      teamId: 1,
      teamName: '团队A',
      projectCount: 1,
      projects: [{ projectId: 11, projectName: 'proj-a', apiCount: 1 }],
    });
    expect(printed.teams[0].projects[0].apis).toEqual([{ id: 1, method: 'GET', path: '/users', name: 'GetUser' }]);
    logSpy.mockRestore();
  });

  it('keyword 同时匹配路径时计入命中', async () => {
    const projects: AccessibleProject[] = [{ id: 11, name: 'proj-a', teamId: 1, teamName: '团队A' }];
    projectMocks.fetchAccessibleProjects.mockResolvedValue(projects);
    mocks.fetchApiTree.mockResolvedValue([
      { key: '1', type: 'apiDetail', name: 'GetUser', api: { id: 1, name: 'GetUser', method: 'GET', path: '/users' } },
    ]);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const root = new Command('fox-api-kit').addCommand(searchApisCommand);
    root.parse(['node', 'test', 'search-apis', '-k', 'users']);
    await new Promise((r) => setTimeout(r, 0));

    const printed = JSON.parse(logSpy.mock.calls.at(-1)![0] as string);
    expect(printed.total).toBe(1);
    logSpy.mockRestore();
  });

  it('某项目拉取全部失败时 WARN 跳过该项目并继续，项目间留 sleep 间隔', async () => {
    const projects: AccessibleProject[] = [
      { id: 11, name: 'proj-ok', teamId: 1, teamName: '团队A' },
      { id: 12, name: 'proj-bad', teamId: 1, teamName: '团队A' },
    ];
    projectMocks.fetchAccessibleProjects.mockResolvedValue(projects);
    // 项目 11 正常 -> 触发项目间 sleep；项目 12：三级数据源全部失败 -> WARN
    mocks.fetchApiTree
      .mockResolvedValueOnce([
        { key: '1', type: 'apiDetail', name: 'GetUser', api: { id: 1, name: 'GetUser', method: 'GET', path: '/users' } },
      ])
      .mockRejectedValueOnce(new Error('tree fail'));
    mocks.fetchHttpApis.mockRejectedValue(new Error('http fail'));
    mocks.fetchOpenAPIByProjectId.mockRejectedValue(new Error('export fail'));

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const root = new Command('fox-api-kit').addCommand(searchApisCommand);
    root.parse(['node', 'test', 'search-apis', '-k', 'user']);
    await new Promise((r) => setTimeout(r, 200)); // 覆盖项目间 sleep(100)

    const printed = JSON.parse(logSpy.mock.calls.at(-1)![0] as string);
    expect(printed.total).toBe(1);
    expect(printed.teams[0].projects[0].projectId).toBe(11);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('[WARN] 拉取项目「proj-bad」'));
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('传入 -p 时仅在指定项目内检索，其余项目不参与拉取', async () => {
    const projects: AccessibleProject[] = [
      { id: 11, name: 'proj-a', teamId: 1, teamName: '团队A' },
      { id: 12, name: 'proj-b', teamId: 1, teamName: '团队A' },
    ];
    projectMocks.fetchAccessibleProjects.mockResolvedValue(projects);
    // 两个项目均存在匹配 'user' 的接口，用以证明结果差异源于过滤而非关键字
    mocks.fetchApiTree.mockImplementation((id: string) => {
      if (id === '11') {
        return Promise.resolve([
          { key: '1', type: 'apiDetail', name: 'GetUser', api: { id: 1, name: 'GetUser', method: 'GET', path: '/users' } },
        ]);
      }
      return Promise.resolve([
        { key: '2', type: 'apiDetail', name: 'GetUser', api: { id: 2, name: 'GetUser', method: 'POST', path: '/users' } },
      ]);
    });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const root = new Command('fox-api-kit').addCommand(searchApisCommand);
    root.parse(['node', 'test', 'search-apis', '-k', 'user', '-p', 'proj-b']);
    await new Promise((r) => setTimeout(r, 0));

    const printed = JSON.parse(logSpy.mock.calls.at(-1)![0] as string);
    expect(printed.total).toBe(1);
    expect(printed.teams[0].projects[0]).toMatchObject({ projectId: 12, projectName: 'proj-b' });
    expect(printed.teams[0].projects[0].apis).toEqual([{ id: 2, method: 'POST', path: '/users', name: 'GetUser' }]);
    // 仅拉取了被指定的项目，另一项目被过滤
    expect(mocks.fetchApiTree).toHaveBeenCalledTimes(1);
    expect(mocks.fetchApiTree).toHaveBeenCalledWith('12');
    logSpy.mockRestore();
  });

  it('传入 -p 但项目名不存在时抛错并列出可用项目', async () => {
    const projects: AccessibleProject[] = [
      { id: 11, name: 'proj-a', teamId: 1, teamName: '团队A' },
      { id: 12, name: 'proj-b', teamId: 1, teamName: '团队A' },
    ];
    projectMocks.fetchAccessibleProjects.mockResolvedValue(projects);

    const root = new Command('fox-api-kit').addCommand(searchApisCommand);
    await expect(
      root.parseAsync(['node', 'test', 'search-apis', '-k', 'user', '-p', 'missing'])
    ).rejects.toThrow(/Project "missing" not found.*Available projects/);
  });
});