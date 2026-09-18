import { Dashboard } from "@/components/dashboard/dashboard";
import { getDashboardData, getGuestDashboardData } from "@/lib/queries/dashboard";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FarmAccessError } from "@/lib/data/farm-access";
import { getFarmAccess } from "@/lib/data/farm-access";

export default async function HomePage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims.sub) return <Dashboard data={getGuestDashboardData()} />;
  let access;
  let accessError = "";
  try { access = await getFarmAccess(); }
  catch (error) { if (!(error instanceof FarmAccessError)) throw error; accessError = error.message; }
  if (!access) return <main className="empty-state" role="alert"><h1>Farm access unavailable</h1><p>{accessError}</p></main>;
  if (access.role === "employee") redirect("/employee");
  if (!access.canManage) return <main className="empty-state" role="alert"><h1>Manager access required</h1><p>This account cannot open the manager dashboard.</p></main>;
  let dashboard;
  accessError = "";
  try {
    dashboard = await getDashboardData();
  } catch (error) {
    if (!(error instanceof FarmAccessError)) throw error;
    accessError = error.message;
  }
  if (!dashboard) return <main className="empty-state" role="alert"><h1>Farm access unavailable</h1><p>{accessError}</p></main>;
  return <Dashboard data={dashboard} />;
}
