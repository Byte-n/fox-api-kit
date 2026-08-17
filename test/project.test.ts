import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/utils/http', () => ({ httpRequest: vi.fn() }));

import { httpRequest } from '../src/utils/http';
import { fetchAccessibleProjects, resolveProjectId } from '../src/services/project';
import { AccessibleProject, ApifoxProject, ApifoxTeam } from '../src/types';

const mockedHttpRequest = vi.mocked(httpRequest);

function teamsRsp(teams: ApifoxTeam[]) {
  return { success: true, data: teams };
}

function projectsRsp(projects: ApifoxProject[]) {
  return { success: true, data: projects };
}

describe('fetchAccessibleProjects', () => {
  beforeEach(() => {
    process.env.APIFOX_ACCESS_TOKEN = 'test-token';
  });

  afterEach(() => {
    delete process.env.APIFOX_ACCESS_TOKEN;
    vi.clearAllMocks();
  });

  it('跨团队聚合项目并携带 teamName', async () => {
    mockedHttpRequest
      .mockResolvedValueOnce(teamsRsp([
        { id: 1, name: '团队A' },
        { id: 2, name: '团队B' },
      ]))
      .mockResolvedValueOnce(projectsRsp([
        { id: 11, teamId: 1, name: 'proj-a' },
        { id: 12, teamId: 1, name: 'proj-b' },
      ]))
      .mockResolvedValueOnce(projectsRsp([{ id: 21, teamId: 2, name: 'proj-c' }]));

    const projects: AccessibleProject[] = await fetchAccessibleProjects();

    expect(projects).toEqual([
      { id: 11, name: 'proj-a', teamId: 1, teamName: '团队A' },
      { id: 12, name: 'proj-b', teamId: 1, teamName: '团队A' },
      { id: 21, name: 'proj-c', teamId: 2, teamName: '团队B' },
    ]);
  });

  it('无团队时返回空数组', async () => {
    mockedHttpRequest.mockResolvedValueOnce(teamsRsp([]));
    expect(await fetchAccessibleProjects()).toEqual([]);
  });

  it('团队项目响应缺失 data 字段时跳过（?? 兜底）', async () => {
    mockedHttpRequest
      .mockResolvedValueOnce(teamsRsp([{ id: 1, name: '团队A' }]))
      .mockResolvedValueOnce({ success: true });
    expect(await fetchAccessibleProjects()).toEqual([]);
  });

  it('缺少 access token 时抛错', async () => {
    delete process.env.APIFOX_ACCESS_TOKEN;
    await expect(fetchAccessibleProjects()).rejects.toThrow(/APIFOX_ACCESS_TOKEN/);
  });
});

describe('resolveProjectId', () => {
  beforeEach(() => {
    process.env.APIFOX_ACCESS_TOKEN = 'test-token';
  });

  afterEach(() => {
    delete process.env.APIFOX_ACCESS_TOKEN;
    vi.clearAllMocks();
  });

  it('仅一个可访问项目时自动使用该项目，无需指定名称', async () => {
    mockedHttpRequest
      .mockResolvedValueOnce(teamsRsp([{ id: 1, name: '团队A' }]))
      .mockResolvedValueOnce(projectsRsp([{ id: 42, teamId: 1, name: 'my-project' }]));

    expect(await resolveProjectId()).toBe('42');
  });

  it('多项目且未指定名称时抛错并列出可用项目', async () => {
    mockedHttpRequest
      .mockResolvedValueOnce(teamsRsp([{ id: 1, name: '团队A' }]))
      .mockResolvedValueOnce(projectsRsp([
        { id: 11, teamId: 1, name: 'proj-a' },
        { id: 12, teamId: 1, name: 'proj-b' },
      ]));

    await expect(resolveProjectId()).rejects.toThrow(/proj-a, proj-b/);
  });

  it('多项目按名称匹配返回对应 ID', async () => {
    mockedHttpRequest
      .mockResolvedValueOnce(teamsRsp([{ id: 1, name: '团队A' }]))
      .mockResolvedValueOnce(projectsRsp([
        { id: 11, teamId: 1, name: 'proj-a' },
        { id: 12, teamId: 1, name: 'proj-b' },
      ]));

    expect(await resolveProjectId('proj-b')).toBe('12');
  });

  it('多项目名称不匹配时抛错并列出可选项目', async () => {
    mockedHttpRequest
      .mockResolvedValueOnce(teamsRsp([{ id: 1, name: '团队A' }]))
      .mockResolvedValueOnce(projectsRsp([
        { id: 11, teamId: 1, name: 'proj-a' },
        { id: 12, teamId: 1, name: 'proj-b' },
      ]));

    await expect(resolveProjectId('missing')).rejects.toThrow(/Project "missing" not found/);
  });
});