#!/usr/bin/env node

/**
 * Simple Automated Fix - No Extra Dependencies
 * Uses Supabase REST API to execute the SQL
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Missing environment variables:");
  console.error("   - SUPABASE_URL");
  console.error("   - SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const fixSQL = `CREATE OR REPLACE FUNCTION public.handle_new_user()
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
$$;`;

async function applyFix() {
  try {
    console.log("🚀 Applying Signup Trigger Fix\n");
    console.log("━".repeat(60) + "\n");

    console.log("⏳ Executing SQL via Supabase...");

    // Try using Supabase RPC endpoint
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        sql: fixSQL,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      // The exec RPC might not exist, try alternative approach
      if (response.status === 404 || data?.code === "PGRST116") {
        console.log("⚠️  Direct SQL execution not available\n");
        console.log("💡 Manual fix required:\n");
        showManualInstructions();
        process.exit(1);
      }

      throw new Error(`HTTP ${response.status}: ${JSON.stringify(data)}`);
    }

    console.log("✅ SQL executed successfully!\n");

    console.log("━".repeat(60));
    console.log("✨ FIX APPLIED SUCCESSFULLY!\n");
    console.log("📋 What was fixed:");
    console.log("   ✓ Updated handle_new_user() trigger");
    console.log("   ✓ Now links users to existing organizations");
    console.log("   ✓ Uses unique church slugs (no conflicts)");
    console.log("   ✓ User role changed to 'member'\n");

    console.log("🧪 Test the fix:");
    console.log("   1. Go to: http://localhost:8084/auth");
    console.log("   2. Click 'Create account'");
    console.log("   3. Fill in test data:");
    console.log("      - Full Name: HD");
    console.log("      - Church: SGBC - Antipolo");
    console.log("      - Email: test@example.com");
    console.log("      - Password: TestPassword123!");
    console.log("   4. Click Signup");
    console.log("   5. Should see: 'Account created successfully!'\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error applying fix:\n");
    console.error(error instanceof Error ? error.message : String(error));
    console.error("\n");

    showManualInstructions();
    process.exit(1);
  }
}

function showManualInstructions() {
  console.log("━".repeat(60));
  console.log("💡 MANUAL FIX REQUIRED:\n");
  console.log("1️⃣  Go to Supabase Dashboard:");
  console.log("    https://supabase.com/dashboard/project/_/sql\n");

  console.log("2️⃣  Click '+ New query'\n");

  console.log("3️⃣  Copy this SQL:\n");
  console.log("    ┌─────────────────────────────────────────────────────┐");
  console.log("    │ " + fixSQL.split("\n")[0]);
  console.log("    │ ... (complete SQL in docs/URGENT_FIX_SIGNUP_TRIGGER.sql)");
  console.log("    └─────────────────────────────────────────────────────┘\n");

  console.log("4️⃣  Paste into the SQL editor\n");

  console.log("5️⃣  Click 'Run' (blue play button)\n");

  console.log("6️⃣  Done! Test signup at http://localhost:8084/auth\n");

  console.log("📁 Full SQL file at:");
  console.log("   docs/URGENT_FIX_SIGNUP_TRIGGER.sql\n");
}

applyFix();
