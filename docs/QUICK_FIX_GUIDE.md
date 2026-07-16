# ✅ QUICK FIX GUIDE - Apply Database Trigger Fix (5 minutes)

## What's the Problem?
Signup shows error: **"Database error saving new user"**
- Root Cause: The `handle_new_user()` trigger is still using OLD code
- It tries to CREATE a new organization for every signup
- But the dropdown already links them to an existing org
- This causes a conflict → database error

---

## 🚀 Quick Steps to Fix

### Step 1: Log In to Supabase
1. Go to: **https://supabase.com/dashboard**
2. Sign in with your GitHub or email
3. Select project: **sgbc-management-system** (auucbrkuwusxgctlfqae)

### Step 2: Open SQL Editor
1. In left sidebar, click **SQL** or **SQL Editor**
2. You should see a list of saved queries
3. Click **"+ New query"** button (usually top right)

### Step 3: Paste the Fix SQL
Copy the entire SQL below and paste it into the editor:

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

### Step 4: Run the SQL
1. Look for the blue **"Run"** button (bottom toolbar or top right)
2. Click it
3. Wait for the query to complete
4. You should see a success message or no error

### Step 5: Test Signup
1. Open: **http://localhost:8084/auth**
2. Click **"Create account"**
3. Fill in the form:
   - **Full Name**: HD
   - **Which Church?**: SGBC - Antipolo
   - **Email**: test@example.com
   - **Password**: Password123!
4. Click **Signup**

**Expected Result**:
- ✅ Toast message: "Account created successfully!"
- ✅ "Check your email to verify your account"
- ✅ Redirects to dashboard after 2 seconds
- ✅ NO database error!

---

## 🎯 What This Fix Does

| Before (BROKEN) | After (FIXED) |
|---|---|
| Creates NEW org on every signup | Links to EXISTING org from dropdown |
| Uses slug 'main' → conflicts | Uses unique slug 'main-{userId}' |
| User is org_admin | User is member |
| Signup fails with database error | Signup succeeds ✅ |

---

## ❓ Troubleshooting

### "I can't find the Run button"
- Look in the toolbar at the bottom or right of the editor
- It's a blue button with text "Run" or a play icon (▶️)
- Or press `Ctrl + Return` (Command + Return on Mac)

### "Permission denied" error
- Make sure you're using the postgres role (you can see this in a dropdown)
- If you see "service_role" selected, that's fine too
- If it still fails, you might need admin access

### "Function already exists" error
- That's fine! It means the function exists and is being replaced
- The `CREATE OR REPLACE` means it updates the existing function
- Not an error, just normal operation

### "Query executed but I still get the error"
- Try clearing browser cache: `Ctrl + Shift + Delete`
- Restart the development server: `npm run dev`
- Test signup again

### Still stuck?
- Check that all 6 organizations exist in database
- Go to: Supabase Dashboard → SQL → Run:
  ```sql
  SELECT id, name FROM public.organizations ORDER BY name;
  ```
- Should show 6 SGBC locations

---

## 📋 Checklist

- [ ] Logged into Supabase
- [ ] Opened SQL Editor
- [ ] Created new query
- [ ] Pasted the complete SQL
- [ ] Clicked Run
- [ ] Got success (or no error)
- [ ] Tested signup at http://localhost:8084/auth
- [ ] Signup works without database error ✅

---

## 📚 Related Documentation

- **Full SQL**: `docs/URGENT_FIX_SIGNUP_TRIGGER.sql`
- **Email Config**: `docs/CONFIGURE_SUPABASE_EMAIL.md`
- **Auth Setup**: `docs/FIX_EMAIL_PASSWORD_AUTH.md`
- **Detailed Instructions**: `docs/APPLY_SIGNUP_FIX_INSTRUCTIONS.md`

---

## ✨ That's It!

Once this fix is applied and signup works, the rest of the system should work too:
- ✅ Organization dropdown loads
- ✅ Signup links user to correct org
- ✅ No duplicate organizations created
- ✅ Database trigger works correctly
- ✅ Email verification can be sent
- ✅ User dashboard loads after signup

Enjoy! 🎉
