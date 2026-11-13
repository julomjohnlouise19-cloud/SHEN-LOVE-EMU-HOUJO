import { test, expect, exploreAsGuest } from "./fixtures";
import AxeBuilder from "@axe-core/playwright";
import { editor, banner } from "./profile-design-helpers";
test("students can try all supplied borders, apply one and restore it after reload", async ({
  page,
}) => {
  await exploreAsGuest(page);
  const url = page.url();
  const design = await editor(page);
  await expect(design.locator(".design-border-option")).toHaveCount(18);
  await design
    .getByRole("button", { name: "Choose Ocean treasures border", exact: true })
    .click();
  await expect(design.locator(".design-preview-avatar")).toHaveAttribute(
    "data-selected-border",
    "ocean-treasures",
  );
  await expect(
    design.getByRole("button", {
      name: "Choose Ocean treasures border",
      exact: true,
    }),
  ).toHaveAttribute("aria-pressed", "true");
  await design.getByRole("button", { name: "Enchanted", exact: true }).click();
  await expect(design.locator(".design-border-option")).toHaveCount(5);
  await design.getByRole("button", { name: "All styles", exact: true }).click();
  await expect(design.locator(".design-border-option")).toHaveCount(18);
  await page.screenshot({ path: "/tmp/cozy-profile-design-desktop.png" });
  await design
    .getByRole("button", { name: "Apply my design", exact: true })
    .click();
  await expect(design).toHaveCount(0);
  await expect(
    page.locator(".scientist-card-avatar .scientist-avatar"),
  ).toHaveAttribute("data-selected-border", "ocean-treasures");
  expect(page.url()).toBe(url);
  await page.reload();
  const restored = await editor(page);
  await expect(restored.locator(".design-preview-avatar")).toHaveAttribute(
    "data-selected-border",
    "ocean-treasures",
  );
  await restored
    .getByRole("button", { name: "Use no border", exact: true })
    .click();
  await restored.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(
    page.locator(".scientist-card-avatar .scientist-avatar"),
  ).toHaveAttribute("data-selected-border", "ocean-treasures");
});
test("banner preview, positioning, offline persistence and removal leave the photo and balance intact", async ({
  page,
  context,
}) => {
  await exploreAsGuest(page);
  const balance = await page.locator(".balance-pill").textContent();
  const design = await editor(page);
  await design.getByRole("button", { name: "My banner", exact: true }).click();
  await design
    .getByLabel("Upload your banner", { exact: true })
    .setInputFiles(await banner(page));
  await expect(design.locator(".design-preview-cover img")).toBeVisible();
  await design
    .getByRole("slider", { name: "Vertical image focus", exact: true })
    .fill("100");
  await expect(design.locator(".design-preview-cover img")).toHaveCSS(
    "object-position",
    "50% 100%",
  );
  await design
    .getByRole("button", { name: "Apply my design", exact: true })
    .click();
  await expect(
    page.locator(".scientist-card .profile-cover-image"),
  ).toBeVisible();
  await expect(page.locator(".scientist-card .profile-cover-image")).toHaveCSS(
    "object-position",
    "50% 100%",
  );
  expect(await page.locator(".balance-pill").textContent()).toBe(balance);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Close and return to page", exact: true })
    .click();
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await context.setOffline(true);
  await page.reload();
  const restored = await editor(page);
  await expect(restored.locator(".design-preview-cover img")).toBeVisible();
  await restored
    .getByRole("button", { name: "My banner", exact: true })
    .click();
  await expect(
    restored.getByRole("slider", { name: "Vertical image focus", exact: true }),
  ).toHaveValue("100");
  await restored
    .getByRole("button", { name: "Remove banner", exact: true })
    .click();
  await restored
    .getByRole("button", { name: "Apply my design", exact: true })
    .click();
  await expect(
    page.locator(".scientist-card .profile-cover-image"),
  ).toHaveCount(0);
  expect(await page.locator(".balance-pill").textContent()).toBe(balance);
});
test("the design studio rejects invalid images and fits a phone with visible save and return controls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await exploreAsGuest(page);
  const design = await editor(page);
  await expect(
    design.getByRole("button", { name: "Apply my design", exact: true }),
  ).toBeInViewport();
  await design.getByRole("button", { name: "My banner", exact: true }).click();
  await design.getByLabel("Upload your banner", { exact: true }).setInputFiles({
    name: "bad.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from("<svg/>"),
  });
  await expect(design.getByRole("alert")).toContainText("JPG, PNG or WebP");
  await design
    .getByLabel("Upload your banner", { exact: true })
    .setInputFiles(await banner(page));
  await expect(design.locator(".design-preview-cover img")).toBeVisible();
  expect(
    (
      await new AxeBuilder({ page })
        .include(".profile-design-dialog")
        .withTags(["wcag2a", "wcag2aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  expect(
    await design.evaluate((node) => node.scrollWidth <= node.clientWidth),
  ).toBe(true);
  expect(
    await design
      .locator(".profile-design-body")
      .evaluate((node) => node.scrollWidth <= node.clientWidth),
  ).toBe(true);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "/tmp/cozy-profile-design-phone.png" });
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(
    design.getByRole("button", { name: "Apply my design", exact: true }),
  ).toBeInViewport();
  await expect(
    design.getByRole("button", {
      name: "Close and return to page",
      exact: true,
    }),
  ).toBeInViewport();
  await page.keyboard.press("Escape");
  await expect(design).toHaveCount(0);
  await expect(
    page
      .getByRole("dialog", { name: "Your scientist profile", exact: true })
      .getByRole("button", { name: "Borders & banner", exact: true }),
  ).toBeFocused();
});
