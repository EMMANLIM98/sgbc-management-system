#!/usr/bin/env node

/**
 * Apply Trigger Fix via REST API using fetch
 * No external dependencies needed!
 */

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

  v_org_name := COALESCE(NEW.raw_user_meta_data->>'organization_name', NULL);

  SELECT id INTO v_org_id FROM public.organizations
  WHERE name = v_org_name
  LIMIT 1;

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

const SUPABASE_URL = "https://auucbrkuwusxgctlfqae.supabase.co";
const SERVICE_ROLE_KEY = "sb_secret_quciSbTHv0V56TFpTY9Fqg_o8nssJII";

async function applyFix() {
  try {
    console.log("🚀 Applying Trigger Fix via REST API\n");
    console.log("━".repeat(60) + "\n");

    console.log("📍 Supabase Project: auucbrkuwusxgctlfqae");
    console.log("⏳ Executing SQL...\n");

    // Method 1: Try executing via RPC
    console.log("Attempting Method 1: Direct SQL execution...");
    
    let response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ sql: fixSQL }),
    });

    if (response.ok) {
      console.log("✅ SQL executed via RPC!\n");
      showSuccess();
      return;
    }

    // Method 2: Try via PostgreSQL connection string
    console.log("❌ Method 1 failed, trying Method 2...");
    console.log("   (This would require pgAdmin or psql directly)\n");

    // Method 3: Provide manual instructions
    console.log("━".repeat(60));
    showManualInstructions();

  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : String(error));
    showManualInstructions();
  }
}

function showSuccess() {
  console.log("━".repeat(60));
  console.log("✨ FIX APPLIED SUCCESSFULLY!\n");
  console.log("📋 What was fixed:");
  console.log("   ✓ Updated handle_new_user() trigger");
  console.log("   ✓ Now links users to existing organizations");
  console.log("   ✓ Uses unique church slugs (no conflicts)");
  console.log("   ✓ User role changed to 'member'\n");

  console.log("🧪 Test signup:");
  console.log("   1. Go to: http://localhost:8084/auth");
  console.log("   2. Click 'Create account'");
  console.log("   3. Fill with: HD / SGBC - Antipolo / test@example.com / Password123!");
  console.log("   4. Should see success message!\n");
}

function showManualInstructions() {
  console.log("💡 MANUAL FIX (takes 2 minutes):\n");

  console.log("Step 1: Open Supabase Dashboard");
  console.log("   👉 https://supabase.com/dashboard/project/auucbrkuwusxgctlfqae/sql/1\n");

  console.log("Step 2: Create New Query");
  console.log("   • If SQL editor not showing: Click 'SQL' in left sidebar");
  console.log("   • Click '+ New query' button\n");

  console.log("Step 3: Copy This SQL:");
  const lines = fixSQL.split("\n").slice(0, 5);
  console.log("   ┌─────────────────────────────────────────────────────┐");
  lines.forEach((line) => {
    console.log("   │ " + line);
  });
  console.log("   │ ... (see full SQL below)\n");
  console.log("   └─────────────────────────────────────────────────────┘");

  console.log("   📄 Full SQL at: docs/URGENT_FIX_SIGNUP_TRIGGER.sql");
  console.log("   Or copy from this command output below:\n");

  console.log("FULL SQL TO PASTE:");
  console.log("━".repeat(60));
  console.log(fixSQL);
  console.log("━".repeat(60) + "\n");

  console.log("Step 4: Paste & Run");
  console.log("   • Paste the SQL into the editor");
  console.log("   • Click the blue 'Run' button");
  console.log("   • Wait for confirmation\n");

  console.log("Step 5: Test Signup");
  console.log("   • Go to: http://localhost:8084/auth");
  console.log("   • Click 'Create account'");
  console.log("   • Full Name: HD");
  console.log("   • Church: SGBC - Antipolo");
  console.log("   • Email: test@example.com");
  console.log("   • Password: Password123!");
  console.log("   • Should work! ✅\n");

  console.log("Questions?");
  console.log("   • Check: docs/APPLY_SIGNUP_FIX_INSTRUCTIONS.md");
  console.log("   • Or: docs/FIX_EMAIL_PASSWORD_AUTH.md\n");
}

applyFix();
