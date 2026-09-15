import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

export interface SendEmailResult {
  success: boolean;
  error?: string;
}

/// Same pattern as PrinterService: one abstraction point for "send an
/// email," backed by real SMTP when configured and a log-only simulation
/// otherwise, so the monthly summary job runs in dev/CI without real
/// mail credentials.
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  async send(to: string, subject: string, body: string): Promise<SendEmailResult> {
    const host = process.env.SMTP_HOST;
    if (!host) {
      this.logger.warn(`No SMTP_HOST configured - simulating email to ${to}\nSubject: ${subject}\n\n${body}`);
      return { success: true };
    }

    try {
      const transport = nodemailer.createTransport({
        host,
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth: process.env.SMTP_USER
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
          : undefined,
      });
      await transport.sendMail({
        from: process.env.SMTP_FROM ?? 'no-reply@bakery-md.local',
        to,
        subject,
        text: body,
      });
      return { success: true };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error sending email';
      this.logger.error(`Failed to send email to ${to}: ${error}`);
      return { success: false, error };
    }
  }
}
