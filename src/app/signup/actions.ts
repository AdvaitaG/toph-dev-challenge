"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type SignupState = { error: string; success: string };

function signupError(code?: string): string {
  switch (code) {
    case "user_already_exists":
    case "email_exists": return "This account already exists. Sign in below instead.";
    case "weak_password": return "Choose a stronger password and try again.";
    case "email_address_invalid":
    case "validation_failed": return "Check your name, email address, and password, then try again.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit": return "Too many signup emails were requested. Please wait before trying again, or sign in if you already confirmed.";
    case "email_provider_disabled":
    case "signup_disabled": return "Employee signup is temporarily unavailable. Please try again later.";
    default: return "Unable to create the account right now. Please try again later, or sign in if you already confirmed your email.";
  }
}

export async function signUpEmployee(_previous: SignupState, form: FormData): Promise<SignupState> {
  const name = form.get("fullName");
  const email = form.get("email");
  const password = form.get("password");
  if (typeof name !== "string" || name.trim().replace(/\s+/g, " ").length < 2 || name.trim().length > 120 ||
      typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.length > 254 ||
      typeof password !== "string" || password.length < 8 || password.length > 4096) {
    return { error: "Enter your name, a valid email, and a password with at least 8 characters.", success: "" };
  }
  const fullName = name.trim().replace(/\s+/g, " ");
  try {
    const supabase = await createClient({ writable: true });
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(), password,
      options: { data: { signup_intent: "employee", full_name: fullName } },
    });
    if (error) return { error: signupError(error.code), success: "" };
    if (!data.session) return { error: "", success: "If this is a new account, check your email to confirm it. Already confirmed? Sign in below. The local app must be running when you open the email link." };
  } catch {
    return { error: "Signup is temporarily unavailable. Please try again.", success: "" };
  }
  redirect("/employee");
}
