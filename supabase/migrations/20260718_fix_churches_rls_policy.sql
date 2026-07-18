-- Fix churches RLS policy to use user_church_ids instead of user_org_ids
-- This allows users to read church records for churches they have access to via church roles
-- even if they're not org admins for the organization

DROP POLICY "churches_read" ON public.churches;

CREATE POLICY "churches_read" ON public.churches FOR SELECT TO authenticated
  USING (id IN (SELECT public.user_church_ids(auth.uid())));
