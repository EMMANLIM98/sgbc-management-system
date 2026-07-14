/**
 * Resend Email Service Client
 *
 * This module initializes and exports the Resend email client for sending transactional emails.
 * Resend is used as the centralized email service across the application.
 *
 * Environment Variables Required:
 * - RESEND_API_KEY: Resend API key for authentication
 */

import { Resend } from "resend";

function createResendClient() {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;

  if (!RESEND_API_KEY) {
    const message = `Missing Resend environment variable: RESEND_API_KEY`;
    console.error(`[Resend] ${message}`);
    throw new Error(message);
  }

  return new Resend(RESEND_API_KEY);
}

export const resendClient = createResendClient();
