# Frontend checkpoint and backend handoff

## Status

The screenshot frontend is implemented. Use `docs/build-plan.md` as the current core plan; the earlier plan is superseded. The UI data contract and seed source records remain intact; the dashboard now loads Supabase records.

Browser evidence is in `docs/qa/`: default and expanded screenshots at a 1676 × 955 viewport, plus a narrow 390px layout. Compared manually against the Figma frames retrieved through MCP. This is not a claim of pixel-perfect automated equality. Expanded content remains scrollable rather than clipping away the remaining records at the frame boundary.

## Verified behavior

The original eight visual/interaction checks below are retained within the expanded 17-test suite:

1. Exact seeded metrics, four rows, row-click and View/Close expansion, each log's own details, and no page runtime errors during the expansion flow.
2. Employee/activity/field search and empty-result recovery.
3. Oldest/newest/name sorting, activity/field/date-range filtering, and demo-month toggle.
4. Select-all, partial selection, and selection without accidental row expansion.
5. Persistent tags, duplicate rejection, per-log separation, refresh retention, filtering, and removal.
6. Map modal, Escape dismissal, focus restoration, snapshot disclosure, and honest unavailable-audio behavior.
7. Narrow-screen page containment, table scrolling, and stacked details.
8. Grammarly-style body attributes do not produce hydration warnings; descendant checks remain enabled.

`npm run check`, `npm run build`, and `npm run test:e2e` are the validation commands. Browser tests currently target installed Google Chrome. Both app scripts use `--webpack` because of the environment's Turbopack worker-port restriction.

## Preserve during backend work

- Sidebar width, main-content position, metric cards, row heights, borders, typography, and two-column expanded layout.
- The `src/lib/queries/dashboard.ts` server-only boundary and `src/types/dashboard.ts` serializable contract.
- The exact screenshot employee records and April 22, 2026 snapshot semantics.
- Generic expansion; do not hard-code Isaac's details.
- Search/filter/sort operating on authorized loaded records only.
- Honest error and unavailable states. Never silently substitute fixtures after a database failure.

## Remaining integrations

The normalized schema, reproducible seed, and farm-level RLS have been applied to the linked Supabase project with user approval. Login/session handling is implemented; see `docs/authentication.md` for tests and the stop boundary. A confirmed demo account and Bays Ranch manager profile were subsequently provisioned with explicit approval. Real login, refresh persistence, logout, and protected re-entry passed in Chrome. Query integration and persistent tag actions are implemented. See `docs/database-integration.md` for current verification and limits.

The local preview callback has been replaced with authorized Server Actions and pending/failure states. Needs Review is a reusable database tag that can be filtered and detached. No dashboard stylesheet or design asset was changed.

Supply real audio URLs or authorized signed URLs. The audio element supports play/pause/error events when a URL exists, but playback has not been verified with a real asset. The visual waveform is decorative.

Replace the Figma-exported map preview with authorized field/log coordinates and suitable satellite imagery. Never treat the reference marker as an employee's real location. Keep the existing map and dialog dimensions.

The current sidebar intentionally does not create unrelated pages. Its unavailable destinations explain that they are outside this preview. Sign-in, session handling, and logout are implemented.

## Source files

- `docs/design/challenge.pdf`: organizer's challenge and submission instructions.
- `docs/design/01-challenge-brief.png`: product context.
- `docs/design/02-default-view.png`: default dashboard.
- `docs/design/03-expanded-entry.png`: expanded layout.
- `public/design/figma/`: original avatar, satellite imagery, waveform, and icons exported through Figma MCP.
- `public/fonts/`: locally hosted variable Geist Latin font and its SIL Open Font License.
- `docs/design/figma-source.md`: frame links, asset provenance, and geometry notes.

Figma MCP access was confirmed for both frames of the user's copied file. The dedicated Supabase integration is in place; Vercel deployment and GitHub publication remain separate user-requested milestones.
