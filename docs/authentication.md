# Authentication and sessions checkpoint

This records the earlier authentication milestone. Subsequently authorized database integration is documented in [database-integration.md](database-integration.md); dashboard reads and tag mutations now use Supabase. Statements below about fixture reads and the stop boundary describe that earlier checkpoint.

Implemented authentication and sessions from the supplied Astra_Supabase_Authentication_Prompt.md. With subsequent explicit user approval, provisioned one confirmed demo account and its Bays Ranch manager profile. No database-read integration, persistent tags, Needs Review changes, RLS changes, or deployment in this phase. Credentials are not stored in this document, migrations, or seeds.

## Files created

| File | Purpose |
|---|---|
| src/lib/supabase/config.ts | Reads only NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY; rejects missing/placeholder URL and non-publishable key configuration. |
| src/lib/supabase/client.ts | Cookie-backed browser client using createBrowserClient. Available for future browser Auth needs; current login/logout use Server Actions. |
| src/lib/supabase/server.ts | Per-request server client with async Next cookies(). Read-only rendering leaves cookie renewal to Proxy; actions explicitly enable cookie writes. |
| src/lib/supabase/proxy.ts | Refreshes/verifies session claims, forwards renewed cookies to the server render and browser, redirects signed-out dashboard requests, and adds private no-store cache headers. |
| src/proxy.ts | Next.js 16 proxy entry point, matched to / and /login, leaving static assets alone. |
| src/app/login/page.tsx | Login screen; verified signed-in users are redirected to the dashboard. |
| src/app/login/login-form.tsx | Accessible email/password form with pending and error states via useActionState. |
| src/app/login/login.module.css | Styles scoped to the new login screen only. |
| src/app/login/actions.ts | Validates form input; signInWithPassword and signOut({scope: local}); writes cookies and redirects only after success. Passwords are never returned or logged. |
| tests/auth.spec.ts | Authentication lifecycle, invalid password, renewal, anti-cache headers, and forged-cookie tests. |
| tests/support/auth-service.mjs | Loopback-only test Auth service with disposable signed tokens and refresh rotation. No real Supabase users or database writes. |
| tests/support/login.ts | Signs into the isolated Auth service through the actual app login form. |

## Files changed

| File | Change |
|---|---|
| src/app/page.tsx | Verifies claims again before calling the unchanged fixture query. |
| src/components/dashboard/sidebar.tsx | Existing Log Out button invokes real logout; identical label, icons, and CSS classes, with pending disabled/aria-busy state. |
| src/components/dashboard/dashboard.tsx | Wires logout Server Action using a transition; failures use the existing notice dialog. |
| playwright.config.ts | Separate production-build test server on port 3100, isolated Auth service on 54331, and test-only public connection settings. Never reuses the user's server or remote credentials. |
| tests/dashboard.spec.ts | Signs in before the existing visual/interaction tests. |
| tests/hydration.spec.ts | Signs in before the existing regression and uses the test server's port. |
| next.config.ts | Uses .next-e2e when TOPH_E2E=1 to avoid conflicting with a running .next development server. This is build-directory isolation, not an authentication bypass. |
| .gitignore / eslint.config.mjs | Ignore generated .next-e2e output. |
| tsconfig.json | Next added its generated .next-e2e type paths and formatting. |
| .env.local (ignored) | Replaced placeholder URL/key with the linked project's actual public URL and publishable key. No service-role/secret key was added or displayed. |
| docs/authentication.md / docs/frontend-handoff.md | Record implementation, verification, limitations, and the next approval boundary. |

No dashboard CSS, assets, fixture records, DashboardData types, SQL migrations, or RLS policies were changed.

## Login → cookie → server → dashboard

