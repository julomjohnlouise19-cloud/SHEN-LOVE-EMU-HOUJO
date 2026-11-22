import AxeBuilder from "@axe-core/playwright";
import { test, expect, exploreAsGuest } from "./fixtures";
import {
  boundedPage,
  brightSurfaces,
  displayMode,
  visitRenderedRoute,
} from "./interface-helpers";

test("opening nested study panels preserves the saved palette and page background", async ({
  page,
}) => {
  test.setTimeout(180000);
  await exploreAsGuest(page, "/#/sources");
  for (const mode of ["light", "dark"] as const) {
    await displayMode(page, mode);
    for (const theme of ["Aurora", "Sunset", "Meadow"]) {
      await page
        .getByRole("button", { name: "Open scientist profile", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Appearance", exact: true })
        .click();
      await page
        .getByRole("button", {
          name: "Choose " + theme + " colors",
          exact: true,
        })
        .click();
      await expect(page.locator(".palette-status")).toContainText("Saved");
      await page.keyboard.press("Escape");
      const background = await page.evaluate(() => {
        const style = getComputedStyle(document.body);
        return [style.backgroundColor, style.backgroundImage];
      });
      await page
        .getByRole("button", { name: "Read Cells study guide", exact: true })
        .click();
      await page
        .getByRole("link", {
          name: "Open Life Science study handbook PDF",
          exact: true,
        })
        .click();
      const panels = await page.locator("dialog[open]").evaluateAll((dialogs) =>
        dialogs.map((dialog) => {
          const surface = document.createElement("span");
          surface.style.backgroundColor = "var(--lab-surface)";
          dialog.append(surface);
          const expected = getComputedStyle(surface).backgroundColor;
          surface.remove();
          return {
            actual: getComputedStyle(dialog).backgroundColor,
            expected,
            backdrop: getComputedStyle(dialog, "::backdrop").backgroundColor,
          };
        }),
      );
      expect(panels).toHaveLength(2);
      for (const panel of panels) {
        expect(panel.actual).toBe(panel.expected);
        expect(panel.backdrop).toBe("rgba(0, 0, 0, 0)");
      }
      expect(
        await page.evaluate(() => {
          const style = getComputedStyle(document.body);
          return [style.backgroundColor, style.backgroundImage];
        }),
      ).toEqual(background);
      await expect(page.locator("html")).toHaveAttribute(
        "data-theme",
        theme.toLowerCase(),
      );
      await expect(page.locator("html")).toHaveAttribute(
        "data-color-mode",
        mode,
      );
      await page
        .getByRole("dialog", {
          name: "Life Science · study handbook",
          exact: true,
        })
        .getByRole("button", { name: "Close and return to page", exact: true })
        .click();
      await page
        .getByRole("dialog", { name: "Cells · study notes", exact: true })
        .getByRole("button", { name: "Close and return to page", exact: true })
        .click();
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
  }
});

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
