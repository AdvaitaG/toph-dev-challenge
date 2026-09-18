import { expect, test, type Page } from "@playwright/test";
import { login } from "./support/login";

async function control(page: Page, options: Record<string, boolean>) {
  const cookie = (await page.context().cookies()).find((item) => item.name.endsWith("auth-token"))!;
  const session = JSON.parse(Buffer.from(cookie.value.slice(7), "base64url").toString());
  const response = await page.request.post("http://127.0.0.1:54331/__test/control", {
    headers: { Authorization: `Bearer ${session.access_token}` }, data: options,
  });
  expect(response.ok()).toBe(true);
}
async function tag(page: Page, name: string) {
  await page.getByRole("button", { name: "Add Tag", exact: true }).click();
  await page.getByLabel("Tag name").fill(name);
  await page.getByRole("button", { name: "Add", exact: true }).click();
}

test.beforeEach(async ({ page }) => { await login(page); });

test("new reusable tags persist on two logs and detaching one preserves the other", async ({ page }) => {
  await page.getByRole("button", { name: "View Isaac Wang's log" }).click();
  await tag(page, "  Equipment   check  ");
  await expect(page.getByRole("list", { name: "Log tags" })).toContainText("Equipment check");
  await page.getByRole("button", { name: "View Maya Patel's log" }).click();
  await tag(page, "equipment check");
  await expect(page.getByRole("list", { name: "Log tags" })).toContainText("Equipment check");
  await page.reload();
  await page.getByRole("button", { name: "View Isaac Wang's log" }).click();
  await page.getByRole("button", { name: "Remove Equipment check tag" }).click();
  await expect(page.getByRole("list", { name: "Log tags" })).toHaveCount(0);
  await page.getByRole("button", { name: "View Maya Patel's log" }).click();
  await expect(page.getByRole("list", { name: "Log tags" })).toContainText("Equipment check");
});

test("failed writes show an error and do not pretend to save", async ({ page }) => {
  await control(page, { failWrites: true });
  await page.getByRole("button", { name: "View Isaac Wang's log" }).click();
  await tag(page, "Needs Review");
  await expect(page.locator(".log-details").getByRole("alert")).toContainText("Unable to save this tag");
  await expect(page.getByRole("list", { name: "Log tags" })).toHaveCount(0);
  await control(page, {});
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByRole("list", { name: "Log tags" })).toContainText("Needs Review");
});

test("member role cannot mutate tags through the server action", async ({ page }) => {
  await control(page, { member: true });
  await page.getByRole("button", { name: "View Isaac Wang's log" }).click();
  await tag(page, "Needs Review");
  await expect(page.locator(".log-details").getByRole("alert")).toContainText("Only farm managers and administrators");
  await expect(page.getByRole("list", { name: "Log tags" })).toHaveCount(0);
});

test("missing membership does not reveal fixture data", async ({ page }) => {
  await control(page, { noProfile: true });
  await page.reload();
  await expect(page.getByRole("heading", { name: "Farm access unavailable" })).toBeVisible();
  await expect(page.locator(".log-row")).toHaveCount(0);
});

test("database failure shows a retry state rather than fixture fallback", async ({ page }) => {
  await control(page, { failReads: true });
  await page.reload();
  await expect(page.getByRole("heading", { name: "Unable to load the dashboard" })).toBeVisible();
  await expect(page.locator(".log-row")).toHaveCount(0);
  await control(page, {});
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.locator(".log-row")).toHaveCount(5);
});
