import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export function proxy(request: NextRequest) {
  return updateSession(request);
}

// Only the current auth-aware routes; static Figma assets are untouched.
export const config = { matcher: ["/", "/login", "/signup", "/employee", "/employees", "/activity-logs", "/api/employee/voice"] };
