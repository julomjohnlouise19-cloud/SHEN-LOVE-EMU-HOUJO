import AxeBuilder from "@axe-core/playwright";
import { test, expect, signIn, signOut, users } from "./community-fixtures";

test("students keep their own device display mode without changing synced palettes or Saved records", async ({
  page,
  backend,
}) => {
  await page.goto("./");
  await signIn(page);
  await expect(
    page.getByRole("link", { name: "Saved records", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Open scientist profile", exact: true })
    .click();
  await page.getByRole("button", { name: "Appearance", exact: true }).click();
  await page.locator(".dark-mode-switch").click();
  await expect(page.locator("html")).toHaveAttribute("data-color-mode", "dark");
  await page
    .getByRole("button", { name: "Choose Aurora colors", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Save my style", exact: true })
    .click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "aurora");
  await expect(page.locator("html")).toHaveAttribute("data-color-mode", "dark");
  expect(backend.preferences[users[0].id]).toEqual({
    theme: "aurora",
    bio: "",
  });
  await page.keyboard.press("Escape");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-color-mode", "dark");
  await signOut(page);
  await expect(page.locator("html")).toHaveAttribute("data-color-mode", "dark");
  await signIn(page, "student2");
  await expect(page.locator("html")).toHaveAttribute("data-color-mode", "dark");
  await page
    .getByRole("button", { name: "Open scientist profile", exact: true })
    .click();
  await page.getByRole("button", { name: "Appearance", exact: true }).click();
  await page.locator(".dark-mode-switch").click();
  await expect(page.locator("html")).toHaveAttribute(
    "data-color-mode",
    "light",
  );
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("link", { name: "Saved records", exact: true }),
  ).toBeVisible();
  await signOut(page);
  await signIn(page);
  await expect(page.locator("html")).toHaveAttribute("data-color-mode", "dark");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "aurora");
});

test("Dark mode keeps populated student and teacher pages readable", async ({
  page,
  backend,
  social,
}, info) => {
  test.setTimeout(120000);
  const third = "00000000-0000-4000-8000-000000000004";
  backend.profiles.push({
    ...backend.profiles[1],
    user_id: third,
    display_name: "Third Scientist",
  });
  social.settings[third] = { ...social.settings[users[1].id] };
  backend.credits[users[0].id] = 200;
  backend.credits[users[1].id] = 80;
  backend.credits[third] = 50;
  await page.goto("./");
  await signIn(page);
  await page
    .getByRole("button", { name: "Open scientist profile", exact: true })
    .click();
  await page.getByRole("button", { name: "Appearance", exact: true }).click();
  await page.locator(".dark-mode-switch").click();
  await expect(page.locator("html")).toHaveAttribute("data-color-mode", "dark");
  await page.keyboard.press("Escape");
  const failures: { path: string; width: number; issues: unknown[] }[] = [];
  async function check(path: string, width: number) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`#${path}`);
    await expect(
      page.getByRole("button", { name: "Log out", exact: true }),
    ).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute(
      "data-color-mode",
      "dark",
    );
    if (path === "/leaderboard")
      await expect(page.locator(".community-rank-row")).toHaveCount(3);
    if (path === "/friends")
      await expect(page.locator(".friend-card").first()).toBeVisible();
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    await info.attach(`dark-${path.slice(1)}-${width}`, {
      body: JSON.stringify(result.violations),
      contentType: "application/json",
    });
    if (result.violations.length)
      failures.push({
        path,
        width,
        issues: result.violations.map((v) => ({
          id: v.id,
          targets: v.nodes.map((n) => n.target),
        })),
      });
  }
  for (const width of [1280, 320])
    for (const path of ["/leaderboard", "/friends", "/shop"])
      await check(path, width);
  await signOut(page);
  await signIn(page, "teacher");
  for (const width of [1280, 320]) await check("/teacher", width);
  expect(failures).toEqual([]);
});
