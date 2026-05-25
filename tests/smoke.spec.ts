import { test, expect } from "@playwright/test";

test("homepage loads without console errors", async ({ page }) => {
  const consoleErrors: string[] = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  });

  await page.goto("/");

  await expect(page.locator("body")).toBeVisible();

  expect(consoleErrors).toEqual([]);
});