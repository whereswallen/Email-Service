/**
 * Authentication routes -- register, login, refresh.
 */

import { FastifyInstance } from 'fastify';
import { createHash } from 'crypto';
import { CustomerRepository } from '../repositories/customer-repository';
import { getPool } from '../lib/db';
import { ValidationError, AuthenticationError, ConflictError } from '../lib/errors';

// Simple password hashing (use bcrypt/argon2 in production)
function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

export default async function authRoutes(app: FastifyInstance) {
  const customerRepo = new CustomerRepository(getPool());

  app.post('/register', async (request, reply) => {
    const { email, password, name } = request.body as { email: string; password: string; name?: string };

    if (!email || !password) throw new ValidationError('Email and password required');
    if (password.length < 8) throw new ValidationError('Password must be at least 8 characters');

    const existing = await customerRepo.findByEmail(email);
    if (existing) throw new ConflictError('Email already registered');

    const customer = await customerRepo.create({
      email,
      name: name || null,
      passwordHash: hashPassword(password),
      type: 'investor',
    } as any);

    const token = app.jwt.sign(
      { id: customer.id, email: customer.email, type: customer.type },
      { expiresIn: '7d' }
    );

    reply.status(201);
    return { token, customer: { id: customer.id, email: customer.email, name: customer.name, type: customer.type } };
  });

  app.post('/login', async (request) => {
    const { email, password } = request.body as { email: string; password: string };

    if (!email || !password) throw new ValidationError('Email and password required');

    const customer = await customerRepo.findByEmail(email);
    if (!customer || !customer.passwordHash) throw new AuthenticationError('Invalid email or password');
    if (!verifyPassword(password, customer.passwordHash)) throw new AuthenticationError('Invalid email or password');

    const token = app.jwt.sign(
      { id: customer.id, email: customer.email, type: customer.type },
      { expiresIn: '7d' }
    );

    return { token, customer: { id: customer.id, email: customer.email, name: customer.name, type: customer.type } };
  });

  app.post('/refresh', { preHandler: [app.authenticate] }, async (request) => {
    const user = request.user;
    const token = app.jwt.sign(
      { id: user.id, email: user.email, type: user.type },
      { expiresIn: '7d' }
    );
    return { token };
  });
}
