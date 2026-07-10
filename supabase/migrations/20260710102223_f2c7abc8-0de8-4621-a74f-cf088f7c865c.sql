
-- Backfill standard giving categories for all existing churches
INSERT INTO public.finance_categories (church_id, name, kind, color)
SELECT c.id, v.name, 'income', v.color
FROM public.churches c
CROSS JOIN (VALUES
  ('Tithes',                  '#0ea5e9'),
  ('Offering',                '#10b981'),
  ('Missions Commitment',     '#8b5cf6'),
  ('Grace Giving Commitment', '#f59e0b')
) AS v(name, color)
ON CONFLICT (church_id, kind, name) DO NOTHING;

-- Trigger to auto-seed for new churches
CREATE OR REPLACE FUNCTION public.seed_default_finance_categories()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.finance_categories (church_id, name, kind, color) VALUES
    (NEW.id, 'Tithes',                  'income', '#0ea5e9'),
    (NEW.id, 'Offering',                'income', '#10b981'),
    (NEW.id, 'Missions Commitment',     'income', '#8b5cf6'),
    (NEW.id, 'Grace Giving Commitment', 'income', '#f59e0b')
  ON CONFLICT (church_id, kind, name) DO NOTHING;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_seed_default_finance_categories ON public.churches;
CREATE TRIGGER trg_seed_default_finance_categories
AFTER INSERT ON public.churches
FOR EACH ROW EXECUTE FUNCTION public.seed_default_finance_categories();
