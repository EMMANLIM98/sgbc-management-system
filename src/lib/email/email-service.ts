/**
 * Email Service Implementation
 *
 * Concrete implementation of IEmailService using Resend as the provider.
 * Handles sending of all email types with proper error handling and logging.
 *
 * Architecture Layer: Infrastructure
 * This service should only be invoked from the Application layer.
 */

import { IEmailService } from "@/lib/email/email-service.interface";
import {
  renderAccountVerificationEmail,
  renderWelcomeEmail,
  renderPasswordResetEmail,
  renderChangeEmailConfirmation,
  renderEventRegistrationConfirmation,
  renderEventQRCodeDelivery,
  renderEventReminder,
  renderAttendanceConfirmation,
  renderRaffleWinnerNotification,
  renderChurchAnnouncement,
} from "@/lib/email/email-templates";
import { resendClient } from "@/integrations/resend/resend-client";
import type {
  AccountVerificationEmail,
  WelcomeEmail,
  PasswordResetEmail,
  ChangeEmailConfirmation,
  EventRegistrationConfirmation,
  EventQRCodeDelivery,
  EventReminder,
  AttendanceConfirmation,
  RaffleWinnerNotification,
  ChurchAnnouncement,
  EmailSendResult,
} from "@/integrations/resend/types";

// Default sender email
const DEFAULT_FROM_EMAIL = process.env.EMAIL_FROM_ADDRESS || "noreply@sgbcmanagement.com";

/**
 * ResendEmailService
 *
 * Production email service implementation using Resend.
 * Provides methods for sending all types of transactional and bulk emails.
 */
export class ResendEmailService implements IEmailService {
  private fromEmail: string;

  constructor(fromEmail: string = DEFAULT_FROM_EMAIL) {
    this.fromEmail = fromEmail;
  }

  /** Throws a descriptive error if Resend is not configured; caught by each method's try/catch */
  private get mailer() {
    if (!resendClient) {
      throw new Error(
        "Email service not configured. Add RESEND_API_KEY to your .env file to enable email sending.",
      );
    }
    return resendClient;
  }

  async sendAccountVerification(data: AccountVerificationEmail): Promise<EmailSendResult> {
    try {
      const html = renderAccountVerificationEmail(data);
      const result = await this.mailer.emails.send({
        from: this.fromEmail,
        to: data.to,
        subject: "Verify Your Email Address",
        html,
      });

      if (result.error) {
        console.error("[EmailService] Account verification send failed:", result.error);
        return { success: false, error: result.error.message };
      }

      console.log("[EmailService] Account verification sent to:", data.to);
      return { success: true, messageId: result.data?.id };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("[EmailService] Account verification error:", message);
      return { success: false, error: message };
    }
  }

  async sendWelcome(data: WelcomeEmail): Promise<EmailSendResult> {
    try {
      const html = renderWelcomeEmail(data);
      const result = await this.mailer.emails.send({
        from: this.fromEmail,
        to: data.to,
        subject: "Welcome to Church Management System",
        html,
      });

      if (result.error) {
        console.error("[EmailService] Welcome send failed:", result.error);
        return { success: false, error: result.error.message };
      }

      console.log("[EmailService] Welcome email sent to:", data.to);
      return { success: true, messageId: result.data?.id };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("[EmailService] Welcome error:", message);
      return { success: false, error: message };
    }
  }

  async sendPasswordReset(data: PasswordResetEmail): Promise<EmailSendResult> {
    try {
      const html = renderPasswordResetEmail(data);
      const result = await this.mailer.emails.send({
        from: this.fromEmail,
        to: data.to,
        subject: "Reset Your Password",
        html,
      });

      if (result.error) {
        console.error("[EmailService] Password reset send failed:", result.error);
        return { success: false, error: result.error.message };
      }

      console.log("[EmailService] Password reset email sent to:", data.to);
      return { success: true, messageId: result.data?.id };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("[EmailService] Password reset error:", message);
      return { success: false, error: message };
    }
  }

  async sendChangeEmailConfirmation(data: ChangeEmailConfirmation): Promise<EmailSendResult> {
    try {
      const html = renderChangeEmailConfirmation(data);
      const result = await this.mailer.emails.send({
        from: this.fromEmail,
        to: data.to,
        subject: "Confirm Your Email Change",
        html,
      });

      if (result.error) {
        console.error("[EmailService] Change email send failed:", result.error);
        return { success: false, error: result.error.message };
      }

      console.log("[EmailService] Change email confirmation sent to:", data.to);
      return { success: true, messageId: result.data?.id };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("[EmailService] Change email error:", message);
      return { success: false, error: message };
    }
  }

