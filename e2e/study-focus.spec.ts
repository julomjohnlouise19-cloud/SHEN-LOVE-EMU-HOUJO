import AxeBuilder from "@axe-core/playwright";
import { test, expect, exploreAsGuest } from "./fixtures";
import { boundedPage, brightSurfaces } from "./interface-helpers";
import { deckById } from "../src/data/catalog";
import type { Page } from "@playwright/test";
import type { AppState } from "../src/core/types";

async function savedLearning(page: Page) {
  return page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("csl:state")!) as AppState;
    state.rev = 0;
    for (const user of state.users) user.lastSeen = 0;
    return state;
  });
}

test("the floating timer follows notes, a video and a guide without restarting or blocking their controls", async ({
  page,
}) => {
  test.setTimeout(180000);
  await page.clock.install({ time: new Date("2026-11-22T02:00:00Z") });
  await exploreAsGuest(page, "/#/sources");
  const before = await savedLearning(page);
  await page
    .getByRole("button", { name: "Focus & practise: Study Room", exact: true })
    .click();
  const dock = page.getByRole("region", {
    name: "Study focus timer",
    exact: true,
  });
  await expect(dock).toBeVisible();
  await expect(page.locator(".study-focus-dialog")).toHaveCount(0);
  await dock.getByRole("button", { name: "Start focus", exact: true }).click();
  await expect(dock).toHaveAttribute("data-collapsed", "true");
  await page.clock.fastForward("01:00");
  await expect(dock.locator(".focus-time")).toHaveText("24:00");
  await dock.getByRole("button", { name: "Pause timer", exact: true }).click();
  await page.clock.fastForward("02:00");
  await expect(dock.locator(".focus-time")).toHaveText("24:00");
  await page
    .getByRole("button", { name: "Science videos", exact: true })
    .click();
  await page.getByRole("button", { name: "Watch Cells", exact: true }).click();
  const video = page.getByRole("dialog", { name: "Cells", exact: true });
  await expect(video.locator(".focus-dock")).toBeVisible();
  const iframe = video.locator("iframe");
  await expect(iframe).toHaveAttribute("src", /ex0x-w00Uy4/);
  await expect(
    page.frameLocator("iframe").getByRole("heading", {
      name: "External video fixture",
      exact: true,
    }),
  ).toBeVisible();
  await video
    .getByRole("button", { name: "Focus & practise: Cells", exact: true })
    .click();
  await expect(dock.locator(".focus-time")).toHaveText("24:00");
  await dock.getByRole("button", { name: "Resume timer", exact: true }).click();
  await page.setViewportSize({ width: 320, height: 844 });
  await video
    .getByRole("button", { name: "Focus & practise: Cells", exact: true })
    .click();
  await expect(dock).toHaveAttribute("data-collapsed", "true");
  await video
    .getByRole("button", { name: "Read Cells study notes", exact: true })
    .click();
  const guide = page.getByRole("dialog", {
    name: "Cells · study notes",
    exact: true,
  });
  await expect(guide.locator(".focus-dock")).toBeVisible();
  await expect(
    guide.getByRole("heading", { name: "Words to keep", exact: true }),
  ).toBeVisible();
  await guide
    .getByRole("button", { name: "Close and return to page", exact: true })
    .click();
  await expect(video.locator(".focus-dock")).toBeVisible();
  await video
    .getByRole("button", { name: "Close and return to page", exact: true })
    .click();
  await expect(dock).toBeVisible();
  expect(
    await dock.evaluate((node) => node.parentElement === document.body),
  ).toBe(true);
  await dock.getByRole("button", { name: /Expand focus timer/ }).click();
  await page.clock.fastForward("24:00");
  await expect(dock.locator(".focus-status")).toContainText("Study finished");
  await dock
    .getByRole("button", { name: "Take a 5-minute break", exact: true })
    .click();
  await expect(dock.locator(".focus-time")).toHaveText("05:00");
  await page.clock.fastForward("05:00");
  await expect(dock.locator(".focus-status")).toContainText("Break finished");
  expect(await savedLearning(page)).toEqual(before);
  await dock.getByRole("button", { name: "Quiz: Cells", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Cells", exact: true }),
  ).toBeVisible();
  await expect(dock).toHaveCount(0);
});

test("focus stays lower-right and readable in six palettes while the periodic table and model remain in place", async ({
  page,
}) => {
  test.setTimeout(180000);
  await exploreAsGuest(page, "/#/sources?view=periodic");
  const search = page.getByRole("searchbox", {
    name: "Find an element",
    exact: true,
  });
  await search.fill("Fe");
  await page
    .getByRole("button", {
      name: "Focus & practise: Periodic table",
      exact: true,
    })
    .click();
  const dock = page.getByRole("region", {
    name: "Study focus timer",
    exact: true,
  });
  await dock.getByLabel("Study duration", { exact: true }).selectOption("50");
  await expect(dock.locator(".focus-time")).toHaveText("50:00");
  await expect(search).toHaveValue("Fe");
  for (const width of [1280, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const theme of ["meadow", "aurora", "sunset"])
      for (const mode of ["light", "dark"]) {
        await page.evaluate(
          ({ theme, mode }) => {
            document.documentElement.dataset.theme = theme;
            document.documentElement.dataset.colorMode = mode;
          },
          { theme, mode },
        );
        await boundedPage(page);
        const box = (await dock.boundingBox())!;
        expect(width - box.x - box.width).toBeGreaterThanOrEqual(8);
        expect(width - box.x - box.width).toBeLessThanOrEqual(24);
        expect(900 - box.y - box.height).toBeLessThanOrEqual(24);
        if (mode === "dark") await brightSurfaces(page, ".focus-dock");
        expect(
          (
            await new AxeBuilder({ page })
              .include(".focus-dock")
              .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
              .analyze()
          ).violations,
        ).toEqual([]);
      }
    await page.screenshot({
      path: "/tmp/cozy-floating-focus-" + width + ".png",
      fullPage: true,
    });
  }
  await dock
    .getByRole("button", { name: "Finish studying", exact: true })
    .click();
  await dock
    .getByRole("button", { name: "Take a 10-minute break", exact: true })
    .click();
  await expect(dock.locator(".focus-time")).toHaveText("10:00");
  await dock
    .getByRole("button", { name: "End focus session", exact: true })
    .click();
  await expect(search).toHaveValue("Fe");
  await page
    .getByRole("button", { name: "Illustrations", exact: true })
    .click();
  const title = "Close the path, light the lamp";
  await page
    .getByRole("button", { name: "Explore " + title, exact: true })
    .click();
  const model = page.getByRole("dialog", { name: title, exact: true });
  await model
    .getByRole("button", { name: "Focus & practise: " + title, exact: true })
    .click();
  await model
    .getByRole("button", { name: "Close the switch", exact: true })
    .click();
  await expect(model.locator(".circuit-state")).toContainText("lamp is lit");
  await dock
    .getByRole("button", { name: "Finish studying", exact: true })
    .click();
  await dock
    .getByRole("button", {
      name: "Quiz: " + deckById("physics.electricity")!.name,
      exact: true,
    })
    .click();
  const deck = page.getByRole("dialog", {
    name: deckById("physics.electricity")!.name,
    exact: true,
  });
  await expect(deck).toBeVisible();
  await deck
    .getByRole("button", { name: "Let’s make a discovery", exact: true })
    .click();
  await expect(page).toHaveURL(/#\/play\//);
  await expect(
    page.getByRole("button", { name: "Check my answer", exact: true }),
  ).toBeVisible();
});

test("a handbook can be read with the floating timer and leaving the account ends the session", async ({
  page,
}) => {
  await exploreAsGuest(page, "/#/sources?view=documents");
  await page
    .getByRole("link", {
      name: "Open Life Science study handbook PDF",
      exact: true,
    })
    .click();
  const pdf = page.getByRole("dialog", {
    name: "Life Science · study handbook",
    exact: true,
  });
  await expect(pdf.locator("iframe")).toHaveAttribute(
    "src",
    /life-study-handbook\.pdf/,
  );
  await pdf
    .getByRole("button", {
      name: "Focus & practise: Life Science handbook",
      exact: true,
    })
    .click();
  const dock = page.getByRole("region", {
    name: "Study focus timer",
    exact: true,
  });
  await dock.getByRole("button", { name: "Start focus", exact: true }).click();
  await expect(
    pdf.getByRole("heading", { name: "Choose a chapter", exact: true }),
  ).toBeVisible();
  await pdf
    .getByRole("button", { name: "Read Cells chapter", exact: true })
    .click();
  const chapter = page.getByRole("dialog", {
    name: "Cells · study notes",
    exact: true,
  });
  await expect(chapter.locator(".focus-dock")).toBeVisible();
  await expect(
    chapter.getByRole("heading", { name: "Words to keep", exact: true }),
  ).toBeVisible();
  await chapter
    .getByRole("button", { name: "Close and return to page", exact: true })
    .click();
  await pdf
    .getByRole("button", { name: "Close and return to page", exact: true })
    .click();
  await expect(dock).toBeVisible();
  await page.getByRole("button", { name: "Log out", exact: true }).click();
  const logout = page
    .getByRole("dialog", { name: "Log out of your lab?", exact: true })
    .last();
  await logout
    .getByRole("button", { name: "Log out now", exact: true })
    .click();
  await expect(dock).toHaveCount(0);
});
