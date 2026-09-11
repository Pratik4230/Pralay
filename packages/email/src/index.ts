export type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export type EmailSender = (input: SendEmailInput) => Promise<void>;

/** Logs emails to stdout — used for local development before SES is wired up. */
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
