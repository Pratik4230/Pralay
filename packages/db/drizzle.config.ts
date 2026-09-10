import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = dirname(fileURLToPath(import.meta.url));

config({ path: resolve(packageRoot, "../../.env") });

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://pralay:pralay@localhost:5432/pralay";

export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
