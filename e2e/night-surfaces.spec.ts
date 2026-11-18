import AxeBuilder from "@axe-core/playwright";
import { test, expect, exploreAsGuest } from "./fixtures";
import {
  displayMode,
  boundedPage,
  visitRenderedRoute,
  brightSurfaces,
} from "./interface-helpers";
import cells from "../src/data/questions/life/cells.json" with { type: "json" };
import type { AppState, Question, Run } from "../src/core/types";
import { editor, banner, applyDesign } from "./profile-design-helpers";

async function readable(
  page: import("@playwright/test").Page,
  scope: string,
  dark = true,
) {
  await boundedPage(page);
  if (dark) expect(await brightSurfaces(page, scope)).toEqual([]);
  expect(
    (
      await new AxeBuilder({ page })
        .include(scope)
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
}

test("empty and populated Review Box surfaces stay dark, readable and usable on a phone", async ({
  page,
}) => {
  test.setTimeout(150000);
  await exploreAsGuest(page);
  await displayMode(page, "dark");
  await visitRenderedRoute(page, "/review");
  await expect(page.locator(".review-intro")).toContainText(
    "Your ideas are settling in.",
  );
  for (const width of [1440, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await readable(page, "#main");
    await page
      .locator(".review-intro")
      .screenshot({ path: `/tmp/cozy-review-dark-empty-${width}.png` });
  }
  const question = (cells as Question[]).find(
    (q) => q.level === "medium" && q.type === "mcq" && q.options,
  )!;
  const id = "dark-review-state";
  await page.evaluate(
    ({ id, question }) => {
      const state = JSON.parse(localStorage.getItem("csl:state")!) as AppState;
      const run: Run = {
        id,
        userId: "guest",
        deckId: question.deckId,
        level: question.level,
        mode: "practice",
        ids: [question.id],
        answers: [],
        completed: false,
        created: Date.now(),
      };
      state.runs.push(run);
      state.rev++;
      localStorage.setItem("csl:state", JSON.stringify(state));
    },
    { id, question },
  );
  await page.goto(`/#/play/${id}`);
  await page.reload();
  const wrong = question.options!.find(
    (choice) => choice.id !== question.answer,
  )!;
  await page.getByRole("button", { name: wrong.text, exact: false }).click();
  await page
    .getByRole("button", { name: "Check my answer", exact: true })
    .click();
  await expect(page.locator(".answer-feedback")).toBeVisible();
  await visitRenderedRoute(page, "/review");
  await expect(page.locator(".review-deck")).toHaveCount(1);
  await expect(page.locator(".boss-card")).toBeVisible();
  for (const width of [1440, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await readable(page, "#main");
    const button = page.locator(".boss-card").getByRole("button");
    await button.hover();
    await button.focus();
    await readable(page, "#main");
  }
  await displayMode(page, "light");
  await readable(page, "#main", false);
});

test("About us cards, expanded bios, hobby chips and controls share the dark palette", async ({
  page,
}) => {
  test.setTimeout(150000);
  await exploreAsGuest(page);
  await displayMode(page, "dark");
  await page
    .locator(".footer")
    .getByRole("button", { name: "About us", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "About us", exact: true });
  await expect(dialog.locator(".researcher-card")).toHaveCount(7);
  await dialog.locator(".about-read-all").click();
  await expect(dialog.locator(".researcher-bio[open]")).toHaveCount(7);
  await expect
    .poll(() =>
      dialog
        .locator(".researcher-photo")
        .evaluateAll((nodes) =>
          nodes.every(
            (node) =>
              (node as HTMLImageElement).complete &&
              (node as HTMLImageElement).naturalWidth > 0,
          ),
        ),
    )
    .toBe(true);
  for (const width of [1440, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await readable(page, ".about-dialog");
    await dialog.locator(".researcher-bio summary").first().hover();
    await dialog.locator(".researcher-bio summary").first().focus();
    await readable(page, ".about-dialog");
    await page.screenshot({
      path: `/tmp/cozy-about-dark-cohesive-${width}.png`,
    });
  }
  await page.keyboard.press("Escape");
  await displayMode(page, "light");
  await page
    .locator(".footer")
    .getByRole("button", { name: "About us", exact: true })
    .click();
  await dialog.locator(".about-read-all").click();
  await readable(page, ".about-dialog", false);
});

test("banner tabs, photo focus sliders, presets and final previews use the Dark mode palette", async ({
  page,
}) => {
  test.setTimeout(150000);
  await exploreAsGuest(page);
  await displayMode(page, "dark");
  const design = await editor(page);
  await design
    .getByLabel("Upload your banner", { exact: true })
    .setInputFiles(await banner(page));
  await expect(design.locator(".design-focus-preview img")).toBeVisible();
  for (const width of [1280, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await readable(page, ".profile-design-dialog");
    await design.getByRole("button", { name: "Bottom", exact: true }).click();
    await expect(
      design.getByRole("button", { name: "Bottom", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await design.getByRole("button", { name: "Top", exact: true }).hover();
    await readable(page, ".profile-design-dialog");
    await design
      .locator(".design-position-controls")
      .screenshot({ path: `/tmp/cozy-banner-focus-dark-${width}.png` });
    await design.getByRole("button", { name: "Preview", exact: true }).click();
    await expect(design.locator(".design-review-pane")).toBeVisible();
    await readable(page, ".profile-design-dialog");
    await design
      .getByRole("button", { name: "My banner", exact: true })
      .click();
  }
  await applyDesign(design);
  await expect(design).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.reload();
  const reopened = await editor(page);
  await expect(reopened.locator(".design-focus-preview img")).toBeVisible();
  await readable(page, ".profile-design-dialog");
});
