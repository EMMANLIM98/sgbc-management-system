
-- Extend app_role with treasurer (if not present)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='treasurer' AND enumtypid = (SELECT oid FROM pg_type WHERE typname='app_role')) THEN
    ALTER TYPE app_role ADD VALUE 'treasurer';
  END IF;
END $$;

-- CATEGORIES
CREATE TABLE public.finance_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('income','expense')),
  color TEXT,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (church_id, kind, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_categories TO authenticated;
GRANT ALL ON public.finance_categories TO service_role;
ALTER TABLE public.finance_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY finance_categories_read ON public.finance_categories FOR SELECT
  USING (church_id IN (SELECT user_church_ids(auth.uid())));
CREATE POLICY finance_categories_write ON public.finance_categories FOR ALL
  USING (has_church_role(auth.uid(), church_id, ARRAY['church_admin','pastor','secretary','treasurer']::app_role[]))
  WITH CHECK (has_church_role(auth.uid(), church_id, ARRAY['church_admin','pastor','secretary','treasurer']::app_role[]));
CREATE TRIGGER trg_finance_categories_updated BEFORE UPDATE ON public.finance_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- CONTRIBUTIONS
CREATE TABLE public.contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.finance_categories(id) ON DELETE SET NULL,
  member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  amount NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'PHP',
  method TEXT CHECK (method IN ('cash','check','bank','online','other')),
  reference TEXT,
  note TEXT,
  occurred_on DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_contributions_church_date ON public.contributions(church_id, occurred_on DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contributions TO authenticated;
GRANT ALL ON public.contributions TO service_role;
ALTER TABLE public.contributions ENABLE ROW LEVEL SECURITY;
CREATE POLICY contributions_read ON public.contributions FOR SELECT
  USING (church_id IN (SELECT user_church_ids(auth.uid())));
CREATE POLICY contributions_write ON public.contributions FOR ALL
  USING (has_church_role(auth.uid(), church_id, ARRAY['church_admin','pastor','secretary','treasurer']::app_role[]))
  WITH CHECK (has_church_role(auth.uid(), church_id, ARRAY['church_admin','pastor','secretary','treasurer']::app_role[]));
CREATE TRIGGER trg_contributions_updated BEFORE UPDATE ON public.contributions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- EXPENSES
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.finance_categories(id) ON DELETE SET NULL,
  amount NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'PHP',
  payee TEXT,
  method TEXT CHECK (method IN ('cash','check','bank','online','other')),
  reference TEXT,
  note TEXT,
  occurred_on DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_expenses_church_date ON public.expenses(church_id, occurred_on DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY expenses_read ON public.expenses FOR SELECT
  USING (church_id IN (SELECT user_church_ids(auth.uid())));
CREATE POLICY expenses_write ON public.expenses FOR ALL
  USING (has_church_role(auth.uid(), church_id, ARRAY['church_admin','pastor','secretary','treasurer']::app_role[]))
  WITH CHECK (has_church_role(auth.uid(), church_id, ARRAY['church_admin','pastor','secretary','treasurer']::app_role[]));
CREATE TRIGGER trg_expenses_updated BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Activity logging triggers
CREATE OR REPLACE FUNCTION public.log_contribution_activity()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_org UUID;
BEGIN
  SELECT organization_id INTO v_org FROM public.churches WHERE id = NEW.church_id;
  INSERT INTO public.activities(organization_id, church_id, actor_id, verb, subject_type, subject_id, meta)
  VALUES (v_org, NEW.church_id, NEW.created_by, 'recorded', 'contribution', NEW.id,
    jsonb_build_object('amount', NEW.amount, 'currency', NEW.currency));
  RETURN NEW;
END $$;
CREATE TRIGGER trg_log_contribution AFTER INSERT ON public.contributions
  FOR EACH ROW EXECUTE FUNCTION public.log_contribution_activity();

CREATE OR REPLACE FUNCTION public.log_expense_activity()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_org UUID;
BEGIN
  SELECT organization_id INTO v_org FROM public.churches WHERE id = NEW.church_id;
  INSERT INTO public.activities(organization_id, church_id, actor_id, verb, subject_type, subject_id, meta)
  VALUES (v_org, NEW.church_id, NEW.created_by, 'recorded', 'expense', NEW.id,
    jsonb_build_object('amount', NEW.amount, 'currency', NEW.currency, 'payee', NEW.payee));
  RETURN NEW;
END $$;
CREATE TRIGGER trg_log_expense AFTER INSERT ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.log_expense_activity();