  async sendEventRegistrationConfirmation(
    data: EventRegistrationConfirmation,
  ): Promise<EmailSendResult> {
    try {
      const html = renderEventRegistrationConfirmation(data);
      const result = await this.mailer.emails.send({
        from: this.fromEmail,
        to: data.to,
        subject: `Event Registration Confirmed: ${data.eventName}`,
        html,
      });

      if (result.error) {
        console.error("[EmailService] Event registration send failed:", result.error);
        return { success: false, error: result.error.message };
      }

      console.log("[EmailService] Event registration confirmation sent to:", data.to);
      return { success: true, messageId: result.data?.id };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("[EmailService] Event registration error:", message);
      return { success: false, error: message };
    }
  }

  async sendEventQRCode(data: EventQRCodeDelivery): Promise<EmailSendResult> {
    try {
      const html = renderEventQRCodeDelivery(data);
      const result = await this.mailer.emails.send({
        from: this.fromEmail,
        to: data.to,
        subject: `Your QR Code: ${data.eventName}`,
        html,
      });

      if (result.error) {
        console.error("[EmailService] Event QR code send failed:", result.error);
        return { success: false, error: result.error.message };
      }

      console.log("[EmailService] Event QR code sent to:", data.to);
      return { success: true, messageId: result.data?.id };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("[EmailService] Event QR code error:", message);
      return { success: false, error: message };
    }
  }

  async sendEventReminder(data: EventReminder): Promise<EmailSendResult> {
    try {
      const html = renderEventReminder(data);
      const result = await this.mailer.emails.send({
        from: this.fromEmail,
        to: data.to,
        subject: `Reminder: ${data.eventName}`,
        html,
      });

      if (result.error) {
        console.error("[EmailService] Event reminder send failed:", result.error);
        return { success: false, error: result.error.message };
      }

      console.log("[EmailService] Event reminder sent to:", data.to);
      return { success: true, messageId: result.data?.id };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("[EmailService] Event reminder error:", message);
      return { success: false, error: message };
    }
  }

  async sendAttendanceConfirmation(data: AttendanceConfirmation): Promise<EmailSendResult> {
    try {
      const html = renderAttendanceConfirmation(data);
      const result = await this.mailer.emails.send({
        from: this.fromEmail,
        to: data.to,
        subject: `Check-in Confirmed: ${data.eventName}`,
        html,
      });

      if (result.error) {
        console.error("[EmailService] Attendance confirmation send failed:", result.error);
        return { success: false, error: result.error.message };
      }

      console.log("[EmailService] Attendance confirmation sent to:", data.to);
      return { success: true, messageId: result.data?.id };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("[EmailService] Attendance confirmation error:", message);
      return { success: false, error: message };
    }
  }

  async sendRaffleWinnerNotification(data: RaffleWinnerNotification): Promise<EmailSendResult> {
    try {
      const html = renderRaffleWinnerNotification(data);
      const result = await this.mailer.emails.send({
        from: this.fromEmail,
        to: data.to,
        subject: `🎉 You Won a Prize!`,
        html,
      });

      if (result.error) {
        console.error("[EmailService] Raffle winner send failed:", result.error);
        return { success: false, error: result.error.message };
      }

      console.log("[EmailService] Raffle winner notification sent to:", data.to);
      return { success: true, messageId: result.data?.id };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("[EmailService] Raffle winner error:", message);
      return { success: false, error: message };
    }
  }

  async sendChurchAnnouncement(data: ChurchAnnouncement): Promise<EmailSendResult> {
    try {
      const html = renderChurchAnnouncement(data);
      const result = await this.mailer.emails.send({
        from: this.fromEmail,
        to: data.to,
        subject: data.announcementTitle,
        html,
      });

      if (result.error) {
        console.error("[EmailService] Church announcement send failed:", result.error);
        return { success: false, error: result.error.message };
      }

      console.log("[EmailService] Church announcement sent to:", data.to);
      return { success: true, messageId: result.data?.id };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("[EmailService] Church announcement error:", message);
      return { success: false, error: message };
    }
  }

  async sendBulk(recipients: string[], subject: string, html: string): Promise<EmailSendResult[]> {
    try {
      const promises = recipients.map((to) =>
        this.mailer.emails.send({
          from: this.fromEmail,
          to,
          subject,
          html,
        }),
      );

      const results = await Promise.all(promises);
      const sendResults = results.map((result) =>
        result.error
          ? { success: false, error: result.error.message }
          : { success: true, messageId: result.data?.id },
      );

      console.log("[EmailService] Bulk email sent to:", recipients.length, "recipients");
      return sendResults;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("[EmailService] Bulk send error:", message);
      return recipients.map(() => ({ success: false, error: message }));
    }
  }
}

/**
 * Export default instance
 */
export const emailService = new ResendEmailService();

