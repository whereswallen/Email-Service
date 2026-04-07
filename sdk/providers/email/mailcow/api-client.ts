/**
 * Mailcow REST API HTTP client.
 */

import * as https from 'https';
import { URL } from 'url';

export class MailcowApiClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.apiKey = apiKey;
  }

  async get(path: string): Promise<Record<string, unknown>> {
    return this.request('GET', path);
  }

  async post(path: string, body: unknown): Promise<Record<string, unknown>> {
    return this.request('POST', path, body);
  }

  private async request(method: string, path: string, body?: unknown): Promise<Record<string, unknown>> {
    const url = new URL(path, this.baseUrl);
    const bodyStr = body ? JSON.stringify(body) : undefined;

    return new Promise((resolve, reject) => {
      const req = https.request(
        {
          hostname: url.hostname,
          port: url.port || 443,
          path: url.pathname,
          method,
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': this.apiKey,
            ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr).toString() } : {}),
          },
        },
        (res) => {
          let data = '';
          res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
          res.on('end', () => {
            try {
              const parsed = JSON.parse(data);
              if (res.statusCode && res.statusCode >= 400) {
                reject(new Error(`Mailcow API ${res.statusCode}: ${data}`));
              } else {
                resolve(parsed);
              }
            } catch {
              reject(new Error(`Invalid JSON from Mailcow API: ${data.slice(0, 200)}`));
            }
          });
        }
      );

      req.on('error', reject);
      if (bodyStr) req.write(bodyStr);
      req.end();
    });
  }
}
