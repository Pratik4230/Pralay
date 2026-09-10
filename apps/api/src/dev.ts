import { cors } from "hono/cors";

import { app } from "./app.js";
import { env } from "./config/env.js";

app.use(
  "/*",
  cors({
    origin: env.corsOrigin,
    credentials: true,
  }),
);

console.log(`Pralay API listening on http://localhost:${env.port}`);
console.log(`OpenAPI docs: http://localhost:${env.port}/docs`);

Bun.serve({
  port: env.port,
  fetch: app.fetch,
});
