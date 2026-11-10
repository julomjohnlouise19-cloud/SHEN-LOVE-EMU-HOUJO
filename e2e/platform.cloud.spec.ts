import { test, expect, signIn, signOut, users } from "./cloud-fixtures";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync, readdirSync } from "node:fs";
import type { Question } from "../src/core/types";
const questions = readdirSync("src/data/questions").flatMap((dir) =>
  readdirSync(`src/data/questions/${dir}`).flatMap(
    (file) =>
      JSON.parse(
        readFileSync(`src/data/questions/${dir}/${file}`, "utf8"),
      ) as Question[],
  ),
);

test("teacher stock edits reach the class shelf and verified claims", async ({
  page,
  backend,
}) => {
  await page.goto("./");
  await signIn(page, "teacher");
  await expect(
    page.getByRole("heading", { name: "Teacher studio", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Stock & pricing", exact: true })
    .click();
  const row = page.getByRole("row").filter({ hasText: "Little idea pencils" });
  await row.getByRole("button", { name: "Edit supply", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Supply name", { exact: true })
    .fill("Discovery pencils");
  await dialog.getByLabel("Price in class credits", { exact: true }).fill("42");
  await dialog.getByLabel("Stock available", { exact: true }).fill("2");
  await dialog
    .getByRole("button", { name: "Save changes", exact: true })
    .click();
  await expect(
    page.getByRole("cell", { name: /Discovery pencils/ }),
  ).toBeVisible();
  expect(backend.items.find((i) => i.id === "pencil")).toMatchObject({
    name: "Discovery pencils",
    price: 42,
    stock: 2,
  });
  await signOut(page);
  await signIn(page);
  await page.goto("#/shop");
  await page
    .getByRole("button", {
      name: "Reserve Discovery pencils for 42 credits",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Reserve for 42 credits", exact: true })
    .click();
  await expect.poll(() => backend.orders.length).toBe(1);
  expect(backend.credits[users[0].id]).toBe(158);
  expect(backend.items.find((i) => i.id === "pencil")!.stock).toBe(1);
  const code = backend.orders[0].code;
  await expect(page.getByText(code, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await signOut(page);
  await signIn(page, "teacher");
  await page.getByRole("link", { name: "Claims desk", exact: true }).click();
  await page
    .getByRole("button", { name: "Verify collection", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("Student’s claim code", { exact: true })
    .fill(code);
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect.poll(() => backend.orders[0].status).toBe("collected");
  await expect(
    page.getByRole("cell", { name: "collected", exact: true }),
  ).toBeVisible();
});

test("teacher profiles, credit reasons, exports and activity stay editable", async ({
  page,
  backend,
}) => {
  await page.goto("./");
  await signIn(page, "teacher");
  await page.getByRole("link", { name: "Scientists", exact: true }).click();
  await page
    .getByRole("row")
    .filter({ hasText: "Student One" })
    .getByRole("button", { name: "Edit profile", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Name", { exact: true }).fill("Jane Scientist");
  await dialog.getByLabel("Section", { exact: true }).fill("Discovery");
  await dialog
    .getByRole("button", { name: "Save changes", exact: true })
    .click();
  await expect(
    page.getByRole("cell", { name: "Jane Scientist", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("row")
    .filter({ hasText: "Jane Scientist" })
    .getByRole("button", { name: "Adjust credits", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("Credit adjustment", { exact: true })
    .fill("10");
  await page
    .getByRole("dialog")
    .getByLabel("Reason", { exact: true })
    .fill("Project participation");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect.poll(() => backend.credits[users[0].id]).toBe(210);
  const file = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export filtered data", exact: true })
    .click();
  expect((await file).suggestedFilename()).toBe("cozy-class-students.csv");
  await page.reload();
  await expect(
    page.getByRole("cell", { name: "Jane Scientist", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Activity history", exact: true })
    .click();
  await expect(
    page.getByRole("cell", { name: "Project participation", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "View change", exact: true })
    .first()
    .click();
  await expect(page.getByRole("dialog").locator("pre").last()).toContainText(
    "Project participation",
  );
});

test("profile photos are normalized, saved privately, restored and removable", async ({
  page,
  backend,
}) => {
  await page.goto("./");
  await signIn(page);
  await page.getByRole("button", { name: "Open scientist profile" }).click();
  const image = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 96;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#98b784";
    ctx.fillRect(0, 0, 128, 96);
    ctx.fillStyle = "#f6dd99";
    ctx.fillRect(30, 20, 40, 45);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  await page.getByLabel("Choose profile photo", { exact: true }).setInputFiles({
    name: "profile.png",
    mimeType: "image/png",
    buffer: Buffer.from(image, "base64"),
  });
  const photo = page
    .getByRole("dialog")
    .getByRole("img", { name: "Student One profile photo", exact: true });
  await expect(photo).toBeVisible();
  expect(
    await photo.evaluate((img) => (img as HTMLImageElement).naturalWidth),
  ).toBe(256);
  expect(backend.photoUploads).toBe(1);
  expect(backend.profiles[0].photo_path).toContain(`${users[0].id}/`);
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.reload();
  await page.getByRole("button", { name: "Open scientist profile" }).click();
  await expect(photo).toBeVisible();
  await expect
    .poll(() => photo.evaluate((img) => (img as HTMLImageElement).naturalWidth))
    .toBe(256);
  await page.getByRole("button", { name: "Remove photo", exact: true }).click();
  await expect(photo).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Remove photo", exact: true }),
  ).toBeDisabled();
  expect(backend.profiles[0].photo_path).toBeNull();
  await page.getByLabel("Choose profile photo", { exact: true }).setInputFiles({
    name: "unsafe.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'),
  });
  await expect(
    page
      .getByRole("region", { name: "Profile photo", exact: true })
      .locator(".form-error"),
  ).toContainText("JPG, PNG or WebP");
  expect(backend.photoUploads).toBe(1);
});

test("email sending limits have persistent cooldown and an existing-account path", async ({
  page,
  backend,
}) => {
  backend.emailLimited = true;
  async function signup(send = true) {
    await page
      .getByRole("button", { name: "Create account", exact: true })
      .click();
    await page.getByLabel("Your name", { exact: true }).fill("Student One");
    await page
      .getByLabel("Email", { exact: true })
      .fill("student1@example.test");
    await page
      .getByLabel("Password", { exact: true })
      .fill("cloud-password-123");
    if (send)
      await page
        .getByRole("button", { name: "Make my little lab", exact: true })
        .click();
  }
  await page.goto("./");
  await signup();
  await expect(page.getByRole("dialog").locator(".form-error")).toContainText(
    "email service has reached its sending limit",
  );
  expect(backend.signupCalls).toBe(1);
  await page.reload();
  await signup(false);
  await expect(
    page.getByRole("button", { name: /Try again in \d+s/ }),
  ).toBeDisabled();
  await expect(
    page.getByRole("dialog").locator(".auth-email-wait"),
  ).toContainText("One account email at a time");
  expect(backend.signupCalls).toBe(1);
  await page
    .getByRole("button", { name: "I already have an account", exact: true })
    .click();
  await expect(page.getByLabel("Email", { exact: true })).toHaveValue(
    "student1@example.test",
  );
  await page.getByLabel("Password", { exact: true }).fill("cloud-password-123");
  await page.getByRole("button", { name: "Welcome back", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Log out", exact: true }),
  ).toBeVisible();
  expect(await page.locator("body").innerText()).not.toMatch(/supabase/i);
});

test("one confirmation resend is available after its cooldown", async ({
  page,
  backend,
}) => {
  await page.clock.install();
  await page.goto("./");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await page.getByLabel("Your name", { exact: true }).fill("New Scientist");
  await page.getByLabel("Email", { exact: true }).fill("new@example.test");
  await page.getByLabel("Password", { exact: true }).fill("cloud-password-123");
  await page
    .getByRole("button", { name: "Make my little lab", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Check your email", exact: true }),
  ).toBeVisible();
  const resend = page.getByRole("button", { name: /Request again in/ });
  await expect(resend).toBeDisabled();
  expect(backend.resendCalls).toBe(0);
  await page.clock.fastForward(61000);
  await page
    .getByRole("button", { name: "Send one new link", exact: true })
    .click();
  await expect.poll(() => backend.resendCalls).toBe(1);
  await expect(
    page.getByRole("button", { name: /Request again in/ }),
  ).toBeDisabled();
});

test("signed-in arcade uses saved rules, reload, combos, boosts and class rankings", async ({
  page,
  backend,
}) => {
  await page.goto("./");
  await signIn(page);
  await page.goto("#/arcade");
  await page
    .getByRole("button", { name: /Biology.*PLAY 9 DISCOVERIES/ })
    .click();
  for (let index = 0; index < 9; index++) {
    await expect(page.locator(".arcade-question .eyebrow")).toHaveText(
      `DISCOVERY ${index + 1} / 9`,
    );
    const prompt = await page.locator(".arcade-question h1").innerText(),
      q = questions.find((q) => q.prompt === prompt)!;
    if (index === 3) {
      await page
        .getByRole("button", { name: "Buy five extra seconds", exact: true })
        .click();
      await expect(
        page.getByRole("button", {
          name: "Buy five extra seconds",
          exact: true,
        }),
      ).toBeDisabled();
      await page
        .getByRole("button", { name: "Buy an extra dart", exact: true })
        .click();
    }
    await page
      .getByRole("button", {
        name: `Shoot ${q.options!.find((o) => o.id === q.answer)!.text}`,
        exact: true,
      })
      .click();
  }
  await expect(
    page.getByRole("heading", {
      name: "A brilliant little bullseye!",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator(".arcade-final-score")).toHaveText("2,000");
  expect(backend.credits[users[0].id]).toBe(209);
  await expect(
    page.getByText("9/9 correct · 22 round coins left", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "View arcade leaderboard", exact: true })
    .click();
  await expect(
    page.getByRole("cell", { name: "Student One", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "2000", exact: true }),
  ).toBeVisible();
});

test("teacher studio is accessible on desktop and a narrow phone", async ({
  page,
}) => {
  await page.goto("./");
  await signIn(page, "teacher");
  await expect(
    page.getByRole("heading", { name: "Teacher studio", exact: true }),
  ).toBeVisible();
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(result.violations).toEqual([]);
  await page.screenshot({
    path: "/tmp/cozy-teacher-studio-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 320, height: 780 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Toggle navigation" }).click();
  await page
    .getByRole("link", { name: "Stock & pricing", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "The supply shelf", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "/tmp/cozy-teacher-studio-mobile.png",
    fullPage: true,
  });
});

test("teacher card and settings editors save reviewed changes for the class", async ({
  page,
  backend,
}) => {
  await page.goto("./");
  await signIn(page, "teacher");
  await page.getByRole("link", { name: "Science cards", exact: true }).click();
  const q = questions.find(
    (q) => q.deckId === "life.cells" && q.level === "easy" && q.type === "mcq",
  )!;
  await page.getByLabel("Find a record", { exact: true }).fill(q.prompt);
  await page
    .getByRole("button", { name: "Apply filters", exact: true })
    .click();
  await page.getByRole("button", { name: "Edit card", exact: true }).click();
  const changed = `Think about a cell. ${q.prompt}`;
  await page
    .getByRole("dialog")
    .getByLabel("Science question", { exact: true })
    .fill(changed);
  await page
    .getByRole("dialog")
    .getByLabel("I checked the science and the correct answer", { exact: true })
    .check();
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(backend.overrides.find((o) => o.question.id === q.id)).toMatchObject({
    question: { prompt: changed },
    version: 1,
  });
  await page.reload();
  await page.getByLabel("Find a record", { exact: true }).fill(changed);
  await page
    .getByRole("button", { name: "Apply filters", exact: true })
    .click();
  await expect(
    page.getByRole("cell").filter({ hasText: changed }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Lab settings", exact: true }).click();
  await page
    .getByLabel("Daily learning credit limit", { exact: true })
    .fill("100");
  await page
    .getByRole("button", { name: "Save learning settings", exact: true })
    .click();
  await expect.poll(() => backend.rules.dailyCap).toBe(100);
  await expect(
    page.getByText("Learning settings saved.", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Level 1 · seconds per card", { exact: true })
    .fill("25");
  await page
    .getByLabel("Level 2 · seconds per card", { exact: true })
    .fill("18");
  await page
    .getByLabel("Level 3 · seconds per card", { exact: true })
    .fill("10");
  await page
    .getByRole("button", { name: "Save arcade settings", exact: true })
    .click();
  await expect.poll(() => backend.game.seconds).toEqual([25, 18, 10]);
  await expect(
    page.getByText("Arcade settings saved for new rounds.", { exact: true }),
  ).toBeVisible();
  await signOut(page);
  await signIn(page);
  await page.goto("#/arcade");
  await page
    .getByRole("button", { name: /Biology.*PLAY 9 DISCOVERIES/ })
    .click();
  await expect(page.locator("[data-arcade-timer]")).toHaveText(/2[45]/);
  expect(backend.settingsVersion).toBe(3);
});

test("teacher cancellation returns the student's credits and shelf stock", async ({
  page,
  backend,
}) => {
  const original = { ...backend.items[0] };
  await page.goto("./");
  await signIn(page);
  await page.goto("#/shop");
  await page
    .getByRole("button", {
      name: `Reserve ${original.name} for ${original.price} credits`,
      exact: true,
    })
    .click();
  await page
    .getByRole("button", {
      name: `Reserve for ${original.price} credits`,
      exact: true,
    })
    .click();
  await expect.poll(() => backend.orders.length).toBe(1);
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await signOut(page);
  await signIn(page, "teacher");
  await page.getByRole("link", { name: "Claims desk", exact: true }).click();
  await page
    .getByRole("button", { name: "Cancel & refund", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("Cancellation reason", { exact: true })
    .fill("Student requested a different supply");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect.poll(() => backend.orders[0].status).toBe("cancelled");
  await expect(
    page.getByRole("cell", { name: "cancelled", exact: true }),
  ).toBeVisible();
  expect(backend.credits[users[0].id]).toBe(200);
  expect(backend.items[0].stock).toBe(original.stock);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Cancel & refund", exact: true }),
  ).toHaveCount(0);
});

test("refreshed account dialogs are accessible, retain details and fit a phone", async ({
  page,
}) => {
  await page.goto("./");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await page.getByLabel("Email", { exact: true }).fill("new@example.test");
  await page.getByLabel("Password", { exact: true }).fill("cloud-password-123");
  await page
    .getByRole("button", { name: "Show password", exact: true })
    .click();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute(
    "type",
    "text",
  );
  await page
    .getByRole("button", { name: "Hide password", exact: true })
    .click();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute(
    "type",
    "password",
  );
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(result.violations).toEqual([]);
  await page.screenshot({
    path: "/tmp/cozy-account-desktop.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Sign in", exact: true })
    .last()
    .click();
  await expect(page.getByLabel("Email", { exact: true })).toHaveValue(
    "new@example.test",
  );
  await page.setViewportSize({ width: 320, height: 780 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "/tmp/cozy-account-mobile.png",
    fullPage: true,
  });
  expect(
    await page.getByRole("dialog").evaluate((el) => {
      const box = el.getBoundingClientRect();
      return (
        box.left >= 0 &&
        box.right <= innerWidth &&
        el.scrollWidth <= el.clientWidth
      );
    }),
  ).toBe(true);
  expect(
    await page
      .getByLabel("Password", { exact: true })
      .evaluate((el) => el.getBoundingClientRect().right <= innerWidth),
  ).toBe(true);
  await expect(page.locator("body")).not.toContainText(/supabase/i);
});
