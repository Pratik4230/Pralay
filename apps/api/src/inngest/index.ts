export { inngest } from "./client.js";
export { inngestHealthCheck } from "./functions/health-check.js";
export { runGeneration } from "./functions/run-generation.js";
export { runAssistantTurn } from "./functions/run-assistant-turn.js";

import { inngestHealthCheck } from "./functions/health-check.js";
import { runGeneration } from "./functions/run-generation.js";
import { runAssistantTurn } from "./functions/run-assistant-turn.js";

export const inngestFunctions = [inngestHealthCheck, runGeneration, runAssistantTurn];
