#!/usr/bin/env node

// Direct SQL execution script - applies the handle_new_user() fix
// This must be run from a protected environment (Node backend, not browser)

import { config } from 'dotenv';
import https from 'https';

config();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SECRET_KEY) {
  console.error('❌ SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY not found in .env');
  process.exit(1);
}

const sql = `CREATE OR REPLACE FUNCTION public.handle_new_user()
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
  VALUES (NEW.id, NEW.email, v_full_name)
  ON CONFLICT (id) DO UPDATE SET email=EXCLUDED.email, full_name=COALESCE(EXCLUDED.full_name, public.profiles.full_name);

  v_org_name := COALESCE(NEW.raw_user_meta_data->>'organization_name', NULL);

  SELECT id INTO v_org_id FROM public.organizations
  WHERE name = v_org_name
  LIMIT 1;

  IF v_org_id IS NOT NULL THEN
    INSERT INTO public.user_organizations (user_id, organization_id, is_org_admin, is_owner)
    VALUES (NEW.id, v_org_id, false, false)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.churches (organization_id, name, slug, currency)
    VALUES (v_org_id, 'Main Church', 'main-' || substr(NEW.id::text, 1, 8), 'PHP')
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_church_id;

    IF v_church_id IS NOT NULL THEN
      INSERT INTO public.user_church_roles (user_id, church_id, role)
      VALUES (NEW.id, v_church_id, 'member')
      ON CONFLICT DO NOTHING;

      INSERT INTO public.activities (organization_id, church_id, actor_id, verb, subject_type, subject_id, meta)
      VALUES (v_org_id, v_church_id, NEW.id, 'joined', 'organization', v_org_id,
              jsonb_build_object('name', v_org_name))
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user error for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;`;

const payload = JSON.stringify({ query: sql });

const url = new URL(`${SUPABASE_URL}/rest/v1/`);
const queryParam = new URLSearchParams();
queryParam.append('apikey', SUPABASE_SECRET_KEY);

const options = {
  hostname: url.hostname,
  port: 443,
  path: `/rest/v1/?${queryParam.toString()}`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
    'apikey': SUPABASE_SECRET_KEY,
    'Authorization': `Bearer ${SUPABASE_SECRET_KEY}`,
  },
};

console.log('🔄 Applying database migration...');
console.log(`📍 Target: ${SUPABASE_URL}`);

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 200 || res.statusCode === 204) {
      console.log('✅ Migration applied successfully!');
      console.log(`   Status: ${res.statusCode}`);
      console.log(`   Response: ${data || '(empty)'}`);
    } else if (res.statusCode === 201) {
      console.log('✅ SQL executed (201 Created)');
      console.log(`   Response: ${data || '(empty)'}`);
    } else {
      console.error(`❌ Failed with status ${res.statusCode}`);
      console.error(`   Response: ${data}`);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});

req.write(payload);
req.end();
