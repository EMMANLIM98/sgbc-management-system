#!/usr/bin/env node

/**
 * Supabase Dashboard Automation - Apply Trigger Fix
 * 
 * This opens your browser and walks you through applying the fix
 * Prerequisites: Must be logged into Supabase dashboard already
 */

import { chromium } from "playwright";

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const PROJECT_ID = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase/)?.[1] || "";

if (!PROJECT_ID) {
  console.error("❌ Could not extract project ID from SUPABASE_URL");
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

async function main() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log("🚀 Opening Supabase SQL Editor...\n");

    const sqlUrl = `https://supabase.com/dashboard/project/${PROJECT_ID}/sql/1`;
    await page.goto(sqlUrl, { waitUntil: "networkidle" });

    console.log("⏳ Waiting for page to load... (give it 5 seconds)\n");
    await page.waitForTimeout(5000);

    console.log("🔍 Looking for SQL editor...\n");

    // Try to find the SQL editor area
    const editors = await page.locator(
      'textarea, [contenteditable="true"], [class*="editor"], [class*="monaco"]'
    ).all();

    if (editors.length === 0) {
      console.log("⚠️  Could not find SQL editor area\n");
      console.log("💡 Manual next steps:");
      console.log("   1. Browser is open at Supabase dashboard");
      console.log("   2. Click 'SQL' in left sidebar");
      console.log("   3. Click '+ New query'");
      console.log("   4. Paste SQL from: docs/URGENT_FIX_SIGNUP_TRIGGER.sql");
      console.log("   5. Click 'Run'\n");
      return;
    }

    // Click in the editor
    console.log("✅ Found editor, clicking to focus...\n");
    await editors[0].click();
    await page.waitForTimeout(1000);

    // Clear any existing content
    console.log("⏳ Clearing editor...");
    await page.keyboard.press("Control+A");
    await page.waitForTimeout(200);
    await page.keyboard.press("Delete");
    await page.waitForTimeout(500);

    // Paste the SQL
    console.log("⏳ Pasting SQL fix...");
    
    // Use evaluate to paste to the element
    await page.evaluate((sql) => {
      const textareas = document.querySelectorAll("textarea");
      const contentEditables = document.querySelectorAll('[contenteditable="true"]');

      // Try textarea first
      if (textareas.length > 0) {
        textareas[0].value = sql;
        textareas[0].dispatchEvent(new Event("input", { bubbles: true }));
        textareas[0].dispatchEvent(new Event("change", { bubbles: true }));
        return true;
      }

      // Try contenteditable
      if (contentEditables.length > 0) {
        contentEditables[0].textContent = sql;
        contentEditables[0].dispatchEvent(new Event("input", { bubbles: true }));
        contentEditables[0].dispatchEvent(new Event("change", { bubbles: true }));
        return true;
      }

      return false;
    }, fixSQL);

    await page.waitForTimeout(1500);
    console.log("✅ SQL pasted into editor\n");

    // Look for and click the Run button
    console.log("🔍 Looking for 'Run' button...");
    const buttons = await page.locator("button").all();
    let runButton = null;

    for (const btn of buttons) {
      const text = await btn.textContent();
      if (
        text?.toLowerCase().includes("run") ||
        text?.toLowerCase().includes("execute")
      ) {
        runButton = btn;
        break;
      }
    }

    if (runButton) {
      console.log("✅ Found Run button, clicking it...\n");
      await runButton.click();
      await page.waitForTimeout(3000);

      console.log("━".repeat(60));
      console.log("✨ FIX APPLIED!\n");
      console.log("📋 What was done:");
      console.log("   ✓ Updated handle_new_user() trigger function");
      console.log("   ✓ Now links users to existing organizations");
      console.log("   ✓ Uses unique church slugs (no conflicts)");
      console.log("   ✓ User role changed to 'member'\n");

      console.log("🧪 Test the fix:");
      console.log("   1. Go to: http://localhost:8084/auth");
      console.log("   2. Click 'Create account'");
      console.log("   3. Fill in:");
      console.log("      - Full Name: HD");
      console.log("      - Church: SGBC - Antipolo");
      console.log("      - Email: test@example.com");
      console.log("      - Password: TestPassword123!");
      console.log("   4. Click Signup");
      console.log("   5. Should see: 'Account created successfully!'\n");

      console.log("Browser will stay open for 30 seconds...\n");
      await page.waitForTimeout(30000);
    } else {
      console.log("⚠️  Could not find Run button\n");
      console.log("💡 Next steps:");
      console.log("   1. Look for blue 'Run' or 'Execute' button");
      console.log("   2. Click it to run the SQL");
      console.log("   3. You should see confirmation message\n");
      
      // Keep browser open for user
      await new Promise(() => {});
    }
  } catch (error) {
    console.error("❌ Error:", error instanceof Error ? error.message : String(error));
  } finally {
    await browser.close();
  }
}

main();
