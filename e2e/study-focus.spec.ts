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

test("periodic-table focus study pauses accurately, offers a break and opens the reviewed topic quiz without awarding progress", async ({
  page,
}) => {
  test.setTimeout(180000);
  await page.clock.install({ time: new Date("2026-11-21T02:00:00Z") });
  await exploreAsGuest(page, "/#/sources?view=periodic");
  await page.evaluate(() => {
    for (let i = 0; i < 5; i++) window.dispatchEvent(new Event("focus"));
  });
  const search = page.getByRole("searchbox", {
    name: "Find an element",
    exact: true,
  });
  await search.fill("Fe");
  const before = await savedLearning(page);
  const launch = page.getByRole("button", {
    name: "Focus & practise: Periodic table",
    exact: true,
  });
  await launch.click();
  const focus = page.getByRole("dialog", {
    name: "Focus room · Periodic table",
    exact: true,
  });
  await expect(focus.getByRole("timer")).toHaveText("25:00");
  await expect(focus.locator(".focus-quiz")).toBeHidden();
  await expect(
    focus.getByText("Take a 5-minute break", { exact: true }),
  ).toBeHidden();
  await expect(
    focus.getByRole("searchbox", { name: "Find an element", exact: true }),
  ).toHaveValue("Fe");
  await focus.getByRole("button", { name: "Start focus", exact: true }).click();
  await page.clock.fastForward("01:00");
  await expect(focus.getByRole("timer")).toHaveText("24:00");
  await focus.getByRole("button", { name: "Pause timer", exact: true }).click();
  await page.clock.fastForward("02:00");
  await expect(focus.getByRole("timer")).toHaveText("24:00");
  await focus
    .getByRole("button", { name: "Resume timer", exact: true })
    .click();
  await page.clock.fastForward("24:00");
  await expect(focus.getByRole("timer")).toHaveText("00:00");
  await expect(focus.locator(".focus-status")).toContainText("Study finished");
  await focus
    .getByRole("button", { name: "Take a 5-minute break", exact: true })
    .click();
  await expect(focus.getByRole("timer")).toHaveText("05:00");
  await page.clock.fastForward("05:00");
  await expect(focus.locator(".focus-status")).toContainText("Break finished");
  expect(await savedLearning(page)).toEqual(before);
  await focus
    .getByRole("button", {
      name: "Quiz: " + deckById("chemistry.atoms")!.name,
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("dialog", {
      name: deckById("chemistry.atoms")!.name,
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator(".difficulty-options")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(search).toHaveValue("Fe");
  await expect(page.locator(".element-count")).toHaveText("1 of 118 elements");
  await search.fill("");
  await launch.click();
  await expect(focus.getByRole("timer")).toHaveText("25:00");
  await focus
    .getByLabel("Focus study duration", { exact: true })
    .selectOption("50");
  await expect(focus.getByRole("timer")).toHaveText("50:00");
  await expect(focus.locator(".element-count")).toHaveText(
    "118 of 118 elements",
  );
  for (const width of [1280, 320]) {
    await page.setViewportSize({ width, height: 950 });
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
        if (mode === "dark") await brightSurfaces(page, ".study-focus-dialog");
        expect(
          (
            await new AxeBuilder({ page })
              .include(".study-focus-dialog")
              .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
              .analyze()
          ).violations,
        ).toEqual([]);
      }
    await page.screenshot({
      path: "/tmp/cozy-study-focus-periodic-" + width + ".png",
      fullPage: true,
    });
  }
  await focus
    .getByRole("searchbox", { name: "Find an element", exact: true })
    .fill("Fe");
  await focus
    .getByRole("button", { name: "Finish studying", exact: true })
    .click();
  await focus
    .getByRole("button", { name: "Take a 10-minute break", exact: true })
    .click();
  await expect(focus.getByRole("timer")).toHaveText("10:00");
  await page.keyboard.press("Escape");
  await expect(launch).toBeFocused();
  await launch.click();
  await focus.getByRole("button", { name: "Start focus", exact: true }).click();
  await page.evaluate(() => {
    location.hash = "/";
  });
  await expect(page.locator(".my-lab .daily-vocabulary")).toBeVisible();
  await expect(page.locator(".study-focus-dialog[open]")).toHaveCount(0);
  await page.clock.fastForward("01:00");
  await page.evaluate(() => {
    location.hash = "/sources?view=periodic";
  });
  await expect(search).toHaveValue("Fe");
  await launch.click();
  await expect(focus.getByRole("timer")).toHaveText("25:00");
  await page.keyboard.press("Escape");
  expect(await savedLearning(page)).toEqual(before);
});

test("a science model stays interactive in focus mode, restores on exit and starts its real quiz only on request", async ({
  page,
}) => {
  await exploreAsGuest(page, "/#/sources?view=illustrations");
  await page
    .getByRole("button", {
      name: "Explore Close the path, light the lamp",
      exact: true,
    })
    .click();
  const title = "Close the path, light the lamp";
  const model = page.getByRole("dialog", { name: title, exact: true });
  const before = await savedLearning(page);
  const launch = model.getByRole("button", {
    name: "Focus & practise: " + title,
    exact: true,
  });
  await launch.click();
  const focus = page.getByRole("dialog", {
    name: "Focus room · " + title,
    exact: true,
  });
  await focus
    .getByRole("button", { name: "Close the switch", exact: true })
    .click();
  await expect(focus.locator(".circuit-state")).toContainText("lamp is lit");
  await focus
    .getByLabel("Focus study duration", { exact: true })
    .selectOption("5");
  await expect(focus.getByRole("timer")).toHaveText("05:00");
  await page.keyboard.press("Escape");
  await expect(launch).toBeFocused();
  await expect(model.locator(".circuit-state")).toContainText("lamp is lit");
  await launch.click();
  await focus
    .getByRole("button", { name: "Finish studying", exact: true })
    .click();
  await focus
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
  await expect(
    page.locator(".study-focus-dialog[open], .illustration-dialog[open]"),
  ).toHaveCount(0);
  expect(await savedLearning(page)).toEqual(before);
  await deck
    .getByRole("button", { name: "Let’s make a discovery", exact: true })
    .click();
  await expect(page).toHaveURL(/#\/play\//);
  await expect(
    page.getByRole("button", { name: "Check my answer", exact: true }),
  ).toBeVisible();
});
