import type { EmailSender } from "./types.js";

/** Logs emails to stdout when SES is not configured. */
export const consoleEmailSender: EmailSender = async (input) => {
  console.log("\n--- Pralay email (dev) ---");
  console.log(`To: ${input.to}`);
  console.log(`Subject: ${input.subject}`);
  console.log(input.text);
  if (input.html) {
    console.log(`HTML: ${input.html}`);
  }
  console.log("--- end email ---\n");
};
