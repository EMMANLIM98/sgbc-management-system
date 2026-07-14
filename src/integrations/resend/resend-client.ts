/**
 * Resend Email Service Client
 *
 * This module initializes and exports the Resend email client for sending transactional emails.
 * Resend is used as the centralized email service across the application.
 *
 * Environment Variables Required:
 * - RESEND_API_KEY: Resend API key for authentication
 *
 * When RESEND_API_KEY is not set, email sending is disabled gracefully
 * so that the rest of the application continues to function.
 */

import { Resend } from "resend";

function createResendClient(): Resend | null {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;

  if (!RESEND_API_KEY) {
    console.warn(
      "[Resend] RESEND_API_KEY not configured — email sending is disabled. " +
        "Add RESEND_API_KEY to your .env file to enable emails.",
    );
    return null;
  }

  return new Resend(RESEND_API_KEY);
}

export const resendClient = createResendClient();
