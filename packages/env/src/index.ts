/** Shared runtime environment (NODE_ENV). Use across packages instead of ad hoc env flags. */

export const nodeEnv = process.env.NODE_ENV ?? "development";

export const isProduction = nodeEnv === "production";

export const isDevelopment = nodeEnv === "development";

export const isTest = nodeEnv === "test";
