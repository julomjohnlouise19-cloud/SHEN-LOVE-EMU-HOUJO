import AxeBuilder from "@axe-core/playwright";
import { test, expect, signIn, signOut, users } from "./cloud-fixtures";
import {
  visitRenderedRoute,
  displayMode,
  boundedPage,
  brightSurfaces,
} from "./interface-helpers";

test("saved learning titles and badges stay with the right account without changing class credits", async ({
  page,
  context,
  backend,
}) => {
  await page.goto("./");
  await signIn(page);
  await page.evaluate((owner) => {
    const saved = JSON.parse(localStorage.getItem("csl:state")!);
    const user = saved.users.find(
      (value: { id: string }) => value.id === owner,
    );
    user.xp = 480;
    user.mastery["life.body"] = { completed: 1, correct: 8, attempts: 8 };
    localStorage.setItem("csl:state", JSON.stringify(saved));
  }, users[0].id);
  await page.reload();
  await visitRenderedRoute(page, "/growth");
  await expect(page.locator(".growth-hero h2")).toHaveText("Lab Assistant");
  const balance = backend.credits[users[0].id];
  async function preferences() {
    await page
      .getByRole("button", { name: "Open scientist profile", exact: true })
      .click();
    await page.getByRole("button", { name: "Appearance", exact: true }).click();
  }
  await preferences();
  await page
    .getByRole("button", {
      name: "Display Anatomy & Body Systems explorer",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Save my badges", exact: true })
    .click();
  await expect(page.locator(".profile-badge-display")).toContainText("Anatomy");
  const volume = page.getByRole("slider", {
    name: "Sound volume",
    exact: true,
  });
  await volume.focus();
  await volume.press("Home");
  for (let index = 0; index < 2; index++) {
    await expect(volume).toBeEnabled();
    await volume.press("ArrowRight");
  }
  await expect(volume).toHaveValue("30");
  await page
    .getByRole("button", { name: "Turn on learning sounds", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Animation style", exact: true })
    .selectOption("reduce");
  await page.keyboard.press("Escape");
  await displayMode(page, "dark");
  await page.setViewportSize({ width: 320, height: 900 });
  await boundedPage(page);
  expect(await brightSurfaces(page, "#main")).toEqual([]);
  expect(
    (
      await new AxeBuilder({ page })
        .include("#main")
        .withTags(["wcag2a", "wcag2aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page
    .getByRole("button", { name: "Science topics", exact: true })
    .click();
  await page.getByRole("button", { name: "Earned only", exact: true }).click();
  await expect(page.locator(".growth-badge-card")).toHaveCount(1);
  await expect(page.locator(".growth-badge-card")).toContainText("Anatomy");
  await page
    .getByRole("button", { name: "High five, Tabby!", exact: true })
    .click();
  expect(backend.credits[users[0].id]).toBe(balance);
  const other = await context.newPage();
  await other.goto("./#/growth");
  await expect(other.locator(".growth-hero h2")).toHaveText("Lab Assistant");
  await other.close();
  await page.setViewportSize({ width: 1280, height: 900 });
  await signOut(page);
  await signIn(page, "student2");
  await visitRenderedRoute(page, "/growth");
  await expect(page.locator(".growth-hero h2")).toHaveText("Curious Seedling");
  await expect(page.locator(".growth-earned-count")).toHaveText("0 earned");
  await preferences();
  await expect(page.locator("[data-displayed-badge]")).toHaveCount(0);
  await expect(page.locator(".profile-badge-choice")).toHaveCount(0);
  await expect(
    page.getByRole("slider", { name: "Sound volume", exact: true }),
  ).toHaveValue("60");
  await expect(
    page.getByRole("button", { name: "Turn on learning sounds", exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByRole("combobox", { name: "Animation style", exact: true }),
  ).toHaveValue("system");
  await page.keyboard.press("Escape");
  await signOut(page);
  await signIn(page);
  await visitRenderedRoute(page, "/growth");
  await expect(page.locator(".growth-hero h2")).toHaveText("Lab Assistant");
  expect(backend.credits[users[0].id]).toBe(balance);
  await preferences();
  await expect(page.locator(".profile-badge-display")).toContainText("Anatomy");
  await expect(
    page.getByRole("slider", { name: "Sound volume", exact: true }),
  ).toHaveValue("30");
  await expect(
    page.getByRole("button", { name: "Mute learning sounds", exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByRole("combobox", { name: "Animation style", exact: true }),
  ).toHaveValue("reduce");
});
