import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { ZodError } from "zod";
import { fail } from "../lib/envelope.js";

async function errorHandlerPlugin(app: FastifyInstance) {
  app.setErrorHandler((error, req, reply) => {
    if (error instanceof ZodError) {
      const detail = error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      return reply.code(400).send(fail(`Validation failed — ${detail}`));
    }
    const statusCode = "statusCode" in error && typeof error.statusCode === "number" ? error.statusCode : 500;
    if (statusCode >= 500) {
      req.log.error({ err: error, url: req.url }, "Unhandled error");
      return reply.code(statusCode).send(fail("An unexpected error occurred. Please try again."));
    }
    return reply.code(statusCode).send(fail(error.message));
  });

  app.setNotFoundHandler((_req, reply) => {
    reply.code(404).send(fail("Not found"));
  });
}

export default fp(errorHandlerPlugin, { name: "error-handler" });
