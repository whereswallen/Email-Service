/**
 * OpenSRS API authentication.
 * Signature = MD5(MD5(xml_body + api_key) + api_key)
 */

import { createHash } from 'crypto';

function md5(input: string): string {
  return createHash('md5').update(input).digest('hex');
}

/**
 * Generate the OpenSRS request signature.
 */
export function generateSignature(xmlBody: string, apiKey: string): string {
  return md5(md5(xmlBody + apiKey) + apiKey);
}

/**
 * Build HTTP headers for an OpenSRS API request.
 */
export function buildHeaders(xmlBody: string, apiUser: string, apiKey: string): Record<string, string> {
  return {
    'Content-Type': 'text/xml',
    'X-Username': apiUser,
    'X-Signature': generateSignature(xmlBody, apiKey),
    'Content-Length': Buffer.byteLength(xmlBody).toString(),
  };
}
