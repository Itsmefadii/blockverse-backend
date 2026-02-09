import Fastify from "fastify";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { allRoutes } from "./routes.js";
import sequelize from "./config/db.js"; // just for import side-effect connection
// import { preValidate } from "./middleware/preValidate.js";
import cors from "@fastify/cors";
import { preValidate } from "./middleware/preValidate.js";
import { ethers } from "ethers";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rawEnv = process.env.NODE_ENV?.trim() || "development";
const envFile = `.env.${rawEnv}`;
dotenv.config({ path: path.join(__dirname, envFile) });

const fastify = Fastify({
  logger: true,
});

// Register CORS plugin
fastify.register(cors, {
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], 
});

preValidate(fastify);

const prefix = process.env.BASE_URL || "/api/v1";

fastify.register(allRoutes, { prefix });

const start = async () => {
  try {
    await fastify.listen({
      host: process.env.HOST || "0.0.0.0",
      port: parseInt(process.env.PORT, 10) || 3050,
    });

    console.log(`✅ Server running at http://localhost:${process.env.PORT || 3050}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

start();
