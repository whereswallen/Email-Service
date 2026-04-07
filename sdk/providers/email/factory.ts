/**
 * Email provider factory -- creates the appropriate provider based on config.
 */

import { EmailProviderConfig, EmailProviderType } from '../../types/index';
import { EmailProvider } from './interface';
import { OpenSRSEmailProvider } from './opensrs/index';
import { MailcowEmailProvider } from './mailcow/index';

export function createEmailProvider(config?: EmailProviderConfig): EmailProvider {
  const type: EmailProviderType = config?.type
    || (process.env.EMAIL_PROVIDER as EmailProviderType)
    || 'opensrs';

  switch (type) {
    case 'opensrs':
      return new OpenSRSEmailProvider({
        apiUser: config?.opensrs?.apiUser || process.env.OPENSRS_API_USER || '',
        apiKey: config?.opensrs?.apiKey || process.env.OPENSRS_API_KEY || '',
        apiUrl: config?.opensrs?.apiUrl || process.env.OPENSRS_API_URL || 'https://admin.hostedemail.com/api',
      });

    case 'mailcow':
      return new MailcowEmailProvider({
        apiUrl: config?.mailcow?.apiUrl || process.env.MAILCOW_API_URL || '',
        apiKey: config?.mailcow?.apiKey || process.env.MAILCOW_API_KEY || '',
      });

    default:
      throw new Error(`Unknown email provider type: ${type}`);
  }
}
