import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  let success = false;
  if (code) {
    try {
      const supabase = await createClient({ writable: true });
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      success = !error;
    } catch {
      // An expired or invalid code returns to the sign-in screen.
    }
  }
  // Next may normalize request.url to localhost behind a local/reverse proxy.
  // Keep the browser's host so its PKCE/session cookies stay on the same site.
  const host = request.headers.get("host")
    || request.headers.get("x-forwarded-host")?.split(",")[0].trim();
  const protocol = request.headers.get("x-forwarded-proto")?.split(",")[0].trim()
    || request.nextUrl.protocol.replace(":", "");
  const destination = new URL(success ? "/" : "/login?google=failed",
    host ? `${protocol}://${host}` : request.nextUrl.origin);
  const response = NextResponse.redirect(destination);
  response.headers.set("Cache-Control", "private, no-cache, no-store, must-revalidate, max-age=0");
  return response;
}
