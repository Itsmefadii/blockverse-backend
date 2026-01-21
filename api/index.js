import { buildApp } from "../app.js";

let fastify;

export default async function handler(req, res) {
  if (!fastify) {
    fastify = buildApp();
    await fastify.ready();
  }

  fastify.server.emit("request", req, res);
}
