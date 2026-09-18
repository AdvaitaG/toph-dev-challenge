import type { ActivityLog, Employee, Farm } from "@/types/dashboard";

export const DEMO_REFERENCE_DATE = "2026-04-22";

export const demoFarm: Farm = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "Bays Ranch",
  timezone: "America/Los_Angeles",
};

const employeeNames = [
  "Isaac Wang",
  "Maya Patel",
  "Liam Johnson",
  "Sophia Lee",
  "Alex Rivera",
  "Anthony Wells",
  "Grace Chen",
  "Noah Davis",
  "Olivia Martin",
  "Lucas Reed",
  "Amelia Torres",
  "Ben Wilson",
];

export const demoEmployees: Employee[] = employeeNames.map((name, index) => ({
  id: `10000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
  farmId: demoFarm.id,
  name,
  active: true,
}));

const sharedLogFields = {
  audioUrl: null,
  location: null,
  responseAccuracy: 90,
  denialReason: null,
} satisfies Pick<ActivityLog, "audioUrl" | "location" | "responseAccuracy" | "denialReason">;

export const demoActivityLogs: ActivityLog[] = [
  {
    ...sharedLogFields,
    id: "20000000-0000-4000-8000-000000000001",
    employeeId: demoEmployees[0].id,
    activityType: "Spraying",
    activityDate: "2026-04-19",
    field: "FIELD A",
    startedAt: "2026-04-19T06:00:00-07:00",
    endedAt: "2026-04-19T10:40:00-07:00",
    recordedAt: "2026-04-22T10:00:00-07:00",
    summary:
      "Offline guided voice log created at 2026-04-08T22:01:01.711Z. Question (activity_type): What type of activity was this — spraying, fertilizing, planting, irrigating, harvesting, scouting, pruning, soil work, or equipment maintenance? Answer: I'm leaving first, I'm going to go home. Question (field_block): Where were you working (field, block, or area)? Answer: yes, in one part and then 130 and 200 yes, and 130 for uh 160 and no, this yes no, no, uhm no no I remember, uhm uhm uhm, no, I don't remember anything.",
    reviewStatus: "pending",
    isNew: false,
  },
  {
    ...sharedLogFields,
    id: "20000000-0000-4000-8000-000000000002",
    employeeId: demoEmployees[1].id,
    activityType: "Harvesting",
    activityDate: "2026-04-20",
    field: "FIELD B",
    startedAt: "2026-04-20T07:30:00-07:00",
    endedAt: "2026-04-20T11:15:00-07:00",
    recordedAt: "2026-04-22T10:05:00-07:00",
    summary:
      "Harvested the mature crop in Field B from 7:30 AM to 11:15 AM. Completed the north and central rows, moved the harvested bins to the collection area, and flagged the remaining south rows for the next pass.",
    reviewStatus: "pending",
    isNew: false,
  },
  {
    ...sharedLogFields,
    id: "20000000-0000-4000-8000-000000000003",
    employeeId: demoEmployees[2].id,
    activityType: "Planting",
    activityDate: "2026-04-21",
    field: "FIELD C",
    startedAt: "2026-04-21T08:00:00-07:00",
    endedAt: "2026-04-21T12:00:00-07:00",
    recordedAt: "2026-04-22T10:10:00-07:00",
    summary:
      "Planted the prepared rows in Field C from 8:00 AM to noon. Checked seed spacing and planting depth before starting, completed the scheduled section, and cleaned the planter after the final pass.",
    reviewStatus: "pending",
    isNew: false,
  },
  {
    ...sharedLogFields,
    id: "20000000-0000-4000-8000-000000000004",
    employeeId: demoEmployees[3].id,
    activityType: "Irrigation",
    activityDate: "2026-04-22",
    field: "FIELD D",
    startedAt: "2026-04-22T06:30:00-07:00",
    endedAt: "2026-04-22T09:30:00-07:00",
    recordedAt: "2026-04-22T10:15:00-07:00",
    summary:
      "Ran the morning irrigation cycle in Field D from 6:30 AM to 9:30 AM. Checked line pressure, cleared two blocked emitters, and confirmed even coverage before shutting down the system.",
    reviewStatus: "pending",
    isNew: true,
  },
  {
    ...sharedLogFields,
    id: "20000000-0000-4000-8000-000000000005",
    employeeId: demoEmployees[4].id,
    activityType: "Scouting",
    activityDate: "2026-04-22",
    field: "FIELD A",
    startedAt: "2026-04-22T07:00:00-07:00",
    endedAt: "2026-04-22T08:00:00-07:00",
    recordedAt: "2026-04-22T10:20:00-07:00",
    summary:
      "Walked Field A to check crop condition and irrigation coverage. No new issues were reported. This recording has already been approved and is excluded from the original four-row design preview.",
    reviewStatus: "approved",
    isNew: false,
  },
];
