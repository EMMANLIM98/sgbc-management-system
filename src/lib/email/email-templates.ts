/**
 * Email Templates
 *
 * Reusable email templates for all email types.
 * These templates are pure functions that return HTML strings.
 * Separation of concerns: Templates are decoupled from email service implementation.
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
} from "@/integrations/resend/types";

const BRAND_COLOR = "#1F2937";
const PRIMARY_COLOR = "#3B82F6";
const TEXT_COLOR = "#374151";

/**
 * Base email wrapper with consistent styling
 */
function emailWrapper(content: string, preheader: string): string {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; color: ${TEXT_COLOR}; }
      .container { max-width: 600px; margin: 0 auto; background: white; }
      .header { background: ${BRAND_COLOR}; color: white; padding: 20px; text-align: center; }
      .content { padding: 40px 20px; }
      .footer { background: #F9FAFB; color: #6B7280; padding: 20px; text-align: center; font-size: 12px; }
      .button { display: inline-block; background: ${PRIMARY_COLOR}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; }
      h1 { color: ${BRAND_COLOR}; margin-top: 0; }
      p { margin: 15px 0; }
      .divider { height: 1px; background: #E5E7EB; margin: 20px 0; }
    </style>
  </head>
  <body>
    <div class="container">
      <span style="display:none;">${preheader}</span>
      ${content}
    </div>
  </body>
</html>`;
}

/**
 * Account Verification Email Template
 */
export function renderAccountVerificationEmail(data: AccountVerificationEmail): string {
  const content = `
    <div class="header">
      <h1>Verify Your Email</h1>
    </div>
    <div class="content">
      <p>Hi ${data.recipientName},</p>
      <p>Welcome to our Church Management System! To complete your registration, please verify your email address by clicking the button below:</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${data.verificationLink}" class="button">Verify Email Address</a>
      </p>
      <p>This link will expire in 24 hours.</p>
      <p>If you didn't create this account, you can safely ignore this email.</p>
    </div>
    <div class="footer">
      <p>&copy; 2026 Church Management System. All rights reserved.</p>
    </div>
  `;
  return emailWrapper(content, "Verify your email address");
}

/**
 * Welcome Email Template
 */
export function renderWelcomeEmail(data: WelcomeEmail): string {
  const content = `
    <div class="header">
      <h1>Welcome!</h1>
    </div>
    <div class="content">
      <p>Hi ${data.recipientName},</p>
      <p>Welcome to the Church Management System! Your account has been successfully created for:</p>
      <p style="font-weight: bold; font-size: 16px;">
        ${data.churchName}
      </p>
      <p>Organization: ${data.organizationName}</p>
      <p>You're now ready to use all the features of our system, including member management, finance tracking, event registration, and more.</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="https://app.sgbcmanagement.com/dashboard" class="button">Go to Dashboard</a>
      </p>
      <p>If you have any questions, please don't hesitate to contact our support team.</p>
    </div>
    <div class="footer">
      <p>&copy; 2026 Church Management System. All rights reserved.</p>
    </div>
  `;
  return emailWrapper(content, "Welcome to Church Management System");
}

/**
 * Password Reset Email Template
 */
export function renderPasswordResetEmail(data: PasswordResetEmail): string {
  const content = `
    <div class="header">
      <h1>Reset Your Password</h1>
    </div>
    <div class="content">
      <p>Hi ${data.recipientName},</p>
      <p>We received a request to reset your password. Click the button below to create a new password:</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${data.resetLink}" class="button">Reset Password</a>
      </p>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.</p>
    </div>
    <div class="footer">
      <p>&copy; 2026 Church Management System. All rights reserved.</p>
    </div>
  `;
  return emailWrapper(content, "Reset your password");
}

/**
 * Change Email Confirmation Template
 */
export function renderChangeEmailConfirmation(data: ChangeEmailConfirmation): string {
  const content = `
    <div class="header">
      <h1>Confirm Email Change</h1>
    </div>
    <div class="content">
      <p>Hi ${data.recipientName},</p>
      <p>We received a request to change your account email address. Click the link below to confirm:</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${data.verificationLink}" class="button">Confirm Email Change</a>
      </p>
      <p>This link will expire in 24 hours.</p>
      <p>If you didn't request this change, please ignore this email and your account will remain unchanged.</p>
    </div>
    <div class="footer">
      <p>&copy; 2026 Church Management System. All rights reserved.</p>
    </div>
  `;
  return emailWrapper(content, "Confirm email change");
}

/**
 * Event Registration Confirmation Template
 */
export function renderEventRegistrationConfirmation(data: EventRegistrationConfirmation): string {
  const content = `
    <div class="header">
      <h1>Event Registration Confirmed</h1>
    </div>
    <div class="content">
      <p>Hi ${data.recipientName},</p>
      <p>Your registration for the following event has been confirmed:</p>
      <div class="divider"></div>
      <p><strong>${data.eventName}</strong></p>
      <p>📅 Date: ${data.eventDate}</p>
      <p>📍 Location: ${data.eventLocation}</p>
      <p>Registration ID: ${data.registrationId}</p>
      <div class="divider"></div>
      <p>You will receive a QR code shortly that you can use for check-in at the event.</p>
      <p>Thank you for registering!</p>
    </div>
    <div class="footer">
      <p>&copy; 2026 Church Management System. All rights reserved.</p>
    </div>
  `;
  return emailWrapper(content, "Event registration confirmed");
}

/**
 * Event QR Code Delivery Template
 */
export function renderEventQRCodeDelivery(data: EventQRCodeDelivery): string {
  const content = `
    <div class="header">
      <h1>Your Event QR Code</h1>
    </div>
    <div class="content">
      <p>Hi ${data.recipientName},</p>
      <p>Your QR code for the event is ready. Please display it at check-in:</p>
      <div style="text-align: center; margin: 30px 0;">
        <img src="${data.qrCodeImage}" alt="Event QR Code" style="max-width: 200px; height: auto;" />
      </div>
      <p><strong>${data.eventName}</strong></p>
      <p>📅 ${data.eventDate}</p>
      <p>Registration ID: ${data.registrationId}</p>
      <p style="color: #DC2626; font-weight: bold;">⚠️ Do not share this QR code with others. It is unique to your registration.</p>
    </div>
    <div class="footer">
      <p>&copy; 2026 Church Management System. All rights reserved.</p>
    </div>
  `;
  return emailWrapper(content, "Your event QR code is ready");
}

/**
 * Event Reminder Template
 */
export function renderEventReminder(data: EventReminder): string {
  const content = `
    <div class="header">
      <h1>Upcoming Event Reminder</h1>
    </div>
    <div class="content">
      <p>Hi ${data.recipientName},</p>
      <p>This is a friendly reminder that your registered event is coming up soon!</p>
      <div class="divider"></div>
      <p><strong>${data.eventName}</strong></p>
      <p>📅 ${data.eventDate} at ${data.eventTime}</p>
      <p>📍 ${data.eventLocation}</p>
      <div class="divider"></div>
      <p>The event starts in approximately <strong>${data.hoursUntilEvent} hours</strong>.</p>
      <p>Please make sure to have your QR code ready for check-in.</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="https://app.sgbcmanagement.com/events/${data.registrationId}" class="button">View Event Details</a>
      </p>
    </div>
    <div class="footer">
      <p>&copy; 2026 Church Management System. All rights reserved.</p>
    </div>
  `;
  return emailWrapper(content, "Event reminder: " + data.eventName);
}

/**
 * Attendance Confirmation Template
 */
export function renderAttendanceConfirmation(data: AttendanceConfirmation): string {
  const content = `
    <div class="header">
      <h1>Check-in Confirmed</h1>
    </div>
    <div class="content">
      <p>Hi ${data.recipientName},</p>
      <p>Your attendance has been recorded:</p>
      <div class="divider"></div>
      <p><strong>${data.eventName}</strong></p>
      <p>✓ Checked in at ${data.checkInTime}</p>
      <p>🏢 ${data.churchName}</p>
      <div class="divider"></div>
      <p>Thank you for attending!</p>
    </div>
    <div class="footer">
      <p>&copy; 2026 Church Management System. All rights reserved.</p>
    </div>
  `;
  return emailWrapper(content, "Your attendance has been confirmed");
}

/**
 * Raffle Winner Notification Template
 */
export function renderRaffleWinnerNotification(data: RaffleWinnerNotification): string {
  const content = `
    <div class="header">
      <h1>🎉 Congratulations!</h1>
    </div>
    <div class="content">
      <p>Hi ${data.recipientName},</p>
      <p>Great news! You are a winner in the raffle draw from <strong>${data.eventName}</strong>!</p>
      <div class="divider"></div>
      <p style="font-size: 18px; font-weight: bold; color: ${PRIMARY_COLOR};">Prize: ${data.prizeName}</p>
      <div class="divider"></div>
      <p>Please claim your prize by <strong>${data.claimDeadline}</strong>.</p>
      <p>Contact the event organizer or visit the office to claim your prize.</p>
      <p style="color: #666;">Congratulations again!</p>
    </div>
    <div class="footer">
      <p>&copy; 2026 Church Management System. All rights reserved.</p>
    </div>
  `;
  return emailWrapper(content, "You won a prize!");
}

/**
 * Church Announcement Template
 */
export function renderChurchAnnouncement(data: ChurchAnnouncement): string {
  const actionButton = data.actionUrl
    ? `<p style="text-align: center; margin: 30px 0;"><a href="${data.actionUrl}" class="button">Learn More</a></p>`
    : "";

  const content = `
    <div class="header">
      <h1>${data.announcementTitle}</h1>
    </div>
    <div class="content">
      <p>Hi ${data.recipientName},</p>
      <div class="divider"></div>
      <div>${data.announcementBody}</div>
      <div class="divider"></div>
      ${actionButton}
      <p style="color: #666; font-size: 14px;">From: ${data.churchName}</p>
    </div>
    <div class="footer">
      <p>&copy; 2026 Church Management System. All rights reserved.</p>
    </div>
  `;
  return emailWrapper(content, data.announcementTitle);
}
