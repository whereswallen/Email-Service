/**
 * Domain Investing Platform -- Fastify API server.
 */

import Fastify from 'fastify';
import { loadConfig } from './lib/config';
import { closePool } from './lib/db';
import { closeRedis } from './lib/redis';

// Load config first (validates required env vars)
const config = loadConfig();

const app = Fastify({ logger: true });

// Plugins
app.register(import('@fastify/cors'), { origin: true });
app.register(import('@fastify/rate-limit'), { max: 100, timeWindow: '1 minute' });
app.register(import('./plugins/error-handler'));
app.register(import('./plugins/auth'));

// Public routes (no auth required)
app.register(import('./routes/auth'), { prefix: '/api/auth' });
app.register(import('./routes/webhooks'), { prefix: '/api/webhooks' });

// Protected routes
app.register(import('./routes/domains'), { prefix: '/api/domains' });
app.register(import('./routes/portfolio'), { prefix: '/api/portfolio' });
app.register(import('./routes/auctions'), { prefix: '/api/auctions' });
app.register(import('./routes/email'), { prefix: '/api/email' });
app.register(import('./routes/billing'), { prefix: '/api/billing' });
app.register(import('./routes/expired-domains'), { prefix: '/api/expired' });

// Health checks
app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

// Graceful shutdown
const shutdown = async () => {
  app.log.info('Shutting down...');
  await app.close();
  await closePool();
  await closeRedis();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start
app.listen({ port: config.port, host: config.host }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
});

export default app;
