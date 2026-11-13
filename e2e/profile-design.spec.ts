import { test, expect, exploreAsGuest } from "./fixtures";
import AxeBuilder from "@axe-core/playwright";
import { editor, banner, applyDesign } from "./profile-design-helpers";
import { profileBorders } from "../src/data/profile-borders";
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
  await applyDesign(design);
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
      .getByRole("button", { name: "Borders & banner", exact: true }),
  ).toBeFocused();
});

test("frames stay outside the full portrait and final banner review matches the saved profile without decorative blocks", async ({
  page,
}) => {
  await exploreAsGuest(page);
  const design = await editor(page);
  for (const border of profileBorders) {
    await design
      .getByRole("button", {
        name: `Choose ${border.name} border`,
        exact: true,
      })
      .click();
    const geometry = await design
      .locator(".design-preview-avatar")
      .evaluate((node) => {
        const portrait = node.querySelector<HTMLElement>(
          ".profile-frame-face",
        )!;
        const art = node.querySelector<HTMLElement>(".profile-frame-art")!;
        const r = node.getBoundingClientRect(),
          p = portrait.getBoundingClientRect(),
          a = art.getBoundingClientRect();
        return {
          fullPortrait:
            Math.abs(r.width - p.width) < 1 &&
            Math.abs(r.height - p.height) < 1,
          outside:
            a.left < p.left &&
            a.top < p.top &&
            a.right > p.right &&
            a.bottom > p.bottom,
          overflow: getComputedStyle(node).overflow,
          mask: getComputedStyle(art).maskImage,
        };
      });
    expect(geometry, border.id).toMatchObject({
      fullPortrait: true,
      outside: true,
      overflow: "visible",
    });
    expect(geometry.mask).toContain("radial-gradient");
  }
  await design
    .getByRole("button", { name: "Choose Moon garden border", exact: true })
    .click();
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
    design.getByRole("button", { name: "Apply my design", exact: true }),
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
  const frameFits = await actual.evaluate((node) => {
    const hero = node.getBoundingClientRect();
    const art = node
      .querySelector(".profile-frame-art")!
      .getBoundingClientRect();
    return (
      art.left >= hero.left &&
      art.right <= hero.right &&
      art.top >= hero.top &&
      art.bottom <= hero.bottom
    );
  });
  expect(frameFits).toBe(true);
  await page.screenshot({ path: "/tmp/cozy-profile-cover-saved-phone.png" });
});
