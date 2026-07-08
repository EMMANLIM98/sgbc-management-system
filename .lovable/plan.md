# Church OS — Phase 1 Foundation

A production-grade, multi-tenant SaaS foundation you can deploy and use immediately. Later phases (Finance → Sunday School → Ministry → …) reuse everything built here.

## What Phase 1 delivers

1. **Backend on Lovable Cloud** — Postgres, Auth (email+password, Google), Storage, RLS.
2. **Multi-tenancy model** — Organization owns many Churches; users have per-church role assignments.
3. **App shell** — sidebar, top bar with Org switcher, Church switcher (with "All Churches" roll-up), notifications, profile menu, global command palette (⌘K).
4. **Dashboard** — real KPIs, growth chart, offerings chart, recent activity, upcoming events, quick actions. Reads live data; "All Churches" aggregates across the org.
5. **Membership module (fully end-to-end)** — list with search/filter/sort/pagination, member profile, create/edit, attendance history, family relationships, documents (Storage), transfers, church assignment, CSV export.
6. **Foundations reused by every later module** — data table, forms, empty/loading/error states, toasts, confirm dialogs, audit log, activity feed, permissions hook.

Later phases (Finance, Sunday School, Discipleship, Ministry, Committee, Visitation, Outreach, Visitors, Event Registration + QR, Inventory) each ship as their own turn, deployable independently.

## Design direction

- Locked visual language: **Linear/Vercel** — dense, monochrome, sharp corners, tight type, subtle single accent, keyboard-first.
- Neutral palette (near-black on off-white), single restrained blue accent, no gradients, no decorative color.
- Typography: Inter tight; tabular numerals for all money/counts.
- Locale: **PHP ₱**, English. Currency formatter and date formatter centralized.
- Every list = same table primitive; every form = same field primitives; every page = same header shape.

## Architecture

Clean Architecture, adapted to the actual stack (TanStack Start, not Next.js — same layering, different router):

```text
src/
  routes/                    # Presentation (TanStack file routes)
    _authenticated/          # Managed auth gate
      dashboard.tsx
      members.tsx
      members.$id.tsx
      settings.*             # Org, churches, users, roles
    auth.tsx                 # Sign in / sign up / reset
  modules/
    membership/
      domain/                # Entities, value objects (Member, FamilyLink, MembershipStatus)
      application/           # Use cases (ListMembers, CreateMember, TransferMember…)
      infrastructure/        # SupabaseMemberRepository (implements domain interface)
      ui/                    # Components specific to membership
    dashboard/
      application/           # GetDashboardKpis, GetMembershipGrowth, GetOfferingsTrend
      infrastructure/
      ui/
    tenancy/                 # Org + Church + membership-of-user
    iam/                     # Roles, permissions, audit
  shared/
    ui/                      # Design system: Button, Table, Card, StatCard, Chart, EmptyState…
    hooks/                   # useCurrentOrg, useCurrentChurch, usePermission, useDebouncedValue
    lib/                     # money, date, csv, qr (later), pdf (later)
  integrations/supabase/     # Managed clients (do not author gate)
```

Every module follows the same 4-layer shape. UI never talks to Supabase directly — it calls use cases; use cases call repository interfaces; Supabase implementations live in `infrastructure/`.

## Database schema (Phase 1)

Multi-tenant with RLS on every table. Roles stored in a separate table (never on profiles).

```text
organizations(id, name, slug, created_at)
churches(id, organization_id, name, slug, address, currency default 'PHP', created_at)
profiles(id = auth.users.id, full_name, avatar_url, phone, created_at)

app_role         enum('super_admin','org_admin','church_admin','pastor','ministry_leader',
                     'treasurer','secretary','sunday_school_coordinator','inventory_custodian','member_viewer')

user_organizations(user_id, organization_id, is_owner)          -- org membership
user_church_roles(id, user_id, church_id, role app_role)        -- per-church roles
                                                                 -- (org_admin/super_admin resolved via helper fns)

members(id, church_id, first_name, last_name, middle_name, suffix, sex, birthdate,
        civil_status, email, phone, address, photo_url,
        membership_status enum('visitor','regular','member','inactive','transferred'),
        joined_at, baptism_date, baptism_church, notes, created_by, created_at, updated_at)

member_family_links(id, member_id, related_member_id,
                    relation enum('spouse','parent','child','sibling','guardian','other'))

member_documents(id, member_id, storage_path, filename, mime_type, size_bytes, uploaded_by, uploaded_at)

member_transfers(id, member_id, from_church_id, to_church_id, reason, transferred_at, transferred_by)

attendance_events(id, church_id, name, event_date, kind enum('service','sunday_school','ministry','event'))
attendance_records(id, event_id, member_id, present bool, checked_in_at)

activities(id, organization_id, church_id, actor_id, verb, subject_type, subject_id, meta jsonb, created_at)
notifications(id, user_id, church_id, kind, title, body, url, read_at, created_at)
```

