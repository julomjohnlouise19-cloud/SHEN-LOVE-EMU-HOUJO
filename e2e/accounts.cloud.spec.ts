import AxeBuilder from "@axe-core/playwright";
import { test, expect, signIn, signOut, users } from "./cloud-fixtures";

const agreement = "I agree to the Terms and Conditions and Privacy Notice";

test("signup requires a deliberate agreement and preserves the form while reading terms", async ({
  page,
  backend,
}, testInfo) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("./");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await page.getByLabel("Your name", { exact: true }).fill("New Scientist");
  await page.getByLabel("Email", { exact: true }).fill("new@example.test");
  await page.getByLabel("Password", { exact: true }).fill("cloud-password-123");
  await page
    .getByRole("combobox", { name: "Section (optional)", exact: true })
    .selectOption("Grejalde");
  const submit = page.getByRole("button", {
    name: "Make my little lab",
    exact: true,
  });
  await expect(submit).toBeDisabled();
  await expect(
    page.getByRole("checkbox", { name: agreement }),
  ).not.toBeChecked();
  await page
    .getByRole("button", { name: "Read Terms & Conditions", exact: true })
    .click();
  const terms = page.getByRole("dialog", {
    name: "Terms & Conditions and Privacy Notice",
    exact: true,
  });
  await expect(
    terms.getByRole("heading", { name: "Your account and privacy" }),
  ).toBeVisible();
  expect(
    (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())
      .violations,
  ).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath("signup-terms-320.png") });
  await terms
    .getByRole("button", { name: "Close dialog", exact: true })
    .click();
  await expect(page.getByLabel("Your name", { exact: true })).toHaveValue(
    "New Scientist",
  );
  await expect(page.getByLabel("Password", { exact: true })).toHaveValue(
    "cloud-password-123",
  );
  await expect(submit).toBeDisabled();
  expect(backend.signupCalls).toBe(0);
  await expect(
    page.getByRole("combobox", { name: "Section (optional)", exact: true }),
  ).toHaveValue("Grejalde");
  await page.getByRole("checkbox", { name: agreement }).check();
  await submit.click();
  await expect(
    page.getByRole("heading", { name: "Check your email", exact: true }),
  ).toBeVisible();
  expect(backend.signupCalls).toBe(1);
  expect(backend.signupMetadata).toMatchObject({
    terms_accepted: true,
    terms_version: "1.0",
    section: "Grejalde",
  });
  expect(
    Number.isFinite(
      Date.parse(String(backend.signupMetadata.terms_accepted_at)),
    ),
  ).toBe(true);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("teachers see the actual student photo, introduction and account details", async ({
  page,
  backend,
}, testInfo) => {
  await page.goto("./");
  await signIn(page);
  await page.getByRole("button", { name: "Open scientist profile" }).click();
  const image = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 32;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "#95b88d";
    context.fillRect(0, 0, 32, 32);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  await page.getByLabel("Choose profile photo", { exact: true }).setInputFiles({
    name: "scientist.png",
    mimeType: "image/png",
    buffer: Buffer.from(image, "base64"),
  });
  await expect.poll(() => backend.photoUploads).toBe(1);
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  backend.preferences[users[0].id] = {
    theme: "aurora",
    bio: "I love learning about cells and our planet.",
  };
  await signOut(page);
  await signIn(page, "teacher");
  await page.getByRole("link", { name: "Scientists", exact: true }).click();
  const row = page.getByRole("row").filter({ hasText: "Student One" });
  await expect(
    row.getByRole("img", { name: "Student One profile photo", exact: true }),
  ).toBeVisible();
  await row.getByRole("button", { name: "View profile", exact: true }).click();
  const dialog = page.getByRole("dialog", {
    name: "Scientist profile",
    exact: true,
  });
  await expect(dialog.getByText(users[0].email, { exact: true })).toBeVisible();
  await expect(
    dialog.getByText(backend.preferences[users[0].id].bio, { exact: true }),
  ).toBeVisible();
  await expect
    .poll(() =>
      dialog
        .getByRole("img", { name: "Student One profile photo", exact: true })
        .evaluate((img) => (img as HTMLImageElement).naturalWidth),
    )
    .toBe(256);
  await expect(
    dialog.getByText("Grade 8 · Curiosity", { exact: true }),
  ).toBeVisible();
  await expect(
    dialog.getByText("No signup agreement is recorded for this account.", {
      exact: true,
    }),
  ).toBeVisible();
  await page.setViewportSize({ width: 320, height: 740 });
  await page.screenshot({
    path: testInfo.outputPath("teacher-profile-320.png"),
  });
  expect(
    (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())
      .violations,
  ).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await dialog
    .getByRole("button", { name: "Close dialog", exact: true })
    .click();
  backend.profiles[0].photo_path = null;
  await page
    .getByRole("button", { name: "Refresh workspace", exact: true })
    .click();
  await expect(
    row.getByRole("img", { name: "Student One profile photo", exact: true }),
  ).toHaveCount(0);
});

