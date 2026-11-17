import AxeBuilder from "@axe-core/playwright";
import { test, expect, exploreAsGuest } from "./fixtures";
import { displayMode, boundedPage } from "./interface-helpers";

async function turnDark(page: import("@playwright/test").Page) {
  await page
    .getByRole("button", { name: "Open scientist profile", exact: true })
    .click();
  await page.getByRole("button", { name: "Appearance", exact: true }).click();
  await page.locator(".dark-mode-switch").click();
  await expect(page.locator("html")).toHaveAttribute("data-color-mode", "dark");
}

test("the periodic table keeps all families, filters and guides readable in both modes", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await exploreAsGuest(page, "/#/sources");
  await displayMode(page, "dark");
  await page
    .getByRole("button", { name: "Periodic table", exact: true })
    .click();
  await expect(page.locator(".element-tile")).toHaveCount(118);
  const colors = await page
    .locator(".element-tile")
    .evaluateAll((nodes) => [
      ...new Set(nodes.map((node) => getComputedStyle(node).backgroundColor)),
    ]);
  expect(colors).toHaveLength(10);
  expect(
    (
      await new AxeBuilder({ page })
        .include(".periodic-shelf")
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.locator(".periodic-scroll").scrollIntoViewIfNeeded();
  await page.screenshot({ path: "/tmp/cozy-periodic-dark-desktop.png" });
  const search = page.getByRole("searchbox", {
    name: "Find an element",
    exact: true,
  });
  await search.fill("Fe");
  const iron = page.getByRole("button", { name: "26 Iron (Fe)", exact: true });
  await iron.click();
  const guide = page.getByRole("dialog", {
    name: "Iron · element guide",
    exact: true,
  });
  await expect(guide).toContainText("Atomic number");
  await expect(guide.locator(".dialog-close")).toHaveCount(1);
  expect(
    (
      await new AxeBuilder({ page })
        .include("dialog")
        .withTags(["wcag2a", "wcag2aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(iron).toBeFocused();
  await page
    .getByRole("button", { name: "Clear element filters", exact: true })
    .click();
  const noble = page.getByRole("button", {
    name: "Filter Noble gases",
    exact: true,
  });
  await noble.click();
  await expect(noble).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".element-count")).toHaveText("7 of 118 elements");
  await page
    .getByRole("button", { name: "Clear element filters", exact: true })
    .click();
  await expect(noble).toHaveAttribute("aria-pressed", "false");
  await page.setViewportSize({ width: 320, height: 740 });
  await page.getByRole("button", { name: "Card view", exact: true }).click();
  await expect(page.locator(".element-cards .element-tile")).toHaveCount(118);
  await boundedPage(page);
  expect(
    (
      await new AxeBuilder({ page })
        .include(".periodic-shelf")
        .withTags(["wcag2a", "wcag2aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.screenshot({ path: "/tmp/cozy-periodic-dark-cards-320.png" });
  await displayMode(page, "light");
  await expect(page.locator(".element-count")).toHaveText(
    "118 of 118 elements",
  );
  expect(
    (
      await new AxeBuilder({ page })
        .include(".periodic-shelf")
        .withTags(["wcag2a", "wcag2aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
});

test("profile dark mode is keyboard accessible, stays after reload and can return to light", async ({
  page,
}, info) => {
  await exploreAsGuest(page, "/#/island");
  await turnDark(page);
  const profile = page.getByRole("dialog", {
    name: "Your scientist profile",
    exact: true,
  });
  await expect(
    profile.getByRole("switch", { name: "Dark mode", exact: true }),
  ).toBeChecked();
  await expect(profile).toContainText("Saved for this account on this device");
  for (const width of [1280, 320]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await profile.evaluate((n) => {
        const r = n.getBoundingClientRect();
        return (
          r.left >= 0 && r.right <= innerWidth && n.scrollWidth <= n.clientWidth
        );
      }),
    ).toBe(true);
    const scan = await new AxeBuilder({ page })
      .include(".profile-dialog")
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    await info.attach(`profile-dark-${width}`, {
      body: JSON.stringify(scan.violations),
      contentType: "application/json",
    });
    expect(
      scan.violations.map((v) => ({
        id: v.id,
        targets: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
    await page.screenshot({ path: `/tmp/cozy-dark-profile-${width}.png` });
  }
  await page.keyboard.press("Escape");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-color-mode", "dark");
  await page
    .getByRole("button", { name: "Open scientist profile", exact: true })
    .click();
  const toggle = page.getByRole("switch", { name: "Dark mode", exact: true });
  await toggle.focus();
  await page.keyboard.press("Space");
  await expect(page.locator("html")).toHaveAttribute(
    "data-color-mode",
    "light",
  );
  await expect(toggle).not.toBeChecked();
});

test("dark lab pages and the reward popup retain readable contrast and week navigation", async ({
  page,
}, info) => {
  await exploreAsGuest(page);
  test.setTimeout(120000);
  await turnDark(page);
  await page.keyboard.press("Escape");
  const violations: { route: string; issues: unknown[] }[] = [];
  for (const path of [
    "/",
    "/island",
    "/shop",
    "/island/activities",
    "/island/activities/planets",
    "/island/activities/match",
    "/island/activities/words",
    "/island/activities/cards",
    "/branch/life",
    "/sources",
    "/review",
    "/notebook",
    "/spin",
    "/leaderboard",
    "/suggestions",
  ]) {
    await page.goto(`/#${path}`);
    await expect(page.locator("html")).toHaveAttribute(
      "data-color-mode",
      "dark",
    );
    const scan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    await info.attach(`dark-${path.replaceAll("/", "-")}`, {
      body: JSON.stringify(scan.violations),
      contentType: "application/json",
    });
    if (scan.violations.length)
      violations.push({
        route: path,
        issues: scan.violations.map((v) => ({
          id: v.id,
          targets: v.nodes.map((n) => n.target),
        })),
      });
  }
  await page.goto("/#/branch/life");
  await expect(
    page.getByRole("button", { name: "Open Cells", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Open Cells", exact: true }).click();
  await page
    .getByRole("button", { name: "Easy peasy Recall & recognize", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Let’s make a discovery", exact: true })
    .click();
  for (const stage of ["question", "feedback"]) {
    if (stage === "feedback") {
      await page.locator(".answer-option").first().click();
      await page
        .getByRole("button", { name: "Check my answer", exact: true })
        .click();
    }
    const quiz = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    if (quiz.violations.length)
      violations.push({
        route: stage,
        issues: quiz.violations.map((v) => ({
          id: v.id,
          targets: v.nodes.map((n) => n.target),
        })),
      });
  }
  await page.setViewportSize({ width: 320, height: 844 });
  await page.locator("[data-daily-rewards-button]").click();
  const rewards = page.getByRole("dialog", {
    name: "Daily rewards",
    exact: true,
  });
  await expect(rewards.getByRole("gridcell")).toHaveCount(7);
  await rewards.getByRole("button", { name: /^Show week 7,/ }).click();
  await expect(rewards.locator(".calendar-week-summary")).toContainText(
    "Week 7 of 7",
  );
  const scan = await new AxeBuilder({ page })
    .include(".daily-rewards-dialog")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  await info.attach("dark-rewards", {
    body: JSON.stringify(scan.violations),
    contentType: "application/json",
  });
  if (scan.violations.length)
    violations.push({
      route: "rewards",
      issues: scan.violations.map((v) => ({
        id: v.id,
        targets: v.nodes.map((n) => n.target),
      })),
    });
  await page.screenshot({ path: "/tmp/cozy-dark-rewards-phone.png" });
  await page.keyboard.press("Escape");
  await page
    .locator(".footer")
    .getByRole("button", { name: "About us", exact: true })
    .click();
  const about = await new AxeBuilder({ page })
    .include("dialog")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  if (about.violations.length)
    violations.push({
      route: "about",
      issues: about.violations.map((v) => ({
        id: v.id,
        targets: v.nodes.map((n) => n.target),
      })),
    });
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await page.getByRole("button", { name: "Log out now", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "A little curiosity starts here.",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-color-mode", "dark");
  for (const path of ["welcome", "signin"]) {
    if (path === "signin")
      await page.getByRole("button", { name: "Sign in", exact: true }).click();
    const scan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    if (scan.violations.length)
      violations.push({
        route: path,
        issues: scan.violations.map((v) => ({
          id: v.id,
          targets: v.nodes.map((n) => n.target),
        })),
      });
    await page.screenshot({ path: `/tmp/cozy-dark-${path}-phone.png` });
  }
  expect(violations).toEqual([]);
});

test("a saved display mode updates another tab for the same account", async ({
  page,
  context,
}) => {
  await exploreAsGuest(page);
  await turnDark(page);
  await page.keyboard.press("Escape");
  const other = await context.newPage();
  await exploreAsGuest(other);
  await expect(other.locator("html")).toHaveAttribute(
    "data-color-mode",
    "dark",
  );
  await other
    .getByRole("button", { name: "Open scientist profile", exact: true })
    .click();
  await other.getByRole("button", { name: "Appearance", exact: true }).click();
  await other.locator(".dark-mode-switch").click();
  await expect(other.locator("html")).toHaveAttribute(
    "data-color-mode",
    "light",
  );
  await expect(page.locator("html")).toHaveAttribute(
    "data-color-mode",
    "light",
  );
});
