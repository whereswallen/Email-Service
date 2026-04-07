/**
 * Shared HTTP transport for OpenSRS APIs.
 */

import * as https from 'https';
import { URL } from 'url';
import { buildHeaders } from './auth';
import { OpenSRSResponse, parseXmlResponse } from './xml-builder';

export interface OpenSRSHttpConfig {
  apiUser: string;
  apiKey: string;
  apiUrl: string;
}

/**
 * Send an XML request to an OpenSRS API endpoint.
 */
export async function sendRequest(
  config: OpenSRSHttpConfig,
  xmlBody: string
): Promise<OpenSRSResponse> {
  const url = new URL(config.apiUrl);
  const headers = buildHeaders(xmlBody, config.apiUser, config.apiKey);

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname,
        method: 'POST',
        headers,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
        res.on('end', () => {
          try {
            const parsed = parseXmlResponse(data);
            resolve(parsed);
          } catch (err) {
            reject(new Error(`Failed to parse OpenSRS response: ${err}`));
          }
        });
      }
    );

    req.on('error', reject);
    req.write(xmlBody);
    req.end();
  });
}
