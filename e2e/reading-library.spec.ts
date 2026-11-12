import { test, expect, exploreAsGuest } from "./fixtures";
import { decks } from "../src/data/catalog";
import { scienceFigures } from "../src/data/science-figures";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";

test("every topic has a complete guide with examples, explanations and supporting sources", async ({
  page,
}) => {
  test.setTimeout(120000);
  await exploreAsGuest(page, "/#/sources");
  for (const deck of decks) {
    await page
      .getByRole("searchbox", { name: "Search science references" })
      .fill(deck.name);
    await page
      .getByRole("button", {
        name: `Read ${deck.name} study guide`,
        exact: true,
      })
      .click();
    const dialog = page.getByRole("dialog", {
      name: `${deck.name} · study notes`,
      exact: true,
    });
    await expect(
      dialog.getByRole("heading", { name: "Words to keep", exact: true }),
    ).toBeVisible();
    await expect(
      dialog.getByRole("heading", { name: "Check your thinking", exact: true }),
    ).toBeVisible();
    await dialog.locator(".study-check summary").click();
    await expect(dialog.locator(".study-check p")).toBeVisible();
    await expect(dialog.locator(".study-citations a")).toHaveCount(2);
    if (deck.id === "life.cells") {
      await page.setViewportSize({ width: 320, height: 740 });
      expect(
        (
          await new AxeBuilder({ page })
            .include("dialog")
            .withTags(["wcag2a", "wcag2aa"])
            .analyze()
        ).violations,
      ).toEqual([]);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({ path: "/tmp/cozy-reading-guide-phone.png" });
      await page.emulateMedia({ media: "print" });
      await expect(dialog.locator(".study-document")).toBeVisible();
      await expect(page.locator("#app")).toBeHidden();
      await page.emulateMedia({ media: "screen" });
    }
    await dialog
      .getByRole("button", { name: "Close and return to page", exact: true })
      .click();
  }
  await page.emulateMedia({ media: "print" });
  await expect(page.locator("#app")).toBeVisible();
  await page.emulateMedia({ media: "screen" });
});

