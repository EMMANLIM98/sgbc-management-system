# Fix for Organization Dropdown Signup Issue

## Problem

When users sign up through the organization dropdown, a NEW organization record is being created in the `organizations` table with a auto-generated slug, instead of linking to the pre-existing SGBC location organizations.

## Root Cause

The `handle_new_user()` database trigger function automatically creates a new organization when a user signs up, regardless of whether the organization already exists.

## Solution

Update the `handle_new_user()` function to:

1. Look up if an organization with the selected name exists
2. Link the user to the EXISTING organization
3. Only fail gracefully if the organization doesn't exist (shouldn't happen with dropdown)

## How to Apply the Fix

### Option 1: Via Supabase Dashboard (Recommended)

1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **SQL Editor**
4. Click **New Query**
5. Paste the SQL from [fix-handle-new-user.sql](./fix-handle-new-user.sql)
6. Click **Run**

### Option 2: Via CLI (if migrations work)

```bash
npx supabase db push
```

## SQL to Execute

See [fix-handle-new-user.sql](./fix-handle-new-user.sql) for the complete function replacement.

The key changes:

- Instead of `INSERT INTO public.organizations (name, slug, created_by)`, we now `SELECT id FROM organizations WHERE name = v_org_name`
- Only perform further operations if the organization exists (`IF v_org_id IS NOT NULL`)
- Link user as a regular member, not org_admin
- Use a unique church slug (`main-` || substr(user_id, 1, 8))

## Verification

After applying the fix:

1. Go to http://localhost:8084/auth (or your signup URL)
2. Click "Create account"
3. Fill in the form and select an organization from dropdown
4. Complete signup
5. Check the `organizations` table - no new record should be created
6. Check `user_organizations` - user should be linked to the existing organization
