import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseConfig } from "./config";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, key } = supabaseConfig();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        const previous = response;
        response = NextResponse.next({ request });
        previous.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([name, value]) => response.headers.set(name, value));
      },
    },
  });
  // Supabase's confirmation email returns PKCE signups to the configured
  // Site URL (currently the local app root) with a one-time code. Exchange it
  // before the dashboard's ordinary unauthenticated redirect can discard it.
  if (request.nextUrl.pathname === "/" &&
      (request.nextUrl.searchParams.has("code") || request.nextUrl.searchParams.has("error"))) {
    const code = request.nextUrl.searchParams.get("code");
    const result = code ? await supabase.auth.exchangeCodeForSession(code) : { error: true };
    const target = request.nextUrl.clone();
    target.pathname = result.error ? "/login" : "/employee";
    target.search = result.error ? "?confirmation=failed" : "";
    const redirect = NextResponse.redirect(target);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    redirect.headers.set("Cache-Control", "private, no-cache, no-store, must-revalidate, max-age=0");
    return redirect;
  }
  // Verify, rather than trusting the user object supplied in a cookie.
  const { data, error } = await supabase.auth.getClaims();
  const signedIn = !error && !!data?.claims.sub;
  if (request.nextUrl.pathname === "/employee" && !signedIn) {
    const target = request.nextUrl.clone();
    target.pathname = "/login";
    target.search = "";
    const redirect = NextResponse.redirect(target);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    response = redirect;
  }
  // Covers Server Action cookie writes as well as proxy refreshes and redirects.
  response.headers.set("Cache-Control", "private, no-cache, no-store, must-revalidate, max-age=0");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
}
