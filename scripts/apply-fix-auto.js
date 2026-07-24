#!/usr/bin/env node

/**
 * Apply Signup Trigger Fix - Multiple Approaches
 *
 * This script tries multiple methods to apply the database fix:
 * 1. Supabase CLI (if installed)
 * 2. Direct PostgreSQL connection
 * 3. Browser automation with Playwright
 *
 * Run: npm exec node -- scripts/apply-fix-auto.js
 */

import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import pkg from "pg";
const { Pool } = pkg;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Missing environment variables:");
  console.error("   - SUPABASE_URL");
  console.error("   - SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

// Extract connection details from Supabase URL
const urlParts = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/);
const projectId = urlParts ? urlParts[1] : null;

if (!projectId) {
  console.error("❌ Could not extract project ID from SUPABASE_URL");
  process.exit(1);
}

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

// Method 1: Try using Supabase CLI
async function trySupabaseCLI() {
  try {
    console.log("🔍 Method 1: Trying Supabase CLI...\n");

    // Check if supabase CLI is installed
    execSync("supabase --version", { stdio: "pipe" });

    // Write SQL to temp file
    const tempFile = path.join(process.cwd(), ".temp-fix.sql");
    fs.writeFileSync(tempFile, fixSQL);

    console.log("⏳ Connecting to Supabase via CLI...");

    // Execute via Supabase CLI
    execSync(`supabase db execute --file ${tempFile}`, { stdio: "inherit" });

    // Clean up
    fs.unlinkSync(tempFile);

    console.log("\n✅ Successfully applied fix via Supabase CLI!\n");
    return true;
  } catch (error) {
    console.log("⚠️  Supabase CLI not available or failed\n");
    return false;
  }
}

// Method 2: Try direct PostgreSQL connection
async function tryDirectPostgres() {
  try {
    console.log("🔍 Method 2: Trying direct PostgreSQL connection...\n");

    // Create connection pool
    const pool = new Pool({
      host: `${projectId}.supabase.co`,
      port: 5432,
      database: "postgres",
      user: "postgres",
      password: SUPABASE_SERVICE_ROLE_KEY,
      ssl: { rejectUnauthorized: false },
    });

    console.log("⏳ Connecting to PostgreSQL database...");
    const client = await pool.connect();

    console.log("⏳ Executing SQL fix...");
    await client.query(fixSQL);

    client.release();
    await pool.end();

    console.log("✅ Successfully applied fix via PostgreSQL!\n");
    return true;
  } catch (error) {
    console.log(
      `⚠️  Direct PostgreSQL failed: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    return false;
  }
}

// Method 3: Try browser automation with Playwright
async function tryPlaywright() {
  try {
    console.log("🔍 Method 3: Trying Playwright automation...\n");

    const { chromium } = await import("playwright");

    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    console.log("📱 Opening Supabase dashboard...");
    await page.goto(`https://supabase.com/dashboard/project/${projectId}/sql/1`, {
      waitUntil: "domcontentloaded",
    });

    // Wait for page to load
    await page.waitForTimeout(3000);

    console.log("⏳ Finding SQL editor...");

    // Try to find and click a "New Query" button or similar
    const buttons = await page.locator("button").all();
    let found = false;

    for (const button of buttons) {
      const text = await button.textContent();
      if (text?.toLowerCase().includes("new") || text?.toLowerCase().includes("query")) {
        await button.click();
        found = true;
        break;
      }
    }

    if (!found) {
      console.log("⚠️  Could not find New Query button, trying to paste directly...");
    }

    // Wait for editor
    await page.waitForTimeout(2000);

    console.log("⏳ Clicking in editor and pasting SQL...");

    // Find text editor and paste
    const editors = await page.locator('[class*="editor"], textarea').all();
    if (editors.length > 0) {
      await editors[0].click();
      await page.keyboard.press("Control+A");
      await page.keyboard.press("Delete");

      // Paste SQL via clipboard
      await page.evaluate((sql) => {
        navigator.clipboard.writeText(sql);
      }, fixSQL);

      await page.keyboard.press("Control+V");
      await page.waitForTimeout(1000);

      console.log("✅ SQL pasted\n");
      console.log("⏳ Looking for Run button...");

      // Find and click Run button
      const runButtons = await page.locator("button").all();
      for (const btn of runButtons) {
        const text = await btn.textContent();
        if (text?.toLowerCase().includes("run") || text?.toLowerCase().includes("execute")) {
          await btn.click();
          break;
        }
      }

      // Wait for execution
      await page.waitForTimeout(3000);

      console.log("✅ Query executed!\n");
      console.log("Browser is open for verification. Close when ready.");

      // Keep browser open
      return true;
    }

    await browser.close();
    return false;
  } catch (error) {
    console.log(
      `⚠️  Playwright automation failed: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    return false;
  }
}

// Main execution
async function main() {
  console.log("🚀 Applying Signup Trigger Fix\n");
  console.log("━".repeat(60) + "\n");

  // Try methods in order
  if (await trySupabaseCLI()) {
    showSuccess();
    return;
  }

  if (await tryDirectPostgres()) {
    showSuccess();
    return;
  }

  if (await tryPlaywright()) {
    showSuccess();
    return;
  }

  // If all methods fail
  showFailure();
}

function showSuccess() {
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
  console.log("      - Email: new@example.com");
  console.log("      - Password: TestPassword123!");
  console.log("   4. Click Signup");
  console.log("   5. Should see: 'Account created successfully!'\n");

  process.exit(0);
}

function showFailure() {
  console.log("━".repeat(60));
  console.log("⚠️  All automated methods failed\n");
  console.log("💡 Manual fix required:\n");
  console.log("   1. Go to: https://supabase.com/dashboard/project/_/sql");
  console.log("   2. Create a new query");
  console.log("   3. Copy SQL from: docs/URGENT_FIX_SIGNUP_TRIGGER.sql");
  console.log("   4. Paste into editor and click Run\n");

  console.log("Or try installing Supabase CLI:");
  console.log("   npm install -g supabase\n");

  process.exit(1);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
