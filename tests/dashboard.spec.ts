import { expect, test } from "@playwright/test";
import { login } from "./support/login";

test.beforeEach(async ({ page }) => { await login(page); });

const names = ["Isaac Wang", "Maya Patel", "Liam Johnson", "Sophia Lee"];

test("default and expanded screenshots, metrics, and generic log expansion", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
  await expect(page.locator(".metric-card dd")).toHaveText(["00 New", "4", "90"]);
  await expect(page.locator(".log-row")).toHaveCount(5);
  await page.screenshot({ path: testInfo.outputPath("default.png"), fullPage: true });
  for (const name of names) {
    await page.getByRole("button", { name: `View ${name}'s log` }).click();
    await expect(page.getByRole("region", { name: `${name}'s log details` })).toBeVisible();
    await expect(page.locator(".log-details")).toHaveCount(1);
    await expect(page.getByRole("button", { name: `Close ${name}'s log` })).toHaveAttribute("aria-expanded", "true");
    if (name === "Isaac Wang") {
      await expect(page.locator(".log-summary")).toContainText("Offline guided voice log");
      await page.screenshot({ path: testInfo.outputPath("expanded.png"), fullPage: true });
    }
    if (name === "Maya Patel") await expect(page.locator(".log-summary")).toContainText("Harvested the mature crop");
  }
  await page.getByRole("button", { name: "Close Sophia Lee's log" }).click();
  await expect(page.locator(".log-details")).toHaveCount(0);
  await page.getByRole("rowheader", { name: "Isaac Wang" }).click();
  await expect(page.locator(".log-details")).toHaveCount(1);
  expect(errors).toEqual([]);
});

test("search handles employee, activity, field, and empty results", async ({ page }) => {
  await page.goto("/");
  const search = page.getByRole("searchbox");
  for (const query of ["Isaac", "Spraying"]) {
    await search.fill(query);
    await expect(page.locator(".log-row")).toHaveCount(1);
    await expect(page.locator(".log-row")).toContainText("Isaac Wang");
  }
  await search.fill("no matching farm activity");
  await expect(page.getByRole("heading", { name: "No matching logs" })).toBeVisible();
  await page.getByRole("button", { name: "Clear search and filters" }).click();
  await expect(page.locator(".log-row")).toHaveCount(5);
});

test("sort, date ranges, activity, field, and month controls work", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Sort", exact: true }).click();
  await page.getByRole("button", { name: "Date: newest first" }).click();
  await expect(page.locator(".log-row").first()).toContainText("Sophia Lee");
  await page.getByRole("button", { name: "Sort", exact: true }).click();
  await page.getByRole("button", { name: "Employee: A–Z" }).click();
  await expect(page.locator(".log-row th")).toHaveText(["Alex Rivera", "Isaac Wang", "Liam Johnson", "Maya Patel", "Sophia Lee"]);
  await page.getByRole("button", { name: "Filter", exact: true }).click();
  await page.getByRole("combobox", { name: "Activity", exact: true }).selectOption("Harvesting");
  await expect(page.locator(".log-row")).toHaveCount(1);
  await expect(page.locator(".log-row")).toContainText("Maya Patel");
  await page.getByRole("button", { name: "Reset filters" }).click();
  await page.getByRole("combobox", { name: "Field", exact: true }).selectOption("FIELD C");
  await expect(page.locator(".log-row")).toContainText("Liam Johnson");
  await page.getByRole("button", { name: "Reset filters" }).click();
  await page.getByLabel("From", { exact: true }).fill("2026-04-20");
  await page.getByLabel("To", { exact: true }).fill("2026-04-21");
  await expect(page.locator(".log-row")).toHaveCount(2);
  await page.getByRole("button", { name: "Done", exact: true }).click();
  const month = page.getByRole("button", { name: /This Month/ });
  await expect(month).toHaveAttribute("aria-pressed", "false");
  await month.click();
  await expect(month).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("heading", { name: "No matching logs" })).toBeVisible();
  await month.click();
  await expect(month).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator(".log-row")).toHaveCount(2);
});

