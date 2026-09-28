import type { ApiApp } from "../../global/http/create-app.js";
import {
  createProjectAssistantThreadController,
  listProjectAssistantMessagesController,
  listProjectAssistantThreadsController,
  sendProjectAssistantMessageController,
} from "./controllers/project-assistant.controller.js";
import {
  createProjectAssistantThreadRoute,
  listProjectAssistantMessagesRoute,
  listProjectAssistantThreadsRoute,
  sendProjectAssistantMessageRoute,
} from "./routes/project-assistant.route.js";

export function registerAssistantFeature(app: ApiApp) {
  app.openapi(listProjectAssistantThreadsRoute, listProjectAssistantThreadsController);
  app.openapi(createProjectAssistantThreadRoute, createProjectAssistantThreadController);
  app.openapi(listProjectAssistantMessagesRoute, listProjectAssistantMessagesController);
  app.openapi(sendProjectAssistantMessageRoute, sendProjectAssistantMessageController);
}
