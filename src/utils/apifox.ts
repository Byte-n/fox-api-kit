/**
 * Apifox 开放 API 公共配置
 *
 * 注意：2024-03-28 版本中两类端点的前缀不一致（实测验证）：
 * - 原始开放 API（teams/projects/export-openapi 等）挂在 /v1 下；
 * - 接口 CRUD（http-apis）等挂在 /api/v1 下，使用 /v1 前缀会返回 302。
 */
export const APIFOX_BASE_URL = 'https://api.apifox.com/v1';
export const APIFOX_CRUD_BASE_URL = 'https://api.apifox.com/api/v1';

/**
 * Web 控制台内部接口（api-tree-list）要求的固定客户端版本头。
 * 实测值不参与校验（任意字符串均可），仅要求该头存在；此处固定一个真实客户端版本值。
 */
export const APIFOX_CLIENT_VERSION = '2.8.43-alpha.1';

/**
 * 构造 Apifox 开放 API 请求头（含鉴权）
 */
export function buildApifoxHeaders(): Record<string, string> {
  const token = process.env.APIFOX_ACCESS_TOKEN;
  if (!token) {
    throw new Error('[FATAL] Missing environment variable APIFOX_ACCESS_TOKEN. Please configure it and retry.');
  }
  return {
    Authorization: `Bearer ${token}`,
    'X-Apifox-Api-Version': '2024-03-28',
    'Content-Type': 'application/json',
  };
}
