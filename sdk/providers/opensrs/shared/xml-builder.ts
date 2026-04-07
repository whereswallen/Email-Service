/**
 * OpenSRS XML request/response builder.
 * Shared by both the email API (admin.hostedemail.com) and the registrar API (rr-n1-tor.opensrs.net).
 *
 * OpenSRS uses a proprietary XML format with OPS_envelope containing dt_assoc/dt_array structures.
 */

export interface OpenSRSRequest {
  action: string;
  object: string;
  attributes: Record<string, unknown>;
}

export interface OpenSRSResponse {
  success: boolean;
  responseCode: number;
  responseText: string;
  attributes: Record<string, unknown>;
}

/**
 * Encode a value into OpenSRS dt_assoc/dt_array XML format.
 */
function encodeValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return escapeXml(String(value));
  }

  if (Array.isArray(value)) {
    const items = value
      .map((item, i) => `<item key="${i}">${encodeValue(item)}</item>`)
      .join('');
    return `<dt_array>${items}</dt_array>`;
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => `<item key="${escapeXml(k)}">${encodeValue(v)}</item>`)
      .join('');
    return `<dt_assoc>${entries}</dt_assoc>`;
  }

  return escapeXml(String(value));
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Build an OpenSRS XML request envelope.
 */
export function buildXmlRequest(request: OpenSRSRequest): string {
  const attributesXml = Object.entries(request.attributes)
    .map(([key, value]) => `<item key="${escapeXml(key)}">${encodeValue(value)}</item>`)
    .join('');

  return `<?xml version='1.0' encoding='UTF-8' standalone='no'?>
<!DOCTYPE OPS_envelope SYSTEM 'ops.dtd'>
<OPS_envelope>
  <header><version>0.9</version></header>
  <body>
    <data_block>
      <dt_assoc>
        <item key="protocol">XCP</item>
        <item key="action">${escapeXml(request.action)}</item>
        <item key="object">${escapeXml(request.object)}</item>
        <item key="attributes">
          <dt_assoc>
            ${attributesXml}
          </dt_assoc>
        </item>
      </dt_assoc>
    </data_block>
  </body>
</OPS_envelope>`;
}

/**
 * Parse an OpenSRS XML response.
 * Uses simple regex parsing -- the response format is predictable enough
 * that a full XML parser isn't necessary for our use case.
 */
export function parseXmlResponse(xml: string): OpenSRSResponse {
  const responseCodeMatch = xml.match(/<item key="response_code">(\d+)<\/item>/);
  const responseTextMatch = xml.match(/<item key="response_text">([^<]*)<\/item>/);
  const isSuccessMatch = xml.match(/<item key="is_success">(\d)<\/item>/);

  const responseCode = responseCodeMatch ? parseInt(responseCodeMatch[1], 10) : -1;
  const responseText = responseTextMatch ? responseTextMatch[1] : 'Unknown error';
  const success = isSuccessMatch ? isSuccessMatch[1] === '1' : responseCode === 200;

  const attributes = parseAttributes(xml);

  return {
    success,
    responseCode,
    responseText,
    attributes,
  };
}

/**
 * Extract key-value attributes from the response XML.
 */
function parseAttributes(xml: string): Record<string, unknown> {
  const attrs: Record<string, unknown> = {};

  // Extract the attributes section
  const attrMatch = xml.match(/<item key="attributes">\s*<dt_assoc>([\s\S]*?)<\/dt_assoc>\s*<\/item>/);
  if (!attrMatch) return attrs;

  const attrBlock = attrMatch[1];
  const itemRegex = /<item key="([^"]*)">((?:(?!<item key=)[\s\S])*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(attrBlock)) !== null) {
    const key = match[1];
    const value = match[2].trim();

    if (value.includes('<dt_assoc>') || value.includes('<dt_array>')) {
      attrs[key] = value; // Leave complex structures as XML strings for now
    } else {
      attrs[key] = value;
    }
  }

  return attrs;
}
