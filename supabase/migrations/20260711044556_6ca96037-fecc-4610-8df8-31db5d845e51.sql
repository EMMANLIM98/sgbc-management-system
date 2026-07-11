
CREATE TABLE public.pledges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.finance_categories(id) ON DELETE RESTRICT,
  campaign TEXT,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'PHP',
  frequency TEXT NOT NULL DEFAULT 'one_time' CHECK (frequency IN ('one_time','weekly','monthly','quarterly','annually')),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','fulfilled','cancelled')),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pledges TO authenticated;
GRANT ALL ON public.pledges TO service_role;

ALTER TABLE public.pledges ENABLE ROW LEVEL SECURITY;

CREATE POLICY pledges_read ON public.pledges
  FOR SELECT USING (church_id IN (SELECT public.user_church_ids(auth.uid())));

CREATE POLICY pledges_write ON public.pledges
  FOR ALL USING (public.has_church_role(auth.uid(), church_id, ARRAY['church_admin','pastor','secretary','treasurer']::app_role[]))
  WITH CHECK (public.has_church_role(auth.uid(), church_id, ARRAY['church_admin','pastor','secretary','treasurer']::app_role[]));

CREATE INDEX pledges_church_idx ON public.pledges(church_id);
CREATE INDEX pledges_member_idx ON public.pledges(member_id);
CREATE INDEX pledges_status_idx ON public.pledges(status);

CREATE TRIGGER trg_pledges_updated
  BEFORE UPDATE ON public.pledges
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
