export { inngest } from "./client.js";
export { inngestHealthCheck } from "./functions/health-check.js";

import { inngestHealthCheck } from "./functions/health-check.js";

export const inngestFunctions = [inngestHealthCheck];
