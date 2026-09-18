import { revalidatePath } from "next/cache";
import { FarmAccessError, getFarmAccess } from "@/lib/data/farm-access";
import { farmLocalInstant } from "@/lib/data/work-time";

const bucket = "toph-recordings";
const maxAudioBytes = 2_621_440;
const mimeExtensions: Record<string, string> = {
  "audio/webm": "webm", "audio/mp4": "mp4", "audio/ogg": "ogg",
};
const activities = new Set(["Spraying", "Harvesting", "Planting", "Irrigation", "Scouting"]);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const text = (value: FormDataEntryValue | null) => typeof value === "string" ? value.trim() : "";
const fail = (message: string, status = 400) => Response.json({ error: message }, { status });

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  try {
    if (origin && new URL(origin).host !== (request.headers.get("host") ?? new URL(request.url).host)) return fail("Invalid request origin.", 403);
  } catch { return fail("Invalid request origin.", 403); }
  if (Number(request.headers.get("content-length") || 0) > maxAudioBytes + 100_000) return fail("The recording is too large.", 413);

  let form: FormData;
  try { form = await request.formData(); }
  catch { return fail("Unable to read the recording."); }
  const audio = form.get("audio");
  const fieldId = text(form.get("fieldId"));
  const activityType = text(form.get("activityType"));
  const day = text(form.get("activityDate"));
  const start = text(form.get("startTime"));
  const end = text(form.get("endTime"));
  const transcript = text(form.get("transcript"));
  const note = text(form.get("note"));
  const duration = Number(text(form.get("durationSeconds")));
  const mime = audio instanceof File ? audio.type.split(";")[0].toLowerCase() : "";
  if (!(audio instanceof File) || audio.size === 0 || audio.size > maxAudioBytes || !mimeExtensions[mime]) return fail("Record a supported audio clip under 2.5 MB.");
  const parsedDay = /^\d{4}-\d{2}-\d{2}$/.test(day) ? Date.parse(`${day}T00:00:00Z`) : NaN;
  if (!uuid.test(fieldId) || !activities.has(activityType) || !Number.isFinite(parsedDay) ||
      new Date(parsedDay).toISOString().slice(0, 10) !== day ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(start) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(end) || end <= start) {
    return fail("Check the field, activity, work date, and time range.");
  }
  if ((!transcript && !note) || transcript.length > 5000 || note.length > 2000 ||
      !Number.isFinite(duration) || duration <= 0 || duration > 90) {
    return fail("Add a transcript or note, and keep the recording under 90 seconds.");
  }

  try {
    const { supabase, farmId, employeeId, role, userId } = await getFarmAccess();
    if (role !== "employee" || !employeeId) return fail("Employee access is required.", 403);
    const [employee, field, farm] = await Promise.all([
      supabase.from("employees").select("active").eq("farm_id", farmId).eq("id", employeeId).maybeSingle(),
      supabase.from("fields").select("id").eq("farm_id", farmId).eq("id", fieldId).maybeSingle(),
      supabase.from("farms").select("timezone").eq("id", farmId).single(),
    ]);
    if (employee.error || !employee.data?.active || field.error || !field.data || farm.error || !farm.data) return fail("Your employee or field access is unavailable.", 403);
    const startedAt = farmLocalInstant(day, start, farm.data.timezone);
    const endedAt = farmLocalInstant(day, end, farm.data.timezone);
    if (!startedAt || !endedAt || endedAt <= startedAt) return fail("That work time is invalid in your farm's timezone.");

    const path = `${farmId}/${userId}/${crypto.randomUUID()}.${mimeExtensions[mime]}`;
    const uploaded = await supabase.storage.from(bucket).upload(path, audio, { contentType: mime, upsert: false });
    if (uploaded.error) return fail("Unable to save the recording. Please try again.", 503);
    const { data: logId, error } = await supabase.rpc("submit_recorded_activity", {
      p_field_id: fieldId, p_activity_type: activityType, p_activity_date: day,
      p_started_at: startedAt, p_ended_at: endedAt,
      p_transcript: transcript, p_note: note, p_storage_path: path,
      p_duration_seconds: duration,
    });
    if (error || !logId) {
      await supabase.storage.from(bucket).remove([path]);
      return fail("Unable to save the activity. Please try again.", 503);
    }
    revalidatePath("/");
    revalidatePath("/employee");
    return Response.json({ id: logId });
  } catch (error) {
    return fail(error instanceof FarmAccessError ? error.message : "Unable to save the recording. Please try again.", error instanceof FarmAccessError ? 401 : 503);
  }
}
