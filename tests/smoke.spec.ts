import { test, expect } from "@playwright/test";

const routes = [
  "/drive",
  "/arm",
  "/science",
  "/autonomy",
  "/extras/graphs",
  "/extras/files",
  "/extras/speedtest",
];

for (const route of routes) {
  test(`${route} loads without console errors`, async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    const response = await page.goto(route);

    expect(response?.ok()).toBeTruthy();
    await expect(page.locator("#root")).not.toBeEmpty();

    expect(consoleErrors).toEqual([]);
  });
}