import { expect, test } from "@playwright/test";
import { login } from "./support/login";

test("extension-added body attributes do not cause a hydration warning", async ({ page }) => {
  await login(page);
  const hydrationErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" && /hydrat|server rendered/i.test(message.text())) {
      hydrationErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => hydrationErrors.push(error.message));

  // Reproduce the DOM attributes from the reported Grammarly screenshot
  // before React starts, without requiring a browser extension in CI.
  await page.route("http://127.0.0.1:3100/", async (route) => {
    const response = await route.fetch();
    const html = await response.text();
    await route.fulfill({
      response,
      body: html.replace(
        "<body>",
        '<body data-new-gr-c-s-check-loaded="14.1329.0" data-gr-ext-installed="">',
      ),
    });
  });

  await page.goto("/");
  await expect(page.locator("body")).toHaveAttribute("data-gr-ext-installed", "");
  await page.getByRole("button", { name: "View Isaac Wang's log" }).click();
  await expect(page.getByRole("region", { name: "Isaac Wang's log details" })).toBeVisible();
  expect(hydrationErrors).toEqual([]);
});
