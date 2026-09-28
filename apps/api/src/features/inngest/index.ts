import { serve } from "inngest/hono";

import { inngest, inngestFunctions } from "../../inngest/index.js";
import type { ApiApp } from "../../global/http/create-app.js";

const inngestServe = serve({
  client: inngest,
  functions: inngestFunctions,
});

/** Inngest sync + execution endpoint (no session auth). */
export function registerInngestFeature(app: ApiApp) {
  app.on(["GET", "PUT", "POST"], "/api/inngest", inngestServe);
}
