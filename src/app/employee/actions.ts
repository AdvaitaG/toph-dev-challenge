"use server";

import { revalidatePath } from "next/cache";
import { FarmAccessError, getFarmAccess } from "@/lib/data/farm-access";
import { farmLocalInstant } from "@/lib/data/work-time";

export type SubmissionState = { error: string; success: string; submissionId: string };
const activities = ["Spraying", "Harvesting", "Planting", "Irrigation", "Scouting"] as const;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const invalid = (error: string): SubmissionState => ({ error, success: "", submissionId: "" });

export async function submitActivity(_previous: SubmissionState, form: FormData): Promise<SubmissionState> {
  const fieldId = form.get("fieldId");
  const activityType = form.get("activityType");
  const day = form.get("activityDate");
  const start = form.get("startTime");
  const end = form.get("endTime");
  const rawSummary = form.get("summary");
  const parsedDay = typeof day === "string" && datePattern.test(day) ? Date.parse(`${day}T00:00:00Z`) : NaN;
  if (typeof fieldId !== "string" || !uuidPattern.test(fieldId) ||
      typeof activityType !== "string" || !activities.some((value) => value === activityType) ||
      typeof day !== "string" || !Number.isFinite(parsedDay) ||
      new Date(parsedDay).toISOString().slice(0, 10) !== day ||
      typeof start !== "string" || !timePattern.test(start) ||
      typeof end !== "string" || !timePattern.test(end) || end <= start ||
      typeof rawSummary !== "string") {
    return invalid("Check the field, activity, date, and time range. End time must be later on the same day.");
  }
  const summary = rawSummary.trim();
  if (summary.length < 3 || summary.length > 2000) return invalid("Enter a summary between 3 and 2,000 characters.");
  try {
    const { supabase, farmId, employeeId, role, userId } = await getFarmAccess();
    if (role !== "employee" || !employeeId) throw new FarmAccessError("This account is not linked to an employee record.");
    const [employee, field, farm] = await Promise.all([
      supabase.from("employees").select("id, active").eq("farm_id", farmId).eq("id", employeeId).maybeSingle(),
      supabase.from("fields").select("id").eq("farm_id", farmId).eq("id", fieldId).maybeSingle(),
      supabase.from("farms").select("timezone").eq("id", farmId).single(),
    ]);
    if (employee.error || !employee.data || !employee.data.active) return invalid("Your employee account is unavailable. Contact the farm manager.");
    if (field.error || !field.data) return invalid("Choose a field from your farm.");
    if (farm.error || !farm.data) return invalid("Your farm is unavailable. Please try again.");
    const startedAt = farmLocalInstant(day, start, farm.data.timezone);
    const endedAt = farmLocalInstant(day, end, farm.data.timezone);
    if (!startedAt || !endedAt || endedAt <= startedAt) return invalid("That time range is invalid in your farm's timezone.");
    const { data, error } = await supabase.from("activity_logs").insert({
      farm_id: farmId, employee_id: employeeId, field_id: fieldId,
      activity_type: activityType, activity_date: day,
      started_at: startedAt, ended_at: endedAt, summary,
      response_accuracy: null, review_status: "pending", submitted_by: userId,
    }).select("id").single();
    if (error || !data) return invalid("Unable to save this activity. Please try again.");
    revalidatePath("/employee");
    return { error: "", success: "Activity submitted. Your manager can now review it.", submissionId: data.id };
  } catch (error) {
    return invalid(error instanceof FarmAccessError ? error.message : "Unable to save this activity. Please try again.");
  }
}
