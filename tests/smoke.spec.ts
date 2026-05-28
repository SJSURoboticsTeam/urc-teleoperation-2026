import { test, expect } from "@playwright/test";

test("homepage loads without console errors", async ({ page }) => {
  const consoleErrors: string[] = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  });

  const response = await page.goto("/");
  expect(response?.ok()).toBeTruthy();

// delay until title is visible as some delay
  await expect(page).toHaveTitle(/Teleoperations/);
  // verify that something loaded below root element
  await expect(page.locator("#root")).not.toBeEmpty();
  // validate teleoperations text exists so page is rendered
  await expect(page.getByText("Teleoperations")).toBeVisible();


  
// now ensure there are no errors
  expect(consoleErrors).toEqual([]);

  
});