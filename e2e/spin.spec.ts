import AxeBuilder from "@axe-core/playwright";
import { test, expect, exploreAsGuest } from "./fixtures";

test("the retained daily wheel explains its saved reward, supports motion preferences and opens useful science", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await exploreAsGuest(page);
  await page.getByRole("link", { name: "Daily spin", exact: true }).click();
  await expect(page.locator(".wheel-bulb")).toHaveCount(16);
  await expect(
    page.locator(".carnival-wheel-stage .wheel-pointer"),
  ).toBeVisible();
  await expect(page.locator(".wheel-pedestal")).toBeVisible();
  await page.screenshot({
    path: "/tmp/cozy-carnival-wheel-desktop.png",
    fullPage: true,
  });
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Your free daily discovery is ready" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Let’s give it a spin", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "A little wonder is on its way…",
      exact: true,
    }),
  ).toBeDisabled();
  const discovery = page.getByRole("region", {
    name: "Your daily discovery",
    exact: true,
  });
  await expect(discovery).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Today’s discovery is yours",
      exact: true,
    }),
  ).toBeDisabled();
  const result = await discovery.locator("strong").textContent();
  const fact = await discovery.locator("p").textContent();
  await page.reload();
  await expect(discovery.locator("strong")).toHaveText(result!);
  await expect(discovery.locator("p")).toHaveText(fact!);
  const selected = Number(
    await page.locator(".science-wheel").getAttribute("data-discovery-slot"),
  );
  const landing = await page.locator(".science-wheel").evaluate((element) => {
    const matrix = new DOMMatrix(getComputedStyle(element).transform);
    return ((Math.atan2(matrix.b, matrix.a) * 180) / Math.PI + 360) % 360;
  });
  expect(landing).toBeCloseTo(360 - (selected * 60 + 30), 1);
  await expect(page.getByText(/Next discovery: .* at midnight/)).toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 320, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(
    (
      await new AxeBuilder({ page })
        .include(".spin-page")
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: testInfo.outputPath("daily-wheel-mobile.png"),
    fullPage: true,
  });
  await page.screenshot({
    path: "/tmp/cozy-carnival-wheel-mobile.png",
    fullPage: true,
  });
  await discovery
    .getByRole("button", { name: "Explore today’s science", exact: true })
    .click();
  await expect(page).toHaveURL(/#\/branch\/(life|physics|chemistry|earth)$/);
  await page.goto("/#/spin");
  await page
    .getByRole("button", { name: "Open my notebook", exact: true })
    .click();
  await expect(page).toHaveURL(/#\/notebook$/);
});

test("the daily wheel still awards once across tabs and keeps the award after refresh", async ({
  page,
  context,
}) => {
  await exploreAsGuest(page, "/#/spin");
  const other = await context.newPage();
  const errors: string[] = [];
  other.on("pageerror", (error) => errors.push(error.message));
  try {
    await exploreAsGuest(other, "/#/spin");
    await Promise.all(
      [page, other].map((tab) =>
        tab
          .locator(".spin-copy button.primary")
          .evaluate((button) => (button as HTMLButtonElement).click()),
      ),
    );
    for (const tab of [page, other])
      await expect(
        tab.getByRole("button", {
          name: "Today’s discovery is yours",
          exact: true,
        }),
      ).toBeDisabled();
    expect(
      await page.evaluate(() => {
        const state = JSON.parse(localStorage.getItem("csl:state")!);
        const events = state.events.filter(
          (event: { type: string; actor: string }) =>
            event.type === "WheelSpun" && event.actor === "guest",
        );
        return {
          count: events.length,
          balance: state.users.find(
            (user: { id: string }) => user.id === "guest",
          ).merits,
          prize: events[0].data.prize,
        };
      }),
    ).toEqual({
      count: 1,
      balance: expect.any(Number),
      prize: expect.any(Number),
    });
    const award = await page
      .getByRole("region", { name: "Your daily discovery", exact: true })
      .locator("strong")
      .textContent();
    await other.reload();
    await expect(
      other
        .getByRole("region", { name: "Your daily discovery", exact: true })
        .locator("strong"),
    ).toHaveText(award!);
    expect(errors).toEqual([]);
  } finally {
    await other.close();
  }
});
