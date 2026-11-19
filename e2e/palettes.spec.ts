import AxeBuilder from "@axe-core/playwright";
import { test, expect, exploreAsGuest } from "./fixtures";
import {
  boundedPage,
  brightSurfaces,
  displayMode,
  visitRenderedRoute,
} from "./interface-helpers";

test("each color story applies immediately across learning screens in light and dark and survives reload", async ({
  page,
}) => {
  test.setTimeout(180000);
  await exploreAsGuest(page, "/#/island");
  for (const mode of ["light", "dark"] as const) {
    await displayMode(page, mode);
    const colors: string[] = [];
    for (const theme of ["Meadow", "Aurora", "Sunset"]) {
      await page
        .getByRole("button", { name: "Open scientist profile", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Appearance", exact: true })
        .click();
      const choice = page.getByRole("button", {
        name: `Choose ${theme} colors`,
        exact: true,
      });
      await choice.click();
      await expect(choice).toBeEnabled();
      await expect(choice).toHaveAttribute("aria-pressed", "true");
      await expect(page.locator(".palette-status")).toContainText(
        /automatically|Saved/,
      );
      await expect(page.locator("html")).toHaveAttribute(
        "data-theme",
        theme.toLowerCase(),
      );
      await expect(page.locator("html")).toHaveAttribute(
        "data-color-mode",
        mode,
      );
      await page.setViewportSize({ width: 320, height: 844 });
      await boundedPage(page);
      expect(
        (
          await new AxeBuilder({ page })
            .include(".profile-dialog")
            .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
            .analyze()
        ).violations,
      ).toEqual([]);
      await page.screenshot({
        path: `/tmp/cozy-palette-${mode}-${theme.toLowerCase()}-320.png`,
      });
      await page.keyboard.press("Escape");
      await page.setViewportSize({ width: 1280, height: 900 });
      colors.push(
        await page.evaluate(() =>
          [
            getComputedStyle(document.body).backgroundColor,
            getComputedStyle(document.querySelector(".sidebar")!)
              .backgroundColor,
            getComputedStyle(document.querySelector(".nav-link.active")!)
              .backgroundColor,
          ].join("|"),
        ),
      );
      for (const route of [
        "/island",
        "/review",
        "/island/activities",
        "/island/activities/match",
        "/island/activities/words",
        "/island/activities/cards",
        "/shop",
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
        if (mode === "dark") expect(await brightSurfaces(page)).toEqual([]);
      }
      await page.screenshot({
        path: `/tmp/cozy-palette-${mode}-${theme.toLowerCase()}-1280.png`,
      });
      await page.reload();
      await expect(page.locator("html")).toHaveAttribute(
        "data-theme",
        theme.toLowerCase(),
      );
      await expect(page.locator("html")).toHaveAttribute(
        "data-color-mode",
        mode,
      );
    }
    expect(
      new Set(colors).size,
      `${mode} palettes have distinct page, navigation and active colors`,
    ).toBe(3);
  }
});
