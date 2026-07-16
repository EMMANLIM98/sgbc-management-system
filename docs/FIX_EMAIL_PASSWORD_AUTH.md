# Fix: Enable Email/Password Authentication in Supabase

## Current Issue

The signup form is returning error: **"Anonymous sign-ins are disabled"**

This means the Supabase project doesn't have the **Email/Password** authentication provider properly enabled.

## How to Fix

### Step 1: Go to Supabase Dashboard
1. Navigate to: https://supabase.com/dashboard
2. Select your **sgbc-management-system** project
3. Click on **Authentication** in the left sidebar

### Step 2: Enable Email Provider
1. Click on **Providers** (under Authentication)
2. Find **Email** in the list
3. Click on **Email** to open the settings
4. You should see toggles for:
   - ✅ **Enable Sign up** - **MUST BE ON**
   - ✅ **Enable Email Confirmations** - Turn ON if you want email verification
   - Other options can stay as default

5. Scroll down and click **Save**

### Step 3: Verify SMTP Configuration (Optional but Recommended)

For email to actually be sent, Supabase needs SMTP configured:

**Option A: Use Supabase Built-in Email (Easiest)**
- Go to **Authentication** → **Email Templates** → **Settings**
- Select **Supabase** as the SMTP provider
- This is limited but works for testing
- Click **Save**

**Option B: Configure SendGrid (Recommended)**
- Sign up for [SendGrid](https://sendgrid.com) free account
- Get your API key from SendGrid dashboard
- In Supabase: Go to **Email Templates** → **Settings**
- Select **SendGrid** as SMTP provider
- Paste your SendGrid API key
- Set **From Email Address**: `noreply@sgbcmanagement.com`
- Click **Save**

**Option C: Configure AWS SES**
- In Supabase: Go to **Email Templates** → **Settings**
- Select **AWS SES** as SMTP provider
- Add your AWS credentials
- Set **From Email Address**: `noreply@sgbcmanagement.com`
- Click **Save**

### Step 4: Add Redirect URLs

The signup email needs to redirect users back to your app:

1. Go to **Authentication** → **URL Configuration**
2. Under **Redirect URLs**, add:
   - `http://localhost:8084` (local development)
   - `https://app.sgbcmanagement.com` (production)
   - Any other URLs your app uses
3. Click **Save**

### Step 5: Test the Signup Flow

1. Open http://localhost:8084/auth
2. Click "Create account"
3. Fill in:
   - **Full Name**: Your test name
   - **Which Church?**: Select "SGBC - Antipolo"
   - **Email**: Your test email
   - **Password**: A strong password
4. Click **Signup**

**Expected Results**:
- ✅ Success toast: "Account created successfully! Check your email to verify your account. Redirecting..."
- ✅ 2 second delay before navigation to dashboard
- ✅ Verification email sent to your email address
- ✅ User linked to selected organization (SGBC - Antipolo)

## Troubleshooting

### "Anonymous sign-ins are disabled" error
- **Solution**: Email provider is not enabled. Follow Step 2 above.

### "User signup is disabled" error
- **Solution**: Go to **Authentication** → **Providers** → **Email** and enable "Enable Sign up"

### Email not received after successful signup
- **Cause**: SMTP not configured
- **Solution**: Follow Step 3 to configure SMTP (Supabase, SendGrid, or AWS SES)

### "Error: Email settings missing or invalid"
- **Cause**: SMTP configured but missing required fields
- **Solution**: Go to **Email Templates** → **Settings** and verify all fields are filled

### Email sent but redirect not working
- **Cause**: Redirect URL not whitelisted
- **Solution**: Follow Step 4 to add your domain to Redirect URLs

## After Fixing Email Auth

Once email/password is enabled:

1. **Signup Flow Works**:
   - User creates account with email/password
   - Success message appears
   - Dashboard redirects in 2 seconds
   - Organization is linked (thanks to our fix)

2. **Verification Email Sent**:
   - Resend/SendGrid/AWS SES sends confirmation email
   - User clicks link in email to verify
   - Account becomes fully active

3. **Organization Database**:
   - User linked to selected SGBC location
   - No duplicate organizations created (our fix prevents this)
   - User can access their organization dashboard

## Current Application Architecture

```
User Registration Flow:
  1. User fills signup form (name, church, email, password)
  2. Clicks "Signup"
  3. Supabase auth.signUp() is called
  4. Supabase creates user & sends verification email
  5. Database trigger handle_new_user() runs:
     - Creates user_organizations record
     - Links user to selected organization
     - Creates church (main-{userId})
     - Creates role (member)
  6. Success toast shown for 2 seconds
  7. Redirects to dashboard
  8. User clicks email verification link to complete signup
```

## Related Configuration

- **RESEND_API_KEY** in `.env`: Optional custom email service
- **Organization Dropdown**: Fixed to fetch from database (working ✓)
- **Organization Duplication Fix**: Already applied to database trigger
- **Error Messages**: Now properly displayed (fixed ✓)

## Next Steps After This Fix

1. ✅ Enable Email/Password provider (THIS FILE)
2. ✅ Configure SMTP/Email sending
3. ✅ Test signup flow end-to-end
4. ⏳ Verify email confirmation works
5. ⏳ Test organization linking
6. ⏳ Apply any organization duplication prevention patches if needed

---

**Note**: If you don't see options in the UI, you might need to refresh the page or clear your browser cache.
