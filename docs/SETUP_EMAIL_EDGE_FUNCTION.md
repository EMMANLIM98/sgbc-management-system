// Follow-up: We need to create a Supabase Edge Function at supabase/functions/send-auth-email/index.ts
// This guide explains how to set it up.

# Setting Up Supabase Auth Email Edge Function

The signup flow now has better error handling, but to ensure emails are sent after signup, we need a Supabase Edge Function.

## Why We Need This

By default, `supabase.auth.signUp()` relies on Supabase's built-in email sending. However:

- It depends on SMTP configuration in your Supabase project
- It doesn't integrate with our custom Resend service
- It's harder to debug if emails aren't being sent

## Solution: Create an Auth Email Edge Function

This function will:

1. Listen to `auth.user_created` webhook events from Supabase
2. Send a verification email using Resend (our configured email service)
3. Have full control over email templates and delivery

## Steps to Implement

### 1. Install Supabase CLI (if not already installed)

```bash
npm install -g supabase
```

### 2. Create the Edge Function

Create file: `supabase/functions/send-auth-email/index.ts`

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'npm:resend@3.0.0'

const resend = new Resend(Deno.env.get('RESEND_API_KEY'))
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

interface AuthPayload {
  type: string
  record: {
    id: string
    email: string
    email_confirmed_at: string | null
    user_metadata: {
      full_name?: string
      organization_name?: string
    }
  }
}

Deno.serve(async (req) => {
  const payload: AuthPayload = await req.json()

  // Only send email for new user signups (not for other auth events)
  if (payload.type !== 'INSERT') {
    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  }

  const { record } = payload
  const { email, user_metadata, email_confirmed_at } = record

  // If email is already confirmed, don't send verification email
  if (email_confirmed_at) {
    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  }

  try {
    // Generate a confirmation link
    // In production, you'd generate a signed confirmation token
    // For now, we'll rely on Supabase's built-in confirmation
    const confirmationLink = \`\${Deno.env.get('APP_URL')}/auth?confirmed=true\`

    const result = await resend.emails.send({
      from: 'noreply@sgbcmanagement.com',
      to: email,
      subject: 'Verify Your Email Address',
      html: \`
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to SGBC Management System</h2>
          <p>Hi \${user_metadata.full_name || 'there'},</p>
          <p>Thank you for signing up! Please verify your email address to complete your registration.</p>
          <p>
            <a href="\${confirmationLink}" style="background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Verify Email
            </a>
          </p>
          <p>Organization: \${user_metadata.organization_name || 'N/A'}</p>
          <p>If you didn't create this account, you can ignore this email.</p>
          <p>Best regards,<br>SGBC Management Team</p>
        </div>
      \`,
    })

    if (result.error) {
      console.error('Email send failed:', result.error)
      return new Response(
        JSON.stringify({ error: result.error }),
        { status: 500 }
      )
    }

    console.log('Verification email sent to:', email)
    return new Response(JSON.stringify({ ok: true, messageId: result.data?.id }), {
      status: 200,
    })
  } catch (error) {
    console.error('Error sending email:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500 }
    )
  }
})
```

### 3. Deploy the Function

```bash
supabase functions deploy send-auth-email --project-id <your-project-id>
```

### 4. Create a Database Webhook

In Supabase Dashboard:

1. Go to **Database** → **Webhooks**
2. Click **Create a new webhook**
3. Set:
   - **Name**: `send-auth-email`
   - **Table**: `auth.users`
   - **Events**: INSERT
   - **Method**: POST
   - **URL**: `https://<your-project-id>.functions.supabase.co/send-auth-email`
   - **Headers**: Add `Authorization: Bearer <your-anon-key>` (or use public webhook)

### 5. Set Environment Variables

In Supabase Dashboard → **Settings** → **Functions**:

- `RESEND_API_KEY`: Your Resend API key
- `APP_URL`: https://app.sgbcmanagement.com (or localhost:8084 for development)

## Alternative: Use Supabase Built-in Email (Simpler)

If you prefer to use Supabase's built-in email sending instead:

1. Go to **Authentication** → **Providers** → **Email**
2. Configure SMTP settings:
   - **SMTP Host**: smtp.sendgrid.net (or your SMTP provider)
   - **SMTP Port**: 587
   - **SMTP User**: Your username
   - **SMTP Password**: Your password
   - **From Email**: noreply@sgbcmanagement.com

3. Or use SendGrid integration:
   - Select **SendGrid** as provider
   - Enter your SendGrid API key
   - Leave SMTP blank

## Testing

1. Clear browser cookies/cache
2. Go to http://localhost:8084/auth
3. Fill signup form with test email
4. Select organization
5. Click Signup
6. Check email inbox (or Resend dashboard) for verification email
7. Click verification link
8. Should be logged in and redirected to dashboard

## Troubleshooting

### "Edge Function returned 500 error"

- Check Supabase function logs: **Functions** → **Monitoring**
- Verify `RESEND_API_KEY` is set correctly
- Verify `APP_URL` environment variable is set

### "Email not received"

- Check Resend dashboard for delivery status
- Verify email address is correct
- Check spam folder
- Check organization_name is being sent in signup data

### "Empty object {} error"

- Already fixed! Check browser console for detailed error
- Look at Supabase auth logs in dashboard

## Current Status

✅ Error handling improved to show proper error messages  
⏳ Edge Function needs to be created and deployed  
⏳ Database webhook needs to be configured  
⏳ Test end-to-end signup flow
