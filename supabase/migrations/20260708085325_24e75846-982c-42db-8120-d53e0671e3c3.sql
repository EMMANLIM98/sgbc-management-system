
-- ============ EXTENSIONS ============
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM (
  'super_admin','org_admin','church_admin','pastor','ministry_leader',
  'treasurer','secretary','sunday_school_coordinator','inventory_custodian','member_viewer'
);
CREATE TYPE public.membership_status AS ENUM ('visitor','regular','member','inactive','transferred');
CREATE TYPE public.family_relation AS ENUM ('spouse','parent','child','sibling','guardian','other');
CREATE TYPE public.attendance_kind AS ENUM ('service','sunday_school','ministry','event');
CREATE TYPE public.civil_status AS ENUM ('single','married','widowed','separated','divorced');
CREATE TYPE public.sex_kind AS ENUM ('male','female');

-- ============ UPDATED_AT HELPER ============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- ============ ORGANIZATIONS ============
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_orgs_updated BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ CHURCHES ============
CREATE TABLE public.churches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  address TEXT,
  city TEXT,
  currency TEXT NOT NULL DEFAULT 'PHP',
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, slug)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.churches TO authenticated;
GRANT ALL ON public.churches TO service_role;
ALTER TABLE public.churches ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_churches_org ON public.churches(organization_id);
CREATE TRIGGER trg_churches_updated BEFORE UPDATE ON public.churches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ USER-ORG MEMBERSHIP ============
CREATE TABLE public.user_organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  is_org_admin BOOLEAN NOT NULL DEFAULT false,
  is_owner BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, organization_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_organizations TO authenticated;
GRANT ALL ON public.user_organizations TO service_role;
ALTER TABLE public.user_organizations ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_user_orgs_user ON public.user_organizations(user_id);
CREATE INDEX idx_user_orgs_org ON public.user_organizations(organization_id);

-- ============ USER-CHURCH ROLES ============
CREATE TABLE public.user_church_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, church_id, role)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_church_roles TO authenticated;
GRANT ALL ON public.user_church_roles TO service_role;
ALTER TABLE public.user_church_roles ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_ucr_user ON public.user_church_roles(user_id);
CREATE INDEX idx_ucr_church ON public.user_church_roles(church_id);

-- ============ SECURITY DEFINER HELPERS (no RLS recursion) ============
CREATE OR REPLACE FUNCTION public.is_org_member(_user UUID, _org UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_organizations WHERE user_id = _user AND organization_id = _org);
$$;

CREATE OR REPLACE FUNCTION public.is_org_admin(_user UUID, _org UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_organizations
    WHERE user_id = _user AND organization_id = _org AND is_org_admin = true);
$$;

CREATE OR REPLACE FUNCTION public.user_org_ids(_user UUID)
RETURNS SETOF UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT organization_id FROM public.user_organizations WHERE user_id = _user;
$$;

CREATE OR REPLACE FUNCTION public.user_church_ids(_user UUID)
RETURNS SETOF UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  -- Any church in an org where the user is org_admin, OR any church they have a role in
  SELECT id FROM public.churches WHERE organization_id IN (
    SELECT organization_id FROM public.user_organizations
      WHERE user_id = _user AND is_org_admin = true
  )
  UNION
  SELECT church_id FROM public.user_church_roles WHERE user_id = _user;
$$;

CREATE OR REPLACE FUNCTION public.has_church_role(_user UUID, _church UUID, _roles public.app_role[])
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    EXISTS (
      SELECT 1 FROM public.user_church_roles
      WHERE user_id = _user AND church_id = _church AND role = ANY(_roles)
    )
    OR EXISTS (
      SELECT 1 FROM public.churches c
      JOIN public.user_organizations uo
        ON uo.organization_id = c.organization_id AND uo.user_id = _user
      WHERE c.id = _church AND uo.is_org_admin = true
    );
$$;

-- ============ ORG / CHURCH / PROFILE POLICIES ============
CREATE POLICY "orgs_read" ON public.organizations FOR SELECT TO authenticated
  USING (id IN (SELECT public.user_org_ids(auth.uid())));
CREATE POLICY "orgs_admin_update" ON public.organizations FOR UPDATE TO authenticated
  USING (public.is_org_admin(auth.uid(), id));
CREATE POLICY "orgs_insert_self" ON public.organizations FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "churches_read" ON public.churches FOR SELECT TO authenticated
  USING (organization_id IN (SELECT public.user_org_ids(auth.uid())));
