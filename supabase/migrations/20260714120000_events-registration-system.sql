-- Event Registration System
-- Comprehensive schema for events, registrations, check-ins, and analytics

-- ============ ENUMS ============

CREATE TYPE public.event_status AS ENUM ('draft', 'scheduled', 'active', 'completed', 'cancelled');
CREATE TYPE public.registration_status AS ENUM ('registered', 'checked_in', 'cancelled', 'no_show');
CREATE TYPE public.attendance_category AS ENUM ('children', 'youth', 'young_adults', 'adults', 'seniors');
CREATE TYPE public.leadership_role AS ENUM (
  'pastor', 'pastor_wife', 'pastor_children', 'associate_pastor',
  'elder', 'deacon', 'preacher', 'evangelist',
  'ministry_leader', 'none'
);
CREATE TYPE public.visitor_membership AS ENUM ('member', 'visitor', 'first_time_guest');

-- ============ EVENTS TABLE ============

CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  location TEXT,
  max_capacity INT,
  status public.event_status NOT NULL DEFAULT 'draft',
  allow_multiple_checkins BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read events in my churches"
  ON public.events FOR SELECT TO authenticated
  USING (church_id IN (SELECT public.user_church_ids(auth.uid())));

CREATE POLICY "manage events in my churches"
  ON public.events FOR ALL TO authenticated
  USING (
    has_church_role(auth.uid(), church_id, ARRAY['pastor', 'church_admin', 'ministry_leader'::app_role])
  )
  WITH CHECK (
    has_church_role(auth.uid(), church_id, ARRAY['pastor', 'church_admin', 'ministry_leader'::app_role])
  );

CREATE TRIGGER events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX events_church_idx ON public.events(church_id, event_date DESC);
CREATE INDEX events_status_idx ON public.events(status, event_date);

-- ============ EVENT REGISTRATIONS TABLE ============

CREATE TABLE public.event_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  member_id UUID REFERENCES public.members(id) ON DELETE CASCADE,
  church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Attendee information (can be guest if no member_id)
  attendee_first_name TEXT NOT NULL,
  attendee_last_name TEXT NOT NULL,
  attendee_email TEXT,
  attendee_phone TEXT,

  -- Demographics
  age_category public.attendance_category,
  sex public.sex_kind,
  visitor_status public.visitor_membership DEFAULT 'visitor',
  leadership_role public.leadership_role DEFAULT 'none',

  -- Registration state
  status public.registration_status NOT NULL DEFAULT 'registered',
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  checked_in_at TIMESTAMPTZ,
  checked_in_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Check-in details
  device_id TEXT,
  device_name TEXT,
  location_checkedin TEXT,

  -- Audit
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (event_id, member_id) -- One registration per member per event
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_registrations TO authenticated;
GRANT ALL ON public.event_registrations TO service_role;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read registrations in my churches"
  ON public.event_registrations FOR SELECT TO authenticated
  USING (church_id IN (SELECT public.user_church_ids(auth.uid())));

CREATE POLICY "write registrations in my churches"
  ON public.event_registrations FOR ALL TO authenticated
  USING (church_id IN (SELECT public.user_church_ids(auth.uid())))
  WITH CHECK (church_id IN (SELECT public.user_church_ids(auth.uid())));

CREATE TRIGGER event_registrations_updated_at
  BEFORE UPDATE ON public.event_registrations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX event_registrations_event_idx ON public.event_registrations(event_id);
CREATE INDEX event_registrations_member_idx ON public.event_registrations(member_id);
CREATE INDEX event_registrations_church_idx ON public.event_registrations(church_id);
CREATE INDEX event_registrations_status_idx ON public.event_registrations(status);
CREATE INDEX event_registrations_checkin_idx ON public.event_registrations(checked_in_at DESC);

-- ============ QR CODES TABLE ============
-- Each registration gets ONE unique QR code that is never reused
-- QR code contains a secure UUID/token, never database IDs

