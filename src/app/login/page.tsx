import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";
import styles from "./login.module.css";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ confirmation?: string; google?: string }> }) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (!error && data?.claims.sub) redirect("/");
  const params = await searchParams;
  const confirmationFailed = params.confirmation === "failed";
  return <main className={styles.page}><section className={styles.card} aria-labelledby="login-heading">
    <p className={styles.brand}>Toph</p>
    <h1 id="login-heading">Sign in</h1>
    <p className={styles.subtitle}>Use your account to access the dashboard.</p>
    {confirmationFailed && <p className={styles.error} role="alert">The email link could not complete sign-in. If you already confirmed your email, sign in below. Otherwise, request a new confirmation email.</p>}
    {params.google === "not-configured" && <p className={styles.error} role="alert">Google sign-in is not configured for this project yet. An administrator must enable Google in Supabase Auth. You can sign in with email for now.</p>}
    {params.google && params.google !== "not-configured" && <p className={styles.error} role="alert">Google sign-in could not start. Please sign in with email and try again later.</p>}
    <LoginForm />
    <p className={styles.subtitle}>Need an employee account? <Link href="/signup">Create one</Link></p>
  </section></main>;
}
