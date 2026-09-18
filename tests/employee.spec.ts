import { expect, test } from "@playwright/test";
import { login } from "./support/login";

test("any visitor can create an employee account and submit activity", async ({ page }) => {
  const email = `new.worker.${Date.now()}@example.test`;
  const summary = "Checked irrigation lines and repaired a leaking valve.";
  await page.goto("/employee");
  await expect(page).toHaveURL(/\/login$/);
  await page.getByRole("link", { name: "Create one" }).click();
  await expect(page).toHaveURL(/\/signup$/);
  await page.getByLabel("Full name").fill("New Worker");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill("local-test-password");
  await page.getByRole("button", { name: "Create employee account" }).click();
  await expect(page).toHaveURL(/\/employee$/);
  await expect(page.getByRole("heading", { name: "Welcome, New Worker" })).toBeVisible();
  await page.goto("/");
  await expect(page).toHaveURL(/\/employee$/);
  await page.getByRole("combobox", { name: "Field" }).selectOption({ label: "FIELD A" });
  await page.getByRole("combobox", { name: "Activity" }).selectOption("Irrigation");
  await page.getByLabel("Work date").fill("2026-09-17");
  await page.getByLabel("Start time").fill("06:00");
  await page.getByLabel("End time").fill("07:00");
  await page.getByLabel("What happened?").fill(summary);
  await page.getByRole("button", { name: "Submit Activity" }).click();
  await expect(page.getByRole("status")).toContainText("Activity submitted");
  await expect(page.getByRole("heading", { name: "Recent submissions" })).toBeVisible();
  await expect(page.getByText(summary)).toBeVisible();
  await page.reload();
  await expect(page.getByText(summary)).toBeVisible();
  await page.getByRole("button", { name: "Log Out" }).click();
  await expect(page).toHaveURL("http://127.0.0.1:3100/");
  await expect(page.locator(".farm-identity")).toContainText("Guest Manager");
  await page.getByRole("link", { name: "Sign In" }).click();
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill("local-test-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/employee$/);
  await expect(page.getByText(summary)).toBeVisible();
});

test("employee records speech, reviews its transcript, and keeps the voice submission after refresh", async ({ page }) => {
  await page.addInitScript(() => {
    const media = navigator.mediaDevices;
    media.getUserMedia = async () => {
      const context = new AudioContext();
      const source = context.createOscillator();
      const destination = context.createMediaStreamDestination();
      source.connect(destination);
      source.start();
      return destination.stream;
    };
    class TestRecognition {
      continuous = false;
      interimResults = false;
      lang = "";
      onresult: ((event: { results: { isFinal: boolean; 0: { transcript: string } }[] }) => void) | null = null;
      onerror: (() => void) | null = null;
      onend: (() => void) | null = null;
      start() { setTimeout(() => this.onresult?.({ results: [{ isFinal: true, 0: { transcript: "Sprayed the north field" } }] }), 100); }
      stop() { this.onend?.(); }
    }
    Object.defineProperty(window, "SpeechRecognition", { configurable: true, value: TestRecognition });
  });
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill("anthony@example.test");
  await page.getByLabel("Password", { exact: true }).fill("local-test-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/employee$/);
  await page.getByRole("combobox", { name: "Field" }).selectOption({ label: "FIELD A" });
  await page.getByRole("combobox", { name: "Activity" }).selectOption("Spraying");
  await page.getByLabel("Start time").fill("06:00");
  await page.getByLabel("End time").fill("07:00");
  await page.getByRole("button", { name: "Start recording" }).click();
  await expect(page.getByLabel("Transcript (review and edit)")).toHaveValue("Sprayed the north field");
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: /Stop recording/ }).click();
  await expect(page.getByLabel("Preview your recording")).toBeVisible();
  await page.getByLabel("What happened?").fill("Used the north block spray mix.");
  await page.getByRole("button", { name: "Submit Activity" }).click();
  await expect(page.getByText("Recording and activity submitted.", { exact: false })).toBeVisible();
  await expect(page.getByText("Transcript: Sprayed the north field", { exact: false })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Transcript: Sprayed the north field", { exact: false })).toBeVisible();
});

test("manager cannot enter employee submission screen", async ({ page }) => {
  await login(page);
  await page.goto("/employee");
  await expect(page).toHaveURL("http://127.0.0.1:3100/");
});

test("employee cannot browse or edit the manager employee directory", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill("anthony@example.test");
  await page.getByLabel("Password", { exact: true }).fill("local-test-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/employee$/);
  await page.goto("/employees");
  await expect(page).toHaveURL(/\/employee$/);
  await page.goto("/activity-logs");
  await expect(page).toHaveURL(/\/employee$/);
  const cookie = (await page.context().cookies()).find((item) => item.name.endsWith("auth-token"))!;
  const session = JSON.parse(Buffer.from(cookie.value.slice(7), "base64url").toString());
  const response = await page.request.patch("http://127.0.0.1:54331/rest/v1/activity_logs?id=eq.20000000-0000-4000-8000-000000000001", {
    headers: { Authorization: `Bearer ${session.access_token}` }, data: { review_status: "approved" },
  });
  expect(response.status()).toBe(403);
  const denial = await page.request.patch("http://127.0.0.1:54331/rest/v1/activity_logs?id=eq.20000000-0000-4000-8000-000000000001", {
    headers: { Authorization: `Bearer ${session.access_token}` }, data: { review_status: "denied" },
  });
  expect(denial.status()).toBe(403);
});

test("email confirmation code completes the employee session instead of being discarded", async ({ page }) => {
  await page.goto("/signup");
  await page.getByLabel("Full name").fill("Confirmed Worker");
  await page.getByLabel("Email", { exact: true }).fill(`worker.${Date.now()}@confirm.example.test`);
  await page.getByLabel("Password", { exact: true }).fill("local-test-password");
  await page.getByRole("button", { name: "Create employee account" }).click();
  await expect(page.getByRole("status")).toContainText("check your email");
  await page.goto("/?code=local-confirm-code");
  await expect(page).toHaveURL(/\/employee$/);
  await expect(page.getByRole("heading", { name: "Welcome, Confirmed Worker" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Welcome, Confirmed Worker" })).toBeVisible();
});

test("manager can remove employee submissions while seeded logs stay protected", async ({ page }) => {
  await login(page);
  await expect(page.locator(".metric-card dd")).toHaveText(["00 New", "4", "90"]);
  const cookie = (await page.context().cookies()).find((item) => item.name.endsWith("auth-token"))!;
  const session = JSON.parse(Buffer.from(cookie.value.slice(7), "base64url").toString());
  const added = await page.request.post("http://127.0.0.1:54331/__test/control", {
    headers: { Authorization: `Bearer ${session.access_token}` }, data: { addSubmittedLog: true },
  });
  expect(added.ok()).toBe(true);
  await page.reload();
  await expect(page.locator(".metric-card dd")).toHaveText(["11 New", "4", "90"]);
  await page.getByRole("button", { name: "View Isaac Wang's log" }).click();
  await expect(page.getByRole("button", { name: "Remove activity" })).toHaveCount(0);
  await page.getByRole("button", { name: "View Anthony Wells's log" }).click();
  await expect(page.getByText("Anthony checked the irrigation lines.")).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Remove activity" }).click();
  await expect(page.getByRole("button", { name: "View Anthony Wells's log" })).toHaveCount(0);
  await expect(page.locator(".metric-card dd")).toHaveText(["00 New", "4", "90"]);
  await page.reload();
  await expect(page.getByRole("button", { name: "View Anthony Wells's log" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "View Isaac Wang's log" })).toBeVisible();
});

test("manager plays a saved employee recording through its signed private URL", async ({ page }) => {
  await login(page);
  const audioBase64 = await page.evaluate(async () => {
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const destination = context.createMediaStreamDestination();
    oscillator.connect(destination);
    oscillator.start();
    const recorder = new MediaRecorder(destination.stream, { mimeType: "audio/webm" });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
    const done = new Promise<Blob>((resolve) => { recorder.onstop = () => resolve(new Blob(chunks, { type: "audio/webm" })); });
    recorder.start();
    await new Promise((resolve) => setTimeout(resolve, 1200));
    recorder.stop();
    const blob = await done;
    oscillator.stop();
    await context.close();
    return new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1]);
      reader.readAsDataURL(blob);
    });
  });
  const cookie = (await page.context().cookies()).find((item) => item.name.endsWith("auth-token"))!;
  const session = JSON.parse(Buffer.from(cookie.value.slice(7), "base64url").toString());
  const added = await page.request.post("http://127.0.0.1:54331/__test/control", {
    headers: { Authorization: `Bearer ${session.access_token}` }, data: { addRecordedLog: audioBase64 },
  });
  expect(added.ok()).toBe(true);
  await page.reload();
  await page.getByRole("button", { name: "View Anthony Wells's log" }).click();
  await expect(page.getByText("Transcript: Sprayed the north field")).toBeVisible();
  await page.getByRole("button", { name: "Play Recording" }).click();
  await expect(page.getByRole("button", { name: "Pause Recording" })).toBeVisible();
  await page.getByRole("button", { name: "Pause Recording" }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Remove activity" }).click();
  await expect(page.getByRole("button", { name: "View Anthony Wells's log" })).toHaveCount(0);
});

test("active workers count the four baseline workers plus new employee accounts", async ({ page }) => {
  await login(page);
  await expect(page.locator(".metric-card dd").nth(1)).toHaveText("4");
  const cookie = (await page.context().cookies()).find((item) => item.name.endsWith("auth-token"))!;
  const session = JSON.parse(Buffer.from(cookie.value.slice(7), "base64url").toString());
  const added = await page.request.post("http://127.0.0.1:54331/__test/control", {
    headers: { Authorization: `Bearer ${session.access_token}` }, data: { addEmployeeAccount: true },
  });
  expect(added.ok()).toBe(true);
  await page.reload();
  await expect(page.locator(".metric-card dd").nth(1)).toHaveText("5");
  await page.getByRole("link", { name: "Employees" }).click();
  await expect(page.getByRole("heading", { name: "All employees (5)" })).toBeVisible();
  await expect(page.getByRole("rowheader", { name: "AGP" })).toBeVisible();
});
