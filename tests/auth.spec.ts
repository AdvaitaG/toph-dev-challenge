import { expect, test } from "@playwright/test";
import { login } from "./support/login";

test("guest landing, login, refresh, logout, and protected re-entry", async ({ page, context }) => {
  const response = await page.goto("/");
  await expect(page).toHaveURL("http://127.0.0.1:3100/");
  await expect(page.locator(".farm-identity")).toContainText("Guest Manager");
  await expect(page.locator(".log-row")).toHaveCount(4);
  expect(response?.headers()["cache-control"]).toContain("no-store");
  await page.getByRole("link", { name: "Sign In" }).click();
  await login(page);
  expect((await context.cookies()).some((c) => c.name.includes("auth-token"))).toBe(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
  await page.goto("/login");
  await expect(page).toHaveURL("http://127.0.0.1:3100/");
  await page.getByRole("button", { name: "Log Out", exact: true }).click();
  await expect(page).toHaveURL("http://127.0.0.1:3100/");
  await expect(page.locator(".farm-identity")).toContainText("Guest Manager");
  expect((await context.cookies()).filter((c) => c.name.includes("auth-token"))).toHaveLength(0);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
});

test("bad credentials stay on login with an accessible error", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill("tester@example.test");
  await page.getByLabel("Password", { exact: true }).fill("wrong-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.locator("form").getByRole("alert")).toContainText("Unable to sign in");
  await expect(page).toHaveURL(/\/login$/);
});

test("Google sign-in provisions a new employee and keeps the manager's existing role", async ({ page, context }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Continue with Google" }).click();
  await expect(page).toHaveURL(/\/employee$/);
  await expect(page.getByRole("heading", { name: "Welcome, Google Worker" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Welcome, Google Worker" })).toBeVisible();
  await page.getByRole("button", { name: "Log Out" }).click();

  await context.addCookies([{ name: "toph-test-oauth-manager", value: "1", url: "http://127.0.0.1:3100" }]);
  await page.getByRole("link", { name: "Sign In" }).click();
  await page.getByRole("button", { name: "Continue with Google" }).click();
  await expect(page).toHaveURL("http://127.0.0.1:3100/");
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
});

test("proxy rotates expiring cookies and the refreshed session survives reload", async ({ page, context }) => {
  await login(page);
  const cookie = (await context.cookies()).find((c) => c.name.endsWith("auth-token"))!;
  const stored = JSON.parse(Buffer.from(cookie.value.slice("base64-".length), "base64url").toString());
  const oldRefresh = stored.refresh_token;
  stored.expires_at = 1;
  await context.addCookies([{ ...cookie, value: `base64-${Buffer.from(JSON.stringify(stored)).toString("base64url")}` }]);
  const response = await page.reload();
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
  expect(response?.headers()["cache-control"]).toContain("no-store");
  const refreshed = (await context.cookies()).find((c) => c.name.endsWith("auth-token"))!;
  const session = JSON.parse(Buffer.from(refreshed.value.slice("base64-".length), "base64url").toString());
  expect(session.refresh_token).not.toBe(oldRefresh);
  await page.reload();
  await expect(page).toHaveURL("http://127.0.0.1:3100/");
});

test("forged session payload is rejected even when it contains a user", async ({ page, context }) => {
  await login(page);
  const cookie = (await context.cookies()).find((c) => c.name.endsWith("auth-token"))!;
  const stored = JSON.parse(Buffer.from(cookie.value.slice("base64-".length), "base64url").toString());
  const pieces = stored.access_token.split(".");
  const claims = JSON.parse(Buffer.from(pieces[1], "base64url").toString());
  claims.sub = "60000000-0000-4000-8000-000000000999";
  pieces[1] = Buffer.from(JSON.stringify(claims)).toString("base64url");
  stored.access_token = pieces.join(".");
  await context.addCookies([{ ...cookie, value: `base64-${Buffer.from(JSON.stringify(stored)).toString("base64url")}` }]);
  await page.goto("/");
  await expect(page).toHaveURL("http://127.0.0.1:3100/");
  await expect(page.locator(".farm-identity")).toContainText("Guest Manager");
  await expect(page.locator(".log-row")).toHaveCount(4);
});
