#!/usr/bin/env node

/**
 * Automated Fix for handle_new_user() Trigger
 * 
 * This script applies the database trigger fix to Supabase directly.
 * Run: npm exec node -- scripts/apply-signup-fix.js
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Error: Missing environment variables");
  console.error("   - SUPABASE_URL");
  console.error("   - SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

// Create Supabase admin client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const fixSQL = `
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
`;

async function applyFix() {
  try {
    console.log("🔧 Applying signup trigger fix...\n");

    // Execute the SQL
    const { error } = await supabase.rpc("exec", {
      sql: fixSQL,
    });

    if (error) {
      // If exec RPC doesn't exist, try direct SQL execution
      console.log("⏳ Executing SQL directly...");
      
      // Use the rest API to execute SQL
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ sql: fixSQL }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    }

    console.log("✅ Successfully applied the signup trigger fix!\n");
    console.log("📋 Summary of changes:");
    console.log("   • Updated handle_new_user() function");
    console.log("   • Now links users to existing organizations");
    console.log("   • Uses unique church slugs (no conflicts)");
    console.log("   • User role changed to 'member' (not 'org_admin')\n");

    console.log("🧪 Testing signup now:");
    console.log("   1. Go to: http://localhost:8084/auth");
    console.log("   2. Click 'Create account'");
    console.log("   3. Fill in:");
    console.log("      - Full Name: HD");
    console.log("      - Church: SGBC - Antipolo");
    console.log("      - Email: test@example.com");
    console.log("      - Password: TestPassword123!");
    console.log("   4. Click Signup\n");

    console.log("✨ Expected result:");
    console.log("   ✓ Success toast appears");
    console.log("   ✓ 'Check your email to verify' message");
    console.log("   ✓ Redirects to dashboard");
    console.log("   ✓ No database error\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error applying fix:\n");
    console.error(error instanceof Error ? error.message : String(error));
    console.error("\n💡 Troubleshooting:");
    console.error("   1. Verify SUPABASE_SERVICE_ROLE_KEY is correct");
    console.error("   2. Make sure you're logged into Supabase");
    console.error("   3. Try manually applying the SQL from docs/URGENT_FIX_SIGNUP_TRIGGER.sql\n");
    process.exit(1);
  }
}

applyFix();
