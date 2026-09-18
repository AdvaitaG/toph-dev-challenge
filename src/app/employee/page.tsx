import { redirect } from "next/navigation";
import { dateInTimezone } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { FarmAccessError, getFarmAccess } from "@/lib/data/farm-access";
import { EmployeeForm } from "./employee-form";

export default async function EmployeePage() {
  const supabase = await createClient();
  const { data: identity, error: authError } = await supabase.auth.getClaims();
  if (authError || !identity?.claims.sub) redirect("/login");
  let access;
  let accessError = "";
  try { access = await getFarmAccess(); }
  catch (error) { if (!(error instanceof FarmAccessError)) throw error; accessError = error.message; }
  if (!access) return <main className="empty-state" role="alert"><h1>Employee access unavailable</h1><p>{accessError}</p></main>;
  if (access.canManage) redirect("/");
  if (access.role !== "employee" || !access.employeeId) return <main className="empty-state" role="alert"><h1>Employee access unavailable</h1><p>This account is not linked to an employee record.</p></main>;
  const [employee, farm, fields, recent] = await Promise.all([
    access.supabase.from("employees").select("full_name, active").eq("farm_id", access.farmId).eq("id", access.employeeId).maybeSingle(),
    access.supabase.from("farms").select("name, timezone").eq("id", access.farmId).single(),
    access.supabase.from("fields").select("id, name").eq("farm_id", access.farmId).order("name"),
    access.supabase.from("activity_logs").select("id, activity_date, activity_type, summary").eq("farm_id", access.farmId).eq("employee_id", access.employeeId).not("submitted_by", "is", null).order("created_at", { ascending: false }).limit(5),
  ]);
  if (employee.error || farm.error || fields.error || recent.error) throw new Error("Unable to load employee activity form.");
  if (!employee.data || !employee.data.active) return <main className="empty-state" role="alert"><h1>Employee access unavailable</h1><p>Your employee record is inactive or missing. Contact the farm manager.</p></main>;
  if (!farm.data || !fields.data) throw new Error("Unable to load farm fields.");
  return <EmployeeForm name={employee.data.full_name} farmName={farm.data.name} today={dateInTimezone(new Date().toISOString(), farm.data.timezone)} fields={fields.data} recent={recent.data ?? []} />;
}
