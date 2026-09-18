import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignupForm } from "./signup-form";
import { signInWithGoogle } from "@/app/login/actions";
import styles from "@/app/login/login.module.css";

export default async function SignupPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (!error && data?.claims.sub) redirect("/");
  return <main className={styles.page}><section className={styles.card} aria-labelledby="signup-heading">
    <p className={styles.brand}>Toph</p>
    <h1 id="signup-heading">Create employee account</h1>
    <p className={styles.subtitle}>Join the Bays Ranch demo to log your own farm activity.</p>
    <form action={signInWithGoogle} className={styles.googleForm}>
      <button type="submit" className={styles.googleButton}>Continue with Google</button>
    </form>
    <p className={styles.divider}>or create an account with email</p>
    <SignupForm />
    <p className={styles.subtitle}>Already have an account? <Link href="/login">Sign in</Link></p>
  </section></main>;
}
