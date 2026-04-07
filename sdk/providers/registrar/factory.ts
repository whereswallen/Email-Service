/**
 * Registrar provider factory.
 */

import { RegistrarProviderConfig, RegistrarType } from '../../types/index';
import { RegistrarProvider } from './interface';
import { OpenSRSRegistrarProvider } from './opensrs/index';

export function createRegistrarProvider(config?: RegistrarProviderConfig): RegistrarProvider {
  const type: RegistrarType = config?.type
    || (process.env.REGISTRAR_PROVIDER as RegistrarType)
    || 'opensrs';

  switch (type) {
    case 'opensrs':
      return new OpenSRSRegistrarProvider({
        apiUser: config?.opensrs?.apiUser || process.env.OPENSRS_REGISTRAR_USER || process.env.OPENSRS_API_USER || '',
        apiKey: config?.opensrs?.apiKey || process.env.OPENSRS_REGISTRAR_KEY || process.env.OPENSRS_API_KEY || '',
        apiUrl: config?.opensrs?.apiUrl || process.env.OPENSRS_REGISTRAR_URL || 'https://rr-n1-tor.opensrs.net:55443',
      });

    default:
      throw new Error(`Unknown registrar type: ${type}`);
  }
}