CREATE POLICY "churches_admin_insert" ON public.churches FOR INSERT TO authenticated
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));
CREATE POLICY "churches_admin_update" ON public.churches FOR UPDATE TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id));
CREATE POLICY "churches_admin_delete" ON public.churches FOR DELETE TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "profiles_read_self" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR id IN (
    SELECT user_id FROM public.user_organizations
    WHERE organization_id IN (SELECT public.user_org_ids(auth.uid()))
  ));
CREATE POLICY "profiles_update_self" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid());
CREATE POLICY "profiles_insert_self" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "user_orgs_read_self" ON public.user_organizations FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_org_admin(auth.uid(), organization_id));
CREATE POLICY "user_orgs_admin_write" ON public.user_organizations FOR INSERT TO authenticated
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));
CREATE POLICY "user_orgs_admin_update" ON public.user_organizations FOR UPDATE TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id));
CREATE POLICY "user_orgs_admin_delete" ON public.user_organizations FOR DELETE TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "ucr_read" ON public.user_church_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR church_id IN (SELECT public.user_church_ids(auth.uid())));
CREATE POLICY "ucr_admin_insert" ON public.user_church_roles FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.churches c
    WHERE c.id = church_id AND public.is_org_admin(auth.uid(), c.organization_id)));
CREATE POLICY "ucr_admin_delete" ON public.user_church_roles FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.churches c
    WHERE c.id = church_id AND public.is_org_admin(auth.uid(), c.organization_id)));

-- ============ MEMBERS ============
CREATE TABLE public.members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  middle_name TEXT,
  suffix TEXT,
  sex public.sex_kind,
  birthdate DATE,
  civil_status public.civil_status,
  email TEXT,
  phone TEXT,
  address TEXT,
  photo_url TEXT,
  membership_status public.membership_status NOT NULL DEFAULT 'visitor',
  joined_at DATE,
  baptism_date DATE,
  baptism_church TEXT,
  wedding_date DATE,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.members TO authenticated;
GRANT ALL ON public.members TO service_role;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_members_church ON public.members(church_id);
CREATE INDEX idx_members_status ON public.members(church_id, membership_status);
CREATE INDEX idx_members_name ON public.members(church_id, last_name, first_name);
CREATE TRIGGER trg_members_updated BEFORE UPDATE ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "members_read" ON public.members FOR SELECT TO authenticated
  USING (church_id IN (SELECT public.user_church_ids(auth.uid())));
CREATE POLICY "members_insert" ON public.members FOR INSERT TO authenticated
  WITH CHECK (church_id IN (SELECT public.user_church_ids(auth.uid())));
CREATE POLICY "members_update" ON public.members FOR UPDATE TO authenticated
  USING (church_id IN (SELECT public.user_church_ids(auth.uid())));
CREATE POLICY "members_delete" ON public.members FOR DELETE TO authenticated
  USING (public.has_church_role(auth.uid(), church_id, ARRAY['church_admin','pastor','secretary']::public.app_role[]));

-- ============ FAMILY LINKS ============
CREATE TABLE public.member_family_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  related_member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  relation public.family_relation NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (member_id, related_member_id, relation),
  CHECK (member_id <> related_member_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_family_links TO authenticated;
GRANT ALL ON public.member_family_links TO service_role;
ALTER TABLE public.member_family_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mfl_all" ON public.member_family_links FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.members m WHERE m.id = member_id
    AND m.church_id IN (SELECT public.user_church_ids(auth.uid()))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.members m WHERE m.id = member_id
    AND m.church_id IN (SELECT public.user_church_ids(auth.uid()))));

-- ============ MEMBER DOCUMENTS ============
CREATE TABLE public.member_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  filename TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_documents TO authenticated;
GRANT ALL ON public.member_documents TO service_role;
ALTER TABLE public.member_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mdoc_all" ON public.member_documents FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.members m WHERE m.id = member_id
    AND m.church_id IN (SELECT public.user_church_ids(auth.uid()))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.members m WHERE m.id = member_id
    AND m.church_id IN (SELECT public.user_church_ids(auth.uid()))));

-- ============ MEMBER TRANSFERS ============
CREATE TABLE public.member_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  from_church_id UUID REFERENCES public.churches(id) ON DELETE SET NULL,
  to_church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  reason TEXT,
  transferred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  transferred_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_transfers TO authenticated;
GRANT ALL ON public.member_transfers TO service_role;
ALTER TABLE public.member_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mtr_read" ON public.member_transfers FOR SELECT TO authenticated
  USING (to_church_id IN (SELECT public.user_church_ids(auth.uid()))
      OR from_church_id IN (SELECT public.user_church_ids(auth.uid())));
CREATE POLICY "mtr_insert" ON public.member_transfers FOR INSERT TO authenticated
  WITH CHECK (to_church_id IN (SELECT public.user_church_ids(auth.uid())));

