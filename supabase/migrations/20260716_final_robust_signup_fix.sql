-- Final robust fix for handle_new_user() trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_full_name TEXT;
  v_org_name TEXT;
  v_org_id UUID;
  v_church_id UUID;
BEGIN
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, v_full_name)
  ON CONFLICT (id) DO UPDATE SET email=EXCLUDED.email, full_name=EXCLUDED.full_name;
  v_org_name := COALESCE(NEW.raw_user_meta_data->>'organization_name', NULL);
  IF v_org_name IS NOT NULL THEN
    SELECT id INTO v_org_id FROM public.organizations WHERE name = v_org_name LIMIT 1;
    IF v_org_id IS NOT NULL THEN
      INSERT INTO public.user_organizations (user_id, organization_id, is_org_admin, is_owner) VALUES (NEW.id, v_org_id, false, false) ON CONFLICT DO NOTHING;
      INSERT INTO public.churches (organization_id, name, slug, currency) VALUES (v_org_id, 'Main Church', 'main-' || substr(NEW.id::text, 1, 8), 'PHP') ON CONFLICT DO NOTHING RETURNING id INTO v_church_id;
      IF v_church_id IS NOT NULL THEN
        INSERT INTO public.user_church_roles (user_id, church_id, role) VALUES (NEW.id, v_church_id, 'member') ON CONFLICT DO NOTHING;
        INSERT INTO public.activities (organization_id, church_id, actor_id, verb, subject_type, subject_id, meta) VALUES (v_org_id, v_church_id, NEW.id, 'joined', 'organization', v_org_id, jsonb_build_object('name', v_org_name)) ON CONFLICT DO NOTHING;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;