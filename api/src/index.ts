/**
 * Domain & Email Platform -- Fastify API server.
 */

import Fastify from 'fastify';

const app = Fastify({ logger: true });

// Plugins
app.register(import('@fastify/cors'), { origin: true });
app.register(import('@fastify/rate-limit'), { max: 100, timeWindow: '1 minute' });

// Routes
app.register(import('./routes/domains'), { prefix: '/api/domains' });
app.register(import('./routes/portfolio'), { prefix: '/api/portfolio' });
app.register(import('./routes/auctions'), { prefix: '/api/auctions' });
app.register(import('./routes/email'), { prefix: '/api/email' });
app.register(import('./routes/billing'), { prefix: '/api/billing' });
app.register(import('./routes/webhooks'), { prefix: '/api/webhooks' });

// Health check
app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

app.listen({ port: PORT, host: HOST }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
});

export default app;
