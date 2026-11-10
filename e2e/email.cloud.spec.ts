import { test, expect, host, users } from "./cloud-fixtures";
import type { Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function signupDetails(page: Page, email = "new@example.test") {
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await page.getByLabel("Your name", { exact: true }).fill("New Scientist");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill("cloud-password-123");
  await page.getByLabel("Grade", { exact: true }).selectOption("9");
  await page
    .getByLabel("Section (optional)", { exact: true })
    .fill("Discovery");
}

test("failed confirmation preserves details, provides accessible recovery and keeps the cooldown after reload", async ({
  page,
  backend,
}, testInfo) => {
  backend.emailDeliveryFailed = true;
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./");
  await signupDetails(page, users[0].email);
  await page
    .getByRole("button", { name: "Make my little lab", exact: true })
    .click();
  const heading = page.getByRole("heading", {
    name: "Email delivery needs attention",
    exact: true,
  });
  await expect(heading).toBeVisible();
  await expect(heading).toBeFocused();
  await expect(
    page.getByRole("heading", { name: "Check your email", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /Request again in/ }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Log out", exact: true }),
  ).toHaveCount(0);
  expect(backend.signupCalls).toBe(1);
  expect(backend.resendCalls).toBe(0);
  expect(await page.locator("body").innerText()).not.toMatch(
    /supabase|SMTP|Error sending confirmation email/i,
  );
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
  await page.screenshot({
    path: testInfo.outputPath("email-recovery-mobile.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Back to signup details", exact: true })
    .click();
  await expect(page.getByLabel("Your name", { exact: true })).toHaveValue(
    "New Scientist",
  );
  await expect(page.getByLabel("Email", { exact: true })).toHaveValue(
    users[0].email,
  );
  await expect(page.getByLabel("Grade", { exact: true })).toHaveValue("9");
  await expect(
    page.getByLabel("Section (optional)", { exact: true }),
  ).toHaveValue("Discovery");
  await expect(page.getByLabel("Password", { exact: true })).toHaveValue("");
  await expect(
    page.getByRole("button", { name: /Try again in/ }),
  ).toBeDisabled();
  await page.reload();
  await signupDetails(page, users[0].email);
  await expect(
    page.getByRole("button", { name: /Try again in/ }),
  ).toBeDisabled();
  expect(backend.signupCalls).toBe(1);
  await page
    .getByRole("button", { name: "I already have an account", exact: true })
    .click();
  await expect(page.getByLabel("Email", { exact: true })).toHaveValue(
    users[0].email,
  );
  await expect(
    page.getByRole("button", { name: "Welcome back", exact: true }),
  ).toBeEnabled();
  await page.getByLabel("Password", { exact: true }).fill("cloud-password-123");
  await page.getByRole("button", { name: "Welcome back", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Log out", exact: true }),
  ).toBeVisible();
  expect(backend.tokenCalls).toBe(1);
  expect(backend.resendCalls).toBe(0);
  expect(backend.recoverCalls).toBe(0);
});

test("confirmation retry distinguishes another delivery failure from an accepted request and guest practice remains explicit", async ({
  page,
  backend,
}) => {
  backend.emailDeliveryFailed = true;
  await page.clock.install();
  await page.goto("./");
  await signupDetails(page);
  await page
    .getByRole("button", { name: "Make my little lab", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Email delivery needs attention",
      exact: true,
    }),
  ).toBeVisible();
  await page.clock.fastForward(61000);
  await page
    .getByRole("button", { name: "Send one new link", exact: true })
    .click();
  await expect.poll(() => backend.resendCalls).toBe(1);
  await expect(
    page.getByRole("heading", {
      name: "Email delivery needs attention",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Request again in/ }),
  ).toBeDisabled();
  await expect(
    page.locator(".auth-confirmation .auth-reset-status"),
  ).toBeEmpty();
  backend.emailDeliveryFailed = false;
  await page.clock.fastForward(61000);
  await page
    .getByRole("button", { name: "Send one new link", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Check your email", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".auth-confirmation .form-error")).toBeEmpty();
  await expect(
    page.locator(".auth-confirmation .auth-reset-status"),
  ).toContainText("A new confirmation was requested");
  expect(backend.resendCalls).toBe(2);
  expect(backend.signupCalls).toBe(1);
  expect(backend.tokenCalls).toBe(0);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Explore as guest", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Open scientist profile", exact: true }),
  ).toBeVisible();
  expect(backend.rows).toHaveLength(0);
  expect(backend.tokenCalls).toBe(0);
});

test("reset delivery failure never claims an email was sent and does not block existing-account login", async ({
  page,
  backend,
}) => {
  backend.emailDeliveryFailed = true;
  await page.goto("./");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByLabel("Email", { exact: true }).fill(users[0].email);
  await page
    .getByRole("button", { name: "Forgot your password?", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Send reset link", exact: true })
    .click();
  await expect(page.getByRole("dialog").locator(".form-error")).toContainText(
    "could not be sent",
  );
  await expect(page.locator(".auth-fields .auth-reset-status")).toBeEmpty();
  await expect(
    page.getByRole("button", { name: /Request again in/ }),
  ).toBeDisabled();
  expect(backend.recoverCalls).toBe(1);
  await page
    .getByRole("button", { name: "Back to sign in", exact: true })
    .click();
  await expect(page.getByLabel("Email", { exact: true })).toHaveValue(
    users[0].email,
  );
  await page.getByLabel("Password", { exact: true }).fill("cloud-password-123");
  await page.getByRole("button", { name: "Welcome back", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Log out", exact: true }),
  ).toBeVisible();
  expect(backend.tokenCalls).toBe(1);
  expect(backend.signupCalls).toBe(0);
  expect(backend.resendCalls).toBe(0);
});

test("two tabs reserve one shared email request before the server responds", async ({
  page,
  context,
  backend,
}) => {
  const other = await context.newPage();
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  let arrivals = 0;
  await context.route(`${host}/auth/v1/signup**`, async (route) => {
    arrivals++;
    await pending;
    await route.fallback();
  });
  try {
    await Promise.all([page.goto("./"), other.goto("./")]);
    await Promise.all([signupDetails(page), signupDetails(other)]);
    await Promise.all(
      [page, other].map((tab) =>
        tab
          .getByRole("dialog")
          .locator("form")
          .evaluate((form) => (form as HTMLFormElement).requestSubmit()),
      ),
    );
    await expect.poll(() => arrivals).toBe(1);
    await expect
      .poll(async () =>
        (
          await Promise.all(
            [page, other].map((tab) =>
              tab.locator(".form-error").allTextContents(),
            ),
          )
        )
          .flat()
          .join(" "),
      )
      .toContain("before requesting another account email");
    expect(backend.signupCalls).toBe(0);
    release();
    await expect.poll(() => backend.signupCalls).toBe(1);
    await expect
      .poll(
        async () =>
          (await page
            .getByRole("heading", { name: "Check your email", exact: true })
            .count()) +
          (await other
            .getByRole("heading", { name: "Check your email", exact: true })
            .count()),
      )
      .toBe(1);
    expect(arrivals).toBe(1);
    expect(backend.resendCalls).toBe(0);
  } finally {
    release();
    await other.close();
  }
});
