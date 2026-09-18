"use server";

import { revalidatePath } from "next/cache";
import { FarmAccessError, getFarmAccess } from "@/lib/data/farm-access";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Result = { error: string };

async function editableLog(logId: string) {
  const access = await getFarmAccess();
  if (!access.canManage) throw new FarmAccessError("Only farm managers and administrators can change tags.");
  const { data, error } = await access.supabase.from("activity_logs").select("id")
    .eq("farm_id", access.farmId).eq("id", logId).maybeSingle();
  if (error || !data) throw new FarmAccessError("This log is unavailable in your farm.");
  return access;
}

export async function addLogTag(logId: string, input: string): Promise<Result> {
  if (typeof logId !== "string" || !uuid.test(logId) || typeof input !== "string" || input.length > 400) return { error: "Invalid log or tag." };
  const name = input.trim().replace(/\s+/g, " ");
  if (!name || [...name].length > 40 || /[\u0000-\u001f\u007f]/.test(name)) return { error: "Enter a tag name between 1 and 40 characters." };
  try {
    const { supabase, farmId, userId } = await editableLog(logId);
    // Escape LIKE wildcards: a literal '%' or '_' is part of a tag name.
    const pattern = name.replace(/[\\%_]/g, "\\$&");
    const findTag = () => supabase.from("tags").select("id").eq("farm_id", farmId).ilike("name", pattern).maybeSingle();
    let lookup = await findTag();
    if (lookup.error) throw new Error("Tag lookup failed");
    let tagId = lookup.data?.id;
    if (!tagId) {
      const inserted = await supabase.from("tags").insert({ farm_id: farmId, name, created_by: userId }).select("id").single();
      if (inserted.error && inserted.error.code !== "23505") throw new Error("Tag creation failed");
      tagId = inserted.data?.id;
      if (!tagId) {
        // Another request may have created the shared definition first.
        lookup = await findTag();
        if (lookup.error || !lookup.data) throw new Error("Tag lookup failed");
        tagId = lookup.data.id;
      }
    }
    const { error } = await supabase.from("activity_log_tags").insert({
      farm_id: farmId, activity_log_id: logId, tag_id: tagId, created_by: userId,
    });
    // A retry of an already attached tag is a successful, idempotent operation.
    if (error && error.code !== "23505") throw new Error("Tag assignment failed");
  } catch (error) {
    return { error: error instanceof FarmAccessError ? error.message : "Unable to save this tag. Please try again." };
  }
  revalidatePath("/");
  revalidatePath("/activity-logs");
  return { error: "" };
}

export async function removeLogTag(logId: string, assignmentId: string): Promise<Result> {
  if (typeof logId !== "string" || !uuid.test(logId) || typeof assignmentId !== "string" || !uuid.test(assignmentId)) return { error: "Invalid log or tag." };
  try {
    const { supabase, farmId } = await editableLog(logId);
    const { error } = await supabase.from("activity_log_tags").delete()
      .eq("farm_id", farmId).eq("activity_log_id", logId).eq("id", assignmentId);
    if (error) throw new Error("Tag removal failed");
  } catch (error) {
    return { error: error instanceof FarmAccessError ? error.message : "Unable to remove this tag. Please try again." };
  }
  revalidatePath("/");
  revalidatePath("/activity-logs");
  return { error: "" };
}

export async function removeEmployeeActivity(logId: string): Promise<Result> {
  if (typeof logId !== "string" || !uuid.test(logId)) return { error: "Invalid activity." };
  try {
    const { supabase, farmId, canManage } = await getFarmAccess();
    if (!canManage) throw new FarmAccessError("Only farm managers can remove employee activities.");
    const { data: log, error: readError } = await supabase.from("activity_logs")
      .select("id, submitted_by").eq("farm_id", farmId).eq("id", logId).maybeSingle();
    if (readError || !log || !log.submitted_by) throw new FarmAccessError("This employee activity is unavailable for removal.");
    const { data: recordings, error: recordingError } = await supabase.from("recordings")
      .select("storage_bucket, storage_path").eq("farm_id", farmId).eq("activity_log_id", logId);
    if (recordingError) throw new Error("Unable to load activity recordings");
    const { data, error } = await supabase.from("activity_logs").delete()
      .eq("farm_id", farmId).eq("id", logId).not("submitted_by", "is", null).select("id");
    if (error || !data || data.length !== 1) throw new Error("Activity removal failed");
    const paths = recordings?.filter((item) => item.storage_bucket === "toph-recordings" && item.storage_path)
      .map((item) => item.storage_path as string) ?? [];
    if (paths.length) {
      const cleanup = await supabase.storage.from("toph-recordings").remove(paths);
      if (cleanup.error) console.error("Unable to remove audio for deleted activity.");
    }
  } catch (error) {
    return { error: error instanceof FarmAccessError ? error.message : "Unable to remove this activity. Please try again." };
  }
  revalidatePath("/");
  revalidatePath("/activity-logs");
  return { error: "" };
}

async function decideActivity(logId: string, decision: "approved" | "denied", inputReason: string): Promise<Result> {
  if (typeof logId !== "string" || !uuid.test(logId)) return { error: "Invalid activity." };
  if (typeof inputReason !== "string" || inputReason.length > 400) return { error: "The denial reason must be 200 characters or less." };
  const reason = inputReason.trim().replace(/\s+/g, " ");
  if (decision === "denied" && ([...reason].length > 200 || /[\u0000-\u001f\u007f]/.test(reason))) {
    return { error: "The denial reason must be 200 characters or less." };
  }
  try {
    const { supabase, farmId, canManage } = await getFarmAccess();
    if (!canManage) throw new FarmAccessError("Only farm managers can decide activities.");
    const { data, error } = await supabase.from("activity_logs")
      .update(decision === "denied" ? { review_status: decision, denial_reason: reason || null } : { review_status: decision })
      .eq("farm_id", farmId).eq("id", logId).eq("review_status", "pending")
      .select("id");
    if (error) throw new Error("Decision failed");
    if (data.length !== 1) return { error: "This activity is unavailable or already has a final decision." };
  } catch (error) {
    return { error: error instanceof FarmAccessError ? error.message : `Unable to ${decision === "approved" ? "approve" : "deny"} this activity. Please try again.` };
  }
  revalidatePath("/");
  revalidatePath("/activity-logs");
  return { error: "" };
}

export async function approveActivity(logId: string): Promise<Result> {
  return decideActivity(logId, "approved", "");
}

export async function denyActivity(logId: string, reason: string): Promise<Result> {
  return decideActivity(logId, "denied", reason);
}
