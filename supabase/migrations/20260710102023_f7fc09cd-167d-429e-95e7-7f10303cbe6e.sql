
-- Seed default giving categories per church + trigger for new churches
CREATE OR REPLACE FUNCTION public.seed_default_giving_categories(_church UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.finance_categories (church_id, name, kind, color) VALUES
    (_church, 'Tithes', 'income', '#10b981'),
    (_church, 'Offering', 'income', '#3b82f6'),
    (_church, 'Missions Commitment', 'income', '#8b5cf6'),
    (_church, 'Grace Giving Commitment', 'income', '#f59e0b')
  ON CONFLICT (church_id, kind, name) DO NOTHING;
END;
$$;

-- Seed for all existing churches
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.churches LOOP
    PERFORM public.seed_default_giving_categories(r.id);
  END LOOP;
END $$;

-- Trigger to auto-seed on new church
CREATE OR REPLACE FUNCTION public.on_church_created_seed_categories()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.seed_default_giving_categories(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_church_seed_categories ON public.churches;
CREATE TRIGGER trg_church_seed_categories
AFTER INSERT ON public.churches
FOR EACH ROW EXECUTE FUNCTION public.on_church_created_seed_categories();
