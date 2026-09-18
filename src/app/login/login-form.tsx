"use client";

import { useActionState } from "react";
import { signIn, signInWithGoogle } from "./actions";
import styles from "./login.module.css";

export function LoginForm() {
  const [state, action, pending] = useActionState(signIn, { error: "" });
  return <><form action={signInWithGoogle} className={styles.googleForm}>
    <button type="submit" className={styles.googleButton}>Continue with Google</button>
  </form><p className={styles.divider}>or sign in with email</p><form action={action} className={styles.form}>
    <label htmlFor="email">Email<input id="email" name="email" type="email" autoComplete="username" required maxLength={254} /></label>
    <label htmlFor="password">Password<input id="password" name="password" type="password" autoComplete="current-password" required maxLength={4096} /></label>
    {state.error && <p className={styles.error} role="alert">{state.error}</p>}
    <button type="submit" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
  </form></>;
}