CREATE TABLE public.qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID NOT NULL REFERENCES public.event_registrations(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,

  -- Secure identifier for QR code (not DB ID)
  token TEXT NOT NULL UNIQUE, -- Could be encrypted or random UUID
  is_scanned BOOLEAN NOT NULL DEFAULT false,
  scanned_at TIMESTAMPTZ,
  scanned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Expiration
  expires_at TIMESTAMPTZ,
  is_expired BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.qr_codes TO authenticated;
GRANT ALL ON public.qr_codes TO service_role;
ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read qr codes in my churches"
  ON public.qr_codes FOR SELECT TO authenticated
  USING (church_id IN (SELECT public.user_church_ids(auth.uid())));

CREATE POLICY "scan qr codes in my churches"
  ON public.qr_codes FOR UPDATE TO authenticated
  USING (church_id IN (SELECT public.user_church_ids(auth.uid())))
  WITH CHECK (church_id IN (SELECT public.user_church_ids(auth.uid())));

CREATE TRIGGER qr_codes_updated_at
  BEFORE UPDATE ON public.qr_codes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX qr_codes_event_idx ON public.qr_codes(event_id);
CREATE INDEX qr_codes_registration_idx ON public.qr_codes(registration_id);
CREATE INDEX qr_codes_token_idx ON public.qr_codes(token);
CREATE INDEX qr_codes_scanned_idx ON public.qr_codes(is_scanned);

-- ============ EVENT CHECKINS TABLE ============
-- Historical record of all check-ins for audit trail

CREATE TABLE public.event_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID NOT NULL REFERENCES public.event_registrations(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  qr_code_id UUID REFERENCES public.qr_codes(id) ON DELETE SET NULL,
  church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,

  -- Check-in details
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  checked_in_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  device_id TEXT,
  device_name TEXT,
  location TEXT,
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.event_checkins TO authenticated;
GRANT ALL ON public.event_checkins TO service_role;
ALTER TABLE public.event_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read checkins in my churches"
  ON public.event_checkins FOR SELECT TO authenticated
  USING (church_id IN (SELECT public.user_church_ids(auth.uid())));

CREATE POLICY "record checkins in my churches"
  ON public.event_checkins FOR INSERT TO authenticated
  WITH CHECK (church_id IN (SELECT public.user_church_ids(auth.uid())));

CREATE INDEX event_checkins_event_idx ON public.event_checkins(event_id);
CREATE INDEX event_checkins_registration_idx ON public.event_checkins(registration_id);
CREATE INDEX event_checkins_church_idx ON public.event_checkins(church_id);
CREATE INDEX event_checkins_timestamp_idx ON public.event_checkins(checked_in_at DESC);

-- ============ RAFFLE ENTRIES TABLE ============

CREATE TABLE public.raffle_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  registration_id UUID NOT NULL REFERENCES public.event_registrations(id) ON DELETE CASCADE,
  church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,

  -- Participant info
  participant_name TEXT NOT NULL,
  participant_email TEXT,

  -- Filtering criteria
  age_category public.attendance_category,
  visitor_status public.visitor_membership,
  leadership_role public.leadership_role,

  -- Entry state
  is_winner BOOLEAN NOT NULL DEFAULT false,
  excluded BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.raffle_entries TO authenticated;
GRANT ALL ON public.raffle_entries TO service_role;
ALTER TABLE public.raffle_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read raffle entries in my churches"
  ON public.raffle_entries FOR SELECT TO authenticated
  USING (church_id IN (SELECT public.user_church_ids(auth.uid())));

CREATE POLICY "manage raffle entries in my churches"
  ON public.raffle_entries FOR ALL TO authenticated
  USING (
    has_church_role(auth.uid(), church_id, ARRAY['pastor', 'church_admin', 'ministry_leader'::app_role])
  )
  WITH CHECK (
    has_church_role(auth.uid(), church_id, ARRAY['pastor', 'church_admin', 'ministry_leader'::app_role])
  );

CREATE INDEX raffle_entries_event_idx ON public.raffle_entries(event_id);
CREATE INDEX raffle_entries_registration_idx ON public.raffle_entries(registration_id);
CREATE INDEX raffle_entries_winner_idx ON public.raffle_entries(is_winner);

-- ============ RAFFLE DRAWS TABLE ============

CREATE TABLE public.raffle_draws (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,

  winner_id UUID NOT NULL REFERENCES public.raffle_entries(id) ON DELETE CASCADE,
  prize_name TEXT NOT NULL,

  draw_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  drawn_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  draw_notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.raffle_draws TO authenticated;
GRANT ALL ON public.raffle_draws TO service_role;
ALTER TABLE public.raffle_draws ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read raffle draws in my churches"
  ON public.raffle_draws FOR SELECT TO authenticated
  USING (church_id IN (SELECT public.user_church_ids(auth.uid())));

CREATE POLICY "record raffle draws in my churches"
  ON public.raffle_draws FOR INSERT TO authenticated
  WITH CHECK (
    has_church_role(auth.uid(), church_id, ARRAY['pastor', 'church_admin', 'ministry_leader'::app_role])
  );

CREATE INDEX raffle_draws_event_idx ON public.raffle_draws(event_id);
CREATE INDEX raffle_draws_winner_idx ON public.raffle_draws(winner_id);
CREATE INDEX raffle_draws_time_idx ON public.raffle_draws(draw_time DESC);

-- ============ ATTENDANCE ANALYTICS VIEW ============
-- Pre-computed analytics for real-time dashboard

CREATE MATERIALIZED VIEW public.event_attendance_analytics AS
SELECT
  e.id as event_id,
  e.church_id,
  e.organization_id,
  e.title as event_name,
  e.event_date,
  COUNT(DISTINCT er.id) as total_registered,
  COUNT(DISTINCT CASE WHEN er.status = 'checked_in' THEN er.id END) as total_checked_in,
  COUNT(DISTINCT CASE WHEN er.status = 'checked_in' THEN er.id END)::float /
    NULLIF(COUNT(DISTINCT er.id), 0) * 100 as attendance_percentage,
  COUNT(DISTINCT CASE WHEN er.status = 'registered' THEN er.id END) as remaining_attendees,
  COUNT(DISTINCT CASE WHEN er.visitor_status = 'visitor' THEN er.id END) as visitor_count,
  COUNT(DISTINCT CASE WHEN er.visitor_status = 'member' THEN er.id END) as member_count,
  COUNT(DISTINCT CASE WHEN er.age_category = 'children' THEN er.id END) as children_count,
  COUNT(DISTINCT CASE WHEN er.age_category = 'youth' THEN er.id END) as youth_count,
  COUNT(DISTINCT CASE WHEN er.age_category = 'young_adults' THEN er.id END) as young_adults_count,
  COUNT(DISTINCT CASE WHEN er.age_category = 'adults' THEN er.id END) as adults_count,
  COUNT(DISTINCT CASE WHEN er.age_category = 'seniors' THEN er.id END) as seniors_count
FROM public.events e
LEFT JOIN public.event_registrations er ON e.id = er.event_id
GROUP BY e.id, e.church_id, e.organization_id, e.title, e.event_date;

GRANT SELECT ON public.event_attendance_analytics TO authenticated;

CREATE UNIQUE INDEX event_attendance_analytics_event_idx ON public.event_attendance_analytics(event_id);

-- Function to refresh analytics
CREATE OR REPLACE FUNCTION public.refresh_event_attendance_analytics()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.event_attendance_analytics;
$$;
