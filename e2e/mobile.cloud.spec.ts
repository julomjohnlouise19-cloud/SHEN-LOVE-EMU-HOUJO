import { test, expect, signIn, signOut, users } from "./cloud-fixtures";
import type { Backend } from "./cloud-fixtures";
import AxeBuilder from "@axe-core/playwright";

test.use({
  viewport: { width: 320, height: 568 },
  isMobile: true,
  hasTouch: true,
});

function history(backend: Backend) {
  backend.rows = [
    {
      id: "10000000-0000-4000-8000-000000000001",
      user_id: users[0].id,
      display_name: "Student One",
      grade: 8,
      section: "Curiosity",
      deck_id: "life.cells",
      level: "medium",
      mode: "practice",
      correct: 6,
      total: 8,
      received_at: new Date().toISOString(),
      responses: [],
    },
  ];
}
async function fit(page: import("@playwright/test").Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(
    await page.locator("main").evaluate((main) =>
      [...main.querySelectorAll("button,input,select,textarea")]
        .filter((e) => e.getClientRects().length)
        .every((e) => {
          const r = e.getBoundingClientRect();
          return r.left >= -1 && r.right <= innerWidth + 1;
        }),
    ),
  ).toBe(true);
}

test("mobile account fields stay readable and usable through resizing, guide and profile", async ({
  page,
  backend,
}) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Sign in", exact: true }).tap();
  const dialog = page.getByRole("dialog");
  const email = page.getByRole("textbox", { name: "Email", exact: true });
  await expect(email).toBeVisible();
  expect((await email.boundingBox())!.y).toBeLessThan(500);
  expect(await email.evaluate((e) => getComputedStyle(e).fontSize)).toBe(
    "16px",
  );
  const bounds = (await dialog.boundingBox())!;
  await page.touchscreen.tap(bounds.x + 3, bounds.y + bounds.height / 2);
  await expect(dialog).toBeVisible();
  await email.fill(users[0].email);
  await page.getByLabel("Password", { exact: true }).fill("cloud-password-123");
  await page.getByRole("button", { name: "Show password", exact: true }).tap();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute(
    "type",
    "text",
  );
  await page.setViewportSize({ width: 320, height: 390 });
  await expect(email).toHaveValue(users[0].email);
  await expect(page.getByLabel("Password", { exact: true })).toHaveValue(
    "cloud-password-123",
  );
  await page.getByRole("button", { name: "Welcome back", exact: true }).tap();
  await expect(
    page.getByRole("button", { name: "Log out", exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 320, height: 568 });
  await page.getByRole("button", { name: "Next step", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", {
      name: "Think, answer, understand",
      exact: true,
    }),
  ).toBeFocused();
  await page
    .getByRole("button", { name: "Hide guide for now", exact: true })
    .tap();
  await page.getByRole("button", { name: "Open scientist profile" }).tap();
  await page
    .getByLabel("A little about me", { exact: true })
    .fill("Curious about life under the sea.");
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(
    page.getByLabel("A little about me", { exact: true }),
  ).toHaveValue("Curious about life under the sea.");
  expect(
    await page
      .getByRole("dialog")
      .locator(".modal-chrome")
      .evaluate((e) => e.getBoundingClientRect().height),
  ).toBeLessThan(100);
  await page.getByRole("button", { name: "Save my style", exact: true }).tap();
  await expect
    .poll(() => backend.preferences[users[0].id]?.bio)
    .toBe("Curious about life under the sea.");
  expect(backend.signupCalls + backend.resendCalls + backend.recoverCalls).toBe(
    0,
  );
});

