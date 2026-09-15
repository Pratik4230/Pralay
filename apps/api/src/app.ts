import { registerAuthHandler, registerAuthRoutes } from "./features/auth/index.js";
import { registerMediaFeature } from "./features/media/index.js";
import { registerSystemFeature } from "./features/system/index.js";
import { registerWorkspaceFeature } from "./features/workspace/index.js";
import { createApp } from "./global/http/create-app.js";
import { registerOpenApiDoc } from "./global/http/openapi-doc.js";
import { sessionMiddleware } from "./global/middleware/session.js";

const app = createApp();

registerSystemFeature(app);
registerAuthHandler(app);

app.use("/api/v1/*", sessionMiddleware);

registerAuthRoutes(app);
registerWorkspaceFeature(app);
registerMediaFeature(app);

registerOpenApiDoc(app);

export { app };
