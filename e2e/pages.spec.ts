import { test, expect, exploreAsGuest } from "./fixtures";
test("GitHub Pages loads styles, fonts, decks and offline assets under the repository path", async ({
  page,
  context,
}) => {
  const site = String(test.info().project.use.baseURL);
  const prefix = new URL(site).pathname;
  await exploreAsGuest(page, site);
  await expect(
    page.getByRole("heading", { name: "Hey, curious mind!" }),
  ).toBeVisible();
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  expect(
    await page.evaluate(() =>
      [...document.fonts].some(
        (font) => font.family.includes("Fredoka") && font.status === "loaded",
      ),
    ),
  ).toBe(true);
  expect(
    await page.evaluate(async () => {
      const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]')!;
      const image = new Image();
      image.src = icon.href;
      await image.decode();
      return image.naturalWidth > 0 && image.naturalHeight > 0;
    }),
  ).toBe(true);
  await expect(page.locator(".startup-screen")).toHaveCount(0);
  await page.screenshot({
    path: "/tmp/cozy-pages-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("heading", { name: "Hey, curious mind!" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "/tmp/cozy-pages-mobile.png", fullPage: true });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page
    .getByRole("link", { name: "Explore Life Science, 6 decks" })
    .click();
  await page.getByRole("button", { name: "Open Cells", exact: true }).click();
  await page.getByRole("button", { name: "Let’s make a discovery" }).click();
  await expect(page.locator(".question-card")).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise<void>((resolve) =>
        navigator.serviceWorker.addEventListener(
          "controllerchange",
          () => resolve(),
          { once: true },
        ),
      );
  });
  expect(
    await page.evaluate(
      () => new URL(navigator.serviceWorker.controller!.scriptURL).pathname,
    ),
  ).toBe(`${prefix}sw.js`);
  const cachedPaths = await page.evaluate(async () => {
    const names = await caches.keys();
    const cache = await caches.open(
      names.find((name) => name.startsWith("cozy-science-"))!,
    );
    return (await cache.keys()).map((request) => new URL(request.url).pathname);
  });
  expect(cachedPaths.length).toBeGreaterThan(30);
  expect(cachedPaths.every((path) => path.startsWith(prefix))).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator(".question-card")).toBeVisible();
  await page.goto(`${site}#/branch/chemistry`);
  await page
    .getByRole("button", {
      name: "Open Atoms & the Periodic Table",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "Let’s make a discovery" }).click();
  await expect(page.locator(".question-card")).toBeVisible();
  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await page.getByRole("button", { name: "Log out now" }).click();
  await expect(
    page.getByRole("heading", { name: "A little curiosity starts here." }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "A little curiosity starts here." }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => sessionStorage.getItem("csl:session")),
  ).toBeNull();
  await context.setOffline(false);
});
