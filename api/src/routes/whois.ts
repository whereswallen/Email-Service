/**
 * WHOIS/RDAP lookup route for domain research.
 */

import { FastifyInstance } from 'fastify';
import { lookupDomain } from '../scrapers/whois-lookup';

export default async function whoisRoutes(app: FastifyInstance) {
  // Look up domain registration info via RDAP
  app.get('/:domain', async (request) => {
    const { domain } = request.params as { domain: string };
    return lookupDomain(domain);
  });
}
