# Supabase Email Configuration Guide

The signup flow is now properly handling errors, but Supabase needs to be configured to send confirmation emails.

## Why Emails Aren't Being Sent

When you call `supabase.auth.signUp()`, Supabase automatically attempts to send a confirmation email. If this isn't happening, it's likely due to:

1. **SMTP Not Configured**: Supabase project settings don't have email SMTP configured
2. **Email Disabled**: Email authentication provider is disabled
3. **Redirect URL Issues**: The emailRedirectTo URL isn't properly whitelisted

## How to Fix Email Sending

### Option 1: Using Supabase Email Provider (Recommended for Development)

1. Go to your [Supabase Project Settings](https://supabase.com/dashboard/project/_/settings/auth)
2. Click on **Auth** → **Providers** → **Email**
3. Ensure the **Email Provider** section has:
   - ✅ **Enable Sign up** - checked
   - ✅ **Double confirm emails before signing up** - checked (if you want confirmation)
   - **Mailer provider**: Select either:
     - **Supabase** (Built-in, limited - good for testing)
     - **SendGrid** or **AWS SES** (Production - requires API keys)

### Option 2: Configure Custom SMTP (For Production)

1. Go to **Auth** → **Email Templates** → **Settings**
2. Under **SMTP Settings**, configure:
   - **Host**: Your SMTP server (e.g., smtp.sendgrid.net)
   - **Port**: 587 or 465
   - **User**: Your SMTP username
   - **Password**: Your SMTP password
   - **From Email Address**: noreply@sgbcmanagement.com (or your domain)

### Option 3: Using a Service Like SendGrid

1. Create a SendGrid account and get your API key
2. In Supabase Auth settings, select **SendGrid** as the email provider
3. Enter your SendGrid API key

## Email Redirect URL Configuration

The `emailRedirectTo` in the signup must be whitelisted:

1. Go to **Auth** → **URL Configuration**
2. Under **Redirect URLs**, add:
   ```
   http://localhost:8084
   https://app.sgbcmanagement.com
   ```
3. These URLs must match exactly with the `emailRedirectTo` parameter in code

## Verify Email Configuration

After setting up emails, test by:

1. Go to `http://localhost:8084/auth`
2. Fill in the signup form with a test email
3. Select a church from the dropdown
4. Click **Signup**
5. Check the email inbox for a confirmation link
6. Click the link to complete email verification

## Troubleshooting

### Empty "{}" Error Message

- **Cause**: Error object has no message property
- **Fix**: Already done! Error handling now properly extracts messages from Supabase errors
- Check browser console for detailed error information

### "Check your email if confirmation is required" but No Email Received

- **Cause**: SMTP/Email provider not configured in Supabase
- **Fix**: Follow Option 1 or 2 above to configure email sending

### Error: "Email settings missing or invalid"

- **Cause**: Supabase auth configuration incomplete
- **Fix**: Go to Auth settings and verify all required fields are filled

### Redirect URL Mismatch Error

- **Cause**: `emailRedirectTo` doesn't match whitelisted URLs in Auth → URL Configuration
- **Fix**: Add the correct URL to the Redirect URLs list

## Testing Email in Development

### Option 1: Supabase Built-in (Easiest)

- Emails are captured in Supabase project "Email logs"
- Go to **Auth** → **Email Log** to see sent emails

### Option 2: Resend Integration (Optional)

If you want to send actual transactional emails with custom templates:

- Set `RESEND_API_KEY` in `.env`
- Create an Edge Function to handle post-signup email sending
- See `/src/lib/email/email-service.ts` for existing implementation

## Current Application Setup

Our application uses:

- **Supabase Auth**: Handles user registration and authentication
- **Email Service** (`/src/lib/email/email-service.ts`): Available for transactional emails
- **Resend Integration**: Optional email provider for custom emails

The signup flow:

1. User fills form and clicks signup
2. `supabase.auth.signUp()` is called with email and password
3. Supabase creates the user and sends confirmation email
4. `handle_new_user()` database trigger creates user organization link
5. User clicks confirmation link in email to verify

## Next Steps

1. **Configure Supabase emails** using one of the options above
2. **Test the signup flow** end-to-end
3. **Monitor Auth logs** in Supabase dashboard for any errors
4. If custom emails needed, enable Resend integration with `RESEND_API_KEY`

---

**Note**: The organization duplication fix from previous session still needs to be manually applied to Supabase. See `/docs/FIX_SIGNUP_ORG.md` for instructions.
