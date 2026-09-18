import "server-only";

import { getFarmAccess } from "@/lib/data/farm-access";
import { readAll } from "@/lib/data/read-all";
import { demoActivityLogs, demoEmployees, demoFarm } from "@/lib/demo/fixtures";
import { dateInTimezone } from "@/lib/format";
import type { ActivityType, DashboardData, DashboardLog, EmployeeDirectoryData, ReviewStatus } from "@/types/dashboard";

// This is the disclosed demo snapshot date, not a source of fixture records.
const REFERENCE_DATE = "2026-04-22";

const baselineWorkerIds = new Set([
  "10000000-0000-4000-8000-000000000001", // Isaac Wang
  "10000000-0000-4000-8000-000000000002", // Maya Patel
  "10000000-0000-4000-8000-000000000003", // Liam Johnson
  "10000000-0000-4000-8000-000000000004", // Sophia Lee
]);

function activeWorkerIds(
  employees: { id: string; active: boolean }[],
  profiles: { role: string; employee_id: string | null }[],
): Set<string> {
  const accountWorkerIds = new Set(profiles
    .filter((row) => row.role === "employee" && row.employee_id)
    .map((row) => row.employee_id));
  return new Set(employees
    .filter((row) => row.active && (baselineWorkerIds.has(row.id) || accountWorkerIds.has(row.id)))
    .map((row) => row.id));
}

function guestActivityData(includeHistory: boolean): DashboardData {
  const employeesById = new Map(demoEmployees.map((employee) => [employee.id, employee]));
  const logs: DashboardLog[] = demoActivityLogs
    .filter((log) => includeHistory || log.reviewStatus === "pending")
    .map((log) => {
      const employee = employeesById.get(log.employeeId);
      if (!employee) throw new Error("A demo log is missing its employee.");
      return {
        ...log,
        employee: { id: employee.id, name: employee.name },
        tags: [],
        canRemove: false,
      };
    });
  return {
    farm: demoFarm,
    referenceDate: REFERENCE_DATE,
    currentDate: dateInTimezone(new Date().toISOString(), demoFarm.timezone),
    source: "fixtures",
    logs,
    // These are disclosed April 22 snapshot values, not live farm metrics.
    metrics: { todaysRecordings: 5, newRecordings: 1, activeWorkers: demoEmployees.length, responseAccuracy: 90 },
  };
}

export function getGuestDashboardData(): DashboardData {
  return guestActivityData(false);
}

export function getGuestActivityLogsData(): DashboardData {
  return guestActivityData(true);
}

export function getGuestEmployeeDirectoryData(): EmployeeDirectoryData {
  return {
    farmName: demoFarm.name,
    employees: demoEmployees.map((employee) => ({
      id: employee.id, name: employee.name, active: employee.active, email: null,
    })).sort((a, b) => a.name.localeCompare(b.name)),
  };
}

