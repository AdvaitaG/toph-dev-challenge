# Architecture and decisions

## Current scope and status

The user adopted [the Final “Wow Us” Build Plan](build-plan.md) on September 16, 2026. It supersedes the earlier Astra/Fugu plan. The original Next.js, TypeScript, Tailwind, Supabase/PostgreSQL, and Vercel choices remain. The new plan expands the future backend to normalized fields/recordings/tags, Supabase Auth, farm isolation, and one review workflow.

**Implemented:** the screenshot frontend, generic expansion, search/sort/filters, selection, persistent reusable tags and Needs Review filtering, a reference-map preview, deployed schema/seed, Supabase Auth sessions, farm-level RLS, and live database reads. **Not implemented:** real audio assets, location-based maps, or deployment. See [RLS implementation](rls.md) for policies and verification.

The challenge PDF is preserved in `docs/design/challenge.pdf`. It prioritizes visual accuracy, a working persistent backend, and the ability to justify decisions. Its submission instructions specify Thursday at 8pm and no subsequent commits; the PDF does not state a timezone. Committing, pushing, deploying, and sending a submission remain separate user-requested milestones.

## Application shape

```text
Server page
  -> server-only getDashboardData()
  -> serializable DashboardData
  -> Dashboard / Sidebar / ActivityLogTable
  -> expanded LogDetails
```

The server-only dashboard query loads normalized Supabase records and adapts them to DashboardData. Browser components receive authorized records, never database clients with privileged credentials. Failed reads show an error and retry state; there is no fixture fallback. See [integration details](database-integration.md).

The screenshot is implemented as real DOM elements and native controls. Only the avatar and map imagery use a CSS crop of the supplied reference image. The map is explicitly labeled a design preview, and its marker is not claimed to represent the selected log. The SVG waveform is decorative and is not synchronized with audio. Null audio produces an unavailable message instead of simulated playback.

Native `<dialog>` handles map expansion and dashboard information, including focus containment and Escape dismissal. Client-side filters are appropriate for the four loaded records; after backend integration, only already-authorized data may reach this filtering layer.

## Refined backend proposal for the new plan

The schema and RLS milestones are implemented in version-controlled migrations and applied to the linked Supabase project with user authorization; see [database review](database-review.md) and [RLS implementation](rls.md). Profiles now have an Auth FK. Query integration and login/session handling are implemented. The proposal below describes the eventual application integration and replaces the earlier four-table, anonymous-visitor-owned-tag proposal.

| Table | Purpose and principal columns |
| --- | --- |
| `farms` | Tenant: UUID `id`, `name`, `timezone`, timestamps |
| `profiles` | One farm per authenticated user: `id` referencing `auth.users`, `farm_id`, `full_name`, `role`, timestamps |
| `employees` | Farm workers: `id`, `farm_id`, `full_name`, `active`, timestamps |
| `fields` | Reusable farm fields: `id`, `farm_id`, `name`, nullable latitude/longitude, timestamps |
| `activity_logs` | Work record: `id`, `farm_id`, `employee_id`, `field_id`, `activity_type`, `activity_date`, `started_at`, `ended_at`, `summary`, `response_accuracy`, `review_status`, timestamps |
| `recordings` | Recording metadata: `id`, `farm_id`, `activity_log_id`, nullable storage bucket/path until a real demo asset exists, duration, `recorded_at`, `is_new`, timestamps |
| `tags` | Reusable farm vocabulary: `id`, `farm_id`, `name`, `created_by`, timestamps |
| `activity_log_tags` | Many-to-many link: `id`, `farm_id`, `activity_log_id`, `tag_id`, `created_by`, `created_at`; unique farm/log/tag combination |

A farm owns its people, fields, and tags. Logs reference employees and fields. A log can have recordings and several tags; a tag can label many logs. Authentication identities are distinct from employee records because dashboard managers and recorded workers serve different product roles.

Use UUID primary keys, required foreign keys, normalized case-insensitive uniqueness for field/tag names within each farm, bounded accuracy/coordinates/duration, and valid time ordering. Keep related latitude/longitude values both present or both null. Preserve explicit `activity_date` because work dates and uploads differ in the supplied demo. Use timezone-aware instants for start/end/upload timestamps.

Include `farm_id` on dependent records and composite foreign keys such as `(farm_id, employee_id)` and `(farm_id, field_id)`. This deliberate redundancy prevents cross-farm associations at the database level as well as in RLS. Index farm/date queries and referencing foreign-key columns. Restrict deleting employees/fields with history; cascade removal of dependent join rows when an authorized maintenance operation removes a log. Do not add a user-facing delete-farm feature.

The query joins and flattens normalized rows into the existing presentation contract. For compatibility, `LogTag.ownerUserId` can carry the creator ID during integration; it must not become an ownership authorization rule for the new farm-shared tags. Review the type naming at that integration boundary without changing the layout.