test("teacher stock and availability can be edited by touch and survive rotation and reload", async ({
  page,
  backend,
}) => {
  await page.goto("./");
  await signIn(page, "teacher");
  await page.goto("#/teacher/shop");
  const row = page.getByRole("row").filter({ hasText: "Little idea pencils" });
  await expect(row.getByText("Availability", { exact: true })).toBeVisible();
  await fit(page);
  await row.getByRole("button", { name: "Edit supply", exact: true }).tap();
  await page.getByLabel("Stock available", { exact: true }).fill("7");
  await page
    .getByLabel("Available on the class shelf", { exact: true })
    .uncheck();
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.getByLabel("Stock available", { exact: true })).toHaveValue(
    "7",
  );
  await page.setViewportSize({ width: 320, height: 568 });
  expect(
    (
      await new AxeBuilder({ page })
        .include("dialog")
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.getByRole("button", { name: "Save changes", exact: true }).tap();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(backend.items.find((i) => i.id === "pencil")).toMatchObject({
    stock: 7,
    active: false,
  });
  await page.reload();
  await row.getByRole("button", { name: "Edit supply", exact: true }).tap();
  await expect(page.getByLabel("Stock available", { exact: true })).toHaveValue(
    "7",
  );
  await expect(
    page.getByLabel("Available on the class shelf", { exact: true }),
  ).not.toBeChecked();
  await page.getByRole("button", { name: "Close and return to page" }).tap();
  await row.scrollIntoViewIfNeeded();
  await page.screenshot({ path: "/tmp/cozy-mobile-teacher-stock.png" });
});

test("every teacher section fits phone, tablet and landscape with long classroom content", async ({
  page,
  backend,
}) => {
  test.setTimeout(120_000);
  history(backend);
  backend.profiles[0].display_name =
    "AStudentWithAVeryLongUnbrokenNameForMobileLayout";
  backend.orders = [
    {
      id: "20000000-0000-4000-8000-000000000001",
      user_id: users[0].id,
      display_name: "Student One",
      grade: 8,
      section: "Curiosity",
      item_id: "pencil",
      item_name: "Little idea pencils",
      price: 10,
      code: "COZY-123456",
      status: "reserved",
      created_at: new Date().toISOString(),
    },
  ];
  await page.goto("./");
  await signIn(page, "teacher");
  const sections = [
    "overview",
    "students",
    "reports",
    "health",
    "shop",
    "claims",
    "content",
    "settings",
    "activity",
    "suggestions",
  ];
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 768, height: 1024 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    for (const section of sections) {
      const path = section === "overview" ? "/teacher" : `/teacher/${section}`;
      await page.goto(`#${path}`);
      await expect(page.locator("main h1")).toBeVisible();
      await expect(page.locator(".teacher-loading")).toHaveCount(0);
      // The location breadcrumb must match before measuring an asynchronous page.
      await expect(page.locator(".page-navigation")).toContainText(
        section === "overview"
          ? "Teacher studio"
          : (
              {
                students: "Scientists",
                reports: "Class reports",
                health: "Record care",
                shop: "Stock & pricing",
                claims: "Claims desk",
                content: "Science cards",
                settings: "Lab settings",
                activity: "Activity history",
                suggestions: "Suggestion inbox",
              } as Record<string, string>
            )[section],
      );
      await fit(page);
      const edit = (
        {
          students: "Edit profile",
          reports: "Answers & feedback",
          claims: "Verify collection",
          content: "Edit card",
        } as Record<string, string>
      )[section];
      if (viewport.width === 320 && edit) {
        await page
          .getByRole("button", { name: edit, exact: true })
          .first()
          .tap();
        const dialog = page.getByRole("dialog");
        await expect(dialog).toBeVisible();
        expect(
          await dialog.evaluate(
            (node) => node.getBoundingClientRect().right <= innerWidth,
          ),
        ).toBe(true);
        expect(
          await dialog.evaluate((node) =>
            [
              ...node.querySelectorAll<HTMLInputElement>(
                "input,textarea,select",
              ),
            ]
              .filter((e) => e.getClientRects().length && e.type !== "checkbox")
              .every((e) => parseFloat(getComputedStyle(e).fontSize) >= 16),
          ),
        ).toBe(true);
        await page
          .getByRole("button", { name: "Close and return to page" })
          .tap();
      }
    }
  }
});

test("phone record cards preserve selection, archive, restore and student answer access", async ({
  page,
  backend,
}) => {
  history(backend);
  const evidence = JSON.stringify(backend.rows);
  await page.goto("./");
  await signIn(page, "teacher");
  await page.goto("#/teacher/reports");
  const all = page.getByLabel("Select all records on this page", {
    exact: true,
  });
  await all.locator("..").tap();
  await expect(all).toBeChecked();
  await page
    .getByRole("button", { name: "Archive selected", exact: true })
    .tap();
  await page
    .getByLabel("Reason for this record change", { exact: true })
    .fill("Reviewed classroom evidence on mobile");
  await page.getByRole("button", { name: "Save changes", exact: true }).tap();
  await expect
    .poll(() => Object.values(backend.labels).filter((r) => r.archived).length)
    .toBe(1);
  await page
    .getByLabel("Filter by record state", { exact: true })
    .selectOption("archived");
  await page.getByRole("button", { name: "Apply filters", exact: true }).tap();
  await page.getByRole("button", { name: "Restore record", exact: true }).tap();
  await page
    .getByLabel("Reason for this record change", { exact: true })
    .fill("Return the record to normal classroom review");
  await page.getByRole("button", { name: "Save changes", exact: true }).tap();
  await expect
    .poll(() => Object.values(backend.labels).filter((r) => r.archived).length)
    .toBe(0);
  expect(JSON.stringify(backend.rows)).toBe(evidence);
  await signOut(page);
  await signIn(page);
  await page.goto("#/records");
  const row = page.getByRole("row").filter({ hasText: "Student One" });
  await expect(row.getByText("Score", { exact: true })).toBeVisible();
  await fit(page);
  await row.getByRole("button", { name: /View answers for Student One/ }).tap();
  await expect(page.getByRole("dialog")).toBeVisible();
});