test("the full periodic table supports accurate lookup, family filters and accessible phone cards", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await exploreAsGuest(page, "/#/sources");
  await page
    .getByRole("button", { name: "Periodic table", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Periodic table", exact: true })
    .hover();
  expect(
    (
      await new AxeBuilder({ page })
        .include(".reading-shelves")
        .withTags(["wcag2a", "wcag2aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await expect(page.locator(".element-count")).toHaveText(
    "118 of 118 elements",
  );
  const search = page.getByRole("searchbox", {
    name: "Find an element",
    exact: true,
  });
  await search.fill("Fe");
  await expect(page.locator(".element-count")).toHaveText("1 of 118 elements");
  await page.getByRole("button", { name: "26 Iron (Fe)", exact: true }).click();
  await expect(
    page
      .getByRole("region", { name: "Selected element", exact: true })
      .getByRole("heading", { name: "Iron", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("dialog", { name: "Iron · element guide", exact: true })
    .getByRole("button", { name: "Close and return to page", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "26 Iron (Fe)", exact: true }),
  ).toBeFocused();
  await page
    .getByRole("button", { name: "Clear element filters", exact: true })
    .click();
  await page
    .getByLabel("Filter by element family", { exact: true })
    .selectOption("noble");
  await expect(page.locator(".element-count")).toHaveText("7 of 118 elements");
  await page
    .getByRole("button", { name: "118 Oganesson (Og)", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Selected element", exact: true }),
  ).toContainText("properties remain uncertain");
  expect(
    (
      await new AxeBuilder({ page })
        .include("dialog")
        .withTags(["wcag2a", "wcag2aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.screenshot({ path: "/tmp/cozy-element-guide-phone.png" });
  await page
    .getByRole("dialog", { name: "Oganesson · element guide", exact: true })
    .getByRole("button", { name: "Close and return to page", exact: true })
    .click();
  await search.fill("not-an-element");
  await expect(
    page.getByRole("heading", { name: "No elements match yet", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Clear element filters", exact: true })
    .click();
  expect(
    (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())
      .violations,
  ).toEqual([]);
  await page.screenshot({ path: "/tmp/cozy-periodic-cards-phone.png" });
  await page.getByRole("button", { name: "Table view", exact: true }).click();
  expect(
    (
      await new AxeBuilder({ page })
        .include(".element-view-controls")
        .withTags(["wcag2a", "wcag2aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  expect(
    await page
      .locator(".periodic-scroll")
      .evaluate((e) => e.scrollWidth > e.clientWidth),
  ).toBe(true);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Periodic table", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("science models retain keyboard focus, explain their limits and switch a working circuit", async ({
  page,
}) => {
  await exploreAsGuest(page, "/#/sources");
  await page
    .getByRole("button", { name: "Illustrations", exact: true })
    .click();
  for (const figure of scienceFigures) {
    await page
      .getByRole("button", { name: `Explore ${figure.title}`, exact: true })
      .click();
    const dialog = page.getByRole("dialog", {
      name: figure.title,
      exact: true,
    });
    await expect(
      dialog.getByRole("img", { name: figure.title, exact: true }),
    ).toBeVisible();
    await expect(dialog.locator(".figure-model-note")).toHaveText(figure.limit);
    const part = dialog.getByRole("button", {
      name: figure.parts[0].name,
      exact: true,
    });
    await part.click();
    await expect(part).toBeFocused();
    await expect(part).toHaveAttribute("aria-pressed", "true");
    await expect(dialog.locator(".illustration-explanation")).toContainText(
      figure.parts[0].explanation,
    );
    if (figure.id === "plant-cell")
      expect(
        (
          await new AxeBuilder({ page })
            .include(".illustration-parts")
            .withTags(["wcag2a", "wcag2aa"])
            .analyze()
        ).violations,
      ).toEqual([]);
    if (figure.id === "circuit") {
      await dialog
        .getByRole("button", { name: "Close the switch", exact: true })
        .click();
      await expect(dialog.getByRole("status")).toContainText("lamp is lit");
      await dialog
        .getByRole("button", { name: "Open the switch", exact: true })
        .click();
      await expect(dialog.getByRole("status")).toContainText("lamp is off");
      await page.setViewportSize({ width: 320, height: 740 });
      expect(
        (
          await new AxeBuilder({ page })
            .include("dialog")
            .withTags(["wcag2a", "wcag2aa"])
            .analyze()
        ).violations,
      ).toEqual([]);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({ path: "/tmp/cozy-circuit-learning-phone.png" });
    }
    await dialog
      .getByRole("button", { name: "Close and return to page", exact: true })
      .click();
  }
});

test("all five handbooks are actual PDFs and remain readable offline, including PDF viewer ranges", async ({
  page,
  context,
}) => {
  await exploreAsGuest(page, "/#/sources");
  await page
    .getByRole("button", { name: "PDF documents", exact: true })
    .click();
  const links = page.getByRole("link", {
    name: /^Download .+ study handbook PDF$/,
  });
  await expect(links).toHaveCount(5);
  const urls = await links.evaluateAll((nodes) =>
    nodes.map((n) => (n as HTMLAnchorElement).href),
  );
  for (const url of urls) {
    const response = await page.request.get(url);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("application/pdf");
    expect((await response.body()).subarray(0, 5).toString()).toBe("%PDF-");
  }
  const downloadEvent = page.waitForEvent("download");
  await links.first().click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe("cozy-life-study-handbook.pdf");
  expect(
    (await readFile((await download.path())!)).subarray(0, 5).toString(),
  ).toBe("%PDF-");
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
  await expect(
    page.getByRole("button", { name: "PDF documents", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  for (const url of urls) {
    const result = await page.evaluate(async (href) => {
      const r = await fetch(href);
      return {
        status: r.status,
        header: new TextDecoder().decode((await r.arrayBuffer()).slice(0, 5)),
      };
    }, url);
    expect(result).toEqual({ status: 200, header: "%PDF-" });
  }
  const range = await page.evaluate(async (href) => {
    const r = await fetch(href, { headers: { Range: "bytes=0-31" } });
    const b = await r.arrayBuffer();
    return {
      status: r.status,
      size: b.byteLength,
      header: new TextDecoder().decode(b.slice(0, 5)),
      range: r.headers.get("content-range"),
    };
  }, urls[0]);
  expect(range).toMatchObject({ status: 206, size: 32, header: "%PDF-" });
  expect(range.range).toMatch(/^bytes 0-31\//);
  await page
    .getByRole("button", { name: "Study notes & sources", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Read Cells study guide", exact: true })
    .click();
  await expect(
    page
      .getByRole("dialog", { name: "Cells · study notes", exact: true })
      .getByRole("heading", { name: "Words to keep", exact: true }),
  ).toBeVisible();
  await context.setOffline(false);
});
