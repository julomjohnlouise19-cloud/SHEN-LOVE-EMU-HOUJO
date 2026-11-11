import { copyFile } from "node:fs/promises";
import { test, expect, signIn, signOut, users } from "./cloud-fixtures";
import AxeBuilder from "@axe-core/playwright";
test("account guide steps can be completed, stay dismissed and replay from help", async ({
  page,
}) => {
  await page.goto("./");
  await signIn(page);
  const guide = page.getByRole("region", {
    name: "How to use your lab",
    exact: true,
  });
  await expect(guide).toBeVisible();
  for (let n = 0; n < 3; n++)
    await guide.getByRole("button", { name: "Next step", exact: true }).click();
  await expect(guide).toContainText("Your voice belongs here");
  await guide
    .getByRole("button", { name: "Ready to explore", exact: true })
    .click();
  await expect(guide).toHaveCount(0);
  await page.reload();
  await expect(guide).toHaveCount(0);
  await page.getByRole("button", { name: /How it works/ }).click();
  await expect(
    page.getByRole("dialog", {
      name: "Your guide to The Cozy Science Lab",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Close and return to page", exact: true })
    .click();
});
test("a private idea reaches the teacher inbox and its reply reaches the author", async ({
  page,
  backend,
}, testInfo) => {
  await page.goto("./");
  await signIn(page);
  await page.goto("#/suggestions");
  await page
    .getByLabel("Suggestion title", { exact: true })
    .fill("More cell examples");
  await page
    .getByLabel("Your suggestion", { exact: true })
    .fill("Could we add a few everyday examples to the cells deck?");
  await page
    .getByLabel("About this science deck", { exact: true })
    .selectOption("life.cells");
  await page
    .getByRole("button", { name: "Send to my teachers", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "More cell examples", exact: true }),
  ).toBeVisible();
  expect(backend.suggestions).toHaveLength(1);
  await signOut(page);
  await signIn(page, "student2");
  await page.goto("#/suggestions");
  await expect(
    page.getByRole("heading", { name: "More cell examples", exact: true }),
  ).toHaveCount(0);
  await signOut(page);
  await signIn(page, "teacher");
  await page
    .getByRole("link", { name: "Suggestion inbox", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Review & reply", exact: true })
    .click();
  await page
    .getByLabel("Suggestion progress", { exact: true })
    .selectOption("done");
  await page
    .getByLabel("Reply to the student", { exact: true })
    .fill("Thank you! We will include more cell examples in class.");
  await page
    .getByRole("button", { name: "Save suggestion reply", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(backend.suggestions[0]).toMatchObject({ status: "done", version: 2 });
  await signOut(page);
  await signIn(page);
  await page.goto("#/suggestions");
  await expect(
    page.getByText("Thank you! We will include more cell examples in class.", {
      exact: true,
    }),
  ).toBeVisible();
  await page.setViewportSize({ width: 320, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(
    (
      await new AxeBuilder({ page })
        .include(".suggestions-page")
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath("suggestion-box-mobile.png"),
    fullPage: true,
  });
  await copyFile(
    testInfo.outputPath("suggestion-box-mobile.png"),
    "/tmp/cozy-suggestion-box-mobile.png",
  );
});
test("missing inbox upgrade keeps drafts honest and recoverable", async ({
  page,
  backend,
}) => {
  backend.suggestionsReady = false;
  await page.goto("./");
  await signIn(page);
  await page.goto("#/suggestions");
  await expect(
    page.getByText(/class inbox is waiting for its service update/),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Send to my teachers", exact: true }),
  ).toBeDisabled();
  await page
    .getByLabel("Suggestion title", { exact: true })
    .fill("A saved draft");
  await page
    .getByLabel("Your suggestion", { exact: true })
    .fill("Please keep this draft until the classroom inbox is ready.");
  await page
    .getByRole("button", { name: "Save draft on this device", exact: true })
    .click();
  await page.reload();
  await expect(
    page.getByLabel("Suggestion title", { exact: true }),
  ).toHaveValue("A saved draft");
  expect(backend.suggestions).toHaveLength(0);
  backend.suggestionsReady = true;
  await page
    .getByRole("button", { name: "Refresh suggestions", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Send to my teachers", exact: true })
    .click();
  await expect.poll(() => backend.suggestions.length).toBe(1);
});
test("teacher availability and category choices save, persist and change the student shelf", async ({
  page,
  backend,
}) => {
  await page.goto("./");
  await signIn(page, "teacher");
  await page
    .getByRole("link", { name: "Stock & pricing", exact: true })
    .click();
  const row = page.getByRole("row").filter({ hasText: "Little idea pencils" });
  await row.getByRole("button", { name: "Edit supply", exact: true }).click();
  await page
    .getByLabel("Category", { exact: true })
    .fill("Classroom essentials");
  await page.getByLabel("Stock available", { exact: true }).fill("0");
  await page
    .getByLabel("Available on the class shelf", { exact: true })
    .uncheck();
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(backend.items.find((item) => item.id === "pencil")).toMatchObject({
    category: "Classroom essentials",
    stock: 0,
    active: false,
  });
  await page.reload();
  await row.getByRole("button", { name: "Edit supply", exact: true }).click();
  await expect(
    page.getByLabel("Available on the class shelf", { exact: true }),
  ).not.toBeChecked();
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await signOut(page);
  await signIn(page);
  await page.goto("#/shop");
  await expect(
    page.getByRole("button", { name: /Reserve Little idea pencils/ }),
  ).toHaveCount(0);
  expect(backend.credits[users[0].id]).toBe(200);
  await signOut(page);
  await signIn(page, "teacher");
  await page
    .getByRole("link", { name: "Stock & pricing", exact: true })
    .click();
  await row.getByRole("button", { name: "Edit supply", exact: true }).click();
  await page
    .getByLabel("Available on the class shelf", { exact: true })
    .check();
  await page.getByLabel("Stock available", { exact: true }).fill("3");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await signOut(page);
  await signIn(page);
  await page.goto("#/shop");
  await expect(
    page.getByRole("button", { name: /Reserve Little idea pencils/ }),
  ).toBeEnabled();
});
test("deck sources give honest provenance and safe external reading links", async ({
  page,
}) => {
  await page.goto("./");
  await signIn(page);
  await page.goto("#/branch/life");
  await page
    .getByRole("button", { name: "Sources for Cells", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("not presented as quotations");
  await expect(
    dialog.getByRole("link", {
      name: "Open supporting reference ↗",
      exact: true,
    }),
  ).toHaveCount(2);
  expect(await dialog.locator("a").first().getAttribute("href")).toContain(
    "openstax.org",
  );
  await page.setViewportSize({ width: 320, height: 844 });
  expect(
    (
      await new AxeBuilder({ page })
        .include("dialog")
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
