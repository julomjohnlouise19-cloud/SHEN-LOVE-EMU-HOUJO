import AxeBuilder from "@axe-core/playwright";
import { test, expect, exploreAsGuest } from "./fixtures";
import { boundedPage, brightSurfaces } from "./interface-helpers";

test("Study Room uses exact-video covers and loads only a deliberately chosen player", async ({
  page,
  context,
}) => {
  const requests: string[] = [];
  page.on("request", (request) => {
    if (/youtube|ytimg|googlevideo/.test(request.url()))
      requests.push(request.url());
  });
  await page.route("https://www.youtube-nocookie.com/embed/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<!doctype html><html lang='en'><title>Video fixture</title><body><p>External player fixture</p></body></html>",
    }),
  );
  await exploreAsGuest(page, "/#/sources?view=videos");
  await expect(
    page.getByRole("heading", { name: "Study Room", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".study-video-card")).toHaveCount(6);
  const seen = new Set<string>();
  for (let index = 0; index < 9; index++) {
    await expect(page.locator(".video-page-count")).toHaveText(
      "Page " + (index + 1) + " of 9",
    );
    for (const id of await page
      .locator(".study-video-card")
      .evaluateAll((cards) =>
        cards.map((card) => (card as HTMLElement).dataset.scienceVideo!),
      ))
      seen.add(id);
    if (index < 8)
      await page
        .getByRole("button", { name: "Next videos", exact: true })
        .click();
  }
  expect(seen.size).toBe(50);
  await expect(
    page.getByRole("button", { name: "Next videos", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "All videos", exact: true }).click();
  expect(requests.length).toBeGreaterThan(0);
  expect(
    requests.every((url) =>
      /^https:\/\/i\.ytimg\.com\/vi\/[A-Za-z0-9_-]{11}\/mqdefault\.jpg$/.test(
        url,
      ),
    ),
  ).toBe(true);
  for (const card of await page.locator(".study-video-card").all()) {
    const id = await card.getAttribute("data-science-video");
    const cover = card.locator(".study-video-thumbnail");
    await cover.scrollIntoViewIfNeeded();
    await expect(card.locator(".study-video-poster")).toHaveAttribute(
      "data-thumbnail-state",
      "ready",
    );
    await expect(cover).toHaveAttribute(
      "src",
      `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
    );
    await expect(cover).toHaveAttribute("loading", "lazy");
    await expect(cover).toHaveAttribute("referrerpolicy", "no-referrer");
  }
  await page
    .getByRole("heading", { name: "Press play on a new idea" })
    .scrollIntoViewIfNeeded();
  const originalState = await page.evaluate(() => {
    const user = JSON.parse(localStorage.getItem("csl:state")!).users.find(
      (u: { id: string }) => u.id === "guest",
    );
    return { xp: user.xp, merits: user.merits, badges: user.badges };
  });
  await page.getByRole("button", { name: "Chemistry", exact: true }).click();
  await expect(page.locator(".study-video-card")).toHaveCount(6);
  await expect(page.locator(".study-video-count")).toContainText("10 of 50");
  await page.getByRole("button", { name: "Next videos", exact: true }).click();
  await expect(page.locator(".study-video-card")).toHaveCount(4);
  await expect(page.locator(".video-page-count")).toHaveText("Page 2 of 2");
  await page
    .getByRole("searchbox", { name: "Search science videos" })
    .fill("DNA");
  await expect(page.locator(".study-video-card")).toHaveCount(0);
  await expect(page.locator(".video-pagination")).toBeHidden();
  await expect(
    page.getByText("A different search might bloom", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Clear video filters", exact: true })
    .click();
  await page
    .getByRole("searchbox", { name: "Search science videos" })
    .fill(" dNa ");
  await expect(page.locator(".study-video-card")).toHaveCount(1);
  await expect(
    page.getByRole("link", { name: "Original video · DNA", exact: true }),
  ).toHaveAttribute("href", "https://www.youtube.com/watch?v=URUJD5NEXC8");
  await page
    .getByRole("button", { name: "Clear video filters", exact: true })
    .click();
  const watch = page.getByRole("button", { name: "Watch Cells", exact: true });
  await watch.click();
  const dialog = page.getByRole("dialog", { name: "Cells", exact: true });
  await expect(dialog.locator("iframe")).toHaveAttribute(
    "src",
    "https://www.youtube-nocookie.com/embed/ex0x-w00Uy4?rel=0&playsinline=1",
  );
  await expect(dialog.locator("iframe")).toHaveAttribute(
    "referrerpolicy",
    "strict-origin-when-cross-origin",
  );
  await expect(
    dialog.getByRole("link", { name: "Open on YouTube · Cells", exact: true }),
  ).toHaveAttribute("target", "_blank");
  await expect(dialog.getByRole("link", { name: /OpenStax/ })).toHaveAttribute(
    "href",
    "https://openstax.org/details/books/biology-2e",
  );
  await dialog
    .getByRole("button", { name: "Read Cells study notes", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Cells · study notes", exact: true }),
  ).toContainText("Supporting sources");
  await expect(dialog.locator("iframe")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(
    dialog.getByRole("button", { name: "Read Cells study notes", exact: true }),
  ).toBeFocused();
  // A busy browser can deliver the previous dialog's animation frame after
  // the student has already moved to another launcher. Closing must not
  // schedule a second focus restoration that steals that new selection.
  await page.evaluate(() => {
    const original = window.requestAnimationFrame;
    const frames: FrameRequestCallback[] = [];
    window.requestAnimationFrame = (callback) => {
      frames.push(callback);
      return -frames.length;
    };
    (
      window as unknown as { releaseVideoCloseFrames: () => void }
    ).releaseVideoCloseFrames = () => {
      window.requestAnimationFrame = original;
      for (const callback of frames) callback(performance.now());
    };
  });
  await page.keyboard.press("Escape");
  await expect(watch).toBeFocused();
  await expect(page.locator("iframe")).toHaveCount(0);
  const poster = page.getByRole("button", {
    name: "Play Cells video",
    exact: true,
  });
  await poster.focus();
  await page.evaluate(() => {
    (
      window as unknown as { releaseVideoCloseFrames: () => void }
    ).releaseVideoCloseFrames();
  });
  await expect(poster).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("iframe")).toHaveCount(1);
  await page.keyboard.press("Escape");
  try {
    await expect(poster).toBeFocused();
  } catch (failure) {
    const snapshot = await page.evaluate(() => ({
      documentFocused: document.hasFocus(),
      active: document.activeElement?.outerHTML.slice(0, 400),
      dialogs: [...document.querySelectorAll("dialog[open]")].map((node) =>
        node.getAttribute("aria-label"),
      ),
      dock: document
        .querySelector(".focus-dock")
        ?.getAttribute("data-collapsed"),
      posterActive:
        document.activeElement?.getAttribute("aria-label") ===
        "Play Cells video",
      route: location.hash,
    }));
    if (failure instanceof Error)
      failure.message += "\nVideo focus state: " + JSON.stringify(snapshot);
    throw failure;
  }
  const previousMain = await page.locator("#main").elementHandle();
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect
    .poll(() => previousMain!.evaluate((node) => node.isConnected))
    .toBe(false);
  await expect(poster).toBeFocused();
  await previousMain!.dispose();
  await expect(page).toHaveURL(/#\/sources\?view=videos$/);
  await context.setOffline(true);
  await watch.click();
  await expect(
    page.getByRole("dialog", { name: "Cells", exact: true }),
  ).toContainText("Connect to the internet");
  await expect(page.locator("iframe")).toHaveCount(0);
  await context.setOffline(false);
  await page
    .getByRole("button", { name: "Try loading the video", exact: true })
    .click();
  await expect(page.locator("iframe")).toHaveCount(1);
  await page.evaluate(() => {
    location.hash = "/island";
  });
  await expect(page.locator("iframe")).toHaveCount(0);
  await expect(
    page.getByRole("dialog", { name: "Cells", exact: true }),
  ).toHaveCount(0);
  expect(requests.length).toBeGreaterThan(0);
  expect(
    requests
      .filter((url) => !url.startsWith("https://i.ytimg.com/"))
      .every((url) =>
        url.startsWith("https://www.youtube-nocookie.com/embed/ex0x-w00Uy4"),
      ),
  ).toBe(true);
  expect(
    await page.evaluate(() => {
      const user = JSON.parse(localStorage.getItem("csl:state")!).users.find(
        (u: { id: string }) => u.id === "guest",
      );
      return { xp: user.xp, merits: user.merits, badges: user.badges };
    }),
  ).toEqual(originalState);
});

test("the video collection and new branding fit phones and every light and Dark palette", async ({
  page,
}) => {
  test.setTimeout(180000);
  await exploreAsGuest(page, "/#/sources?view=videos");
  await expect(page.locator(".study-video-card")).toHaveCount(6);
  const csp = await page
    .locator('meta[http-equiv="Content-Security-Policy"]')
    .getAttribute("content");
  expect(csp).toContain("frame-src 'self' https://www.youtube-nocookie.com;");
  expect(csp).toContain("script-src 'self';");
  expect(csp).toContain("img-src 'self' data: https://i.ytimg.com;");
  for (const width of [1280, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const theme of ["meadow", "aurora", "sunset"])
      for (const mode of ["light", "dark"]) {
        await page.evaluate(
          ({ theme, mode }) => {
            document.documentElement.dataset.theme = theme;
            document.documentElement.dataset.colorMode = mode;
          },
          { theme, mode },
        );
        await boundedPage(page);
        if (mode === "dark") await brightSurfaces(page, "#main");
        const audit = await new AxeBuilder({ page })
          .include("#main")
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze();
        expect(audit.violations).toEqual([]);
      }
    await page.screenshot({
      path: "/tmp/cozy-study-videos-dark-" + width + ".png",
      fullPage: true,
    });
  }
  const logos = page.locator("img.school-logo:visible");
  expect(await logos.count()).toBeGreaterThan(0);
  for (const image of await logos.all()) {
    await expect(image).toHaveAttribute("alt", "The Cozy Science Lab logo");
    expect(
      await image.evaluate(
        (image: HTMLImageElement) => image.complete && image.naturalWidth > 0,
      ),
    ).toBe(true);
  }
});

test("missing, placeholder and offline video covers keep clear working fallbacks", async ({
  page,
  context,
}) => {
  await page.route(
    "https://i.ytimg.com/vi/ex0x-w00Uy4/mqdefault.jpg",
    (route) =>
      route.fulfill({
        contentType: "image/svg+xml",
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="90"><rect width="120" height="90"/></svg>',
      }),
  );
  await page.route(
    "https://i.ytimg.com/vi/AHQGNb0zBgg/mqdefault.jpg",
    (route) =>
      route.fulfill({
        contentType: "image/jpeg",
        body: "An unavailable image fixture",
      }),
  );
  await page.route("https://www.youtube-nocookie.com/embed/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<!doctype html><title>Player fixture</title><p>Explicit test fixture</p>",
    }),
  );
  await exploreAsGuest(page, "/#/sources?view=videos");
  for (const id of ["ex0x-w00Uy4", "AHQGNb0zBgg"]) {
    const cover = page.locator(
      `[data-science-video="${id}"] .study-video-poster`,
    );
    await cover.scrollIntoViewIfNeeded();
    await expect(cover).toHaveAttribute("data-thumbnail-state", "unavailable");
    await expect(cover).toContainText("Preview unavailable");
    await expect(cover.locator("img")).toHaveCount(0);
  }
  await page
    .getByRole("button", { name: "Play Cells video", exact: true })
    .click();
  await expect(page.locator("iframe")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await context.setOffline(true);
  await page
    .getByRole("searchbox", { name: "Search science videos" })
    .fill("DNA");
  await expect(page.locator(".study-video-poster")).toContainText(
    "Connect to load cover",
  );
  await expect(page.locator(".study-video-thumbnail")).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Original video · DNA", exact: true }),
  ).toHaveAttribute("href", "https://www.youtube.com/watch?v=URUJD5NEXC8");
  await context.setOffline(false);
});
