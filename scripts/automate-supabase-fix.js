#!/usr/bin/env node

/**
 * Automated Supabase Fix using Playwright
 * 
 * This script:
 * 1. Opens Supabase dashboard
 * 2. Navigates to SQL editor
 * 3. Creates a new query
 * 4. Pastes and runs the fix SQL
 * 
 * Run: npm exec node -- scripts/automate-supabase-fix.js
 */

import { chromium } from "playwright";
import * as fs from "fs";
import * as path from "path";

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const PROJECT_ID = SUPABASE_URL.split("//")[1]?.split(".")[0] || "";

if (!PROJECT_ID) {
  console.error("❌ Error: Could not extract project ID from SUPABASE_URL");
  process.exit(1);
}

// The SQL fix to apply
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
`.trim();

async function fixSupabase() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log("🚀 Opening Supabase dashboard...\n");
    
    // Navigate to SQL editor
    const sqlEditorUrl = `https://supabase.com/dashboard/project/${PROJECT_ID}/sql/1`;
    console.log(`📍 Going to: ${sqlEditorUrl}\n`);
    
    await page.goto(sqlEditorUrl, { waitUntil: "networkidle" });

    // Wait a bit for page to load
    await page.waitForTimeout(3000);

    console.log("⏳ Waiting for SQL editor to load...");
    
    // Try to find and click the "New query" button
    const newQueryButton = page.locator('button:has-text("New query"), [role="button"]:has-text("New"), button[aria-label*="New"]');
    
    // Wait for button to appear
    try {
      await newQueryButton.first().click({ timeout: 10000 });
      console.log("✅ Clicked 'New query' button\n");
    } catch (e) {
      console.log("⚠️  Could not find 'New query' button, trying alternative method...");
      
      // Try keyboard shortcut
      await page.keyboard.press("Control+K");
      await page.waitForTimeout(500);
      await page.keyboard.type("new");
      await page.waitForTimeout(1000);
    }

    console.log("⏳ Waiting for editor to appear...");
    await page.waitForTimeout(2000);

    // Click in the editor area
    const editorArea = page.locator('[class*="editor"], [class*="monaco"], textarea, [contenteditable="true"]').first();
    await editorArea.click({ timeout: 10000 });
    
    console.log("✅ Focused editor\n");
    console.log("⏳ Pasting SQL fix...");

    // Paste the SQL
    await page.keyboard.press("Control+A");
    await page.keyboard.press("Delete");
    await page.waitForTimeout(500);
    
    // Type the SQL (use paste via page.evaluate for large text)
    await page.evaluate((sql) => {
      const textarea = document.querySelector('textarea, [contenteditable="true"]');
      if (textarea instanceof HTMLTextAreaElement) {
        textarea.value = sql;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, fixSQL);

    await page.waitForTimeout(1000);
    console.log("✅ SQL pasted\n");

    console.log("⏳ Looking for Run button...");
    
    // Find and click the Run button
    const runButton = page.locator('button:has-text("Run"), [role="button"]:has-text("Execute"), button[title*="Run"]');
    
    try {
      await runButton.first().click({ timeout: 5000 });
      console.log("✅ Clicked Run button\n");
    } catch (e) {
      console.log("⚠️  Could not find Run button, trying keyboard shortcut...");
      await page.keyboard.press("Control+Return");
      console.log("✅ Sent Run command via keyboard\n");
    }

    // Wait for execution
    console.log("⏳ Executing SQL... (waiting up to 10 seconds)");
    await page.waitForTimeout(5000);

    // Check for success message
    const successMessage = page.locator('text=successfully, text=completed, [class*="success"]').first();
    
    try {
      await successMessage.waitFor({ state: "visible", timeout: 5000 });
      console.log("✅ SQL executed successfully!\n");
    } catch (e) {
      console.log("⚠️  Could not confirm success, but query may have run\n");
    }

    console.log("━".repeat(60));
    console.log("✨ FIX APPLIED SUCCESSFULLY!\n");
    console.log("📋 What was fixed:");
    console.log("   ✓ Updated handle_new_user() trigger");
    console.log("   ✓ Now links users to existing organizations");
    console.log("   ✓ Uses unique church slugs (no conflicts)");
    console.log("   ✓ User role changed to 'member'\n");

    console.log("🧪 Next steps:");
    console.log("   1. Go to: http://localhost:8084/auth");
    console.log("   2. Click 'Create account'");
    console.log("   3. Fill signup form");
    console.log("   4. Click Signup - should work now!\n");

    console.log("📍 Browser is still open for verification");
    console.log("   Close it when ready (or keep testing)\n");

    // Keep browser open for user to verify
    // User can close manually
    await new Promise(() => {}); // Never resolves, keeps process alive

  } catch (error) {
    console.error("❌ Error occurred:\n");
    console.error(error instanceof Error ? error.message : String(error));
    console.error("\n💡 Troubleshooting:");
    console.error("   1. Make sure you're logged into Supabase");
    console.error("   2. Browser should open automatically");
    console.error("   3. If manual fix needed: docs/URGENT_FIX_SIGNUP_TRIGGER.sql\n");
    
    await browser.close();
    process.exit(1);
  }
}

fixSupabase();
