import { app } from "./app.js";
import { env } from "./config/env.js";

console.log(`Pralay API listening on http://localhost:${env.port}`);
console.log(`OpenAPI docs: http://localhost:${env.port}/docs`);

Bun.serve({
  port: env.port,
  fetch: app.fetch,
});
