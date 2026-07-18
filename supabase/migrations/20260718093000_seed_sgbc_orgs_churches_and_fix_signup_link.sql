-- Seed default SGBC organizations and churches, then link signup users to the selected church.

CREATE TEMP TABLE tmp_default_sgbc_orgs (
  name TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE
) ON COMMIT DROP;

INSERT INTO tmp_default_sgbc_orgs (name, slug)
VALUES
  ('SGBC - Antipolo', 'sgbc-antipolo'),
  ('SGBC - Angono', 'sgbc-angono'),
  ('SGBC - Baras', 'sgbc-baras'),
  ('SGBC - Boracay', 'sgbc-boracay'),
  ('SGBC - Cainta', 'sgbc-cainta'),
  ('SGBC - Morong', 'sgbc-morong'),
  ('SGBC - Taytay', 'sgbc-taytay');

-- Upsert organizations using slug as the stable key.
INSERT INTO public.organizations (name, slug, created_by)
SELECT d.name, d.slug, NULL
FROM tmp_default_sgbc_orgs d
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    updated_at = now();

-- If is_active exists, make sure default organizations are active.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'organizations'
      AND column_name = 'is_active'
  ) THEN
    EXECUTE '
      UPDATE public.organizations o
      SET is_active = true
      FROM tmp_default_sgbc_orgs d
      WHERE o.name = d.name
    ';
  END IF;
END;
$$;

-- Normalize existing "main" churches to match the organization display name.
UPDATE public.churches c
SET name = d.name,
    currency = COALESCE(c.currency, 'PHP'),
    updated_at = now()
FROM public.organizations o
JOIN tmp_default_sgbc_orgs d ON d.name = o.name
WHERE c.organization_id = o.id
  AND c.slug = 'main'
  AND c.name IS DISTINCT FROM d.name;

-- Ensure each default organization has one default church row.
INSERT INTO public.churches (organization_id, name, slug, currency)
SELECT o.id, d.name, 'main', 'PHP'
FROM public.organizations o
JOIN tmp_default_sgbc_orgs d ON d.name = o.name
WHERE NOT EXISTS (
  SELECT 1
  FROM public.churches c
  WHERE c.organization_id = o.id
    AND c.slug = 'main'
)
ON CONFLICT (organization_id, slug) DO NOTHING;

-- Update signup trigger:
-- 1) Link user to selected existing organization.
-- 2) Link user to that organization's default church.
-- 3) Create default church only as a fallback when missing.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_full_name TEXT;
  v_org_name TEXT;
  v_org_id UUID;
  v_church_id UUID;
BEGIN
  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );

  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, v_full_name)
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = EXCLUDED.full_name;

  v_org_name := NULLIF(NEW.raw_user_meta_data->>'organization_name', '');

  IF v_org_name IS NOT NULL THEN
    SELECT id
    INTO v_org_id
    FROM public.organizations
    WHERE name = v_org_name
    LIMIT 1;

    IF v_org_id IS NOT NULL THEN
      INSERT INTO public.user_organizations (user_id, organization_id, is_org_admin, is_owner)
      VALUES (NEW.id, v_org_id, false, false)
      ON CONFLICT (user_id, organization_id) DO NOTHING;

      -- Prefer the church with the same name as the selected org, then fallback to slug=main.
      SELECT c.id
      INTO v_church_id
      FROM public.churches c
      WHERE c.organization_id = v_org_id
        AND lower(c.name) = lower(v_org_name)
      ORDER BY c.created_at ASC
      LIMIT 1;

      IF v_church_id IS NULL THEN
        SELECT c.id
        INTO v_church_id
        FROM public.churches c
        WHERE c.organization_id = v_org_id
          AND c.slug = 'main'
        ORDER BY c.created_at ASC
        LIMIT 1;
      END IF;

      IF v_church_id IS NULL THEN
        INSERT INTO public.churches (organization_id, name, slug, currency)
        VALUES (v_org_id, v_org_name, 'main', 'PHP')
        ON CONFLICT (organization_id, slug) DO UPDATE
        SET name = EXCLUDED.name,
            currency = EXCLUDED.currency,
            updated_at = now()
        RETURNING id INTO v_church_id;
      END IF;

      IF v_church_id IS NOT NULL THEN
        INSERT INTO public.user_church_roles (user_id, church_id, role)
        VALUES (NEW.id, v_church_id, 'member_viewer')
        ON CONFLICT (user_id, church_id, role) DO NOTHING;

        INSERT INTO public.activities (
          organization_id,
          church_id,
          actor_id,
          verb,
          subject_type,
          subject_id,
          meta
        )
        VALUES (
          v_org_id,
          v_church_id,
          NEW.id,
          'joined',
          'organization',
          v_org_id,
          jsonb_build_object('name', v_org_name)
        )
        ON CONFLICT DO NOTHING;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;