-- ============ ATTENDANCE ============
CREATE TABLE public.attendance_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  event_date DATE NOT NULL,
  kind public.attendance_kind NOT NULL DEFAULT 'service',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_events TO authenticated;
GRANT ALL ON public.attendance_events TO service_role;
ALTER TABLE public.attendance_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_att_events_church_date ON public.attendance_events(church_id, event_date DESC);
CREATE POLICY "att_events_all" ON public.attendance_events FOR ALL TO authenticated
  USING (church_id IN (SELECT public.user_church_ids(auth.uid())))
  WITH CHECK (church_id IN (SELECT public.user_church_ids(auth.uid())));

CREATE TABLE public.attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.attendance_events(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  present BOOLEAN NOT NULL DEFAULT true,
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, member_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_records TO authenticated;
GRANT ALL ON public.attendance_records TO service_role;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_att_rec_member ON public.attendance_records(member_id);
CREATE POLICY "att_rec_all" ON public.attendance_records FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.attendance_events e WHERE e.id = event_id
    AND e.church_id IN (SELECT public.user_church_ids(auth.uid()))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.attendance_events e WHERE e.id = event_id
    AND e.church_id IN (SELECT public.user_church_ids(auth.uid()))));

-- ============ ACTIVITIES / NOTIFICATIONS ============
CREATE TABLE public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  church_id UUID REFERENCES public.churches(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  verb TEXT NOT NULL,
  subject_type TEXT,
  subject_id UUID,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activities TO authenticated;
GRANT ALL ON public.activities TO service_role;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_activities_org ON public.activities(organization_id, created_at DESC);
CREATE INDEX idx_activities_church ON public.activities(church_id, created_at DESC);
CREATE POLICY "activities_read" ON public.activities FOR SELECT TO authenticated
  USING (
    (church_id IS NOT NULL AND church_id IN (SELECT public.user_church_ids(auth.uid())))
    OR (organization_id IS NOT NULL AND organization_id IN (SELECT public.user_org_ids(auth.uid())))
  );
CREATE POLICY "activities_insert" ON public.activities FOR INSERT TO authenticated
  WITH CHECK (
    (church_id IS NULL OR church_id IN (SELECT public.user_church_ids(auth.uid())))
    AND (organization_id IS NULL OR organization_id IN (SELECT public.user_org_ids(auth.uid())))
  );

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  church_id UUID REFERENCES public.churches(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  url TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_notif_user ON public.notifications(user_id, created_at DESC);
CREATE POLICY "notif_read_self" ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "notif_update_self" ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- ============ SIGNUP TRIGGER: profile + starter org + first church + org_admin ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_full_name TEXT;
  v_org_name TEXT;
  v_org_slug TEXT;
  v_org_id UUID;
  v_church_id UUID;
BEGIN
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name',
                          NEW.raw_user_meta_data->>'name',
                          split_part(NEW.email, '@', 1));

  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, v_full_name);

  v_org_name := COALESCE(NEW.raw_user_meta_data->>'organization_name',
                         v_full_name || '''s Organization');
  v_org_slug := lower(regexp_replace(v_org_name, '[^a-zA-Z0-9]+', '-', 'g'))
                || '-' || substr(NEW.id::text, 1, 8);

  INSERT INTO public.organizations (name, slug, created_by)
  VALUES (v_org_name, v_org_slug, NEW.id)
  RETURNING id INTO v_org_id;

  INSERT INTO public.user_organizations (user_id, organization_id, is_org_admin, is_owner)
  VALUES (NEW.id, v_org_id, true, true);

  INSERT INTO public.churches (organization_id, name, slug, currency)
  VALUES (v_org_id, 'Main Church', 'main', 'PHP')
  RETURNING id INTO v_church_id;

  INSERT INTO public.user_church_roles (user_id, church_id, role)
  VALUES (NEW.id, v_church_id, 'org_admin');

  INSERT INTO public.activities (organization_id, church_id, actor_id, verb, subject_type, subject_id, meta)
  VALUES (v_org_id, v_church_id, NEW.id, 'created', 'organization', v_org_id,
          jsonb_build_object('name', v_org_name));

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ ACTIVITY LOG TRIGGER FOR MEMBERS ============
CREATE OR REPLACE FUNCTION public.log_member_activity()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_org UUID;
BEGIN
  SELECT organization_id INTO v_org FROM public.churches WHERE id = NEW.church_id;
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.activities(organization_id, church_id, actor_id, verb, subject_type, subject_id, meta)
    VALUES (v_org, NEW.church_id, NEW.created_by, 'created', 'member', NEW.id,
      jsonb_build_object('name', NEW.first_name || ' ' || NEW.last_name));
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_log_member_insert AFTER INSERT ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.log_member_activity();
