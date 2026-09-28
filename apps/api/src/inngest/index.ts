export { inngest } from "./client.js";
export { inngestHealthCheck } from "./functions/health-check.js";
export { runGeneration } from "./functions/run-generation.js";

import { inngestHealthCheck } from "./functions/health-check.js";
import { runGeneration } from "./functions/run-generation.js";

export const inngestFunctions = [inngestHealthCheck, runGeneration];
