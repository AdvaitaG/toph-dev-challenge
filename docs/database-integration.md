# Supabase dashboard integration

The existing foundation was verified before integration. No Auth implementation, RLS policy, SQL migration, seed, or remote schema was changed. The app now reads Supabase through the existing authenticated cookie client. No privileged key or fixture fallback is used.

## Foundation verified

- Both local migrations match remote history: `20260916000000` and `20260916010000`.
- Existing read-only deployment checks passed: eight RLS tables, no anonymous reads, Auth/profile FK, no client UPDATE grants, and no data returned without an identity.
- The real demo manager profile resolves to Bays Ranch. Public-client reads returned one farm, 12 employees, four fields, five logs, five recording metadata rows, and the existing Needs Review definition.
- Expected metrics remain 5 recordings, 1 new, 12 active workers, 90 accuracy, and four pending logs. No foundation mismatch was found.

## Application changes

| File | Responsibility |
| --- | --- |
| `src/lib/queries/dashboard.ts` | Farm-scoped reads, normalized-row adaptation, database-derived metrics, and `source: "supabase"`. |
| `src/lib/data/farm-access.ts` | Verifies claims, reads the caller's profile, derives farm and manager permission. No caller-supplied farm or role. Reuses the existing cookie client. |
| `src/lib/data/read-all.ts` | Stable, ID-ordered pages to avoid silent PostgREST row-limit truncation. |
| `src/types/database.ts` | TypeScript types generated from the existing remote public schema. No schema mutation. |
| `src/app/logs/actions.ts` | Validated add/remove tag actions using the user's public client and existing RLS; revalidates `/` on success. |
| `src/components/logs/log-details.tsx` | Existing form now saves real tags; pending, failure, duplicate, and removal states. |
| `src/components/logs/activity-log-table.tsx` | Removes preview state; adds a Tag selector inside the existing filter popover. |
| `src/app/page.tsx`, `src/app/error.tsx` | Explicit missing-membership and database-failure states. Next's `retry()` refetches a failed server render. |
| `next.config.ts` | Disables the development-only Server Component HMR fetch cache so successful writes appear immediately on localhost. Production behavior and authentication remain unchanged. |

DashboardData retains its structure. `LogTag.id` identifies the assignment so a removal detaches only that log. `ownerUserId` retains its existing name for compatibility but represents nullable assignment attribution, never ownership or authorization; its type was widened to `string | null` to match SQL. Stylesheets, Figma assets, auth modules, migrations, and fixtures were not edited.

## Reads and metrics

The server verifies identity, resolves profile membership, loads only that farm's rows, and flattens employee, field, recording, and tag relationships into the existing UI shape. RLS remains the enforcement layer even with explicit farm filters. A user without membership receives an access message; the app never defaults them to Bays Ranch.

The demo reference date remains April 22, 2026, disclosed through About and the recordings card. Recordings are counted by receipt date in the farm timezone, including recordings belonging to reviewed logs. Accuracy averages each relevant log once, avoiding duplicate weighting when a log has several recordings. Workers are counted independently of visible logs. Only pending logs populate the table.

The existing single-recording UI uses the latest recording per log, with ID as a deterministic tie-breaker. A missing employee, field, or recording on a displayed log produces an error rather than inventing required contract values. Seeded recording storage and coordinates remain null. A configured recording object uses a user-authorized signed URL; that future asset path has not been verified with a real audio file. The map remains the honestly labeled Figma preview.

## Tags and Needs Review

1. Send only the log ID and tag name to the Server Action.
2. Validate the ID/name, verify the current session, resolve the profile, require manager/admin, and read the target log under farm scope and RLS.
3. Normalize whitespace; reuse a case-insensitive farm tag definition. Escape LIKE wildcards so `%` and `_` remain literal characters.
4. If a concurrent request creates the definition first, recover from the unique conflict by reading it again. Assignment duplicates are idempotent. No UPDATE permission is required.
5. Insert the log/tag relationship with the authenticated user as creator, then revalidate the route. The UI displays persisted records, not an optimistic success that could disappear on refresh.
6. Filter by Needs Review inside the existing Filter control. Remove the tag to detach that log; the shared definition and other logs' assignments remain.

Needs Review is a reusable tag, distinct from `activity_logs.review_status`. Removing it does not mark a pending log reviewed. The optional Reviewed state machine was not implemented because the current policies intentionally prohibit activity-log updates.

## Verification

- `npm run check`: lint and type checking pass.
- Production builds pass with both isolated test settings and real Supabase settings.
- `npm run test:e2e`: **17 passed**. Covers auth regression, layout/interactions, new reusable tags, refresh persistence, duplicate prevention, Needs Review filtering/removal, failed writes and retry, member write denial, missing membership, database-error recovery, and hydration.
- `node scripts/test-database-local.mjs`: existing schema, seed replay, constraints, and RLS tests pass in disposable PostgreSQL, including two farms, roles, missing membership, forged metadata, and prohibited cross-farm writes. No remote test tenants were created.
- `scripts/verify-dashboard-live.mjs`: opt-in Chrome verification with the real manager account and public key passed load → tag two logs → refresh → filter → independent browser sign-in → remove tags → logout against the production instance. API checks confirmed saved relationships. Only the test's assignments were removed afterward; original seed data and the tag definition were preserved.
- The same live workflow subsequently passed on localhost:3000. A stale post-save response in development was traced to Next's HMR fetch cache and fixed with `experimental.serverComponentsHmrCache: false`, as documented in the installed Next 16.3.5 fetch/config guides. Restarting alone did not fix the cache behavior.
- Production default and expanded captures in `docs/qa/database/` match `docs/qa/authentication/` in dimensions and pixel content: **zero changed pixels** for both untouched dashboard states.

The automated suite uses a loopback Auth/PostgREST protocol double with per-session test data. It validates the real Next query/action/UI path but does not prove actual database security or durable storage by itself. The PostgreSQL isolation suite and real-project browser/API checks provide those separate checks. Live credentials are supplied through environment variables and are not stored in the verification script or screenshots.

## Interview decisions and limits

- Reuse the existing client, policies, constraints, and schema rather than expand infrastructure for a tag workflow.
- Keep database adaptation on the server to preserve the completed UI and avoid exposing unrelated farm records.
- Reuse tag definitions and detach relationships rather than deleting shared vocabulary.
- Definition creation and assignment insertion are two calls, not an atomic transaction. If attachment fails, an unused reusable definition may remain; retry safely reuses it. Adding a database function solely for atomicity was outside the no-migration scope.
- Page through data to avoid response caps, but load the farm's small dataset for client filtering and metric calculation. This is appropriate for the challenge; a large production farm would need bounded date queries, server pagination, and database aggregates. Multiple reads are not a transactionally consistent snapshot.
- Preserve field coordinates as reference points, not worker tracking. Do not invent audio or geolocation from the design.
- Public signup, new schema/policies, deployment, Git commits, and pushes are outside this milestone.
