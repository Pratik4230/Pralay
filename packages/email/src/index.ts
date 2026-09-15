export type { EmailSender, SendEmailInput } from "./types.js";
export { consoleEmailSender } from "./console-sender.js";
export { createSesEmailSender } from "./ses-sender.js";
export { emailEnv, isSesConfigured } from "./env.js";
export { getEmailSender } from "./get-email-sender.js";
