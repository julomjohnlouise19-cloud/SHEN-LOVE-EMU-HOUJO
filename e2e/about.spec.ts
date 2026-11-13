import { test, expect, exploreAsGuest } from "./fixtures";
import AxeBuilder from "@axe-core/playwright";

const introduction =
  "Hello, Scientists! We are the Grade 10-SSC researchers. We are excited to introduce the people behind this research. We worked together to develop this study, share ideas, gather information, and make this project possible. Each of us played an important role in completing this research. Get to know the student researchers who put their time, effort, and dedication into making this project!";

async function loadPortraits(page: import("@playwright/test").Page) {
  const photos = page.locator(".researcher-photo");
  await expect(photos).toHaveCount(7);
  for (const photo of await photos.all()) {
    await photo.scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        photo.evaluate(
          (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
        ),
      )
      .toBe(true);
  }
}

test("About us opens on the welcome page with seven real portraits and returns without navigating", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "A little curiosity starts here." }),
  ).toBeVisible();
  const url = page.url();
  const trigger = page.getByRole("button", { name: "About us", exact: true });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "About us", exact: true });
  await expect(dialog.locator(".about-intro-copy")).toHaveText(introduction);
  await expect(dialog.getByRole("article")).toHaveCount(7);
  for (const name of [
    "Tristan T. Andales",
    "Shen B. Curiba",
    "Athena Daivy S. Vitos",
    "Princess Angel P. Canino",
    "Shane Pearl M. Delicano",
    "John Louise C. Julom",
    "Romer Xyriel C. Dumgog",
  ])
    await expect(
      dialog.getByRole("heading", { name, exact: true }),
    ).toHaveCount(1);
  expect(page.url()).toBe(url);
  await loadPortraits(page);
  await dialog
    .getByRole("button", { name: "Read all bios", exact: true })
    .click();
  await expect(dialog.locator(".researcher-bio[open]")).toHaveCount(7);
  await dialog
    .getByRole("button", { name: "Close all bios", exact: true })
    .click();
  await expect(dialog.locator(".researcher-bio[open]")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  expect(page.url()).toBe(url);
  await trigger.press("Enter");
  await expect(dialog).toBeVisible();
  await page.screenshot({ path: "/tmp/cozy-about-desktop.png" });
  await page.setViewportSize({ width: 1440, height: 2600 });
  await loadPortraits(page);
  await dialog.evaluate((node) => (node.scrollTop = 0));
  await page.screenshot({ path: "/tmp/cozy-about-team-overview.png" });
  await page.setViewportSize({ width: 1280, height: 720 });
  await dialog
    .getByRole("button", { name: "Back to the website", exact: true })
    .click();
  await expect(trigger).toBeFocused();
});

test("About us is available within the lab and its portraits and bios remain readable offline", async ({
  page,
  context,
}) => {
  await exploreAsGuest(page);
  await page.goto("#/island");
  const url = page.url();
  const balance = await page.locator(".balance-pill").textContent();
  const trigger = page
    .locator(".footer")
    .getByRole("button", { name: "About us", exact: true });
  await trigger.click();
  await loadPortraits(page);
  const photoPaths = await page
    .locator(".researcher-photo")
    .evaluateAll((images) =>
      images.map((img) => (img as HTMLImageElement).src),
    );
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await expect
    .poll(() =>
      page.evaluate(async (paths) => {
        const cached = await Promise.all(
          paths.map((path) => caches.match(path)),
        );
        return cached.every(Boolean);
      }, photoPaths),
    )
    .toBe(true);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Close and return to page", exact: true })
    .click();
  await expect(trigger).toBeFocused();
  expect(page.url()).toBe(url);
  expect(await page.locator(".balance-pill").textContent()).toBe(balance);
  await context.setOffline(true);
  await page.reload();
  await trigger.click();
  await loadPortraits(page);
  await page
    .getByRole("dialog")
    .getByText("Get to know Shen", { exact: true })
    .click();
  await expect(
    page.getByRole("dialog").getByText(/I love reading novels/),
  ).toBeVisible();
  expect(page.url()).toBe(url);
});

test("the About us panel is accessible on a small phone and closes from the mobile menu", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "A little curiosity starts here." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "About us", exact: true }),
  ).toBeInViewport();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "/tmp/cozy-about-welcome-phone.png" });
  await page
    .getByRole("button", { name: "Explore as guest", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Log out", exact: true }),
  ).toBeVisible();
  const url = page.url();
  const menu = page.getByRole("button", {
    name: "Toggle navigation",
    exact: true,
  });
  await menu.click();
  await page
    .locator("#lab-sidebar")
    .getByRole("button", { name: "About us", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "About us", exact: true });
  await expect(dialog).toBeVisible();
  expect(
    (
      await new AxeBuilder({ page })
        .include(".about-dialog")
        .withTags(["wcag2a", "wcag2aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  expect(
    await dialog.evaluate((node) => node.scrollWidth <= node.clientWidth),
  ).toBe(true);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await dialog.getByText("Get to know Tristan", { exact: true }).click();
  await expect(
    dialog.getByText(/I love working out in my free time/),
  ).toBeVisible();
  await page.screenshot({ path: "/tmp/cozy-about-phone.png" });
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(
    dialog.getByRole("button", {
      name: "Close and return to page",
      exact: true,
    }),
  ).toBeInViewport();
  await dialog
    .getByRole("button", { name: "Close and return to page", exact: true })
    .click();
  expect(page.url()).toBe(url);
  await expect(
    page.getByRole("button", { name: "Log out", exact: true }),
  ).toBeVisible();
});
