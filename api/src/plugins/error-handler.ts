/**
 * Global error handler plugin for Fastify.
 */

import { FastifyInstance, FastifyError } from 'fastify';
import fp from 'fastify-plugin';
import { AppError } from '../lib/errors';

async function errorHandlerPlugin(app: FastifyInstance) {
  app.setErrorHandler((error: FastifyError | AppError, request, reply) => {
    // Handle our custom AppError subclasses
    if (error instanceof AppError) {
      request.log.warn({ err: error, code: error.code }, error.message);
      return reply.status(error.statusCode).send({
        error: true,
        code: error.code,
        message: error.message,
      });
    }

    // Handle Fastify validation errors
    if (error.validation) {
      return reply.status(400).send({
        error: true,
        code: 'VALIDATION_ERROR',
        message: error.message,
        details: error.validation,
      });
    }

    // Handle unexpected errors
    request.log.error({ err: error }, 'Unhandled error');
    return reply.status(500).send({
      error: true,
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  });
}

export default fp(errorHandlerPlugin, { name: 'error-handler' });
