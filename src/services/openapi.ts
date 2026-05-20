import { OasDocument } from '../types';
import { httpRequest } from '../utils/http';
import { resolveProjectId } from './project';

const APIFOX_BASE_URL = 'https://api.apifox.com/v1';

/**
 * 获取 OpenAPI 数据
 */
export async function fetchOpenAPI(projectName: string): Promise<OasDocument> {
  const token = process.env.APIFOX_ACCESS_TOKEN;
  if (!token) {
    throw new Error('[FATAL] Missing environment variable APIFOX_ACCESS_TOKEN. Please configure it and retry.');
  }

  const resolvedProjectId = resolveProjectId(projectName);
  const url = `${APIFOX_BASE_URL}/projects/${resolvedProjectId}/export-openapi?locale=zh-CN`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'X-Apifox-Api-Version': '2024-03-28',
    'Content-Type': 'application/json',
  };

  const body = {
    scope: { type: 'ALL' },
    options: {
      includeApifoxExtensionProperties: false,
      addFoldersToTags: false,
    },
    oasVersion: '3.1',
    exportFormat: 'JSON',
  };

  return httpRequest(url, { headers, body });
}
