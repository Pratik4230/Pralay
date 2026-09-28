import { registerAuthHandler, registerAuthRoutes } from "./features/auth/index.js";
import { registerAssetsFeature } from "./features/assets/index.js";
import { registerAssistantFeature } from "./features/assistant/index.js";
import { registerInngestFeature } from "./features/inngest/index.js";
import { registerMediaFeature } from "./features/media/index.js";
import { registerProjectsFeature } from "./features/projects/index.js";
import { registerSystemFeature } from "./features/system/index.js";
import { registerTrashFeature } from "./features/trash/index.js";
import { registerWorkspaceFeature } from "./features/workspace/index.js";
import { createApp } from "./global/http/create-app.js";
import { registerOpenApiDoc } from "./global/http/openapi-doc.js";
import { sessionMiddleware } from "./global/middleware/session.js";

const app = createApp();

registerSystemFeature(app);
registerInngestFeature(app);
registerAuthHandler(app);

app.use("/api/v1/*", sessionMiddleware);

registerAuthRoutes(app);
registerWorkspaceFeature(app);
registerProjectsFeature(app);
registerAssistantFeature(app);
registerAssetsFeature(app);
registerMediaFeature(app);
registerTrashFeature(app);

registerOpenApiDoc(app);

export { app };
