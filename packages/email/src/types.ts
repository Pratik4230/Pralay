export type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export type EmailSender = (input: SendEmailInput) => Promise<void>;
