import { describe, expect, it } from 'vitest';
import { collectRefs, extractModule, resolveAllRefs, resolveRef } from '../src/utils/oas';
import { OasDocument } from '../src/types';

describe('extractModule', () => {
  it('无路径层级时为 other', () => {
    expect(extractModule('/health')).toBe('other');
  });

  it('api 前缀（非 v3）取第三段为模块', () => {
    expect(extractModule('/api/v1/users')).toBe('api.users');
  });

  it('api/v3 前缀取第四段为模块', () => {
    expect(extractModule('/api/v3/config/users')).toBe('api.users');
    expect(extractModule('/api/v3/config/orders')).toBe('api.orders');
  });

  it('rpc 前缀按第二段取模块', () => {
    expect(extractModule('/rpc/order_service/Create')).toBe('rpc.order_service');
  });

  it('未知前缀返回 other', () => {
    expect(extractModule('/unknown/path/test')).toBe('other');
  });
});

describe('collectRefs', () => {
  it('收集嵌套对象中的全部 $ref', () => {
    const node = {
      a: { $ref: '#/components/schemas/A' },
      b: [{ $ref: '#/components/schemas/B' }, { c: { $ref: '#/components/schemas/C' } }],
    };
    const refs = collectRefs(node);
    expect([...refs].sort()).toEqual([
      '#/components/schemas/A',
      '#/components/schemas/B',
      '#/components/schemas/C',
    ]);
  });

  it('无 $ref 时返回空集', () => {
    expect(collectRefs({ a: 1, b: 'x' }).size).toBe(0);
  });
});

describe('resolveRef', () => {
  const oas = {
    components: { schemas: { User: { type: 'object' }, Nested: { props: { id: { type: 'string' } } } } },
  } as unknown as OasDocument;

  it('解析 #/components/schemas/User', () => {
    expect(resolveRef(oas, '#/components/schemas/User')).toEqual({ type: 'object' });
  });

  it('嵌套引用路径可正常解析', () => {
    expect(resolveRef(oas, '#/components/schemas/Nested/props/id')).toEqual({ type: 'string' });
  });

  it('不存在的引用返回 undefined', () => {
    expect(resolveRef(oas, '#/components/schemas/Missing')).toBeUndefined();
  });
});

describe('resolveAllRefs', () => {
  const oas = {
    components: {
      schemas: {
        User: {
          type: 'object',
          properties: { address: { $ref: '#/components/schemas/Address' } },
        },
        Address: { type: 'object', properties: { city: { type: 'string' } } },
        // @ts-expect-error 循环引用仅用于测试循环保护
        Self: { type: 'object', properties: { self: { $ref: '#/components/schemas/Self' } } },
      },
    },
  } as unknown as OasDocument;

  it('解析嵌套引用并以 schema 名作 key', () => {
    const sources = [{ $ref: '#/components/schemas/User' }];
    const result = resolveAllRefs(oas, sources);
    expect(Object.keys(result).sort()).toEqual(['Address', 'User']);
    expect(result.User).toMatchObject({ type: 'object' });
    expect(result.Address.properties.city.type).toBe('string');
  });

  it('仅解析被引用的 schema', () => {
    const sources = [{ $ref: '#/components/schemas/Address' }];
    const result = resolveAllRefs(oas, sources);
    expect(Object.keys(result)).toEqual(['Address']);
  });

  it('循环引用不会死循环', () => {
    const sources = [{ $ref: '#/components/schemas/Self' }];
    expect(() => resolveAllRefs(oas, sources)).not.toThrow();
    const result = resolveAllRefs(oas, sources);
    expect(result.Self.properties.self.$ref).toBe('#/components/schemas/Self');
  });

  it('引用不存在的 schema 时抛错', () => {
    const sources = [{ $ref: '#/components/schemas/Missing' }];
    expect(() => resolveAllRefs(oas, sources)).toThrow(/non-existent schema/);
  });
});