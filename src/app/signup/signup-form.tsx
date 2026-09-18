"use client";

import { useActionState } from "react";
import { signUpEmployee } from "./actions";
import styles from "@/app/login/login.module.css";

export function SignupForm() {
  const [state, action, pending] = useActionState(signUpEmployee, { error: "", success: "" });
  return <form action={action} className={styles.form}>
    <label htmlFor="full-name">Full name<input id="full-name" name="fullName" autoComplete="name" required minLength={2} maxLength={120} /></label>
    <label htmlFor="signup-email">Email<input id="signup-email" name="email" type="email" autoComplete="username" required maxLength={254} /></label>
    <label htmlFor="signup-password">Password<input id="signup-password" name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={4096} /></label>
    {state.error && <p className={styles.error} role="alert">{state.error}</p>}
    {state.success && <p role="status">{state.success}</p>}
    <button type="submit" disabled={pending}>{pending ? "Creating account…" : "Create employee account"}</button>
  </form>;
}
