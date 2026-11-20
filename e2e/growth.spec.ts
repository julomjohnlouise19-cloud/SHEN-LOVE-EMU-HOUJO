import AxeBuilder from "@axe-core/playwright";
import { test, expect, exploreAsGuest } from "./fixtures";
import {
  displayMode,
  brightSurfaces,
  boundedPage,
  visitRenderedRoute,
} from "./interface-helpers";
import cells from "../src/data/questions/life/cells.json" with { type: "json" };
import type { Question } from "../src/core/types";
import { decks } from "../src/data/catalog";

test("real easy-deck learning earns persistent badges, XP and useful garden actions", async ({
  page,
}) => {
  test.setTimeout(120000);
  await exploreAsGuest(page);
  await visitRenderedRoute(page, "/branch/life");
  await page.getByRole("button", { name: "Open Cells", exact: true }).click();
  await page
    .getByRole("button", { name: "Easy peasy Recall & recognize", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Let’s make a discovery", exact: true })
    .click();
  async function answer() {
    await expect(
      page.getByRole("button", { name: "Check my answer", exact: true }),
    ).toBeVisible();
    const prompt = await page.locator(".question-card > h2").innerText();
    const question = (cells as Question[]).find((q) => q.prompt === prompt)!;
    expect(question).toBeTruthy();
    if (question.options)
      await page
        .getByRole("button", {
          name: question.options.find(
            (option) => option.id === question.answer,
          )!.text,
          exact: false,
        })
        .click();
    else
      await page
        .getByLabel("Your answer", { exact: true })
        .fill(String(question.answer));
    await page
      .getByRole("button", { name: "Check my answer", exact: true })
      .click();
    await expect(page.locator(".answer-feedback")).toBeVisible();
  }
  for (let index = 0; index < 8; index++) {
    await answer();
    await page
      .getByRole("button", {
        name:
          index === 7 ? "See my discoveries" : "On to the next little wonder",
        exact: true,
      })
      .click();
  }
  await expect(page.locator(".results-page .growth-celebration")).toContainText(
    "Perfect easy deck",
  );
  await expect(page.locator(".results-page .growth-celebration")).toContainText(
    "Cells explorer",
  );
  await page
    .getByRole("button", { name: "Another little discovery", exact: true })
    .click();
  for (let index = 0; index < 2; index++) {
    await answer();
    if (index === 0)
      await page
        .getByRole("button", {
          name: "On to the next little wonder",
          exact: true,
        })
        .click();
  }
  await expect(
    page.locator(".answer-feedback .growth-celebration"),
  ).toContainText("First 10 correct");
  await expect(
    page.locator(".answer-feedback .growth-celebration"),
  ).toContainText("Level 2");
  await expect(
    page.locator("#toasts .achievement-toast-copy").last(),
  ).toContainText("First 10 correct");
  await page.getByRole("button", { name: /^Notifications/ }).click();
  const updates = page.getByRole("dialog", {
    name: "Little lab updates",
    exact: true,
  });
  await updates
    .getByRole("button", { name: "Achievements", exact: true })
    .click();
  await expect(updates.locator(".achievement-notification")).not.toHaveCount(0);
  await expect(updates).toContainText("First 10 correct");
  await expect(updates.locator(".buddy-medal").first()).toBeVisible();
  expect(
    (
      await new AxeBuilder({ page })
        .include("dialog[open]")
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.keyboard.press("Escape");
  await page
    .getByRole("link", { name: "See my growth garden", exact: true })
    .click();
  await expect(page.locator(".growth-level-label")).toContainText("LEVEL 2");
  await expect(page.locator(".learning-calendar-summary")).toContainText(
    "10 answers",
  );
  const easy = page.locator('[data-learning-badge="perfect-easy"]');
  await expect(easy).toHaveAccessibleName("Perfect easy deck · earned");
  await easy.click();
  const detail = page.getByRole("dialog", {
    name: "Perfect easy deck",
    exact: true,
  });
  await expect(detail).toContainText("all eight questions correctly");
  await page.keyboard.press("Escape");
  await expect(easy).toBeFocused();
  await page.reload();
  await expect(page.locator(".growth-stats")).toContainText("120");
  await page.getByRole("button", { name: "Earned only", exact: true }).click();
  await expect(page.locator(".growth-badge-card")).toHaveCount(4);
  await page
    .getByRole("button", { name: "Science topics", exact: true })
    .click();
  await expect(page.locator(".growth-badge-card")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Cells explorer · earned", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Cells explorer", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Explore another topic", exact: true })
    .click();
  await expect(page).toHaveURL(/#\/island$/);
  await page
    .getByRole("button", { name: "Open scientist profile", exact: true })
    .click();
  await page.getByRole("button", { name: "Appearance", exact: true }).click();
  await page
    .getByRole("button", { name: "Display Perfect easy deck", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Display Cells explorer", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Save my badges", exact: true })
    .click();
  await expect(page.locator(".profile-badge-display")).toContainText(
    "Perfect easy deck",
  );
  await expect(page.locator(".profile-badge-display")).toContainText(
    "Cells explorer",
  );
});

test("growth goals connect actual criteria to practice and the profile shelf without inventing progress", async ({
  page,
}) => {
  await exploreAsGuest(page, "/#/growth");
  const before = await page.evaluate(() => {
    const user = JSON.parse(localStorage.getItem("csl:state")!).users.find(
      (value: { id: string }) => value.id === "guest",
    );
    return [user.xp, user.merits, user.badges.length];
  });
  const goal = page.getByRole("region", {
    name: "My next learning goal",
    exact: true,
  });
  await expect(goal.getByRole("heading")).toHaveText("First little discovery");
  await page
    .getByRole("combobox", { name: "Choose my next badge goal", exact: true })
    .selectOption("topic:life.body");
  await expect(goal.getByRole("heading")).toHaveText(
    "Anatomy & Body Systems explorer",
  );
  await goal
    .getByRole("button", { name: "See goal details", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "Complete a Anatomy & Body Systems deck",
  );
  await page.keyboard.press("Escape");
  await goal
    .getByRole("button", { name: "Practice for this badge", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Anatomy & Body Systems", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "A little stretch Apply & explain",
      exact: true,
    }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Arrange my badge shelf", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your little badge shelf", exact: true }),
  ).toBeFocused();
  await expect(page.locator(".profile-badge-choice")).toHaveCount(0);
  expect(
    await page.evaluate(() => {
      const user = JSON.parse(localStorage.getItem("csl:state")!).users.find(
        (value: { id: string }) => value.id === "guest",
      );
      return [user.xp, user.merits, user.badges.length];
    }),
  ).toEqual(before);
});

test("a completed badge garden keeps a useful challenge without a fake remaining goal", async ({
  page,
}) => {
  await exploreAsGuest(page, "/#/growth");
  await page.evaluate(
    (ids) => {
      const state = JSON.parse(localStorage.getItem("csl:state")!);
      state.users.find((value: { id: string }) => value.id === "guest").badges =
        ids;
      localStorage.setItem("csl:state", JSON.stringify(state));
    },
    [
      "first-deck",
      "ten-right",
      "perfect-easy",
      "week-streak",
      "perfect-deck",
      ...decks.map((deck) => "topic:" + deck.id),
    ],
  );
  await page.reload();
  await expect(
    page.getByRole("heading", {
      name: "A garden full of discoveries",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("combobox", {
      name: "Choose my next badge goal",
      exact: true,
    }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Try a hard Cells challenge", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Big brain time Analyze & reason",
      exact: true,
    }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("the garden keeps all palettes, filters, title details and Tabby readable and functional on phones", async ({
  page,
}) => {
  test.setTimeout(180000);
  await exploreAsGuest(page);
  await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem("csl:state")!);
    const user = saved.users.find(
      (value: { id: string }) => value.id === "guest",
    );
    user.xp = 2280;
    user.mastery["life.body"] = { completed: 1, correct: 8, attempts: 8 };
    user.badges = ["week-streak"];
    localStorage.setItem("csl:state", JSON.stringify(saved));
  });
  await page.reload();
  await visitRenderedRoute(page, "/growth");
  const before = await page.locator(".growth-stats").innerText();
  await page
    .getByRole("button", { name: "High five, Tabby!", exact: true })
    .click();
  await expect(page.locator(".growth-mascot-speech")).toContainText(
    "High five",
  );
  expect(await page.locator(".growth-stats").innerText()).toBe(before);
  await page.locator(".growth-title-section > summary").click();
  await page
    .getByRole("button", {
      name: "Professor · Level 20 · current title",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Professor", exact: true }),
  ).toContainText("2280 total XP");
  await page.keyboard.press("Escape");
  await expect
    .poll(() =>
      page
        .locator(".growth-badge-card .growth-buddy img")
        .evaluateAll(
          (images) =>
            images.length === 5 &&
            images.every(
              (image) =>
                image instanceof HTMLImageElement &&
                image.complete &&
                image.naturalWidth > 0,
            ),
        ),
    )
    .toBe(true);
  for (const theme of ["Meadow", "Aurora", "Sunset"]) {
    await page
      .getByRole("button", { name: "Open scientist profile", exact: true })
      .click();
    await page.getByRole("button", { name: "Appearance", exact: true }).click();
    const pick = page.getByRole("button", {
      name: `Choose ${theme} colors`,
      exact: true,
    });
    await pick.click();
    await expect(pick).toBeEnabled();
    await page.keyboard.press("Escape");
    for (const mode of ["light", "dark"] as const) {
      await displayMode(page, mode);
      for (const width of [1280, 320]) {
        await page.setViewportSize({ width, height: 900 });
        await boundedPage(page);
        if (mode === "dark")
          expect(await brightSurfaces(page, "#main")).toEqual([]);
        expect(
          (
            await new AxeBuilder({ page })
              .include("#main")
              .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
              .analyze()
          ).violations,
        ).toEqual([]);
        if (theme === "Meadow")
          await page.screenshot({
            path: `/tmp/cozy-growth-${mode}-${width}.png`,
            fullPage: true,
          });
      }
    }
  }
  await page
    .getByRole("button", { name: "Science topics", exact: true })
    .click();
  await page
    .getByRole("searchbox", { name: "Find a learning badge", exact: true })
    .fill("Anatomy");
  await expect(page.locator(".growth-badge-card")).toHaveCount(1);
  await page
    .getByRole("button", {
      name: "Anatomy & Body Systems explorer · earned",
      exact: true,
    })
    .click();
  expect(
    (
      await new AxeBuilder({ page })
        .include("dialog")
        .withTags(["wcag2a", "wcag2aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.keyboard.press("Escape");
  await page
    .getByRole("searchbox", { name: "Find a learning badge", exact: true })
    .fill("No such science badge");
  await page
    .getByRole("button", { name: "Reset badge filters", exact: true })
    .click();
  await expect(page.locator(".growth-badge-card")).toHaveCount(32);
  await page.locator('[data-learning-badge="perfect-easy"]').click();
  await page
    .getByRole("button", { name: "Try an easy Cells deck", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Cells", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Easy peasy Recall & recognize",
      exact: true,
    }),
  ).toHaveAttribute("aria-pressed", "true");
});
