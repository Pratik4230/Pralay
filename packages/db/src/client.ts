import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema/index.js";

const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://pralay:pralay@localhost:5432/pralay";

const queryClient = postgres(connectionString, { max: 10 });

export const db = drizzle({ client: queryClient, schema });

export type Database = typeof db;
