import https from 'https';
import { HttpOptions } from '../types';

/**
 * 发送 HTTPS 请求。
 * 对 429（限流）响应按 retries 次数退避重试，避免聚合多项目时被官方 API 限流。
 */
export function httpRequest<T = unknown>(url: string, options: HttpOptions = {}): Promise<T> {
  const { body, headers, method = 'POST', retries = 0, retryDelayMs = 1000 } = options;

  const attempt = (remaining: number): Promise<T> => {
    return new Promise((resolve, reject) => {
      const req = https.request(url, { method, headers }, (res) => {
        let data = '';
        res.on('data', (chunk: string) => (data += chunk));
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              resolve(JSON.parse(data) as T);
            } catch (e) {
              reject(new Error(`[FATAL] Failed to parse response JSON: ${(e as Error).message}`));
            }
          } else if (res.statusCode === 429 && remaining > 0) {
            setTimeout(() => attempt(remaining - 1), retryDelayMs);
          } else {
            const truncated = data.length > 500 ? data.slice(0, 500) + '...' : data;
            reject(new Error(`[FATAL] HTTP ${url} ${res.statusCode}: ${truncated}`));
          }
        });
      });

      req.on('error', reject);
      if (body !== undefined) {
        req.write(JSON.stringify(body));
      }
      req.end();
    });
  };

  return attempt(retries);
}
