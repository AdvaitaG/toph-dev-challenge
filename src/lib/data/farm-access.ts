import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export class FarmAccessError extends Error {}

// Reuse the existing cookie client. Never accept a farm ID or role from the UI.
export async function getFarmAccess() {
  const supabase = await createClient() as SupabaseClient<Database>;
  const { data: identity, error: authError } = await supabase.auth.getClaims();
  if (authError || !identity?.claims.sub) {
    throw new FarmAccessError("Your session has expired. Please sign in again.");
  }
  const userId = identity.claims.sub;
  const { data: profile, error } = await supabase.from("profiles")
    .select("farm_id, role, employee_id, full_name").eq("id", userId).maybeSingle();
  if (error) throw new Error("Unable to load farm membership.");
  if (!profile) throw new FarmAccessError("Your account has not been assigned to a farm. Contact the farm administrator.");
  return {
    supabase, userId, farmId: profile.farm_id, role: profile.role,
    employeeId: profile.employee_id, fullName: profile.full_name,
    canManage: profile.role === "admin" || profile.role === "manager",
  };
}
