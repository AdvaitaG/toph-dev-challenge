import { expect, test } from "@playwright/test";

test("a fresh visitor lands on the Figma dashboard and can explore it read-only", async ({ page, context }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
  await expect(page.getByText("Guest Manager · Read-only")).toBeVisible();
  await expect(page.locator(".metric-card dd")).toHaveText(["51 New", "12", "90"]);
  await expect(page.locator(".log-row")).toHaveCount(4);
  expect((await context.cookies()).filter((cookie) => cookie.name.includes("auth-token"))).toHaveLength(0);

  await page.getByRole("button", { name: "View Isaac Wang's log" }).click();
  await expect(page.getByRole("region", { name: "Isaac Wang's log details" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Approve" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Deny" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Add Tag" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Remove activity" })).toHaveCount(0);
  await page.getByRole("searchbox", { name: "Search employee logs" }).fill("Maya");
  await expect(page.locator(".log-row")).toHaveCount(1);
  await page.getByRole("button", { name: "Filter", exact: true }).click();
  await page.getByRole("combobox", { name: "Activity" }).selectOption("Harvesting");
  await expect(page.locator(".log-row")).toHaveCount(1);
  await page.getByRole("combobox", { name: "Activity" }).selectOption("Spraying");
  await expect(page.getByRole("heading", { name: "No matching logs" })).toBeVisible();
});

test("guest can open safe history and directory without contact details or write controls", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Activity Logs" }).click();
  await expect(page).toHaveURL(/\/activity-logs$/);
  await expect(page.locator(".log-row")).toHaveCount(5);
  await page.getByRole("button", { name: "View Alex Rivera's log" }).click();
  await expect(page.getByRole("button", { name: "Approve" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Deny" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Add Tag" })).toHaveCount(0);
  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Employees" }).click();
  await expect(page.getByRole("heading", { name: "All employees (12)" })).toBeVisible();
  await expect(page.getByText("Contact details require manager sign-in.")).toBeVisible();
  await expect(page.getByRole("button", { name: /Add email|Edit email/ })).toHaveCount(0);
  await expect(page.locator('a[href^="mailto:"]')).toHaveCount(0);
  await page.locator("aside.sidebar").getByRole("link", { name: "Sign In" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
});

test("guest cannot submit work or mutate review data with crafted unauthenticated requests", async ({ page }) => {
  await page.goto("/");
  const update = await page.request.patch("http://127.0.0.1:54331/rest/v1/activity_logs?id=eq.20000000-0000-4000-8000-000000000001", {
    data: { review_status: "denied" },
  });
  expect(update.status()).toBe(401);
  const tag = await page.request.post("http://127.0.0.1:54331/rest/v1/activity_log_tags", {
    data: { activity_log_id: "20000000-0000-4000-8000-000000000001" },
  });
  expect(tag.status()).toBe(401);
  await page.goto("/employee");
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/");
  await expect(page.getByRole("button", { name: "View Isaac Wang's log" })).toBeVisible();
});
