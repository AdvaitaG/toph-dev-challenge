export function supabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key) throw new Error("Supabase URL and publishable key must be configured.");
  if (!/^https?:\/\//.test(url)) throw new Error("Replace NEXT_PUBLIC_SUPABASE_URL in .env.local with the project's URL.");
  if (!key.startsWith("sb_publishable_")) throw new Error("Replace NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local with the project's public sb_publishable_ key.");
  return { url, key };
}
