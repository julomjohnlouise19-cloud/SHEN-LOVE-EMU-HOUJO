import { test, expect, exploreAsGuest } from "./fixtures";
import AxeBuilder from "@axe-core/playwright";
import cells from "../src/data/questions/life/cells.json" with { type: "json" };
import type { Question } from "../src/core/types";

test.use({
  viewport: { width: 320, height: 568 },
  isMobile: true,
  hasTouch: true,
});

test("phone navigation contains focus and scrolling, exposes help and survives rotation", async ({
  page,
}) => {
  await exploreAsGuest(page, "/#/branch/life");
  await page.evaluate(() => scrollTo(0, 350));
  const before = await page.evaluate(() => scrollY);
  const menu = page.getByRole("button", { name: "Toggle navigation" });
  await menu.tap();
  const drawer = page.getByRole("dialog", { name: "Lab navigation" });
  await expect(drawer).toBeVisible();
  expect(
    await page.locator(".workspace").evaluate((e) => e.hasAttribute("inert")),
  ).toBe(true);
  await drawer.evaluate((node) => {
    node.dataset.refreshProbe = "before";
  });
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(drawer).not.toHaveAttribute("data-refresh-probe", "before");
  expect(
    await drawer.evaluate((node) => node.contains(document.activeElement)),
  ).toBe(true);
  await drawer.getByRole("button", { name: "Close menu", exact: true }).focus();
  await page.keyboard.press("Shift+Tab");
  expect(await drawer.evaluate((e) => e.contains(document.activeElement))).toBe(
    true,
  );
  await page.mouse.move(314, 400);
  await page.mouse.wheel(0, 400);
  expect(await page.evaluate(() => scrollY)).toBe(before);
  await page.keyboard.press("Escape");
  await expect(menu).toBeFocused();
  expect(
    await page.locator(".workspace").evaluate((e) => e.hasAttribute("inert")),
  ).toBe(false);
  await menu.tap();
  await drawer.getByRole("button", { name: "Open lab guide" }).tap();
  await expect(
    page.getByRole("dialog", { name: "Your guide to The Cozy Science Lab" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close and return to page" }).tap();
  await expect(menu).toBeFocused();
  await menu.tap();
  await drawer.getByRole("button", { name: "Open notifications" }).tap();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Close and return to page" }).tap();
  await menu.tap();
  await page.setViewportSize({ width: 844, height: 390 });
  expect(
    await page.locator(".workspace").evaluate((e) => e.hasAttribute("inert")),
  ).toBe(false);
  expect(
    await page.locator(".sidebar").evaluate((e) => e.hasAttribute("inert")),
  ).toBe(false);
  await page.setViewportSize({ width: 320, height: 568 });
  await expect(page.locator(".sidebar")).toBeHidden();
  await menu.tap();
  await drawer.getByRole("button", { name: "Close menu", exact: true }).tap();
  await expect(menu).toBeFocused();
});

test("student pages and forms fit narrow phones, landscape and tablets", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await exploreAsGuest(page);
  const routes: [string, string][] = [
    ["/", "My lab"],
    ["/island", "Science Island"],
    ["/branch/life", "Life Science"],
    ["/branch/chemistry", "Chemistry"],
    ["/branch/physics", "Physics"],
    ["/branch/earth", "Earth & Space"],
    ["/branch/skills", "Science Skills Lab"],
    ["/sources", "Science reading room"],
    ["/suggestions", "Suggestion box"],
    ["/review", "Review Box"],
    ["/notebook", "My notebook"],
    ["/shop", "Supply shop"],
    ["/spin", "Daily spin"],
    ["/quests", "Quests"],
    ["/leaderboard", "Leaderboard"],
    ["/experiment", "Science lab"],
  ];
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    for (const [path, label] of routes) {
      await page.goto(`/#${path}`);
      await expect(page.locator(".breadcrumbs > li").last()).toHaveText(label);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${label} at ${viewport.width}px`,
      ).toBe(true);
      expect(
        await page
          .locator("main")
          .evaluate((main) =>
            [
              ...main.querySelectorAll<HTMLInputElement>(
                "input,select,textarea",
              ),
            ]
              .filter(
                (e) =>
                  e.getClientRects().length &&
                  !["checkbox", "radio"].includes(e.type),
              )
              .every((e) => parseFloat(getComputedStyle(e).fontSize) >= 16),
          ),
      ).toBe(true);
    }
  }
  await page.getByRole("button", { name: "Open scientist profile" }).tap();
  const dialog = page.getByRole("dialog");
  expect(
    await dialog
      .locator(".modal-chrome")
      .evaluate((e) => e.getBoundingClientRect().height),
  ).toBeLessThan(100);
  await page.screenshot({ path: "/tmp/cozy-mobile-landscape-profile.png" });
  await page.getByRole("button", { name: "Close and return to page" }).tap();
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/#/sources");
  await page
    .getByRole("button", { name: "Sources for Cells", exact: true })
    .tap();
  expect(
    (
      await new AxeBuilder({ page })
        .include("dialog")
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
});

test("an eight-card discovery works with touch controls and retains its result", async ({
  page,
}) => {
  await exploreAsGuest(page, "/#/branch/life");
  await page.getByRole("button", { name: "Open Cells", exact: true }).tap();
  await page.getByRole("button", { name: "Let’s make a discovery" }).tap();
  for (let index = 0; index < 8; index++) {
    await expect(page.locator(".play-counter strong")).toHaveText(
      String(index + 1),
    );
    await expect(
      page.getByRole("button", { name: "Check my answer", exact: true }),
    ).toBeVisible();
    const prompt = await page.locator(".question-card > h2").innerText();
    const question = (cells as Question[]).find((q) => q.prompt === prompt)!;
    expect(question).toBeTruthy();
    if (
      question.type === "match" &&
      typeof question.answer === "object" &&
      !Array.isArray(question.answer)
    ) {
      for (const [key, value] of Object.entries(question.answer))
        await page
          .getByRole("combobox", { name: `Match ${key}` })
          .selectOption(value);
    } else if (question.type === "order" && Array.isArray(question.answer)) {
      const correctOrder = question.answer;
      for (let target = 0; target < correctOrder.length; target++) {
        const text = question.options!.find(
          (o) => o.id === correctOrder[target],
        )!.text;
        let position = (
          await page.locator(".order-row > span:nth-child(2)").allTextContents()
        ).indexOf(text);
        while (position > target) {
          await page
            .getByRole("button", {
              name: `Move step ${position + 1} up`,
              exact: true,
            })
            .tap();
          position--;
        }
      }
    } else if (question.options) {
      await page
        .locator(".answer-option")
        .filter({
          hasText: question.options.find((o) => o.id === question.answer)!.text,
        })
        .tap();
    } else
      await page.locator(".answer-area input").fill(String(question.answer));
    await page
      .getByRole("button", { name: "Check my answer", exact: true })
      .tap();
    await expect(page.locator(".answer-feedback")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page
      .getByRole("button", {
        name:
          index === 7 ? "See my discoveries" : "On to the next little wonder",
      })
      .tap();
  }
  await expect(
    page.getByRole("heading", { name: /perfect little|discovered/ }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("csl:state")!).users.find(
          (u: { id: string }) => u.id === "guest",
        ).mastery["life.cells"].completed,
    ),
  ).toBe(1);
});
