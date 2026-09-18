# Toph developer challenge

## Project scope

- This repository uses the user-approved Next.js, TypeScript, Tailwind, Supabase/PostgreSQL, and Vercel architecture.
- The InsForge project described in the parent-directory instructions belongs to another application. Do not use its credentials, database, or infrastructure for Toph.
- The supplied screenshots in `docs/design/` are the visual source of truth. No Figma connection is required.
- `docs/build-plan.md` is the current user-adopted Final “Wow Us” plan; it supersedes the original Astra/Fugu plan.
- See `docs/architecture.md` for decisions and the proposed normalized farm/auth model; `docs/frontend-handoff.md` records the completed visual checkpoint and remaining integrations.

## Implementation boundaries

- Keep database and fixture access behind the server-only query in `src/lib/queries/dashboard.ts`.
- Presentation consumes the serializable types in `src/types/dashboard.ts`; do not import server-only modules into client components.
- The current app is Supabase-backed. Never disguise database failures with a fixture fallback.
- The demo reference date is April 22, 2026. Do not describe it as the actual current date.
- The screenshot frontend is implemented. Backend integration must preserve its styling and the UI-facing data contract.
- Supabase Auth, farm-level RLS, reusable tags, and the persistent Needs Review tag/filter workflow are implemented. Preserve these boundaries; do not use privileged keys for application queries or actions.
- Do not add unrelated sidebar pages, a worker mobile app, or live transcription.
- Never commit credentials or use a privileged Supabase key in browser code.

## Validation

- `npm run check` runs lint and type checking.
- `npm run build` verifies the production build.
- `npm run test:e2e` runs the Playwright interaction checks using installed Google Chrome.
- `npm run dev` starts the local application.
- Do not commit, push, or deploy unless the user has requested that milestone.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
