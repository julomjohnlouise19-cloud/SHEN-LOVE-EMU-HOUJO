import AxeBuilder from "@axe-core/playwright";
import { test, expect, users } from "./calendar-fixtures";
import { signIn, signOut } from "./cloud-fixtures";
import { displayMode, boundedPage } from "./interface-helpers";
import { banner, editor, applyDesign } from "./profile-design-helpers";

test("student and teacher profile identities blend with their cards and never clip at narrow widths", async ({
  page,
  backend,
}) => {
  test.setTimeout(180000);
  backend.profiles[0].display_name = "Astra the Curious Student Scientist";
  backend.profiles[2].display_name = "Luna the Classroom Science Teacher";
  await page.goto("./");
  for (const account of ["student1", "teacher"] as const) {
    await signIn(page, account);
    await displayMode(page, "dark");
    await page
      .getByRole("button", { name: "Open scientist profile", exact: true })
      .click();
    const profile = page.getByRole("dialog", {
      name: "Your scientist profile",
      exact: true,
    });
    await page
      .getByLabel("Choose profile photo", { exact: true })
      .setInputFiles(await banner(page));
    await expect
      .poll(() => backend.profiles[account === "teacher" ? 2 : 0].photo_path)
      .not.toBeNull();
    for (const width of [1280, 1120, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      const card = profile.locator(".profile-composition");
      await expect(card.locator(".scientist-card-copy")).toHaveCSS(
        "background-color",
        "rgba(0, 0, 0, 0)",
      );
      expect(
        await card.evaluate((node) => {
          const card = node.getBoundingClientRect();
          return [
            ".scientist-card-avatar",
            ".scientist-card-copy",
            ".scientist-card-copy h3",
          ].every((selector) => {
            const part = node.querySelector<HTMLElement>(selector)!;
            const r = part.getBoundingClientRect();
            return (
              r.left >= card.left &&
              r.right <= card.right &&
              r.top >= card.top &&
              r.bottom <= card.bottom &&
              part.scrollWidth <= part.clientWidth
            );
          });
        }),
      ).toBe(true);
      await expect(profile.locator(".modal-chrome .dialog-close")).toHaveCount(
        1,
      );
      await expect(profile.locator(".dialog-back")).toHaveCount(0);
      await boundedPage(page);
      if (width === 1280 || width === 320) {
        expect(
          (
            await new AxeBuilder({ page })
              .include(".profile-dialog")
              .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
              .analyze()
          ).violations,
        ).toEqual([]);
        await card.scrollIntoViewIfNeeded();
        await page.screenshot({
          path: `/tmp/cozy-profile-polished-${account}-${width}.png`,
        });
      }
    }
    await page.setViewportSize({ width: 1280, height: 900 });
    const design = await editor(page);
    await design
      .getByLabel("Upload your banner", { exact: true })
      .setInputFiles(await banner(page));
    await design
      .getByRole("button", { name: "Preview & finish", exact: true })
      .click();
    await expect(
      design.locator(".design-review-pane .scientist-card-copy"),
    ).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await applyDesign(design);
    await expect(profile.locator(".profile-cover-image")).toHaveCSS(
      "object-position",
      "50% 50%",
    );
    await expect(profile.locator(".scientist-card-copy")).toHaveCSS(
      "background-color",
      "rgba(0, 0, 0, 0)",
    );
    await profile
      .getByRole("button", { name: "Close and return to page", exact: true })
      .click();
    const guide = page.locator(".topbar .help-button");
    await page.mouse.move(0, 0);
    await expect(guide).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await guide.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(guide).toBeFocused();
    await displayMode(page, "light");
    await page
      .getByRole("button", { name: "Open scientist profile", exact: true })
      .click();
    await expect(profile.locator(".scientist-card-copy")).toHaveCSS(
      "background-color",
      "rgba(0, 0, 0, 0)",
    );
    await page.keyboard.press("Escape");
    await signOut(page);
  }
  expect(backend.credits[users[0].id]).toBe(200);
});

test("activated calendar settings are readable in Dark mode and changes still require successful confirmation", async ({
  page,
  calendar,
}) => {
  test.setTimeout(120000);
  Object.assign(calendar.settings, {
    enrolled: 27,
    claims_today: 8,
    credits_awarded: 1250,
  });
  await page.goto("./");
  await signIn(page, "teacher");
  await displayMode(page, "dark");
  await page.goto("#/teacher/settings");
  const panel = page.getByRole("region", {
    name: "Daily calendar controls",
    exact: true,
  });
  await expect(panel.locator(".calendar-teacher-totals")).toContainText(
    "27 calendars started",
  );
  for (const width of [1280, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await boundedPage(page);
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await panel.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: `/tmp/cozy-calendar-controls-dark-${width}.png`,
    });
  }
  await panel
    .getByRole("checkbox", { name: "Enable daily claim calendar", exact: true })
    .uncheck();
  await panel.getByLabel("Daily class credits", { exact: true }).fill("7");
  await panel
    .getByLabel("Seventh-day class credits", { exact: true })
    .fill("15");
  await panel
    .getByRole("button", { name: "Save calendar settings", exact: true })
    .click();
  expect(calendar.settingsWrites).toBe(0);
  calendar.failSettings = true;
  await page
    .getByRole("button", { name: "Confirm calendar settings", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "Settings were not saved",
  );
  expect(calendar.settingsWrites).toBe(0);
  calendar.failSettings = false;
  await page
    .getByRole("button", { name: "Confirm calendar settings", exact: true })
    .click();
  await expect(panel.locator(".calendar-settings-status")).toHaveText(
    "Calendar settings saved.",
  );
  expect(calendar.settingsWrites).toBe(1);
  await page.reload();
  await expect(
    panel.getByRole("checkbox", {
      name: "Enable daily claim calendar",
      exact: true,
    }),
  ).not.toBeChecked();
  await expect(
    panel.getByLabel("Daily class credits", { exact: true }),
  ).toHaveValue("7");
});
