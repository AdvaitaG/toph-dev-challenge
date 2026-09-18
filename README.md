# Toph Dashboard

A desktop farm-activity dashboard built from the supplied screenshots. The current implementation reproduces the default dashboard and inline expanded log while retaining a server-only data boundary for Supabase integration.

## Current milestone

The frontend is implemented with a **read-only guest demo at `/`** and a Supabase-backed manager/employee experience after sign-in:

- Sidebar, farm profile, search, metric cards, controls, and all four supplied employee rows.
- Generic View/Close expansion with the corresponding summary, waveform, recording control, tag form, and map preview.
- Search by employee/activity/field; oldest/newest/name sorting; activity, field, and date-range filters; farm-local current-month toggle; row selection.
- Manager approval moves pending logs out of the dashboard queue while retaining their details and tags in the complete, searchable `/activity-logs` history. The history can filter by employee, activity, field, and review status.
- Dashboard metric cards link to Activity Logs or Employees, with keyboard-accessible focus and activation.
- Visitors can explore the original Figma dashboard, Activity Logs history, and a sample Employees directory without signing in. Guest data comes from safe local demo fixtures; contact emails and manager write controls are not exposed.
- Persistent reusable tags with duplicate validation, removal, and Needs Review filtering.
- Public employee signup (email or Google), a separate employee activity form, and manager approval, denial, and removal of employee-submitted logs.
- Manager-only Employees tab with the same workers counted by Active Workers, account-backed contact emails, and an option to add or edit missing addresses.
- Expand Map dialog, keyboard focus handling, empty results, unavailable-media messages, and contained table scrolling on narrow screens.

**Still pending:** audio files for the original Figma seed recordings, live map locations, and Vercel deployment. Employee-submitted recordings are playable. See [database integration](docs/database-integration.md) for implementation, verification, and tradeoffs.

The core plan is [docs/build-plan.md](docs/build-plan.md), the user-supplied **Final “Wow Us” Build Plan**. It supersedes the previous Astra/Fugu plan. [Architecture and decisions](docs/architecture.md) describe the refined backend proposal and distinguish it from implemented functionality.

## Preview screenshots

[Default dashboard](docs/qa/dashboard-default.png) · [Expanded log](docs/qa/dashboard-expanded.png) · [Narrow-screen layout](docs/qa/dashboard-mobile.png)

Original references and the challenge PDF are in `docs/design/`. The dark surrounding challenge instructions are not part of the application.

## Run locally

Use Node.js 24 and npm:

```sh
nvm use
npm ci
npm run dev
```

Configure `.env.local` using the public URL/publishable-key names in `.env.example`. Open `http://localhost:3000` to see the read-only guest dashboard immediately. Sign In connects to a provisioned Supabase account assigned to a farm; new Google and email signups become employees, while the existing manager profile retains manager rights. Anyone can create an employee account at `/signup`; after sign-in, employees use `/employee` to submit a note or recording. A manager sees pending and approved submissions on the dashboard, can approve or deny a pending log, and can open `/activity-logs` for complete history or `/employees` for contact details. Denied logs stay in Activity Logs; manager deletion of eligible employee submissions is a separate action. Signing out returns to the guest dashboard. Never commit credentials.

Google sign-in uses Supabase OAuth and `/auth/callback`. The linked project's Google provider is configured for local use. For a production deployment, add the production app callback (`https://<your-domain>/auth/callback`) to Supabase Auth Redirect URLs and set Supabase's Site URL to the production origin so email confirmations return there. Keep the Google provider secret in Supabase, not this repository. The existing confirmed manager Auth account retains its manager profile when Google links to the same identity. New accounts receive employee profiles; browser metadata cannot assign manager access.

```sh
npm run check
npm run build
npm start
npm run test:e2e
```

`check` runs ESLint and TypeScript. `build` produces the production application. `test:e2e` uses installed Google Chrome through Playwright, starts an isolated production server and local Auth/PostgREST protocol double, and exercises the core interactions. It does not write to the linked project. Screenshots and failure traces are written to the ignored `test-results/` directory. Install Google Chrome if it is not available on the test machine.