### RLS approach (no recursion)

- Security-definer helpers: `has_org_role(uid, org_id, roles[])`, `has_church_role(uid, church_id, roles[])`, `user_church_ids(uid) returns setof uuid`.
- Every church-scoped table policy: `USING (church_id IN (SELECT user_church_ids(auth.uid())))` for reads; role-gated for writes.
- Every `CREATE TABLE` immediately followed by `GRANT`s to `authenticated` (and `anon` only where truly public — none in Phase 1).
- `service_role` grants on all tables for admin/webhook paths.
- Trigger auto-creates `profiles` row on `auth.users` insert. Trigger writes to `activities` from key inserts/updates.

## Auth & permissions

- Email + password AND Google (via `lovable.auth.signInWithOAuth('google', …)`). No GitHub/Facebook.
- Password reset with dedicated `/reset-password` page.
- Route protection via the managed `_authenticated/` layout.
- Client-side `usePermission(role | permission)` reads from a `me()` server function that returns `{ user, orgs, churches, roles }` — cached with TanStack Query, invalidated on `SIGNED_IN`/`SIGNED_OUT`/`USER_UPDATED`.
- Server functions that mutate use `requireSupabaseAuth` + role check (`has_church_role`).

## Server functions (Phase 1)

All under `src/modules/**/*.functions.ts` (never `src/server/`). Handlers are thin; call use cases.

- `tenancy`: `getMyContext`, `listMyOrganizations`, `listChurchesForOrg`, `switchChurch(churchId | 'all')`
- `dashboard`: `getKpis({scope})`, `getMembershipGrowth({scope, months})`, `getOfferingsTrend` (returns zeros in Phase 1; real in Finance phase), `getUpcomingEvents`, `getRecentActivities`
- `membership`: `listMembers({scope, q, status, page, sort})`, `getMember(id)`, `createMember(dto)`, `updateMember(id, dto)`, `archiveMember(id)`, `transferMember(id, toChurchId, reason)`, `addFamilyLink`, `removeFamilyLink`, `listMemberAttendance(id)`, `uploadMemberDocument`, `exportMembersCsv({scope, filters})`
- `settings`: `listOrgUsers`, `inviteUser`, `assignChurchRole`, `revokeChurchRole`, `updateOrgProfile`, `createChurch`, `updateChurch`

Every mutating server fn writes to `activities`.

## Routes (Phase 1)

```text
/auth                             public — sign in / sign up / forgot
/reset-password                   public
/_authenticated/dashboard         Dashboard
/_authenticated/members           List
/_authenticated/members/new       Create
/_authenticated/members/$id       Profile (Overview / Family / Attendance / Documents / Transfers)
/_authenticated/settings/organization
/_authenticated/settings/churches
/_authenticated/settings/team
/_authenticated/settings/profile
```

Every route with a loader defines `errorComponent` and `notFoundComponent`. Router sets `defaultPreloadStaleTime: 0` (already true) and `defaultErrorComponent`.

## SEO & metadata

Root `head()` gets real title/description/OG for "Church OS — Centralized Church Management". Each protected route sets its own title. `sitemap.xml` and `robots.txt` per the template recipe (only public routes: `/`, `/auth`).

## Definition of done for Phase 1

- Fresh sign-up creates an org + first church + assigns the user `org_admin`.
- User can create additional churches and invite teammates with per-church roles.
- Church switcher works; "All Churches" aggregates KPIs and lists across the org.
- Membership module: create, edit, transfer, archive, upload doc, add family link, view attendance, export CSV — all persisted, RLS-enforced, audit-logged.
- Empty/loading/error states everywhere. Toasts on every mutation. Confirm dialog on destructive actions.
- Build clean, no unresolved imports, no placeholder pages.

## Out of scope for Phase 1 (planned for later phases in this order)

Finance → Sunday School → Discipleship → Ministry → Committee → Visitation → Outreach → Visitors → Event Registration (with QR) → Inventory → Notifications realtime → Subscription/billing.

---

Reply **"go"** to start building Phase 1, or tell me what to adjust (scope, module order, roles list, extra tables).