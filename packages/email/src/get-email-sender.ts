import { consoleEmailSender } from "./console-sender.js";
import { isSesConfigured } from "./env.js";
import { createSesEmailSender } from "./ses-sender.js";
import type { EmailSender } from "./types.js";

let cachedSender: EmailSender | null = null;

export function getEmailSender(): EmailSender {
  if (!cachedSender) {
    cachedSender = isSesConfigured()
      ? createSesEmailSender()
      : consoleEmailSender;
  }

  return cachedSender;
}