## Authentication and authorization proposal

Use a small Supabase sign-in screen and cookie-based server/client clients. Resolve the verified user to a profile and then a farm. A user without a valid farm profile gets an explicit access state; never assign them Bays Ranch by default. Provision demo users and their farm membership through a trusted setup path. Users must not choose or change their own privileged role/farm through editable metadata or an unrestricted profile update.

RLS and explicit grants should protect each application table. Reads are limited to the authenticated user's farm. Manager/admin mutations can create tags and attach/detach same-farm tag relationships; seeded employees and logs otherwise remain read-only until a concrete editing requirement exists. Validate input and identity in every Server Action, then execute with the user's scoped session so RLS still applies. A browser must never receive a service-role key.

Prefer private recording storage with authorized access and short-lived URLs. Test with two different farm identities, a signed-out request, and a user without a profile. Attempt cross-farm reads and writes directly against the database API, including fabricated link IDs and profile membership changes. Tests must check denials as well as allowed operations.

Auth UI can follow the stable core as the plan requests, but do not expose unrestricted public writes in the interim. Apply and validate policies before any public database deployment.

## Primary product extension: Needs Review

Use one workflow: open a log, add the reusable `Needs Review` tag, persist its log/tag relationship, and filter the dashboard by that tag. Demonstrate that the relationship survives refresh and is scoped to the manager's farm. Support removal/resolution only if the main flow is polished. A larger review state machine is optional, not a prerequisite.

Add Tag now calls a validated Server Action with the current user session. It reuses case-insensitive farm tag definitions, attaches a unique log/tag relationship, and revalidates the page. Removing Needs Review detaches the relationship; it does not change the read-only activity log review_status.

## Demo date and metrics

The reference date is **April 22, 2026**, not the real current date. The farm timezone is provisionally `America/Los_Angeles`. The About button and the recordings card expose this assumption without a large banner competing with the supplied design.

- Today's recordings: uploads on the reference date, including reviewed records.
- New recordings: those reference-date uploads marked new.
- Active workers: active employees in the farm, not just employees in visible rows.
- Response accuracy: rounded mean of stored accuracy for relevant reference-date logs; empty if no values exist. It is not a generated ML score.
- New Employee Logs: pending records, initially filtered to the reference month by activity date.

The fixtures produce 5 recordings, 1 new, 12 active workers, 90 accuracy, and four visible pending rows. A fifth reviewed record explains the count difference. When adopting the separate recordings table, retain the count definition and avoid double-counting accuracy if multiple recordings refer to one log.

## Delivery sequence

1. Completed frontend checkpoint and browser evidence.
2. Review the refined schema/auth proposal, then implement migrations and reproducible seeds in a dedicated Toph Supabase project.
3. Integrate logs, details, fields, recordings, tags, and aggregates while preserving styling.
4. Add persistent mutations, complete media behavior, and add loading/error/pending states.
5. Finish Supabase Auth and verify farm isolation before public release.
6. Polish the Needs Review tag/filter workflow.
7. Visual regression, production build, and user-requested Vercel/GitHub milestones.

No InsForge resources, unrelated sidebar pages, mobile worker application, live transcription, custom ML, standalone backend service, ORM, Redis, or global state library are needed.

## Tooling findings

TypeScript 6.0.3 and ESLint 9.39.5 retain compatibility with the installed Next.js lint toolchain; revisit their versions together with the preset rather than forcing unsupported majors.

Turbopack's CSS worker failed to bind its local port in this environment, including during an escalated build. Next's supported Webpack mode built successfully, so both development and build scripts explicitly use `--webpack`. This changes the bundler, not the approved application stack.

## Research record

Official sources consulted September 16, 2026:

- [Next.js Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components): server data access and serializable interactive props.
- [Next.js installation](https://nextjs.org/docs/app/getting-started/installation): project initialization and supported CLI build modes.
- [Tailwind with Next.js](https://tailwindcss.com/docs/guides/nextjs): PostCSS setup and CSS import.
- [Supabase server-side clients](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs): cookie-based authenticated server/browser clients for the proposed integration.
- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security): database policies complement grants and must be verified for each operation.
- [PostgreSQL constraints](https://www.postgresql.org/docs/current/ddl-constraints.html): foreign keys, composite references, checks, and uniqueness for relational integrity.
- [PostgreSQL date/time types](https://www.postgresql.org/docs/current/datatype-datetime.html): calendar dates versus instants.
- [MDN dialog](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog): native modal behavior and accessibility.
- [Playwright visual comparisons](https://playwright.dev/docs/test-snapshots): reproducible browser screenshots; rendering environment affects pixel output. This milestone uses manual reference comparisons and interaction tests, not a claim of automated pixel equality.
