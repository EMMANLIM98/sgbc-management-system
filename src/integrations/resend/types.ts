/**
 * Email Service Types and Interfaces
 *
 * Defines the structure of emails sent through the Resend service.
 */

/**
 * Base email data structure
 */
export interface EmailData {
  to: string;
  from: string;
  subject: string;
  html: string;
}

/**
 * Account Verification Email
 */
export interface AccountVerificationEmail {
  to: string;
  verificationLink: string;
  recipientName: string;
}

/**
 * Welcome Email
 */
export interface WelcomeEmail {
  to: string;
  recipientName: string;
  churchName: string;
  organizationName: string;
}

/**
 * Password Reset Email
 */
export interface PasswordResetEmail {
  to: string;
  resetLink: string;
  recipientName: string;
}

/**
 * Change Email Confirmation
 */
export interface ChangeEmailConfirmation {
  to: string;
  verificationLink: string;
  recipientName: string;
}

/**
 * Event Registration Confirmation
 */
export interface EventRegistrationConfirmation {
  to: string;
  recipientName: string;
  eventName: string;
  eventDate: string;
  eventLocation: string;
  registrationId: string;
}

/**
 * Event QR Code Delivery
 */
export interface EventQRCodeDelivery {
  to: string;
  recipientName: string;
  eventName: string;
  eventDate: string;
  qrCodeImage: string; // Base64 encoded or URL
  registrationId: string;
}

/**
 * Event Reminder
 */
export interface EventReminder {
  to: string;
  recipientName: string;
  eventName: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  registrationId: string;
  hoursUntilEvent: number;
}

/**
 * Attendance Confirmation
 */
export interface AttendanceConfirmation {
  to: string;
  recipientName: string;
  eventName: string;
  checkInTime: string;
  churchName: string;
}

/**
 * Raffle Winner Notification
 */
export interface RaffleWinnerNotification {
  to: string;
  recipientName: string;
  prizeName: string;
  eventName: string;
  claimDeadline: string;
}

/**
 * Church Announcement
 */
export interface ChurchAnnouncement {
  to: string;
  recipientName: string;
  churchName: string;
  announcementTitle: string;
  announcementBody: string;
  actionUrl?: string;
}

/**
 * Union type for all email types
 */
export type EmailType =
  | AccountVerificationEmail
  | WelcomeEmail
  | PasswordResetEmail
  | ChangeEmailConfirmation
  | EventRegistrationConfirmation
  | EventQRCodeDelivery
  | EventReminder
  | AttendanceConfirmation
  | RaffleWinnerNotification
  | ChurchAnnouncement;

/**
 * Email send result
 */
export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}
