# URGENT: Fix Database Error During Signup

## Problem
When users try to sign up, they get error: **"Database error saving new user"**

## Root Cause
The database trigger `handle_new_user()` is still using OLD code that tries to CREATE a new organization for every signup. This causes a conflict because:
1. The trigger tries to insert `name, slug, created_by` into organizations table
2. It also tries to insert into churches table with slug `'main'` 
3. This causes duplicate key violations or constraint errors

## Solution: Apply the Database Fix

### STEP 1: Go to Supabase SQL Editor
1. Open: https://supabase.com/dashboard/project/_/sql
2. Click the "+" icon to create a **New Query**

### STEP 2: Copy the Fix SQL
Open the file: `docs/URGENT_FIX_SIGNUP_TRIGGER.sql`
Copy ALL the SQL code

### STEP 3: Paste into Supabase
1. Paste the entire SQL code into the query editor
2. You should see a function definition with `CREATE OR REPLACE FUNCTION public.handle_new_user()`

### STEP 4: Execute the Fix
Click the **"Run"** button (blue play icon) in the bottom right

**Expected Result:**
- ✅ Query runs successfully
- ✅ Message appears: "Executing query..."  then completes
- ✅ No error message

### STEP 5: Clear Test Users (Optional)
If you want to delete the failed signup attempt:
1. Go to **Authentication** → **Users** in Supabase
2. Find the user `hilariodacma@protonmail.com`
3. Delete it
4. This allows you to test signup again with the same email

## Test the Fix

After applying the SQL:

1. **Open the signup form**: http://localhost:8084/auth
2. **Click "Create account"**
3. **Fill in the form**:
   - Full Name: `HD`
   - Which Church?: `SGBC - Antipolo`
   - Email: `hilariodacma@protonmail.com` (or new email)
   - Password: `Tropang20!`
4. **Click "Signup"**

**Expected Result**:
- ✅ Success toast: "Account created successfully! Check your email to verify your account. Redirecting..."
- ✅ 2 second delay
- ✅ Redirects to dashboard
- ✅ User linked to "SGBC - Antipolo" organization (no new org created)
- ✅ Verification email sent to inbox

## What the Fix Does

**Before** (BROKEN):
```sql
-- OLD CODE - creates new org for every user
INSERT INTO public.organizations (name, slug, created_by)
VALUES (v_org_name, v_org_slug, NEW.id)
RETURNING id INTO v_org_id;

-- Always uses slug 'main' - CAUSES CONFLICT!
INSERT INTO public.churches (organization_id, name, slug, currency)
VALUES (v_org_id, 'Main Church', 'main', 'PHP')
```

**After** (FIXED):
```sql
-- NEW CODE - finds existing org
SELECT id INTO v_org_id FROM public.organizations
WHERE name = v_org_name LIMIT 1;

-- Only proceeds if org exists
IF v_org_id IS NOT NULL THEN
  -- Links user to existing org (no insert into organizations)
  INSERT INTO public.user_organizations (user_id, organization_id, is_org_admin, is_owner)
  VALUES (NEW.id, v_org_id, false, false);

  -- Uses unique slug: 'main-{userId}' - no conflicts!
  INSERT INTO public.churches (organization_id, name, slug, currency)
  VALUES (v_org_id, 'Main Church', 'main-' || substr(NEW.id::text, 1, 8), 'PHP')
END IF;
```

## Troubleshooting

### "Permission denied" error when running SQL
- Go to **Settings** → **Database** → **Backups**
- Make sure you're using the service role key with sufficient permissions
- Or use the authenticated SQL editor with a super-admin account

### "Syntax error" in SQL
- Make sure you copied ALL the code including the full function
- Check that you didn't accidentally paste it twice
- Try copying again from the .sql file

### "No error but signup still fails"
- The function update might not be taking effect
- Try disconnecting/reconnecting your browser
- Hard refresh (Ctrl+Shift+R) to clear cache
- Try signup from incognito/private window

### "I'm still getting the same error"
1. Check Supabase function logs: Go to **Functions** → **Query Performance**
2. Look for recent `handle_new_user` trigger calls
3. Click on a failed call to see the exact error
4. Report that error message for specific debugging

## Advanced: Check if Fix Applied

To verify the function was updated:

1. Go to **SQL** editor
2. Create a new query with:
```sql
SELECT prosrc FROM pg_proc WHERE proname = 'handle_new_user';
```
3. Run it
4. You should see the function code that starts with `v_org_id := COALESCE...`
5. The key line should be: `SELECT id INTO v_org_id FROM public.organizations`

## Next Steps

After the fix works and signup succeeds:

1. ✅ Test signup end-to-end
2. ✅ Verify email verification works
3. ✅ Check organization linking (user should be member of SGBC - Antipolo, not admin)
4. ✅ Verify only 6 organizations exist (no duplicates created)
5. ⏳ Optional: Apply any pending email configuration

---

**Note**: This SQL fix needs to be applied once. After this, all future signups will work correctly.
**Time Estimate**: 2 minutes to apply and test
