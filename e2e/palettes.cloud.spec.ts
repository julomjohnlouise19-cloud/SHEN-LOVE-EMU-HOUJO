import AxeBuilder from "@axe-core/playwright";
import { test, expect, users, signIn, signOut } from "./community-fixtures";
import { host } from "./cloud-fixtures";
import {
  displayMode,
  boundedPage,
  visitRenderedRoute,
} from "./interface-helpers";
import type { Page } from "@playwright/test";

async function appearance(page: Page) {
  await page
    .getByRole("button", { name: "Open scientist profile", exact: true })
    .click();
  await page.getByRole("button", { name: "Appearance", exact: true }).click();
}

test("palette autosave preserves an unfinished introduction, recovers from failure and isolates accounts", async ({
  page,
  backend,
}) => {
  backend.preferences[users[0].id] = {
    theme: "meadow",
    bio: "My saved introduction.",
  };
  backend.preferences[users[1].id] = {
    theme: "sunset",
    bio: "Another scientist.",
  };
  await page.goto("./");
  await signIn(page);
  await appearance(page);
  const bio = page.getByLabel("A little about me", { exact: true });
  await expect(bio).toHaveValue("My saved introduction.");
  await bio.fill("An unfinished thought that stays in the form.");
  await page
    .getByRole("button", { name: "Choose Aurora colors", exact: true })
    .click();
  await expect(page.locator(".palette-status")).toContainText(
    "Saved to your account",
  );
  expect(backend.preferences[users[0].id]).toEqual({
    theme: "aurora",
    bio: "My saved introduction.",
  });
  await expect(bio).toHaveValue(
    "An unfinished thought that stays in the form.",
  );
  let fail = true;
  await page.route(`${host}/rest/v1/rpc/csl_preferences`, async (route) => {
    const body = route.request().postDataJSON();
    if (fail && body?.p_theme === "sunset") {
      fail = false;
      await route.fulfill({
        status: 400,
        json: {
          message: "Your color change could not be saved. Please try again.",
        },
      });
    } else await route.fallback();
  });
  await page
    .getByRole("button", { name: "Choose Sunset colors", exact: true })
    .click();
  await expect(page.locator(".palette-status")).toContainText(
    "previous colors are still on",
  );
  await expect(page.locator("html")).toHaveAttribute("data-theme", "aurora");
  expect(backend.preferences[users[0].id].theme).toBe("aurora");
  await expect(bio).toHaveValue(
    "An unfinished thought that stays in the form.",
  );
  await page
    .getByRole("button", { name: "Choose Sunset colors", exact: true })
    .click();
  await expect(page.locator(".palette-status")).toContainText(
    "Saved to your account",
  );
  await page.keyboard.press("Escape");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "sunset");
  await signOut(page);
  await signIn(page, "student2");
  await appearance(page);
  await expect(bio).toHaveValue("Another scientist.");
  await page
    .getByRole("button", { name: "Choose Meadow colors", exact: true })
    .click();
  await expect(page.locator(".palette-status")).toContainText(
    "Saved to your account",
  );
  expect(backend.preferences[users[0].id]).toEqual({
    theme: "sunset",
    bio: "My saved introduction.",
  });
  expect(backend.preferences[users[1].id]).toEqual({
    theme: "meadow",
    bio: "Another scientist.",
  });
  expect(backend.credits[users[0].id]).toBe(200);
});

test("a second tab follows saved colors while retaining its introduction draft", async ({
  page,
  context,
  backend,
}) => {
  backend.preferences[users[0].id] = {
    theme: "meadow",
    bio: "Keep this introduction.",
  };
  await page.goto("./");
  await signIn(page);
  const other = await context.newPage();
  await other.goto("./#/island");
  await appearance(other);
  const draft = other.getByLabel("A little about me", { exact: true });
  await expect(draft).toHaveValue("Keep this introduction.");
  await draft.fill("A draft on another tab.");
  await appearance(page);
  await page
    .getByRole("button", { name: "Choose Aurora colors", exact: true })
    .click();
  await expect(page.locator(".palette-status")).toContainText(
    "Saved to your account",
  );
  await expect(other.locator("html")).toHaveAttribute("data-theme", "aurora");
  await expect(
    other.getByRole("button", { name: "Choose Aurora colors", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(draft).toHaveValue("A draft on another tab.");
  expect(backend.preferences[users[0].id]).toEqual({
    theme: "aurora",
    bio: "Keep this introduction.",
  });
  await other.close();
});

test("all three palettes keep populated teacher controls readable in both modes", async ({
  page,
  backend,
}) => {
  test.setTimeout(180000);
  await page.goto("./");
  await signIn(page, "teacher");
  const stock = backend.items[0].stock;
  const colors = new Set<string>();
  for (const mode of ["light", "dark"] as const) {
    await displayMode(page, mode);
    for (const theme of ["Meadow", "Aurora", "Sunset"]) {
      await appearance(page);
      const choice = page.getByRole("button", {
        name: `Choose ${theme} colors`,
        exact: true,
      });
      await choice.click();
      await expect(choice).toBeEnabled();
      await expect(page.locator(".palette-status")).toContainText(
        /automatically|Saved/,
      );
      await page.keyboard.press("Escape");
      for (const route of [
        "/teacher/students",
        "/teacher/shop",
        "/teacher/settings",
      ]) {
        await visitRenderedRoute(page, route);
        await expect(page.locator("html")).toHaveAttribute(
          "data-theme",
          theme.toLowerCase(),
        );
        await boundedPage(page);
        expect(
          (
            await new AxeBuilder({ page })
              .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
              .analyze()
          ).violations,
          `${mode}/${theme}/${route}`,
        ).toEqual([]);
      }
      colors.add(
        await page.locator(".sidebar").evaluate((node) => {
          const style = getComputedStyle(node);
          return `${style.backgroundColor}|${style.backgroundImage}`;
        }),
      );
      await page.screenshot({
        path: `/tmp/cozy-teacher-palette-${mode}-${theme.toLowerCase()}.png`,
      });
    }
  }
  expect(colors.size).toBe(6);
  expect(backend.credits[users[0].id]).toBe(200);
  expect(backend.items[0].stock).toBe(stock);
});

test("friends and credit rankings follow every palette in both display modes", async ({
  page,
  backend,
}) => {
  test.setTimeout(180000);
  await page.goto("./");
  await signIn(page);
  for (const mode of ["light", "dark"] as const) {
    await displayMode(page, mode);
    for (const theme of ["Meadow", "Aurora", "Sunset"]) {
      await appearance(page);
      const choice = page.getByRole("button", {
        name: `Choose ${theme} colors`,
        exact: true,
      });
      await choice.click();
      await expect(choice).toBeEnabled();
      await expect(page.locator(".palette-status")).toContainText(
        /automatically|Saved/,
      );
      await page.keyboard.press("Escape");
      for (const route of ["/friends", "/leaderboard"]) {
        await visitRenderedRoute(page, route);
        if (route === "/friends")
          await expect(page.locator(".friend-card").first()).toBeVisible();
        else await expect(page.locator(".community-rank-row")).toHaveCount(2);
        await expect(page.locator("html")).toHaveAttribute(
          "data-theme",
          theme.toLowerCase(),
        );
        expect(
          (
            await new AxeBuilder({ page })
              .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
              .analyze()
          ).violations,
          `${mode}/${theme}/${route}`,
        ).toEqual([]);
        await boundedPage(page);
      }
    }
  }
  expect(backend.credits[users[0].id]).toBe(200);
});
