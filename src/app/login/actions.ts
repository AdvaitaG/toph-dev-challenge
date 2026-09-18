"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfig } from "@/lib/supabase/config";

export type LoginState = { error: string };

export async function signInWithGoogle() {
  const origin = (await headers()).get("origin");
  if (!origin) redirect("/login?google=unavailable");
  let url: string | undefined;
  let providerDisabled = false;
  try {
    const config = supabaseConfig();
    const settingsResponse = await fetch(`${config.url}/auth/v1/settings`, {
      headers: { apikey: config.key }, cache: "no-store",
    });
    const settings = settingsResponse.ok ? await settingsResponse.json() : null;
    providerDisabled = settings?.external?.google === false;
    if (settings?.external?.google === true) {
      const supabase = await createClient({ writable: true });
      const result = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: new URL("/auth/callback", origin).toString(), skipBrowserRedirect: true },
      });
      if (!result.error && result.data.url) url = result.data.url;
    }
  } catch {
    // Keep provider/configuration errors on the sign-in page.
  }
  if (!url) redirect(providerDisabled ? "/login?google=not-configured" : "/login?google=unavailable");
  redirect(url);
}

export async function signIn(_previous: LoginState, form: FormData): Promise<LoginState> {
  const email = form.get("email");
  const password = form.get("password");
  if (typeof email !== "string" || typeof password !== "string" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.length > 254 || !password || password.length > 4096) {
    return { error: "Enter a valid email address and password." };
  }
  try {
    const supabase = await createClient({ writable: true });
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error?.code === "email_not_confirmed") return { error: "Confirm your email first, then sign in. Keep the local app running when opening the confirmation link." };
    if (error) return { error: "Unable to sign in. Check your email and password and try again." };
  } catch {
    return { error: "Sign-in is temporarily unavailable. Please try again." };
  }
  redirect("/");
}

export async function signOut(): Promise<{ error: string }> {
  try {
    const supabase = await createClient({ writable: true });
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) return { error: "Unable to log out. Please try again." };
  } catch {
    return { error: "Logout is temporarily unavailable. Please try again." };
  }
  redirect("/");
}
