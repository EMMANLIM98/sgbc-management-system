-- Relax all RLS policies to allow authenticated users full CRUD access
-- This is a temporary measure for development; implement fine-grained access control later

-- ============ CHURCHES ============
DROP POLICY IF EXISTS "churches_admin_insert" ON public.churches;
DROP POLICY IF EXISTS "churches_admin_update" ON public.churches;
DROP POLICY IF EXISTS "churches_admin_delete" ON public.churches;

CREATE POLICY "churches_insert" ON public.churches FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT public.user_org_ids(auth.uid())));

CREATE POLICY "churches_update" ON public.churches FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT public.user_org_ids(auth.uid())))
  WITH CHECK (organization_id IN (SELECT public.user_org_ids(auth.uid())));

CREATE POLICY "churches_delete" ON public.churches FOR DELETE TO authenticated
  USING (organization_id IN (SELECT public.user_org_ids(auth.uid())));

-- ============ PROFILES ============
DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;

CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_delete" ON public.profiles FOR DELETE TO authenticated
  USING (id = auth.uid());

-- ============ USER_ORGANIZATIONS ============
DROP POLICY IF EXISTS "user_orgs_admin_write" ON public.user_organizations;
DROP POLICY IF EXISTS "user_orgs_admin_update" ON public.user_organizations;
DROP POLICY IF EXISTS "user_orgs_admin_delete" ON public.user_organizations;

CREATE POLICY "user_orgs_insert" ON public.user_organizations FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "user_orgs_update" ON public.user_organizations FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "user_orgs_delete" ON public.user_organizations FOR DELETE TO authenticated
  USING (true);

-- ============ USER_CHURCH_ROLES ============
DROP POLICY IF EXISTS "ucr_admin_insert" ON public.user_church_roles;
DROP POLICY IF EXISTS "ucr_admin_delete" ON public.user_church_roles;

CREATE POLICY "ucr_insert" ON public.user_church_roles FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "ucr_update" ON public.user_church_roles FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "ucr_delete" ON public.user_church_roles FOR DELETE TO authenticated
  USING (true);

-- ============ MEMBERS ============
DROP POLICY IF EXISTS "members_delete" ON public.members;

CREATE POLICY "members_delete" ON public.members FOR DELETE TO authenticated
  USING (church_id IN (SELECT public.user_church_ids(auth.uid())));

-- ============ MEMBER_TRANSFERS ============
DROP POLICY IF EXISTS "member_transfers_update" ON public.member_transfers;
DROP POLICY IF EXISTS "member_transfers_delete" ON public.member_transfers;

CREATE POLICY "member_transfers_update" ON public.member_transfers FOR UPDATE TO authenticated
  USING (
    from_church_id IN (SELECT public.user_church_ids(auth.uid()))
    OR to_church_id IN (SELECT public.user_church_ids(auth.uid()))
  )
  WITH CHECK (
    from_church_id IN (SELECT public.user_church_ids(auth.uid()))
    OR to_church_id IN (SELECT public.user_church_ids(auth.uid()))
  );

CREATE POLICY "member_transfers_delete" ON public.member_transfers FOR DELETE TO authenticated
  USING (
    from_church_id IN (SELECT public.user_church_ids(auth.uid()))
    OR to_church_id IN (SELECT public.user_church_ids(auth.uid()))
  );

-- ============ FINANCE_CATEGORIES ============
DROP POLICY IF EXISTS "finance_categories_admin_insert" ON public.finance_categories;
DROP POLICY IF EXISTS "finance_categories_admin_update" ON public.finance_categories;
DROP POLICY IF EXISTS "finance_categories_admin_delete" ON public.finance_categories;

CREATE POLICY "finance_categories_insert" ON public.finance_categories FOR INSERT TO authenticated
  WITH CHECK (church_id IN (SELECT public.user_church_ids(auth.uid())));

CREATE POLICY "finance_categories_update" ON public.finance_categories FOR UPDATE TO authenticated
  USING (church_id IN (SELECT public.user_church_ids(auth.uid())))
  WITH CHECK (church_id IN (SELECT public.user_church_ids(auth.uid())));

CREATE POLICY "finance_categories_delete" ON public.finance_categories FOR DELETE TO authenticated
  USING (church_id IN (SELECT public.user_church_ids(auth.uid())));

-- ============ CONTRIBUTIONS ============
DROP POLICY IF EXISTS "contributions_admin_insert" ON public.contributions;
DROP POLICY IF EXISTS "contributions_admin_update" ON public.contributions;
DROP POLICY IF EXISTS "contributions_admin_delete" ON public.contributions;

CREATE POLICY "contributions_insert" ON public.contributions FOR INSERT TO authenticated
  WITH CHECK (church_id IN (SELECT public.user_church_ids(auth.uid())));

CREATE POLICY "contributions_update" ON public.contributions FOR UPDATE TO authenticated
  USING (church_id IN (SELECT public.user_church_ids(auth.uid())))
  WITH CHECK (church_id IN (SELECT public.user_church_ids(auth.uid())));

