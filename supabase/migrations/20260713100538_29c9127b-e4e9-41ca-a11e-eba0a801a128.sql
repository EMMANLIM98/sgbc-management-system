-- Visitors module
CREATE TYPE public.visitor_source AS ENUM ('invited', 'walk_in');

CREATE TABLE public.visitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  full_name TEXT NOT NULL,
  age INT,
  address TEXT,
  contact_number TEXT,
  source public.visitor_source NOT NULL DEFAULT 'walk_in',
  invited_by TEXT,
  can_visit BOOLEAN NOT NULL DEFAULT false,
  visit_when DATE,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.visitors TO authenticated;
GRANT ALL ON public.visitors TO service_role;

ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read visitors in my churches"
  ON public.visitors FOR SELECT TO authenticated
  USING (church_id IN (SELECT public.user_church_ids(auth.uid())));

CREATE POLICY "write visitors in my churches"
  ON public.visitors FOR ALL TO authenticated
  USING (church_id IN (SELECT public.user_church_ids(auth.uid())))
  WITH CHECK (church_id IN (SELECT public.user_church_ids(auth.uid())));

CREATE TRIGGER visitors_updated_at
  BEFORE UPDATE ON public.visitors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX visitors_church_idx ON public.visitors(church_id, visit_date DESC);