import { test, expect, exploreAsGuest } from "./fixtures";
import { decks } from "../src/data/catalog";
import { referencesFor } from "../src/data/references";
import AxeBuilder from "@axe-core/playwright";

test.use({
  viewport: { width: 320, height: 700 },
  isMobile: true,
  hasTouch: true,
});

test("every deck has readable in-app notes without opening a publisher", async ({
  page,
  context,
}) => {
  test.setTimeout(90_000);
  await exploreAsGuest(page, "/#/sources");
  for (const deck of decks) {
    await page
      .getByRole("searchbox", { name: "Search science references" })
      .fill(deck.name);
    await page
      .getByRole("button", { name: `Sources for ${deck.name}`, exact: true })
      .tap();
    const dialog = page.getByRole("dialog");
    await dialog.locator("summary").tap();
    await expect(
      dialog.locator(".topic-reading-notes li").first(),
    ).toBeVisible();
    expect(
      await dialog.locator(".topic-reading-notes li").count(),
    ).toBeGreaterThan(0);
    await expect(dialog).toContainText("lab-authored learning notes");
    await expect(
      dialog.getByRole("link", { name: /^Open .+ from / }),
    ).toHaveCount(2);
    await expect(page).toHaveURL(/#\/sources$/);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.getByRole("button", { name: "Close and return to page" }).tap();
  }
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise((resolve) =>
        navigator.serviceWorker.addEventListener("controllerchange", resolve, {
          once: true,
        }),
      );
  });
  await context.setOffline(true);
  await page.reload();
  await page
    .getByRole("searchbox", { name: "Search science references" })
    .fill("Cells");
  await page
    .getByRole("button", { name: "Sources for Cells", exact: true })
    .tap();
  await page.getByRole("dialog").locator("summary").tap();
  await expect(
    page.getByRole("dialog").getByText(/The nucleus holds most DNA/),
  ).toBeVisible();
  await context.setOffline(false);
});

test("source filters explain empty results, reset and keep the mobile reading controls accessible", async ({
  page,
}) => {
  await exploreAsGuest(page, "/#/sources");
  const search = page.getByRole("searchbox", {
    name: "Search science references",
  });
  await page
    .getByLabel("Filter sources by science branch")
    .selectOption("physics");
  await expect(page.locator(".reading-count")).toHaveText(
    `${decks.filter((d) => d.branch === "physics").length} of 27 science decks`,
  );
  await search.fill("NoSuchScienceDeck");
  await expect(
    page.getByRole("heading", { name: "Let’s try another science idea" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear filters", exact: true }).tap();
  await expect(search).toBeFocused();
  await expect(page.locator(".reading-count")).toHaveText(
    "27 of 27 science decks",
  );
  await page
    .getByRole("button", { name: "Sources for Cells", exact: true })
    .tap();
  const dialog = page.getByRole("dialog");
  await dialog.locator("summary").tap();
  await expect(dialog.locator(".topic-reading-notes li").first()).toBeVisible();
  expect(
    (
      await new AxeBuilder({ page })
        .include("dialog")
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.screenshot({
    path: "/tmp/cozy-reading-sources-phone.png",
    fullPage: false,
  });
});

test("citations can be selected when clipboard access fails and official links use this tab", async ({
  page,
  context,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          throw new Error("Clipboard denied in this test browser");
        },
      },
    });
  });
  const curriculum = referencesFor("life.cells")[1];
  await exploreAsGuest(page, "/#/sources");
  await page
    .getByRole("button", { name: "Sources for Cells", exact: true })
    .tap();
  await page
    .getByRole("button", {
      name: `Copy citation for ${curriculum.title}`,
      exact: true,
    })
    .tap();
  const copy = page.getByRole("dialog", {
    name: "Keep this source",
    exact: true,
  });
  const value = copy.getByLabel("Source citation and address");
  await expect(value).toHaveValue(
    `${curriculum.publisher}. ${curriculum.title}. ${curriculum.url}`,
  );
  await copy
    .getByRole("button", { name: "Select citation", exact: true })
    .tap();
  expect(
    await value.evaluate((e) => {
      const field = e as HTMLTextAreaElement;
      return field.selectionEnd - field.selectionStart === field.value.length;
    }),
  ).toBe(true);
  await copy.getByRole("button", { name: "Close and return to page" }).tap();
  const source = page.getByRole("link", {
    name: `Open ${curriculum.title} from ${curriculum.publisher}`,
  });
  await expect(source).toHaveAttribute("href", curriculum.url);
  expect(await source.getAttribute("target")).toBeNull();
  expect(curriculum.url).toMatch(/Science-CG.+\.pdf$/);
  await page.route(curriculum.url, (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<title>Publisher navigation fixture</title><p>Official reading destination test.</p>",
    }),
  );
  await source.tap();
  await expect(page).toHaveURL(curriculum.url);
  expect(context.pages()).toHaveLength(1);
});
