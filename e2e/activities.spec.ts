import AxeBuilder from "@axe-core/playwright";
import { test, expect, exploreAsGuest } from "./fixtures";
import { wordBoard, type ActivityProgress } from "../src/core/activities";
import { explorerPlanets } from "../src/data/activity-planets";

test("Science Island opens a complete activities subcategory and clear return trail", async ({
  page,
}) => {
  await exploreAsGuest(page, "/#/island");
  await page
    .getByRole("link", { name: "Open Discovery Activities", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Big ideas. Little adventures.",
      exact: true,
    }),
  ).toBeVisible();
  for (const name of [
    "Match Lab",
    "Word Hunt",
    "Flashcards",
    "Planet Explorer",
  ])
    await expect(
      page.getByRole("link", { name: `Open ${name}`, exact: true }),
    ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Activity science branch" })
    .selectOption("chemistry");
  await page.getByRole("link", { name: "Open Match Lab", exact: true }).click();
  await expect(page).toHaveURL(/activities\/match\?topic=chemistry/);
  await expect(page.locator(".match-term")).toHaveCount(6);
  await page
    .getByRole("link", { name: "Back to Discovery Activities", exact: true })
    .click();
  await expect(
    page.getByRole("combobox", { name: "Activity science branch" }),
  ).toHaveValue("chemistry");
  await page
    .getByRole("link", { name: "Back to Science Island", exact: true })
    .click();
  await expect(page).toHaveURL(/#\/island$/);
});

test("matching supports wrong feedback, a real drag, hints, keyboard pairs and saved achievements", async ({
  page,
}) => {
  await exploreAsGuest(page, "/#/island/activities/match?topic=life");
  const ids = await page
    .locator("[data-match-term]")
    .evaluateAll((nodes) =>
      nodes.map((n) => (n as HTMLElement).dataset.matchTerm!),
    );
  await page.locator(`[data-match-term="${ids[0]}"]`).click();
  await page.locator(`[data-definition="${ids[1]}"]`).click();
  await expect(page.locator(".activity-feedback")).toContainText("Not quite");
  await page
    .getByRole("button", { name: "A little hint", exact: true })
    .click();
  await expect(page.locator(`[data-definition="${ids[0]}"]`)).toHaveClass(
    /is-hinted/,
  );
  const source = page.locator(`[data-match-term="${ids[0]}"]`),
    target = page.locator(`[data-definition="${ids[0]}"]`);
  // Begin a continuous native drag before scrolling to an off-screen definition.
  await source.hover();
  const from = (await source.boundingBox())!;
  await page.mouse.down();
  await page.mouse.move(
    from.x + from.width / 2 + 12,
    from.y + from.height / 2,
    { steps: 5 },
  );
  await target.scrollIntoViewIfNeeded();
  const to = (await target.boundingBox())!;
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, {
    steps: 15,
  });
  await page.mouse.up();
  await expect(page.locator(".activity-round-progress strong")).toHaveText(
    "1 / 6",
  );
  for (const id of ids.slice(1)) {
    const term = page.locator(`[data-match-term="${id}"]`);
    await expect(term).toBeEnabled();
    await term.focus();
    await page.keyboard.press("Enter");
    await expect(term).toHaveAttribute("aria-pressed", "true");
    await page.locator(`[data-definition="${id}"]`).focus();
    await page.keyboard.press("Space");
    await expect(page.locator(".activities-page")).not.toHaveAttribute(
      "aria-busy",
      "true",
    );
    if (id !== ids.at(-1))
      await expect(page.locator(".activity-round-progress strong")).toHaveText(
        `${ids.indexOf(id) + 1} / 6`,
      );
  }
  await expect(
    page.getByRole("heading", { name: "Discovery complete!", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Discovery complete!", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "See my badges", exact: true }).click();
  await expect(
    page.getByRole("article", {
      name: "Connection keeper: earned",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "2 of 7 badges collected", exact: true }),
  ).toBeVisible();
});

test("Word Hunt validates real letter paths, supports pointer selection and retains offline progress", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await exploreAsGuest(page, "/#/island/activities/words?topic=earth");
  const progress = (await page.evaluate(() =>
    JSON.parse(localStorage.getItem("csl:activities:guest")!),
  )) as ActivityProgress;
  const round = progress.rounds.words!,
    board = wordBoard(round);
  await page
    .getByRole("button", { name: "A little hint", exact: true })
    .click();
  await expect(page.locator(".word-cell.is-hinted")).toHaveCount(1);
  const first = board.placements[round.items[0]];
  await page.locator(`[data-letter-index="${first[0]}"]`).click();
  await page.locator(`[data-letter-index="${first.at(-1)}"]`).click();
  await expect(page.locator(".activity-round-progress strong")).toHaveText(
    "1 / 6",
  );
  const second = board.placements[round.items[1]];
  await page.locator(".word-grid").scrollIntoViewIfNeeded();
  const start = await page
    .locator(`[data-letter-index="${second[0]}"]`)
    .boundingBox();
  const end = await page
    .locator(`[data-letter-index="${second.at(-1)}"]`)
    .boundingBox();
  await page.mouse.move(
    start!.x + start!.width / 2,
    start!.y + start!.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(end!.x + end!.width / 2, end!.y + end!.height / 2, {
    steps: 12,
  });
  await page.mouse.up();
  await expect(page.locator(".activity-round-progress strong")).toHaveText(
    "2 / 6",
  );
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    await new Promise<void>((resolve) => {
      if (navigator.serviceWorker.controller) resolve();
      else
        navigator.serviceWorker.addEventListener(
          "controllerchange",
          () => resolve(),
          { once: true },
        );
    });
  });
  await expect
    .poll(() =>
      page.evaluate(async () =>
        (await caches.keys()).some((name) => name.startsWith("cozy-science-")),
      ),
    )
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator(".activity-round-progress strong")).toHaveText(
    "2 / 6",
  );
  for (const id of round.items.slice(2)) {
    const path = board.placements[id];
    await page.locator(`[data-letter-index="${path.at(-1)}"]`).click();
    await page.locator(`[data-letter-index="${path[0]}"]`).click();
  }
  await expect(
    page.getByRole("heading", { name: "Discovery complete!", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "See my badges", exact: true }).click();
  await expect(
    page.getByRole("article", { name: "Word wanderer: earned", exact: true }),
  ).toBeVisible();
});

test("flashcards require revealing, requeue practice cards and resume the same review stack", async ({
  page,
}) => {
  await exploreAsGuest(page, "/#/island/activities/cards?topic=skills");
  await expect(
    page.getByRole("button", { name: "I know this", exact: true }),
  ).toBeDisabled();
  const first = await page.locator(".flashcard-front strong").textContent();
  await page.locator("[data-focus-key=flip-card]").click();
  await page
    .getByRole("button", { name: "Practice again", exact: true })
    .click();
  await expect(page.locator(".flashcard-front strong")).not.toHaveText(first!);
  const second = await page.locator(".flashcard-front strong").textContent();
  await page.reload();
  await expect(page.locator(".flashcard-front strong")).toHaveText(second!);
  for (let i = 0; i < 8; i++) {
    await page.locator("[data-focus-key=flip-card]").click();
    await page
      .getByRole("button", { name: "I know this", exact: true })
      .click();
  }
  await expect(
    page.getByRole("heading", { name: "Discovery complete!", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "See my badges", exact: true }).click();
  await expect(
    page.getByRole("article", { name: "Memory gardener: earned", exact: true }),
  ).toBeVisible();
});

test("Planet Explorer earns eight stamps through field notes and correct checks", async ({
  page,
}) => {
  await exploreAsGuest(page, "/#/island/activities/planets");
  await expect(page.getByText(/Pluto is a dwarf planet/)).toBeVisible();
  await page
    .getByRole("button", { name: "A little hint", exact: true })
    .click();
  await expect(page.locator(".planet-fact-list")).toHaveClass(/is-hinted/);
  await page.getByRole("button", { name: "Venus", exact: true }).click();
  await expect(page.locator(".activity-feedback")).toContainText(
    "Take another look",
  );
  for (const planet of explorerPlanets) {
    await page
      .getByRole("button", { name: `Explore ${planet.name}`, exact: true })
      .click();
    await expect(
      page.getByRole("region", {
        name: `${planet.name} field notes`,
        exact: true,
      }),
    ).toContainText(planet.group);
    await page
      .getByRole("button", { name: planet.options[planet.answer], exact: true })
      .click();
    await expect(
      page.getByRole("heading", {
        name: `${planet.name}, in your passport!`,
        exact: true,
      }),
    ).toBeVisible();
  }
  await page
    .getByRole("link", { name: "See your Orbit ranger badge", exact: true })
    .click();
  await expect(
    page.getByRole("article", { name: "Orbit ranger: earned", exact: true }),
  ).toBeVisible();
});

test("activities fit narrow phones, support keyboard letter navigation and have accessible colours", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await exploreAsGuest(page, "/#/island/activities");
  for (const mode of ["", "match", "words", "cards", "planets", "badges"]) {
    await page.goto(`/#/island/activities${mode ? `/${mode}` : ""}`);
    await expect(page.locator(".activities-page")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      (
        await new AxeBuilder({ page })
          .include(".activities-page")
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    if (mode === "words") {
      await page.locator('[data-letter-index="0"]').focus();
      await page.keyboard.press("ArrowRight");
      await expect(page.locator('[data-letter-index="1"]')).toBeFocused();
      await page.keyboard.press("Enter");
      await page.keyboard.press("Escape");
      await expect(page.locator(".word-cell.is-selected")).toHaveCount(0);
    }
    await page.evaluate(() => {
      (document.activeElement as HTMLElement)?.blur();
      window.scrollTo(0, 0);
    });
    await page.screenshot({
      path: `/tmp/cozy-discovery-${mode || "hub"}-phone.png`,
      fullPage: true,
    });
  }
});

test("activity sounds start off and the user can toggle the saved preference", async ({
  page,
}) => {
  await exploreAsGuest(page, "/#/island/activities");
  await expect(
    page.getByRole("button", { name: "Activity sound off", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  await page
    .getByRole("button", { name: "Activity sound off", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Activity sound on", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Activity sound on", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Activity sound on", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Activity sound off", exact: true }),
  ).toBeVisible();
});
