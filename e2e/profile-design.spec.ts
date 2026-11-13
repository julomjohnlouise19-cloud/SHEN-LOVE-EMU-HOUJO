import { test, expect, exploreAsGuest } from "./fixtures";
import AxeBuilder from "@axe-core/playwright";
import { editor, banner, applyDesign } from "./profile-design-helpers";
test("the focused banner editor has no border picker and cancel keeps the saved banner", async ({
  page,
}) => {
  await exploreAsGuest(page);
  const original = page.url(),
    design = await editor(page);
  await expect(design.locator(".design-border-option")).toHaveCount(0);
  await expect(
    design.getByRole("button", { name: "Borders", exact: true }),
  ).toHaveCount(0);
  await design
    .getByLabel("Upload your banner", { exact: true })
    .setInputFiles(await banner(page));
  await expect(design.locator(".design-preview-cover img")).toBeVisible();
  await design.getByRole("button", { name: "Bottom", exact: true }).click();
  await applyDesign(design);
  await expect(design).toHaveCount(0);
  expect(page.url()).toBe(original);
  await page.reload();
  const restored = await editor(page);
  await expect(restored.locator(".design-preview-cover img")).toHaveCSS(
    "object-position",
    "50% 100%",
  );
  await restored.getByRole("button", { name: "Top", exact: true }).click();
  await restored.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.locator(".profile-dialog .profile-cover-image")).toHaveCSS(
    "object-position",
    "50% 100%",
  );
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
  await applyDesign(design);
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
  await applyDesign(restored);
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
    design.getByRole("button", { name: "Preview & finish", exact: true }),
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
    design.getByRole("button", { name: "Preview & finish", exact: true }),
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
      .getByRole("button", { name: "Edit banner", exact: true }),
  ).toBeFocused();
});

test("complete banner review matches the saved profile without border controls or decorative blocks", async ({
  page,
}) => {
  await exploreAsGuest(page);
  const design = await editor(page);
  await expect(design.locator(".design-border-option")).toHaveCount(0);
  await design.getByRole("button", { name: "My banner", exact: true }).click();
  await design
    .getByLabel("Upload your banner", { exact: true })
    .setInputFiles(await banner(page));
  await expect(design.locator(".design-focus-preview img")).toBeVisible();
  await design.getByRole("button", { name: "Bottom", exact: true }).click();
  await expect(design.locator(".design-focus-preview img")).toHaveCSS(
    "object-position",
    "50% 100%",
  );
  await expect(
    page.locator(".profile-dialog .profile-cover-image"),
  ).toHaveCount(0);
  await design
    .getByRole("button", { name: "Preview & finish", exact: true })
    .click();
  const final = design.getByRole("region", {
    name: "Final profile preview",
    exact: true,
  });
  await expect(final).toBeVisible();
  await expect(final.locator(".scientist-card-copy")).toContainText(
    "Little scientist",
  );
  await expect(final.locator(".design-review-cover img")).toHaveCSS(
    "object-position",
    "50% 100%",
  );
  await expect(
    page.locator(".profile-dialog .profile-cover-image"),
  ).toHaveCount(0);
  await page.screenshot({ path: "/tmp/cozy-profile-cover-review-wide.png" });
  await final.getByRole("button", { name: "Phone view", exact: true }).click();
  expect(
    await final
      .locator(".design-review-device")
      .evaluate((node) => node.getBoundingClientRect().width),
  ).toBeLessThanOrEqual(344);
  await page.setViewportSize({ width: 320, height: 740 });
  expect(
    (
      await new AxeBuilder({ page })
        .include(".profile-design-dialog")
        .withTags(["wcag2a", "wcag2aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  expect(
    await design
      .locator(".profile-design-body")
      .evaluate((node) => node.scrollWidth <= node.clientWidth),
  ).toBe(true);
  await expect(
    design.getByRole("button", { name: "Apply my banner", exact: true }),
  ).toBeInViewport();
  await page.screenshot({ path: "/tmp/cozy-profile-cover-review-phone.png" });
  await design
    .getByRole("button", { name: "Keep editing", exact: true })
    .click();
  await expect(design.locator(".design-preview-cover img")).toHaveCSS(
    "object-position",
    "50% 100%",
  );
  await applyDesign(design);
  await expect(design).toHaveCount(0);
  const actual = page.locator(".profile-dialog .profile-composition");
  await expect(
    actual.locator(".profile-cover .profile-cover-image"),
  ).toBeVisible();
  await expect(actual.locator(".profile-cover-image")).toHaveCSS(
    "object-position",
    "50% 100%",
  );
  await expect(actual.locator(".scientist-card-copy")).toHaveCSS(
    "background-color",
    "rgba(0, 0, 0, 0)",
  );
  await expect(actual.locator(".profile-identity-layout")).toHaveCSS(
    "display",
    "flex",
  );
  expect(
    await actual
      .locator(".scientist-card-copy h3")
      .evaluate((node) => node.getBoundingClientRect().height),
  ).toBeLessThan(65);
  await expect(actual.locator(".profile-orbit, .profile-hero-art")).toHaveCount(
    0,
  );
  expect(
    await actual.evaluate((node) => node.scrollWidth <= node.clientWidth),
  ).toBe(true);
  await page.screenshot({ path: "/tmp/cozy-profile-cover-saved-phone.png" });
});
