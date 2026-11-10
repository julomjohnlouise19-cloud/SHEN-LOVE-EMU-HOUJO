import { test, expect, exploreAsGuest } from "./fixtures";

test("destination-labeled returns work from a deep link and preserve an unfinished quiz", async ({
  page,
}) => {
  await exploreAsGuest(page, "/#/branch/physics");
  await expect(
    page.getByRole("heading", { name: "Physics", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Back to Science Island", exact: true }),
  ).toHaveAttribute("href", "#/island");
  await page
    .getByRole("link", { name: "Back to Science Island", exact: true })
    .click();
  await expect(page).toHaveURL(/#\/island$/);
  await page.goto("/#/branch/life");
  await page.getByRole("button", { name: "Open Cells", exact: true }).click();
  await page
    .getByRole("button", { name: "Close and return to page", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Open Cells", exact: true }).click();
  await page
    .getByRole("button", { name: "Let’s make a discovery", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Check my answer", exact: true }),
  ).toBeVisible();
  const run = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("csl:state")!).runs.find(
        (r: { userId: string; completed: boolean }) =>
          r.userId === "guest" && !r.completed,
      ).id,
  );
  await page
    .getByRole("link", { name: "Back to Life Science", exact: true })
    .click();
  await expect(page).toHaveURL(/#\/branch\/life$/);
  expect(
    await page.evaluate(
      (id) =>
        JSON.parse(localStorage.getItem("csl:state")!).runs.some(
          (r: { id: string; completed: boolean }) =>
            r.id === id && !r.completed,
        ),
      run,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 320, height: 780 });
  await expect(
    page.getByRole("link", { name: "Back to Science Island", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "/tmp/cozy-clear-mobile-return.png",
    fullPage: true,
  });
});