test("This Month uses the farm's current calendar month instead of the April demo snapshot", async ({ page }) => {
  const cookie = (await page.context().cookies()).find((item) => item.name.endsWith("auth-token"))!;
  const session = JSON.parse(Buffer.from(cookie.value.slice(7), "base64url").toString());
  const added = await page.request.post("http://127.0.0.1:54331/__test/control", {
    headers: { Authorization: `Bearer ${session.access_token}` }, data: { addCurrentMonthLog: true },
  });
  expect(added.ok()).toBe(true);
  await page.reload();
  await expect(page.locator(".log-row")).toHaveCount(6);
  const month = page.getByRole("button", { name: /This Month/ });
  await month.click();
  await expect(month).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".log-row")).toHaveCount(1);
  await expect(page.locator(".log-row")).toContainText("Anthony Wells");
  await month.click();
  await expect(page.locator(".log-row")).toHaveCount(6);
});

test("Employees tab lists counted workers, saves contact emails, and supports search", async ({ page }) => {
  await page.getByRole("link", { name: "Employees" }).click();
  await expect(page).toHaveURL(/\/employees$/);
  await expect(page.getByRole("heading", { name: "All employees (4)" })).toBeVisible();
  await expect(page.locator(".nav-badge")).toHaveText("4");
  await expect(page.getByRole("rowheader", { name: "Isaac Wang" })).toBeVisible();
  await expect(page.getByRole("rowheader", { name: "Alex Rivera" })).toHaveCount(0);
  await page.getByRole("button", { name: "Add email for Isaac Wang" }).click();
  await page.getByRole("textbox", { name: "Email for Isaac Wang" }).fill("Isaac@Bays.Example");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("link", { name: "isaac@bays.example" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("link", { name: "isaac@bays.example" })).toHaveAttribute("href", "mailto:isaac@bays.example");
  await page.getByRole("searchbox", { name: "Search employees" }).fill("isaac@");
  await expect(page.getByRole("heading", { name: "All employees (1)" })).toBeVisible();
  await expect(page.getByRole("rowheader", { name: "Isaac Wang" })).toBeVisible();
  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Dashboard" }).click();
  await expect(page).toHaveURL("http://127.0.0.1:3100/");
});

test("manager approves and denies submissions; history, reasons, and tags persist", async ({ page }) => {
  await expect(page.locator(".nav-badge")).toHaveText("4");
  const cookie = (await page.context().cookies()).find((item) => item.name.endsWith("auth-token"))!;
  const session = JSON.parse(Buffer.from(cookie.value.slice(7), "base64url").toString());
  const added = await page.request.post("http://127.0.0.1:54331/__test/control", {
    headers: { Authorization: `Bearer ${session.access_token}` }, data: { addSubmittedLog: true, addSecondSubmittedLog: false },
  });
  expect(added.ok()).toBe(true);
  const second = await page.request.post("http://127.0.0.1:54331/__test/control", {
    headers: { Authorization: `Bearer ${session.access_token}` }, data: { addSecondSubmittedLog: true },
  });
  expect(second.ok()).toBe(true);
  await page.reload();
  await expect(page.locator(".nav-badge")).toHaveText("6");
  await expect(page.locator(".log-row").filter({ hasText: "Anthony Wells" })).toHaveCount(2);
  await page.locator(".log-row").filter({ hasText: "Anthony Wells" }).filter({ hasText: "Irrigation" }).getByRole("button", { name: "View Anthony Wells's log" }).click();
  await page.getByRole("button", { name: "Add Tag" }).click();
  await page.getByRole("textbox", { name: "Tag name" }).fill("Needs Review");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByRole("list", { name: "Log tags" })).toContainText("Needs Review");
  await page.reload();
  await page.locator(".log-row").filter({ hasText: "Anthony Wells" }).filter({ hasText: "Irrigation" }).getByRole("button", { name: "View Anthony Wells's log" }).click();
  await expect(page.getByRole("list", { name: "Log tags" })).toContainText("Needs Review");
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await expect(page.locator(".nav-badge")).toHaveText("5");
  await expect(page.locator(".log-row").filter({ hasText: "Anthony Wells" })).toHaveCount(2);
  await expect(page.locator(".log-row").filter({ hasText: "Anthony Wells" }).filter({ hasText: "Irrigation" })).toContainText("Approved");
  await page.locator(".log-row").filter({ hasText: "Anthony Wells" }).filter({ hasText: "Planting" }).getByRole("button", { name: "View Anthony Wells's log" }).click();
  await page.getByRole("button", { name: "Deny", exact: true }).click();
  await page.getByRole("textbox", { name: "Reason (optional)" }).fill("Incorrect field selected");
  await page.getByRole("button", { name: "Deny Activity" }).click();
  await expect(page.locator(".nav-badge")).toHaveText("4");
  await expect(page.locator(".log-row").filter({ hasText: "Anthony Wells" })).toHaveCount(1);
  await page.reload();
  await expect(page.locator(".log-row").filter({ hasText: "Anthony Wells" }).filter({ hasText: "Irrigation" })).toContainText("Approved");
  await expect(page.locator(".log-row").filter({ hasText: "Anthony Wells" }).filter({ hasText: "Planting" })).toHaveCount(0);
  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Activity Logs" }).click();
  await expect(page).toHaveURL(/\/activity-logs$/);
  await expect(page.locator(".nav-badge")).toHaveText("4");
  await expect(page.locator(".log-row")).toHaveCount(7);
  await expect(page.locator(".log-row").filter({ hasText: "Anthony Wells" }).filter({ hasText: "Irrigation" })).toContainText("Approved");
  await expect(page.locator(".log-row").filter({ hasText: "Anthony Wells" }).filter({ hasText: "Planting" })).toContainText("Denied");
  await page.locator(".log-row").filter({ hasText: "Anthony Wells" }).filter({ hasText: "Irrigation" }).getByRole("button", { name: "View Anthony Wells's log" }).click();
  await expect(page.getByRole("list", { name: "Log tags" })).toContainText("Needs Review");
  await page.getByRole("button", { name: "Filter", exact: true }).click();
  await page.getByRole("combobox", { name: "Status" }).selectOption("pending");
  await expect(page.getByRole("button", { name: "View Anthony Wells's log" })).toHaveCount(0);
  await page.getByRole("combobox", { name: "Status" }).selectOption("approved");
  await expect(page.getByRole("rowheader", { name: "Anthony Wells" })).toBeVisible();
  await expect(page.locator(".log-row").filter({ hasText: "Anthony Wells" }).filter({ hasText: "Planting" })).toHaveCount(0);
  await page.getByRole("combobox", { name: "Status" }).selectOption("denied");
  await expect(page.locator(".log-row").filter({ hasText: "Anthony Wells" }).filter({ hasText: "Planting" })).toBeVisible();
  await expect(page.locator(".log-row").filter({ hasText: "Anthony Wells" }).filter({ hasText: "Irrigation" })).toHaveCount(0);
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.locator(".log-row").filter({ hasText: "Anthony Wells" }).filter({ hasText: "Planting" }).getByRole("button", { name: "View Anthony Wells's log" }).click();
  await expect(page.getByText("Incorrect field selected")).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Filter", exact: true }).click();
  await page.getByRole("combobox", { name: "Status" }).selectOption("approved");
  await page.getByRole("combobox", { name: "Employee" }).selectOption({ label: "Anthony Wells" });
  await expect(page.locator(".log-row")).toHaveCount(1);
  await page.getByRole("combobox", { name: "Field" }).selectOption("FIELD A");
  await expect(page.locator(".log-row")).toHaveCount(1);
  await page.getByRole("combobox", { name: "Activity" }).selectOption("Harvesting");
  await expect(page.getByRole("heading", { name: "No matching logs" })).toBeVisible();
  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Employees" }).click();
  await expect(page.locator(".nav-badge")).toHaveText("4");
});

