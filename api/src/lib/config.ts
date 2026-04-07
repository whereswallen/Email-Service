/**
 * Centralized configuration loader.
 * Validates required env vars at startup, exports typed config.
 */

export interface AppConfig {
  port: number;
  host: string;
  databaseUrl: string;
  redisUrl: string;
  jwtSecret: string;
  stripeSecretKey: string;
  stripeWebhookSecret: string;
  opensrsApiUser: string;
  opensrsApiKey: string;
  opensrsApiUrl: string;
  opensrsRegistrarUrl: string;
  nodeEnv: string;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name: string, fallback: string): string {
  return process.env[name] || fallback;
}

let _config: AppConfig | null = null;

export function loadConfig(): AppConfig {
  if (_config) return _config;

  _config = {
    port: parseInt(optionalEnv('PORT', '3000'), 10),
    host: optionalEnv('HOST', '0.0.0.0'),
    databaseUrl: requireEnv('DATABASE_URL'),
    redisUrl: optionalEnv('REDIS_URL', 'redis://localhost:6379'),
    jwtSecret: requireEnv('JWT_SECRET'),
    stripeSecretKey: optionalEnv('STRIPE_SECRET_KEY', ''),
    stripeWebhookSecret: optionalEnv('STRIPE_WEBHOOK_SECRET', ''),
    opensrsApiUser: optionalEnv('OPENSRS_API_USER', ''),
    opensrsApiKey: optionalEnv('OPENSRS_API_KEY', ''),
    opensrsApiUrl: optionalEnv('OPENSRS_API_URL', 'https://admin.hostedemail.com/api'),
    opensrsRegistrarUrl: optionalEnv('OPENSRS_REGISTRAR_URL', 'https://rr-n1-tor.opensrs.net:55443'),
    nodeEnv: optionalEnv('NODE_ENV', 'development'),
  };

  return _config;
}

export function getConfig(): AppConfig {
  if (!_config) return loadConfig();
  return _config;
}