async function loadActivityData(includeHistory: boolean): Promise<DashboardData> {
  const { supabase, farmId, canManage } = await getFarmAccess();
  if (!canManage) throw new Error("Only managers can load the dashboard.");
  const [farmResult, employees, profiles, fields, activityLogs, recordings, tags, assignments] = await Promise.all([
    supabase.from("farms").select("id, name, timezone").eq("id", farmId).single(),
    readAll((from, to) => supabase.from("employees").select("id, full_name, active").eq("farm_id", farmId).order("id").range(from, to), "employees"),
    readAll((from, to) => supabase.from("profiles").select("id, employee_id, role").eq("farm_id", farmId).order("id").range(from, to), "employee accounts"),
    readAll((from, to) => supabase.from("fields").select("id, name, latitude, longitude").eq("farm_id", farmId).order("id").range(from, to), "fields"),
    readAll((from, to) => supabase.from("activity_logs").select("id, employee_id, field_id, activity_type, activity_date, started_at, ended_at, created_at, summary, response_accuracy, review_status, denial_reason, submitted_by").eq("farm_id", farmId).order("id").range(from, to), "activity logs"),
    readAll((from, to) => supabase.from("recordings").select("id, activity_log_id, recorded_at, is_new, storage_bucket, storage_path").eq("farm_id", farmId).order("id").range(from, to), "recordings"),
    readAll((from, to) => supabase.from("tags").select("id, name").eq("farm_id", farmId).order("id").range(from, to), "tags"),
    readAll((from, to) => supabase.from("activity_log_tags").select("id, activity_log_id, tag_id, created_by, created_at").eq("farm_id", farmId).order("id").range(from, to), "tag assignments"),
  ]);
  if (farmResult.error || !farmResult.data) throw new Error("Unable to load your farm.");
  const farm = farmResult.data;
  const employeesById = new Map(employees.map((row) => [row.id, row]));
  const fieldsById = new Map(fields.map((row) => [row.id, row]));
  const tagsById = new Map(tags.map((row) => [row.id, row]));
  const activeWorkers = activeWorkerIds(employees, profiles).size;
  // Count current-day employee submissions, with or without an audio recording.
  // The Figma recordings belong to the disclosed April snapshot date.
  const today = dateInTimezone(new Date().toISOString(), farm.timezone);
  const todaysSubmissions = activityLogs.filter((row) => row.submitted_by &&
    dateInTimezone(row.created_at, farm.timezone) === today);
  const snapshotRecordings = recordings.filter((row) => dateInTimezone(row.recorded_at, farm.timezone) === REFERENCE_DATE);
  const snapshotLogIds = new Set(snapshotRecordings.map((row) => row.activity_log_id));
  // Average once per log, even when it has multiple uploaded recordings.
  const scoredLogs = activityLogs.filter((row) => snapshotLogIds.has(row.id) && row.response_accuracy !== null);
  const logs: DashboardLog[] = await Promise.all(activityLogs
    .filter((row) => includeHistory || row.review_status !== "denied")
    .sort((a, b) => a.activity_date.localeCompare(b.activity_date) || a.id.localeCompare(b.id))
    .map(async (row) => {
      const employee = employeesById.get(row.employee_id);
      const field = fieldsById.get(row.field_id);
      const recording = recordings.filter((item) => item.activity_log_id === row.id)
        .sort((a, b) => Date.parse(b.recorded_at) - Date.parse(a.recorded_at) || a.id.localeCompare(b.id))[0];
      if (!employee || !field) throw new Error("A dashboard log is missing its employee or field.");
      let audioUrl: string | null = null;
      if (recording?.storage_bucket && recording.storage_path) {
        const result = await supabase.storage.from(recording.storage_bucket).createSignedUrl(recording.storage_path, 3600);
        if (result.error) throw new Error("Unable to load recording access.");
        audioUrl = result.data.signedUrl;
      }
      return {
        id: row.id, employeeId: employee.id,
        employee: { id: employee.id, name: employee.full_name },
        activityType: row.activity_type as ActivityType,
        activityDate: row.activity_date, field: field.name,
        startedAt: row.started_at, endedAt: row.ended_at,
        recordedAt: recording?.recorded_at ?? row.created_at, isNew: recording?.is_new ?? false,
        summary: row.summary, audioUrl,
        location: field.latitude === null || field.longitude === null ? null : { latitude: field.latitude, longitude: field.longitude },
        responseAccuracy: row.response_accuracy, reviewStatus: row.review_status as ReviewStatus,
        denialReason: row.denial_reason,
        canRemove: typeof row.submitted_by === "string",
        tags: assignments.filter((item) => item.activity_log_id === row.id).map((item) => {
          const tag = tagsById.get(item.tag_id);
          if (!tag) throw new Error("A log tag definition is missing.");
          return { id: item.id, activityLogId: row.id, ownerUserId: item.created_by, name: tag.name, createdAt: item.created_at };
        }).sort((a, b) => a.name.localeCompare(b.name)),
      };
    }));
  return {
    farm, referenceDate: REFERENCE_DATE, currentDate: today, source: "supabase", logs,
    metrics: {
      todaysRecordings: todaysSubmissions.length,
      newRecordings: todaysSubmissions.length,
      activeWorkers,
      responseAccuracy: scoredLogs.length ? Math.round(scoredLogs.reduce((sum, row) => sum + (row.response_accuracy ?? 0), 0) / scoredLogs.length) : null,
    },
  };
}

export async function getDashboardData(): Promise<DashboardData> {
  return loadActivityData(false);
}

export async function getActivityLogsData(): Promise<DashboardData> {
  return loadActivityData(true);
}

export async function getEmployeeDirectoryData(): Promise<EmployeeDirectoryData> {
  const { supabase, farmId, canManage } = await getFarmAccess();
  if (!canManage) throw new Error("Only managers can load the employee directory.");
  const [farm, employees, profiles] = await Promise.all([
    supabase.from("farms").select("name").eq("id", farmId).single(),
    readAll((from, to) => supabase.from("employees")
      .select("id, full_name, active, contact_email")
      .eq("farm_id", farmId).order("id").range(from, to), "employee directory"),
    readAll((from, to) => supabase.from("profiles")
      .select("id, role, employee_id")
      .eq("farm_id", farmId).order("id").range(from, to), "employee accounts"),
  ]);
  if (farm.error || !farm.data) throw new Error("Unable to load your farm.");
  const countedWorkerIds = activeWorkerIds(employees, profiles);
  return {
    farmName: farm.data.name,
    employees: employees.filter((row) => countedWorkerIds.has(row.id)).map((row) => ({
      id: row.id, name: row.full_name, active: row.active, email: row.contact_email,
    })).sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id)),
  };
}
