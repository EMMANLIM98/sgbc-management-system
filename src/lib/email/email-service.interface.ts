/**
 * Email Service Interface
 *
 * Abstract interface for email sending functionality.
 * Allows switching between different email providers without changing application code.
 * Implements Dependency Inversion Principle from SOLID.
 */

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

/**
 * IEmailService
 *
 * Defines the contract for email sending operations.
 * All email-related operations must go through this interface.
 * Only the Application layer should invoke email service methods.
 */
export interface IEmailService {
  /**
   * Send account verification email
   * Used during user registration/email change verification
   */
  sendAccountVerification(data: AccountVerificationEmail): Promise<EmailSendResult>;

  /**
   * Send welcome email
   * Used after successful registration/signup
   */
  sendWelcome(data: WelcomeEmail): Promise<EmailSendResult>;

  /**
   * Send password reset email
   * Used in password reset flow
   */
  sendPasswordReset(data: PasswordResetEmail): Promise<EmailSendResult>;

  /**
   * Send change email confirmation
   * Used when user changes email address
   */
  sendChangeEmailConfirmation(data: ChangeEmailConfirmation): Promise<EmailSendResult>;

  /**
   * Send event registration confirmation
   * Used after successful event registration
   */
  sendEventRegistrationConfirmation(data: EventRegistrationConfirmation): Promise<EmailSendResult>;

  /**
   * Send event QR code
   * Used to deliver QR code to registered attendee
   */
  sendEventQRCode(data: EventQRCodeDelivery): Promise<EmailSendResult>;

  /**
   * Send event reminder
   * Used to remind attendees of upcoming events (scheduled)
   */
  sendEventReminder(data: EventReminder): Promise<EmailSendResult>;

  /**
   * Send attendance confirmation
   * Used to confirm check-in at event
   */
  sendAttendanceConfirmation(data: AttendanceConfirmation): Promise<EmailSendResult>;

  /**
   * Send raffle winner notification
   * Used to notify raffle winners
   */
  sendRaffleWinnerNotification(data: RaffleWinnerNotification): Promise<EmailSendResult>;

  /**
   * Send church announcement
   * Used for general church communications
   */
  sendChurchAnnouncement(data: ChurchAnnouncement): Promise<EmailSendResult>;

  /**
   * Send bulk email
   * Used for mass communications (newsletters, announcements)
   * @param recipients List of email addresses
   * @param subject Email subject
   * @param html Email HTML body
   */
  sendBulk(recipients: string[], subject: string, html: string): Promise<EmailSendResult[]>;
}
