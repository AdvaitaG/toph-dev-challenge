# Farm-level RLS

Migration: `20260916010000_enable_farm_rls.sql`. Applied to the linked Toph Supabase project with user authorization. The original schema migration is unchanged. No frontend code or fixtures changed.

## Access model

| Actor | Reads | Writes |
|---|---|---|
| Signed out (`anon`) | None | None |
| Signed in without a provisioned profile | No rows | None |
| Member | Own farm's dashboard records and own profile | None |
| Manager / admin | Own farm's dashboard records and own profile | Create reusable tags, attach tags, detach assignments within own farm |
| Trusted database administration / service role | Administrative access, bypassing ordinary client RLS | Provision memberships and maintain data; never used as the browser's identity |

All eight application tables have RLS enabled. Authenticated users receive SELECT grants, but policies determine which rows are returned. INSERT is granted only on tags and assignments, DELETE only on assignments. No client can edit profiles, promote their own role, change farms, edit seeded work records, or delete shared tag definitions.

`profiles.id` now references `auth.users.id`, with ON DELETE CASCADE, and no independent random UUID default. Deleting an Auth identity removes its membership while existing attribution foreign keys preserve the farm's tags and assignments with a NULL creator.

## Membership source

The two functions in `toph_private` read the current verified `auth.uid()` and resolve its profile. They accept no user/farm arguments. Farm and role are read from the database on each statement; user-editable JWT metadata does not establish membership. Missing membership yields NULL farm/false management permission.

These small SECURITY DEFINER functions are owned by postgres and use an empty search path and fully qualified tables. They can inspect the protected profiles table without policy recursion. Only authenticated callers can execute them. `toph_private` must remain outside exposed Data API schemas. Their sole purpose is to return the caller's own farm/management status; they perform no writes.

SELECT policies check farm_id (or the farm's id). Profiles are narrower: users see only their own profile. Tag creation and attachment require the current farm, manager/admin status, and created_by = auth.uid(). Composite foreign keys still reject cross-farm log/tag references even if the supplied farm_id itself is valid. Managers may remove another manager's assignment within their farm because labels are farm-shared.

No automatic signup-to-farm trigger exists. New users must be assigned a farm and role through trusted administration. A signup must never infer privileged membership from editable metadata or silently join Bays Ranch.

## Verification

`node scripts/test-database-local.mjs` replays both migrations on disposable PostgreSQL 17, retains the first milestone's integrity tests, and tests RLS with two farms and four identities. It verifies both allowed operations and denied attempts: all-table read isolation, own-profile visibility, member read-only access, manager/admin tag writes, cross-farm reads/attachments/deletions, false creator attribution, profile-write denial, forged metadata, missing membership, role demotion, and Auth-user deletion.

`supabase/tests/auth-stub.sql` is strictly a local test harness implementing the small auth.users/auth.uid surface used by these policies. It is not a migration and is never deployed. These tests exercise real PostgreSQL RLS, but do not test JWT signature verification or browser sign-in.

Remote verification uses `supabase/tests/verify-rls-deployment.sql`: read-only catalogs, grant assertions, the Auth FK, helper permissions, and authenticated-role probes with no identity. Local and remote histories match. End-to-end tests with real Supabase login sessions remain part of the login/integration milestone.

## Integration boundary

The app still returns source: fixtures. Next work is cookie-based Supabase sign-in/session handling and server queries using the user's session so RLS applies. A user without a profile receives an explicit access state; do not work around it with service-role reads or broad anonymous policies. Media storage policies are separate: this migration protects recording metadata, not future objects in storage buckets.

Vercel deployment follows live reads, persistent tag integration, Auth-session tests, and visual regression checks. Git publication/deployment has not occurred.

References: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) for grants, policies, and private helper functions; [Supabase user data](https://supabase.com/docs/guides/auth/managing-user-data) for Auth-linked profiles.
