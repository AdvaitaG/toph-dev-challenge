import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FarmAccessError, getFarmAccess } from "@/lib/data/farm-access";
import { getEmployeeDirectoryData, getGuestEmployeeDirectoryData } from "@/lib/queries/dashboard";
import { EmployeesDirectory } from "./employees-directory";

export default async function EmployeesPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims.sub) return <EmployeesDirectory data={getGuestEmployeeDirectoryData()} guest />;
  let access;
  let accessError = "";
  try { access = await getFarmAccess(); }
  catch (caught) { if (!(caught instanceof FarmAccessError)) throw caught; accessError = caught.message; }
  if (!access) return <main className="empty-state" role="alert"><h1>Farm access unavailable</h1><p>{accessError}</p></main>;
  if (access.role === "employee") redirect("/employee");
  if (!access.canManage) return <main className="empty-state" role="alert"><h1>Manager access required</h1><p>This account cannot open the employee directory.</p></main>;
  return <EmployeesDirectory data={await getEmployeeDirectoryData()} />;
}
