import { swaggerUI } from "@hono/swagger-ui";

import type { ApiApp } from "./create-app.js";

export function registerOpenApiDoc(app: ApiApp) {
  app.doc("/openapi.json", {
    openapi: "3.1.0",
    info: {
      title: "Pralay API",
      version: "0.1.0",
      description: "Pralay creative platform API",
    },
    servers: [
      {
        url: "http://localhost:3001",
        description: "Local development",
      },
    ],
  });

  app.get("/docs", swaggerUI({ url: "/openapi.json" }));
}