The development and build scripts use Next's Webpack option because Turbopack's local CSS worker could not bind its worker port in this environment. TypeScript and ESLint remain pinned to versions accepted by the installed Next lint toolchain. See the architecture notes for details.

## Boundaries

- `src/app/page.tsx`: server entry point.
- `src/lib/queries/dashboard.ts`: the server-only query and exclusive fixture/database boundary.
- `src/types/dashboard.ts`: serializable UI contract, preserved through this visual pass.
- `src/components/dashboard/`: dashboard shell, sidebar, and metrics.
- `src/components/logs/`: controls, table, and expanded details.
- `src/components/ui/modal.tsx`: native modal wrapper.
- `src/lib/demo/fixtures.ts`: deterministic synthetic records.
- `src/lib/format.ts`: activity date and farm-local time formatting.

## Demo data and media

The guest reference date is **April 22, 2026**, not the current date. Guest metrics show the original 5 / 12 / 90 snapshot values and the Employees page lists twelve sample workers without contact emails. Use the About button beside Bays Ranch for snapshot information. The signed-in manager dashboard initially shows the April demo rows; clicking **This Month** filters by the farm's actual current calendar month. For signed-in managers, the four named Figma workers form the Active Workers baseline; each additional active employee account adds one. The Today’s Recordings card counts employee activities submitted on the farm’s actual local date, including text-only submissions; deleting one removes it from the count. The original April snapshot recordings do not count as today. Response Accuracy remains the mean of the scored snapshot logs (90). The manager Dashboard shows pending and approved activity; Activity Logs retains pending, approved, and denied history. The guest Dashboard keeps the original four Figma rows.

Isaac's transcript preserves the supplied text. The other seed summaries and supporting employee records are synthetic. Seed audio URLs and locations remain null, so Play Recording reports unavailability for those rows. Employee-submitted recordings use private signed URLs. The waveform is a decorative SVG, not audio-derived. Seed workers without an Auth account have no supplied contact email; the manager can add one in the Employees tab.

The avatar, satellite preview, icons, and waveform use the supplied Figma exports in `public/design/figma/`. The map is labeled **Design preview** and is not linked to any employee's coordinates. This preserves the visual asset without an invented location, a third-party tile account, or a remote image dependency. The waveform remains illustrative; employee-submitted audio is playable through the adjacent recording control. A data-driven map is still a future integration.

## Backend and deployment plan

The linked Toph Supabase project contains farms, profiles, employees, fields, logs, recordings, reusable tags, and log/tag relationships. Supabase Auth and RLS enforce farm isolation. The persistent Needs Review tag/filter workflow uses the existing schema and policies.

The public employee signup is intentionally scoped to the single Bays Ranch challenge demo. A database trigger creates an employee and employee-role profile in that farm for every new email-bearing Auth user; browser-supplied metadata cannot choose a manager role or another farm. Employees can submit a written note or record up to 90 seconds of audio with an editable transcript and optional note. Audio is stored in a private Supabase Storage bucket, while its metadata and transcript are linked to the activity in PostgreSQL. Automatic transcription uses browser speech recognition when available; if it is unavailable, the employee can type the transcript or submit a written note. Manager deletion is limited by both Server Action checks and RLS to employee submissions; original Figma rows remain protected. See [employee flow](docs/employee-flow.md) for the exact boundaries and verification.

`.env.example` lists the Supabase URL/publishable-key names consumed by the application. Never expose a service-role key in browser code or commit `.env.local`. Do not use the unrelated parent-directory InsForge application.

The next milestone is described in [docs/frontend-handoff.md](docs/frontend-handoff.md). Commit, push, deployment, and submission require the user's requested milestone. The challenge PDF requires submission Thursday at 8pm and no later commits; verify the organizer's timezone before submission.
