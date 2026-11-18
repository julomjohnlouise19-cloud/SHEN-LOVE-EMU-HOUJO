import AxeBuilder from "@axe-core/playwright";
import { test, expect, exploreAsGuest } from "./fixtures";
import { boundedPage, brightSurfaces, displayMode } from "./interface-helpers";

const title = "A little guide to your science world";

test("the logo question mark explains the lab before signup and returns keyboard focus", async ({
  page,
}) => {
  await page.goto("/#/welcome");
  const trigger = page.getByRole("button", {
    name: "About The Cozy Science Lab",
    exact: true,
  });
  const url = page.url();
  for (const width of [1440, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(trigger).toBeInViewport();
    await boundedPage(page);
    await trigger.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", { name: title, exact: true });
    await expect(dialog.getByRole("tab")).toHaveCount(6);
    await expect(dialog.getByRole("tabpanel")).toHaveCount(1);
    await expect(dialog).toContainText("Grade 10-SSC student researchers");
    await expect(dialog).toContainText("Anatomy to Volcanoes");
    await expect(dialog).toContainText("This is a local demo");
    const explore = dialog.getByRole("tab", { name: "Explore", exact: true });
    await explore.focus();
    await page.keyboard.press("ArrowRight");
    await expect(
      dialog.getByRole("tab", { name: "Play", exact: true }),
    ).toBeFocused();
    await expect(dialog.getByRole("tabpanel")).toContainText("Word Hunt");
    await page.keyboard.press("End");
    await expect(
      dialog.getByRole("tab", { name: "My profile", exact: true }),
    ).toHaveAttribute("aria-selected", "true");
    await expect(dialog.getByRole("tabpanel")).toContainText("Dark mode");
    await dialog
      .getByRole("button", { name: "Next stop", exact: true })
      .click();
    await expect(explore).toHaveAttribute("aria-selected", "true");
    await expect(dialog.locator(".site-help-stop-count")).toHaveText(
      "Stop 1 of 6",
    );
    await dialog.getByRole("tab", { name: "Friends", exact: true }).click();
    await expect(dialog.getByRole("tabpanel")).toContainText("highest first");
    await dialog.getByRole("button", { name: "Previous", exact: true }).click();
    await expect(dialog.getByRole("tabpanel")).toContainText("Review Box");
    await explore.click();
    await expect(dialog.locator(".dialog-close")).toHaveCount(1);
    expect(
      (
        await new AxeBuilder({ page })
          .include(".site-help-dialog")
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await boundedPage(page);
    await page.screenshot({ path: `/tmp/cozy-site-help-welcome-${width}.png` });
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
    expect(page.url()).toBe(url);
  }
});

test("help stays by the logo in both themes and nested guidance preserves a science card", async ({
  page,
}) => {
  await exploreAsGuest(page, "/#/branch/life");
  await displayMode(page, "dark");
  await page.getByRole("button", { name: "Open Cells", exact: true }).click();
  await page.getByRole("button", { name: "Let’s make a discovery" }).click();
  const prompt = await page.locator(".question-card > h2").innerText();
  const url = page.url();
  const balance = await page.locator(".balance-pill").textContent();
  const trigger = page.locator(".topbar-left .site-help-button");
  for (const width of [1280, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(trigger).toBeInViewport();
    await boundedPage(page);
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: title, exact: true });
    for (const label of [
      "Play",
      "Friends",
      "Rewards",
      "My profile",
      "Explore",
    ]) {
      await dialog.getByRole("tab", { name: label, exact: true }).click();
      await expect(
        dialog.getByRole("tab", { name: label, exact: true }),
      ).toHaveAttribute("aria-selected", "true");
    }
    expect(await brightSurfaces(page, ".site-help-dialog")).toEqual([]);
    expect(
      (
        await new AxeBuilder({ page })
          .include(".site-help-dialog")
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await dialog.evaluate((node) => (node.scrollTop = 0));
    await page.screenshot({ path: `/tmp/cozy-site-help-dark-${width}.png` });
    const steps = dialog.getByRole("button", {
      name: "Show me the step-by-step guide",
      exact: true,
    });
    await steps.click();
    await expect(page.getByRole("dialog")).toHaveCount(2);
    await page.keyboard.press("Escape");
    await expect(steps).toBeFocused();
    await dialog.getByRole("button", { name: "Got it!", exact: true }).click();
    await expect(trigger).toBeFocused();
    expect(page.url()).toBe(url);
    await expect(page.locator(".question-card > h2")).toHaveText(prompt);
    expect(await page.locator(".balance-pill").textContent()).toBe(balance);
  }
  await displayMode(page, "light");
  await trigger.click();
  await expect(page.getByRole("dialog", { name: title })).toBeVisible();
  await page
    .getByRole("button", { name: "Close and return to page", exact: true })
    .click();
  await expect(trigger).toBeFocused();
});
