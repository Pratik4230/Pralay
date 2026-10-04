import type { ApiApp } from "../../global/http/create-app.js";
import {
  createProjectAssistantThreadController,
  deleteProjectAssistantThreadController,
  listProjectAssistantMessagesController,
  listProjectAssistantThreadsController,
  sendProjectAssistantMessageController,
  streamProjectAssistantMessageController,
  submitProjectAssistantMessageController,
} from "./controllers/project-assistant.controller.js";
import {
  createProjectAssistantThreadRoute,
  deleteProjectAssistantThreadRoute,
  listProjectAssistantMessagesRoute,
  listProjectAssistantThreadsRoute,
  sendProjectAssistantMessageRoute,
} from "./routes/project-assistant.route.js";

export function registerAssistantFeature(app: ApiApp) {
  app.openapi(
    listProjectAssistantThreadsRoute,
    listProjectAssistantThreadsController,
  );
  app.openapi(
    createProjectAssistantThreadRoute,
    createProjectAssistantThreadController,
  );
  app.openapi(
    deleteProjectAssistantThreadRoute,
    deleteProjectAssistantThreadController,
  );
  app.openapi(
    listProjectAssistantMessagesRoute,
    listProjectAssistantMessagesController,
  );
  app.openapi(
    sendProjectAssistantMessageRoute,
    sendProjectAssistantMessageController,
  );
  app.post(
    "/api/v1/workspaces/:id/projects/:projectId/assistant/messages/stream",
    streamProjectAssistantMessageController,
  );
  app.post(
    "/api/v1/workspaces/:id/projects/:projectId/assistant/messages/submit",
    submitProjectAssistantMessageController,
  );
}
