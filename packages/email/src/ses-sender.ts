import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

import { emailEnv } from "./env.js";
import type { EmailSender } from "./types.js";

export function createSesEmailSender(): EmailSender {
  const client = new SESClient({ region: emailEnv.region });
  const fromEmail = emailEnv.fromEmail!;

  return async (input) => {
    await client.send(
      new SendEmailCommand({
        Source: `${emailEnv.fromName} <${fromEmail}>`,
        Destination: {
          ToAddresses: [input.to],
        },
        Message: {
          Subject: { Data: input.subject, Charset: "UTF-8" },
          Body: {
            Text: { Data: input.text, Charset: "UTF-8" },
            ...(input.html
              ? { Html: { Data: input.html, Charset: "UTF-8" } }
              : {}),
          },
        },
      }),
    );
  };
}
