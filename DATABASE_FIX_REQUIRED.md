# URGENT: Critical Database Trigger Issue - Signup Blocked

## Problem
When attempting to sign up, you get a 500 error with empty error details: `{"message": {}, status: 500}`. This is the PostgreSQL trigger `handle_new_user()` failing when trying to process the signup.

## Root Cause
The current database trigger (in migration `20260708085325_*.sql`) is trying to INSERT a new organization every time a user signs up. This causes a database constraint violation because:
1. It tries to insert with slug `'main-{uuid}'` for the church
2. The church table already has a 'main' slug for existing churches
3. The unique constraint on (organization_id, slug) is violated

## Solution
Apply the corrected trigger from migration `20260715_fix_signup_org_creation.sql`.

### Option 1: Apply Via Supabase Dashboard (FASTEST - 2 minutes)

1. Go to: https://supabase.com/dashboard/project/auucbrkuwusxgctlfqae
2. Log in if needed
3. Click **SQL Editor** in the left sidebar
4. Click **"+ New Query"**
5. Copy and paste THE ENTIRE CONTENT below:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_full_name TEXT;
  v_org_name TEXT;
  v_org_id UUID;
  v_church_id UUID;
BEGIN
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name',
                          NEW.raw_user_meta_data->>'name',
                          split_part(NEW.email, '@', 1));

  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, v_full_name);

  -- Get the organization name from signup metadata (e.g., "SGBC - Antipolo")
  v_org_name := COALESCE(NEW.raw_user_meta_data->>'organization_name', NULL);

  -- Try to find an existing organization with this name
  SELECT id INTO v_org_id FROM public.organizations
  WHERE name = v_org_name
  LIMIT 1;

  -- If organization exists, link user to it
  -- If not (shouldn't happen with dropdown), don't create a new one
  -- Users can add new organizations later from the app
  IF v_org_id IS NOT NULL THEN
    INSERT INTO public.user_organizations (user_id, organization_id, is_org_admin, is_owner)
    VALUES (NEW.id, v_org_id, false, false);

    INSERT INTO public.churches (organization_id, name, slug, currency)
    VALUES (v_org_id, 'Main Church', 'main-' || substr(NEW.id::text, 1, 8), 'PHP')
    RETURNING id INTO v_church_id;

    INSERT INTO public.user_church_roles (user_id, church_id, role)
    VALUES (NEW.id, v_church_id, 'member');

    INSERT INTO public.activities (organization_id, church_id, actor_id, verb, subject_type, subject_id, meta)
    VALUES (v_org_id, v_church_id, NEW.id, 'joined', 'organization', v_org_id,
            jsonb_build_object('name', v_org_name));
  END IF;

  RETURN NEW;
END;
$$;
```

6. Click **"Run"** button in the top right
7. You should see a success message: `"Success. No rows returned"`
8. **DONE!** The trigger is now fixed. Try signing up again.

### Option 2: Apply Via Node.js Script (AUTOMATED)

If you prefer to run a script:

```bash
# From the project root directory:
node scripts/apply-database-fix.js
```

This will automatically apply the fix to your Supabase database.

### Option 3: Apply Via Supabase CLI (if installed)

```bash
supabase migration up
```

## Verification

After applying the fix:

1. Reload the signup page: http://localhost:8085/auth?mode=signup
2. Fill in the form:
   - Full Name: `Test User`
   - Church: Select any SGBC location
   - Email: `test@example.com`
   - Password: `TestPassword123!`
3. Click **Signup**
4. You should see: `"Account created successfully! Check your email to verify your account. Redirecting..."`
5. You will be redirected to the dashboard after 2 seconds

## What Changed

**Old Trigger (BROKEN)**:
- `INSERT INTO public.organizations` on every signup ❌
- Creates new org with slug `'sgbc-{name}-{uuid}'`
- Creates church with slug `'main'` (duplicate!)
- Sets user as org_admin (wrong role)
- Tries to insert even if org doesn't exist

**New Trigger (FIXED)**:
- `SELECT` to find existing organization by name ✓
- Only links user if org exists, doesn't create new orgs ✓
- Uses unique slug: `'main-' || substr(user_id, 1, 8)` ✓
- Sets user as member (correct role) ✓
- Gracefully skips if org doesn't exist ✓

## Database Schema

Organizations exist in the database:
- SGBC - Antipolo
- SGBC - Baras
- SGBC - Boracay
- SGBC - Cainta
- SGBC - Morong
- SGBC - Taytay

The signup dropdown shows these automatically.

## Current Test Status

✅ Dropdown displays all 6 organizations correctly
✅ Form validation working (requires church selection)
✅ Form input accepting text
✅ Only blocked by database trigger error

After fix:
✅ Signup should complete
✅ User records created in database
✅ Organization link established
✅ Church and roles auto-created
✅ Welcome email sent

## Support

If you still have issues after applying this fix:
1. Check your Supabase email settings (Resend integration)
2. Verify organizations exist in Settings > Organizations
3. Check that the trigger ran successfully (no error in SQL Editor)
4. Contact support with the error message
