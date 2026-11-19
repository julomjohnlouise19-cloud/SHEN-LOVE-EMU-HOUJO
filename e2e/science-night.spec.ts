import AxeBuilder from "@axe-core/playwright";
import { test, expect, exploreAsGuest } from "./fixtures";
import {
  displayMode,
  brightSurfaces,
  boundedPage,
  visitRenderedRoute,
} from "./interface-helpers";
import { branches, decks } from "../src/data/catalog";
import { scienceFigures } from "../src/data/science-figures";

test("every science branch, deck picker and model uses a genuinely dark readable canvas", async ({
  page,
}) => {
  test.setTimeout(300000);
  await exploreAsGuest(page);
  await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem("csl:state")!);
    saved.users.find((user: { id: string }) => user.id === "guest").xp = 480;
    localStorage.setItem("csl:state", JSON.stringify(saved));
  });
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Log out", exact: true }),
  ).toBeVisible();
  await displayMode(page, "dark");
  async function scan(scope: string) {
    await boundedPage(page);
    expect(await brightSurfaces(page, scope)).toEqual([]);
    const pale = await page.locator(scope).evaluate((root) => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 1;
      const context = canvas.getContext("2d")!;
      return [
        ...root.querySelectorAll<SVGElement>(
          ".science-diagram [fill], .science-illustration [fill]",
        ),
      ].flatMap((shape) => {
        if (shape.tagName.toLowerCase() === "text" || shape.closest("marker"))
          return [];
        const color = getComputedStyle(shape).fill;
        if (color === "none" || color.startsWith("url(")) return [];
        context.clearRect(0, 0, 1, 1);
        context.fillStyle = color;
        context.fillRect(0, 0, 1, 1);
        const rgba = [...context.getImageData(0, 0, 1, 1).data];
        if (rgba[3] < 217) return [];
        const linear = rgba
          .slice(0, 3)
          .map((n) => n / 255)
          .map((n) =>
            n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4,
          );
        return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722 >
          0.4
          ? [{ shape: shape.tagName, color }]
          : [];
      });
    });
    expect(pale).toEqual([]);
    expect(
      (
        await new AxeBuilder({ page })
          .include(scope)
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
  }
  for (const theme of ["Meadow", "Aurora", "Sunset"]) {
    await page.setViewportSize({ width: 1280, height: 900 });
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
    for (const branch of branches) {
      await visitRenderedRoute(page, `/branch/${branch.id}`);
      await scan("#main");
      const deck = decks.find((value) => value.branch === branch.id)!;
      await page
        .getByRole("button", { name: `Open ${deck.name}`, exact: true })
        .click();
      await scan("dialog");
      await page.keyboard.press("Escape");
    }
    await visitRenderedRoute(page, "/branch/life");
    await page
      .getByRole("button", { name: "Open Genetics & Evolution", exact: true })
      .click();
    for (const width of [1280, 320]) {
      await page.setViewportSize({ width, height: 900 });
      await scan("dialog");
      await page
        .getByRole("button", {
          name: "Easy peasy Recall & recognize",
          exact: true,
        })
        .click();
      await expect(
        page.getByRole("button", {
          name: "Easy peasy Recall & recognize",
          exact: true,
        }),
      ).toHaveAttribute("aria-pressed", "true");
      await page.screenshot({
        path: `/tmp/cozy-science-night-${theme.toLowerCase()}-${width}.png`,
      });
    }
    await page.keyboard.press("Escape");
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  await visitRenderedRoute(page, "/sources");
  await page
    .getByRole("button", { name: "Illustrations", exact: true })
    .click();
  for (const figure of scienceFigures) {
    await page
      .getByRole("button", { name: `Explore ${figure.title}`, exact: true })
      .click();
    await scan("dialog");
    await page.keyboard.press("Escape");
  }
});