1. A signed-out browser requests /. Proxy constructs a request-specific Supabase SSR client and calls getClaims(), which verifies identity rather than trusting a cookie's user object. No identity redirects to /login.
2. The form posts credentials to the Next Server Action. It calls Supabase signInWithPassword using only the project publishable key. Supabase validates credentials and returns access/refresh tokens.
3. @supabase/ssr serializes the session into cookies (including chunking when necessary). The action writes them through Next's cookies API. A successful action redirects to /.
4. Proxy reads those cookies and verifies claims. When renewal is needed, Supabase exchanges the refresh token; Proxy writes refreshed cookies to both the forwarded request and outgoing browser response. Auth responses are private/non-cacheable.
5. The dashboard Server Component also verifies claims before calling getDashboardData(). That query still returns fixtures; no farm profile is required merely to view this authenticated demo. This does not grant access to real Bays Ranch records. The displayed Admin label remains part of the Figma fixture, not the authenticated user's actual authorization role.
6. Browser refresh sends the cookies again, preserving the session. Server clients are never shared between requests.
7. Log Out calls signOut with local scope (this session, not every other device). The SDK clears session cookies, Next updates its client cache, and the action redirects to /login. Subsequent / requests redirect back to login.

getClaims validates token signatures; it does not require an Auth server lookup on every request when asymmetric keys are used. Administrative revocation may not invalidate an already issued access token until expiry. RLS membership checks remain database-backed for future real reads.

The supplied SSR cookie approach supports browser-client access to tokens; it does not claim HttpOnly cookies. Only public project settings enter browser bundles. Do not put service-role/secret keys in NEXT_PUBLIC variables.

## Verification performed

- npm run check: passed lint and TypeScript.
- npm run test:e2e: 12 passed against a separate **production build**, including the eight existing dashboard/hydration checks plus four Auth tests.
- The E2E startup runs npm run build and next start successfully. Production-mode testing matters because next dev overrides Cache-Control headers.
- Auth tests cover signed-out redirect, successful login, cookie presence, reload retention, signed-in /login redirect, logout and protected re-entry, bad credentials, refresh-token rotation, no-store headers, and rejected forged access tokens.
- Real local development /login returned HTTP 200 after replacing placeholder configuration.
- Default dashboard screenshot: same 1676 × 955 dimensions, zero changed pixels versus docs/qa/dashboard-default.png.
- Expanded screenshot: same 1676 × 1114 dimensions; 6,329 differing pixels (about 0.34%) versus the older saved capture. The dashboard styles/markup layout and assets were not edited; visual inspection shows the same layout. This is not a claim of exact expanded-image equality.
- Screenshots from this run are saved in docs/qa/authentication/; previous baselines were preserved.

The automated Auth service is a protocol double, not Supabase Auth itself. It exercises real SSR cookie plumbing, Next routing/actions, token-validation rejection, and UI behavior without provisioning users. After authorized demo-account provisioning, a separate Chrome check against localhost:3000 and the linked Supabase project passed real sign-in, dashboard rendering, session retention after reload, logout, and protected re-entry. Account creation used the server-side Auth admin API; the confirmed account required no invitation email. The manager profile was inserted into the existing schema without a schema change.

## Manual test

1. Start `npm run dev` in `/Users/AG/toph-dev-challenge` and open `http://localhost:3000/` in an incognito window. Expect `/login`.
2. Submit an incorrect email/password combination. Expect an inline error and no dashboard access.
3. If you already have a confirmed email/password user in this Supabase project, sign in with it. Expect `/` and the unchanged fixture dashboard. Do not use the automated test credentials on the real app; they exist only in the local test service.
4. Refresh. Expect to remain signed in. Visit `/login` while signed in; expect a redirect to `/`.
5. Click the existing Log Out button (desktop sidebar). Expect `/login`. Navigate to `/` and refresh; expect `/login` again.
6. Confirm search, expansion, map preview, and temporary tags behave as before. Preview tags still disappear on refresh.
7. Inspect DevTools Network for failed auth requests or console errors. Do not copy session cookies/passwords into chat.

The authorized demo account can now be used for steps 3–5. The implementation intentionally contains no public signup or account-creation flow.

## Stop boundary

Demo-account and Bays Ranch manager-profile provisioning are complete. Stopped before replacing fixtures, persistent tags, Needs Review, or unrelated backend changes. Next-phase work requires explicit approval under the supplied prompt.

Sources: [official Supabase SSR setup](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs), installed @supabase/ssr 0.12.7 cookie adapter types, and installed Next.js 16.3.5 guides for Proxy, Server Actions, and cookies.
