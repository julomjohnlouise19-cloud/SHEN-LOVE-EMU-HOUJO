import AxeBuilder from "@axe-core/playwright";
import { test, expect, users, signOut, signIn } from "./cloud-fixtures";
import type { Page } from "@playwright/test";
import { displayMode } from "./interface-helpers";

async function signup(page: Page, address = "learner.science@gmail.com") {
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await page.getByLabel("Your name", { exact: true }).fill("New Scientist");
  await page.getByLabel("Email", { exact: true }).fill(address);
  await page
    .getByLabel("Password", { exact: true })
    .fill("a-real-website-password");
  await page
    .getByRole("checkbox", {
      name: "I agree to the Terms and Conditions and Privacy Notice",
    })
    .check();
}

test("Gmail signup requires a server-verified code before opening the student interface", async ({
  page,
  backend,
}) => {
  await page.goto("./");
  await signup(page, "learner@gmaill.com");
  const create = page.getByRole("button", {
    name: "Make my little lab",
    exact: true,
  });
  await create.click();
  await expect(page.locator(".auth-fields .form-error")).toContainText(
    "Use a Gmail address you can open",
  );
  expect(backend.signupCalls).toBe(0);
  await page
    .getByLabel("Email", { exact: true })
    .fill("a".repeat(31) + "@gmail.com");
  await create.click();
  await expect(page.locator(".auth-fields .form-error")).toContainText(
    "Use a Gmail address you can open",
  );
  expect(backend.signupCalls).toBe(0);
  await page
    .getByLabel("Email", { exact: true })
    .fill("learner.science@gmail.com");
  await create.click();
  const code = page.getByLabel("Six-digit verification code", { exact: true });
  await expect(code).toBeVisible();
  await expect(page.locator('[data-email-status="pending"]')).toContainText(
    "Not verified yet",
  );
  await page.getByText("No email yet?", { exact: true }).click();
  await expect(page.locator(".auth-mail-help")).toContainText(
    "A request is not proof",
  );
  await page.getByText("No email yet?", { exact: true }).click();
  expect(
    (
      await new AxeBuilder({ page })
        .include("dialog")
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await expect(
    page.getByRole("button", { name: "Log out", exact: true }),
  ).toHaveCount(0);
  const verify = page.getByRole("button", {
    name: "Verify code & enter",
    exact: true,
  });
  await code.fill("12345");
  await expect(verify).toBeDisabled();
  expect(backend.verifyCalls).toBe(0);
  await code.fill("000000");
  await verify.click();
  await expect(page.locator(".auth-confirmation .form-error")).toContainText(
    "expired",
  );
  await expect(
    page.getByRole("button", { name: "Log out", exact: true }),
  ).toHaveCount(0);
  await code.fill("123 456");
  await expect(code).toHaveValue("123456");
  await verify.click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Log out", exact: true }),
  ).toBeVisible();
  await expect(page).not.toHaveURL(/#\/welcome$/);
  expect(backend.emailCodeRequests).toEqual([
    { email: "learner.science@gmail.com", token: "000000", type: "signup" },
    { email: "learner.science@gmail.com", token: "123456", type: "signup" },
  ]);
  expect(backend.signupCalls).toBe(1);
  expect(backend.tokenCalls).toBe(0);
  expect(backend.credits[users[0].id]).toBe(200);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Log out", exact: true }),
  ).toBeVisible();
  await signOut(page);
  await signIn(page, "teacher");
  await expect(page).toHaveURL(/#\/teacher$/);
});

test("email code entry is accessible on a phone and resending preserves the cooldown", async ({
  page,
  backend,
}) => {
  await page.clock.install();
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("./");
  await page
    .getByRole("button", { name: "Explore as guest", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Log out", exact: true }),
  ).toBeVisible();
  await displayMode(page, "dark");
  await signOut(page);
  await signup(page);
  await page
    .getByRole("button", { name: "Make my little lab", exact: true })
    .click();
  const panel = page.locator(".auth-confirmation");
  await expect(
    panel.getByLabel("Six-digit verification code", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Request again in/ }),
  ).toBeDisabled();
  expect(
    (
      await new AxeBuilder({ page })
        .include("dialog")
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  expect(
    await page
      .getByRole("dialog")
      .evaluate((node) => node.scrollWidth <= node.clientWidth),
  ).toBe(true);
  await page.screenshot({ path: "/tmp/cozy-signup-code-320.png" });
  await page.clock.fastForward(61000);
  await page
    .getByRole("button", { name: "Send a new code", exact: true })
    .click();
  await expect(panel.locator(".auth-reset-status")).toContainText(
    "A new verification code was requested",
  );
  expect(backend.resendCalls).toBe(1);
  expect(backend.signupCalls).toBe(1);
  await expect(
    page.getByRole("button", { name: /Request again in/ }),
  ).toBeDisabled();
  expect(backend.verifyCalls).toBe(0);
});

test("Gmail aliases share the signup email cooldown across tabs", async ({
  page,
  context,
  backend,
}) => {
  await page.goto("./");
  await signup(page, "learner.science@gmail.com");
  await page
    .getByRole("button", { name: "Make my little lab", exact: true })
    .click();
  await expect(
    page.getByLabel("Six-digit verification code", { exact: true }),
  ).toBeVisible();
  const other = await context.newPage();
  await other.goto("./");
  await signup(other, "learnerscience+class@gmail.com");
  await expect(
    other.getByRole("button", { name: /Try again in/ }),
  ).toBeDisabled();
  expect(backend.signupCalls).toBe(1);
  expect(backend.resendCalls).toBe(0);
});

test("signup does not silently skip inbox verification when the server auto-confirms accounts", async ({
  page,
  backend,
}) => {
  backend.signupAutoConfirmed = true;
  await page.goto("./");
  await signup(page);
  await page
    .getByRole("button", { name: "Make my little lab", exact: true })
    .click();
  await expect(page.locator(".auth-fields .form-error")).toContainText(
    "turn on email confirmation",
  );
  expect(backend.signupCalls).toBe(1);
  expect(backend.verifyCalls).toBe(0);
  await expect(
    page.getByRole("button", { name: "Log out", exact: true }),
  ).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "A little curiosity starts here." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Log out", exact: true }),
  ).toHaveCount(0);
});

test("an unconfirmed server user cannot enter through password login or a misleading code response", async ({
  page,
  backend,
}) => {
  backend.unverifiedUsers = [users[0].id];
  await page.goto("./");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByLabel("Email", { exact: true }).fill(users[0].email);
  await page.getByLabel("Password", { exact: true }).fill("cloud-password-123");
  await page.getByRole("button", { name: "Welcome back", exact: true }).click();
  await expect(page.locator(".form-error")).toContainText(
    "email is still unverified",
  );
  await expect(
    page.getByRole("button", { name: "Log out", exact: true }),
  ).toHaveCount(0);
  await page.reload();
  await signup(page);
  await page
    .getByRole("button", { name: "Make my little lab", exact: true })
    .click();
  await page
    .getByLabel("Six-digit verification code", { exact: true })
    .fill("123456");
  await page
    .getByRole("button", { name: "Verify code & enter", exact: true })
    .click();
  await expect(page.locator(".auth-confirmation .form-error")).toContainText(
    "email is still unverified",
  );
  await expect(
    page.getByRole("button", { name: "Log out", exact: true }),
  ).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole("heading", {
      name: "A little curiosity starts here.",
      exact: true,
    }),
  ).toBeVisible();
});
