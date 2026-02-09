import { Sequelize } from "sequelize";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rawEnv = process.env.NODE_ENV?.trim() || "development";
const envFile = `.env.${rawEnv}`;
const envPath = path.join(__dirname, "../", envFile);

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log(`Loaded environment from: ${envFile}`);
} else {
  console.warn(`Env file not found: ${envFile}`);
}

const sequelize = new Sequelize(
  process.env.DATABASE,
  process.env.DBUSER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DBHOST,
    port: process.env.DBPORT,
    dialect: process.env.DIALECT || "mysql",
    logging: true,
    pool: { max: 40, min: 0, acquire: 60000, idle: 10000 },
  }
);

try {
  await sequelize.authenticate();
  console.log("✅ Database connection established.");
} catch (err) {
  console.error("❌ DB connection failed:", err.message);
   process.exit(1);
}

export default sequelize;
