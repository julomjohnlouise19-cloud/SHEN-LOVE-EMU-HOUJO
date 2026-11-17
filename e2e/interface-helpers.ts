import { expect, type Page } from "@playwright/test";

export async function displayMode(page: Page, mode: "light" | "dark") {
  await page
    .getByRole("button", { name: "Open scientist profile", exact: true })
    .click();
  await page.getByRole("button", { name: "Appearance", exact: true }).click();
  const control = page.getByRole("switch", { name: "Dark mode", exact: true });
  if ((await control.isChecked()) !== (mode === "dark"))
    await page.locator(".dark-mode-switch").click();
  await expect(page.locator("html")).toHaveAttribute("data-color-mode", mode);
  await page
    .getByRole("dialog", { name: "Your scientist profile", exact: true })
    .getByRole("button", { name: "Close and return to page", exact: true })
    .click();
}

export async function boundedPage(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}
