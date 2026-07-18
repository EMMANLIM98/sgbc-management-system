-- Relax events RLS policy to allow all authenticated users to create events
-- This allows anyone signed up to create events in their church/organization
-- More restrictive access can be added later as needed

DROP POLICY "manage events in my churches" ON public.events;

CREATE POLICY "manage events in my churches"
  ON public.events FOR ALL TO authenticated
  USING (church_id IN (SELECT public.user_church_ids(auth.uid())))
  WITH CHECK (church_id IN (SELECT public.user_church_ids(auth.uid()))); 
