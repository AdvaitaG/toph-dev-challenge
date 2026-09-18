"use server";

import { revalidatePath } from "next/cache";
import { FarmAccessError, getFarmAccess } from "@/lib/data/farm-access";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function saveEmployeeEmail(employeeId: string, emailInput: string): Promise<{ error: string }> {
  if (!uuid.test(employeeId) || typeof emailInput !== "string" || emailInput.length > 300) {
    return { error: "Enter a valid employee email address." };
  }
  const email = emailInput.trim().toLowerCase();
  if (email && (email.length > 254 || !emailPattern.test(email))) {
    return { error: "Enter a valid email address, or leave it blank to remove the contact." };
  }
  try {
    const { supabase, farmId, canManage } = await getFarmAccess();
    if (!canManage) throw new FarmAccessError("Only farm managers can edit employee contacts.");
    const { data, error } = await supabase.from("employees")
      .update({ contact_email: email || null })
      .eq("farm_id", farmId).eq("id", employeeId).select("id").maybeSingle();
    if (error || !data) return { error: "Unable to save this employee email. Please try again." };
  } catch (error) {
    return { error: error instanceof FarmAccessError ? error.message : "Unable to save this employee email. Please try again." };
  }
  revalidatePath("/employees");
  return { error: "" };
}
