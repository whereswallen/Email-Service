/**
 * JWT authentication plugin for Fastify.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import fjwt from '@fastify/jwt';
import { getConfig } from '../lib/config';
import { AuthenticationError } from '../lib/errors';

export interface JwtPayload {
  id: string;
  email: string;
  type: 'customer' | 'investor' | 'admin';
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtPayload;
    user: JwtPayload;
  }
}

async function authPlugin(app: FastifyInstance) {
  const config = getConfig();

  app.register(fjwt, { secret: config.jwtSecret });

  app.decorate('authenticate', async function (request: FastifyRequest, reply: FastifyReply) {
    try {
      await request.jwtVerify();
    } catch {
      throw new AuthenticationError('Invalid or expired token');
    }
  });
}

export default fp(authPlugin, { name: 'auth' });
