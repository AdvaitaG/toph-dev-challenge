export type ActivityType =
  | "Spraying"
  | "Harvesting"
  | "Planting"
  | "Irrigation"
  | "Scouting";

export type ReviewStatus = "pending" | "approved" | "denied";

export interface Farm {
  id: string;
  name: string;
  timezone: string;
}

export interface Employee {
  id: string;
  farmId: string;
  name: string;
  active: boolean;
}

export interface LogLocation {
  latitude: number;
  longitude: number;
}

export interface ActivityLog {
  id: string;
  employeeId: string;
  activityType: ActivityType;
  activityDate: string;
  field: string;
  startedAt: string;
  endedAt: string;
  recordedAt: string;
  summary: string;
  audioUrl: string | null;
  location: LogLocation | null;
  responseAccuracy: number | null;
  reviewStatus: ReviewStatus;
  denialReason: string | null;
  isNew: boolean;
}

export interface LogTag {
  id: string;
  activityLogId: string;
  // Assignment attribution, not ownership; system/deleted creators are nullable.
  ownerUserId: string | null;
  name: string;
  createdAt: string;
}

export interface DashboardLog extends ActivityLog {
  employee: Pick<Employee, "id" | "name">;
  tags: LogTag[];
  canRemove: boolean;
}

export interface DashboardMetrics {
  todaysRecordings: number;
  newRecordings: number;
  activeWorkers: number;
  responseAccuracy: number | null;
}

export interface DashboardData {
  farm: Farm;
  referenceDate: string;
  currentDate: string;
  source: "fixtures" | "supabase";
  metrics: DashboardMetrics;
  logs: DashboardLog[];
}

export interface EmployeeContact {
  id: string;
  name: string;
  email: string | null;
  active: boolean;
}

export interface EmployeeDirectoryData {
  farmName: string;
  employees: EmployeeContact[];
}