test("teacher bans require a reason, block sign-in and can be restored without deleting records", async ({
  page,
  backend,
}) => {
  await page.goto("./");
  await signIn(page, "teacher");
  await page.getByRole("link", { name: "Scientists", exact: true }).click();
  const row = page.getByRole("row").filter({ hasText: "Student One" });
  await expect(
    page
      .getByRole("row")
      .filter({ hasText: "Teacher" })
      .getByRole("button", { name: "Ban user", exact: true }),
  ).toBeDisabled();
  await row.getByRole("button", { name: "Ban user", exact: true }).click();
  await page.getByRole("button", { name: "Confirm ban", exact: true }).click();
  expect(backend.profiles[0].active).toBe(true);
  await page
    .getByLabel("Reason for account access change", { exact: true })
    .fill("Classroom access under teacher review");
  await page.getByRole("button", { name: "Confirm ban", exact: true }).click();
  await expect(
    row.getByRole("button", { name: "Restore access", exact: true }),
  ).toBeVisible();
  expect(backend.activity[0].note).toBe(
    "Classroom access under teacher review",
  );
  expect(backend.credits[users[0].id]).toBe(200);
  await signOut(page);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByLabel("Email", { exact: true }).fill(users[0].email);
  await page.getByLabel("Password", { exact: true }).fill("cloud-password-123");
  await page.getByRole("button", { name: "Welcome back", exact: true }).click();
  await expect(page.getByRole("dialog").locator(".form-error")).toContainText(
    "banned from classroom access",
  );
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await signIn(page, "teacher");
  await page.getByRole("link", { name: "Scientists", exact: true }).click();
  await row
    .getByRole("button", { name: "Restore access", exact: true })
    .click();
  await page
    .getByLabel("Reason for account access change", { exact: true })
    .fill("Teacher review complete");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Restore access", exact: true })
    .click();
  await expect(
    row.getByRole("button", { name: "Ban user", exact: true }),
  ).toBeVisible();
  await signOut(page);
  await signIn(page);
  expect(backend.credits[users[0].id]).toBe(200);
});

test("a newly banned signed-in student is returned to the welcome hub on the next classroom request", async ({
  page,
  backend,
}) => {
  await page.goto("./");
  await signIn(page);
  backend.profiles[0].active = false;
  await page.getByRole("button", { name: /^Notifications/ }).click();
  await expect(
    page.getByRole("heading", {
      name: "A little curiosity starts here.",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Log out", exact: true }),
  ).toHaveCount(0);
  expect(backend.credits[users[0].id]).toBe(200);
});

test("reservation instructions persist in notifications and follow the teacher's collection location", async ({
  page,
  backend,
}) => {
  await page.goto("./");
  await signIn(page);
  await page.goto("#/shop");
  await page
    .getByRole("button", { name: /^Reserve Little idea pencils for/ })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /^Reserve for/ })
    .click();
  const pickup = page.getByRole("region", {
    name: "Reservation pickup instructions",
    exact: true,
  });
  await expect(pickup).toContainText("Grade 10 SSC classroom");
  await expect(pickup).toContainText("Bring your claim code for verification");
  const code = backend.orders[0].code;
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: /^Notifications/ }).click();
  const pending = page.getByRole("region", {
    name: "Pending supply pickups",
    exact: true,
  });
  await expect(pending).toContainText(code);
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await signOut(page);
  await signIn(page, "teacher");
  await page.getByRole("link", { name: "Lab settings", exact: true }).click();
  await page
    .getByLabel("Supply pickup location", { exact: true })
    .fill("Grade 10 SSC classroom · Science corner");
  await page
    .getByRole("button", { name: "Save pickup location", exact: true })
    .click();
  await expect
    .poll(() => backend.rules.pickupLocation)
    .toBe("Grade 10 SSC classroom · Science corner");
  await expect(
    page.getByText("Supply pickup location saved.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Save learning settings", exact: true })
    .click();
  await expect(
    page.getByText("Learning settings saved.", { exact: true }),
  ).toBeVisible();
  expect(backend.rules.pickupLocation).toBe(
    "Grade 10 SSC classroom · Science corner",
  );
  await signOut(page);
  await signIn(page);
  await page.getByRole("button", { name: /^Notifications/ }).click();
  await expect(pending).toContainText("Science corner");
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  backend.orders[0].status = "collected";
  await page.getByRole("button", { name: /^Notifications/ }).click();
  await expect(pending).toHaveCount(0);
});

test("existing databases retain profile management and ban controls before the extra details upgrade", async ({
  page,
  backend,
}) => {
  backend.accountsReady = false;
  await page.goto("./");
  await signIn(page, "teacher");
  await page.getByRole("link", { name: "Scientists", exact: true }).click();
  await page
    .getByRole("row")
    .filter({ hasText: "Student One" })
    .getByRole("button", { name: "View profile", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Scientist profile",
    exact: true,
  });
  await expect(
    dialog.getByText("Grade 8 · Curiosity", { exact: true }),
  ).toBeVisible();
  await expect(
    dialog.getByText(/Email, introduction and agreement details need/),
  ).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Ban user", exact: true }),
  ).toBeEnabled();
});
