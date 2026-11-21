import AxeBuilder from "@axe-core/playwright";
import { test, expect, exploreAsGuest } from "./fixtures";
import { boundedPage, brightSurfaces } from "./interface-helpers";
import { wordBoard, type ActivityProgress } from "../src/core/activities";

test("the discovery map is themed, keyboard usable and shows real saved activity progress", async ({
  page,
}) => {
  test.setTimeout(180000);
  await exploreAsGuest(page, "/#/island");
  const entry = page.getByRole("region", {
    name: "Discovery Activities",
    exact: true,
  });
  await expect(
    entry.locator(".activity-entry-mini-map .science-diary-sticker"),
  ).toHaveCount(4);
  for (const width of [1280, 768, 320]) {
    await page.setViewportSize({ width, height: 1000 });
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
        expect(
          (
            await new AxeBuilder({ page })
              .include(".island-activity-entry")
              .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
              .analyze()
          ).violations,
        ).toEqual([]);
      }
    await entry.screenshot({
      path: "/tmp/cozy-adventure-entry-dark-" + width + ".png",
    });
  }
  await entry
    .getByRole("link", { name: "Open Discovery Activities", exact: true })
    .click();
  const map = page.getByRole("region", {
    name: "Discovery adventure map",
    exact: true,
  });
  await expect(map.locator("[data-adventure-islet]")).toHaveCount(4);
  for (const name of [
    "Connection Cove",
    "Wordwood Grove",
    "Memory Meadow",
    "Starlight Lookout",
  ])
    await expect(map.getByText(name, { exact: true })).toBeVisible();
  const before = await page.evaluate(() => ({
    learning: localStorage.getItem("csl:state"),
    activities: localStorage.getItem("csl:activities:guest"),
  }));
  await page
    .getByRole("combobox", { name: "Activity science branch", exact: true })
    .selectOption("chemistry");
  for (const kind of ["match", "words", "cards", "planets"]) {
    await expect(
      map.locator('[data-adventure-islet="' + kind + '"] a'),
    ).toHaveAttribute(
      "href",
      "#/island/activities/" + kind + "?topic=chemistry",
    );
  }
  for (const width of [1280, 768, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const theme of ["meadow", "aurora", "sunset"])
      for (const mode of ["light", "dark"]) {
        await page.evaluate(
          ({ theme, mode }) => {
            document.documentElement.dataset.theme = theme;
            document.documentElement.dataset.colorMode = mode;
            document.documentElement.dataset.motion = "reduce";
          },
          { theme, mode },
        );
        await boundedPage(page);
        if (mode === "dark") await brightSurfaces(page, "#main");
        expect(
          (
            await new AxeBuilder({ page })
              .include("#main")
              .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
              .analyze()
          ).violations,
        ).toEqual([]);
      }
    await page.screenshot({
      path: "/tmp/cozy-adventure-map-dark-" + width + ".png",
      fullPage: true,
    });
  }
  expect(
    await page.evaluate(() => ({
      learning: localStorage.getItem("csl:state"),
      activities: localStorage.getItem("csl:activities:guest"),
    })),
  ).toEqual(before);
  await page.setViewportSize({ width: 1280, height: 1000 });
  const wordIsland = map.getByRole("link", {
    name: "Open Word Hunt",
    exact: true,
  });
  await wordIsland.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".word-grid")).toBeVisible();
  const activity = (await page.evaluate(() =>
    JSON.parse(localStorage.getItem("csl:activities:guest")!),
  )) as ActivityProgress;
  const round = activity.rounds.words!;
  const board = wordBoard(round),
    path = board.placements[round.items[0]];
  await page.locator('[data-letter-index="' + path[0] + '"]').click();
  await page.locator('[data-letter-index="' + path.at(-1) + '"]').click();
  await expect(page.locator(".activity-round-progress strong")).toHaveText(
    "1 / 6",
  );
  await page
    .getByRole("link", { name: "Back to Discovery Activities", exact: true })
    .click();
  await expect(map.locator(".islet-words .islet-saved-status")).toContainText(
    "1 of 6",
  );
  await expect(map.locator(".islet-words .islet-open")).toHaveText(
    "Continue round",
  );
  await page.reload();
  await expect(map.locator(".islet-words .islet-saved-status")).toContainText(
    "1 of 6",
  );
  await map.getByRole("link", { name: "Open Word Hunt", exact: true }).click();
  await expect(page.locator(".activity-round-progress strong")).toHaveText(
    "1 / 6",
  );
});
