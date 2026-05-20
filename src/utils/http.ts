import https from 'https';
import { HttpOptions, OasDocument } from '../types';

/**
 * 发送 HTTPS 请求
 */
export function httpRequest(url: string, options: HttpOptions = {}): Promise<OasDocument> {
  const { body, headers } = options;
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method: 'POST', headers }, (res) => {
      let data = '';
      res.on('data', (chunk: string) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            resolve(JSON.parse(data) as OasDocument);
          } catch (e) {
            reject(new Error(`[FATAL] Failed to parse response JSON: ${(e as Error).message}`));
          }
        } else {
          const truncated = data.length > 500 ? data.slice(0, 500) + '...' : data;
          reject(new Error(`[FATAL] HTTP ${res.statusCode}: ${truncated}`));
        }
      });
    });

    req.on('error', reject);
    if (body !== undefined) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}
