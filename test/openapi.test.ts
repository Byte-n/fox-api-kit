import { describe, expect, it } from 'vitest';
import { flattenApiTree } from '../src/services/openapi';
import { ApiTreeNode } from '../src/types';

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