test("dashboard metric cards navigate to Activity Logs and Employees", async ({ page }) => {
  await page.getByRole("link", { name: "Open Todays Recordings" }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/activity-logs$/);
  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Dashboard" }).click();
  await page.getByRole("link", { name: "Open Active Workers" }).click();
  await expect(page).toHaveURL(/\/employees$/);
  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Dashboard" }).click();
  await page.getByRole("link", { name: "Open Response Accuracy" }).click();
  await expect(page).toHaveURL(/\/activity-logs$/);
});

test("checkbox selection does not expand rows and supports partial selection", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("checkbox", { name: "Select Isaac Wang's log" }).check();
  await expect(page.locator(".log-details")).toHaveCount(0);
  await expect(page.getByRole("checkbox", { name: "Select all visible logs" })).toBeChecked({ indeterminate: true });
  await page.getByRole("checkbox", { name: "Select all visible logs" }).check();
  for (const name of names) await expect(page.getByRole("checkbox", { name: `Select ${name}'s log` })).toBeChecked();
  await page.getByRole("checkbox", { name: "Select all visible logs" }).uncheck();
  await expect(page.locator("input[type=checkbox]:checked")).toHaveCount(0);
});

test("persistent tags are isolated by log, reject duplicates, filter Needs Review, and can be removed", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "View Isaac Wang's log" }).click();
  await page.getByRole("button", { name: "Add Tag", exact: true }).click();
  await expect(page.getByText("Tags are saved for your farm.")).toBeVisible();
  await page.getByLabel("Tag name").fill("Needs Review");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByRole("list", { name: "Log tags" })).toContainText("Needs Review");
  await page.getByRole("button", { name: "Add Tag", exact: true }).click();
  await page.getByLabel("Tag name").fill(" needs review ");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.locator(".log-details").getByRole("alert")).toHaveText("This tag already exists.");
  await page.getByRole("button", { name: "View Maya Patel's log" }).click();
  await expect(page.getByRole("list", { name: "Log tags" })).toHaveCount(0);
  await page.getByRole("button", { name: "View Isaac Wang's log" }).click();
  await expect(page.getByRole("list", { name: "Log tags" })).toContainText("Needs Review");
  await page.reload();
  await page.getByRole("button", { name: "View Isaac Wang's log" }).click();
  await expect(page.getByRole("list", { name: "Log tags" })).toContainText("Needs Review");
  await page.getByRole("button", { name: "Filter", exact: true }).click();
  await page.getByRole("combobox", { name: "Tag", exact: true }).selectOption("needs review");
  await expect(page.locator(".log-row")).toHaveCount(1);
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.getByRole("button", { name: "Remove Needs Review tag" }).click();
  await expect(page.getByRole("heading", { name: "No matching logs" })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "View Isaac Wang's log" }).click();
  await expect(page.getByRole("list", { name: "Log tags" })).toHaveCount(0);
});

test("map dialog supports Escape and restores focus; unavailable audio is honest", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "View Isaac Wang's log" }).click();
  await page.getByRole("button", { name: "Expand Map" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog")).toContainText("No location has been recorded");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Expand Map" })).toBeFocused();
  await page.getByRole("button", { name: "Play Recording" }).click();
  await expect(page.getByText("No recording is available for this demo log.")).toBeVisible();
  await page.getByRole("button", { name: "About this dashboard" }).click();
  await expect(page.getByRole("dialog")).toContainText("Demo snapshot: April 22, 2026");
});

test("narrow layout contains horizontal scrolling and stacks expanded content", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await page.getByRole("rowheader", { name: "Isaac Wang" }).click();
  await expect(page.locator(".log-summary")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await page.screenshot({ path: testInfo.outputPath("mobile.png"), fullPage: true });
});
