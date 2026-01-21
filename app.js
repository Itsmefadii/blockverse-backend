import Fastify from "fastify";
import cors from "@fastify/cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { allRoutes } from "./routes.js";
import { preValidate } from "./middleware/preValidate.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rawEnv = process.env.NODE_ENV?.trim() || "development";
dotenv.config({ path: path.join(__dirname, `.env.${rawEnv}`) });

export function buildApp() {
  const fastify = Fastify({ logger: true });

  fastify.register(cors, {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  });

  preValidate(fastify);

  const prefix = process.env.BASE_URL || "/api/v1";
  fastify.register(allRoutes, { prefix });

  return fastify;
}
