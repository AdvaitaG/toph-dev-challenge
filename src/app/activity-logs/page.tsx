import { redirect } from "next/navigation";
import { ActivityLogsPage } from "@/components/logs/activity-logs-page";
import { FarmAccessError, getFarmAccess } from "@/lib/data/farm-access";
import { getActivityLogsData, getGuestActivityLogsData } from "@/lib/queries/dashboard";
import { createClient } from "@/lib/supabase/server";

export default async function Page() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims.sub) return <ActivityLogsPage data={getGuestActivityLogsData()} />;
  let access;
  try { access = await getFarmAccess(); }
  catch (caught) {
    if (!(caught instanceof FarmAccessError)) throw caught;
    return <main className="empty-state" role="alert"><h1>Farm access unavailable</h1><p>{caught.message}</p></main>;
  }
  if (access.role === "employee") redirect("/employee");
  if (!access.canManage) return <main className="empty-state" role="alert"><h1>Manager access required</h1><p>This account cannot open Activity Logs.</p></main>;
  return <ActivityLogsPage data={await getActivityLogsData()} />;
}