CREATE POLICY "contributions_delete" ON public.contributions FOR DELETE TO authenticated
  USING (church_id IN (SELECT public.user_church_ids(auth.uid())));

-- ============ EXPENSES ============
DROP POLICY IF EXISTS "expenses_admin_insert" ON public.expenses;
DROP POLICY IF EXISTS "expenses_admin_update" ON public.expenses;
DROP POLICY IF EXISTS "expenses_admin_delete" ON public.expenses;

CREATE POLICY "expenses_insert" ON public.expenses FOR INSERT TO authenticated
  WITH CHECK (church_id IN (SELECT public.user_church_ids(auth.uid())));

CREATE POLICY "expenses_update" ON public.expenses FOR UPDATE TO authenticated
  USING (church_id IN (SELECT public.user_church_ids(auth.uid())))
  WITH CHECK (church_id IN (SELECT public.user_church_ids(auth.uid())));

CREATE POLICY "expenses_delete" ON public.expenses FOR DELETE TO authenticated
  USING (church_id IN (SELECT public.user_church_ids(auth.uid())));

-- ============ PLEDGES ============
DROP POLICY IF EXISTS "pledges_admin_insert" ON public.pledges;
DROP POLICY IF EXISTS "pledges_admin_update" ON public.pledges;
DROP POLICY IF EXISTS "pledges_admin_delete" ON public.pledges;

CREATE POLICY "pledges_insert" ON public.pledges FOR INSERT TO authenticated
  WITH CHECK (church_id IN (SELECT public.user_church_ids(auth.uid())));

CREATE POLICY "pledges_update" ON public.pledges FOR UPDATE TO authenticated
  USING (church_id IN (SELECT public.user_church_ids(auth.uid())))
  WITH CHECK (church_id IN (SELECT public.user_church_ids(auth.uid())));

CREATE POLICY "pledges_delete" ON public.pledges FOR DELETE TO authenticated
  USING (church_id IN (SELECT public.user_church_ids(auth.uid())));

-- ============ RAFFLE_ENTRIES ============
DROP POLICY IF EXISTS "raffle_entries_admin_insert" ON public.raffle_entries;
DROP POLICY IF EXISTS "raffle_entries_admin_update" ON public.raffle_entries;
DROP POLICY IF EXISTS "raffle_entries_admin_delete" ON public.raffle_entries;

CREATE POLICY "raffle_entries_insert" ON public.raffle_entries FOR INSERT TO authenticated
  WITH CHECK (event_id IN (SELECT id FROM public.events WHERE church_id IN (SELECT public.user_church_ids(auth.uid()))));

CREATE POLICY "raffle_entries_update" ON public.raffle_entries FOR UPDATE TO authenticated
  USING (event_id IN (SELECT id FROM public.events WHERE church_id IN (SELECT public.user_church_ids(auth.uid()))))
  WITH CHECK (event_id IN (SELECT id FROM public.events WHERE church_id IN (SELECT public.user_church_ids(auth.uid()))));

CREATE POLICY "raffle_entries_delete" ON public.raffle_entries FOR DELETE TO authenticated
  USING (event_id IN (SELECT id FROM public.events WHERE church_id IN (SELECT public.user_church_ids(auth.uid()))));

-- ============ RAFFLE_DRAWS ============
DROP POLICY IF EXISTS "raffle_draws_admin_insert" ON public.raffle_draws;
DROP POLICY IF EXISTS "raffle_draws_admin_update" ON public.raffle_draws;
DROP POLICY IF EXISTS "raffle_draws_admin_delete" ON public.raffle_draws;

CREATE POLICY "raffle_draws_insert" ON public.raffle_draws FOR INSERT TO authenticated
  WITH CHECK (event_id IN (SELECT id FROM public.events WHERE church_id IN (SELECT public.user_church_ids(auth.uid()))));

CREATE POLICY "raffle_draws_update" ON public.raffle_draws FOR UPDATE TO authenticated
  USING (event_id IN (SELECT id FROM public.events WHERE church_id IN (SELECT public.user_church_ids(auth.uid()))))
  WITH CHECK (event_id IN (SELECT id FROM public.events WHERE church_id IN (SELECT public.user_church_ids(auth.uid()))));

CREATE POLICY "raffle_draws_delete" ON public.raffle_draws FOR DELETE TO authenticated
  USING (event_id IN (SELECT id FROM public.events WHERE church_id IN (SELECT public.user_church_ids(auth.uid()))));

-- ============ EVENT_CHECKINS ============
DROP POLICY IF EXISTS "event_checkins_update" ON public.event_checkins;
DROP POLICY IF EXISTS "event_checkins_delete" ON public.event_checkins;

CREATE POLICY "event_checkins_update" ON public.event_checkins FOR UPDATE TO authenticated
  USING (church_id IN (SELECT public.user_church_ids(auth.uid())))
  WITH CHECK (church_id IN (SELECT public.user_church_ids(auth.uid())));

CREATE POLICY "event_checkins_delete" ON public.event_checkins FOR DELETE TO authenticated
  USING (church_id IN (SELECT public.user_church_ids(auth.uid())));
