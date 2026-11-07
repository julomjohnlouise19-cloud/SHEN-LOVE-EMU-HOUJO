import { test as base, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
export async function exploreAsGuest(page: Page, path = "/") {
  await page.goto(path);
  await expect(
    page.getByRole("heading", { name: "A little curiosity starts here." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Explore as guest", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Log out", exact: true }),
  ).toBeVisible();
}
export const test = base.extend<{ consoleCheck: void }>({
  consoleCheck: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });
      await use();
      expect(
        errors,
        "Every browser scenario must finish without console errors",
      ).toEqual([]);
    },
    { auto: true },
  ],
});
export { expect };
