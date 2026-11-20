import { test, expect, signIn, signOut, users } from "./cloud-fixtures";
import type { Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { boundedPage, brightSurfaces } from "./interface-helpers";

async function requestReset(page: Page) {
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByLabel("Email", { exact: true }).fill(users[0].email);
  await page
    .getByRole("button", { name: "Forgot your password?", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Send reset link", exact: true })
    .click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "If this email has an account" }),
  ).toBeVisible();
}

test("reset email actions remain separated, readable and useful on phones in both modes", async ({
  page,
  backend,
}) => {
  test.setTimeout(120000);
  await page.goto("./");
  await requestReset(page);
  expect(backend.recoverCalls).toBe(1);
  const send = page.locator(".auth-reset-form button[type=submit]");
  const back = page.getByRole("button", {
    name: "Back to sign in",
    exact: true,
  });
  await expect(send).toBeDisabled();
  for (const width of [1280, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const mode of ["light", "dark"]) {
      await page.evaluate((mode) => {
        document.documentElement.dataset.colorMode = mode;
      }, mode);
      await back.scrollIntoViewIfNeeded();
      const a = await send.boundingBox(),
        b = await back.boundingBox();
      expect(b!.y - (a!.y + a!.height)).toBeGreaterThanOrEqual(24);
      expect(b!.height).toBeGreaterThanOrEqual(44);
      await boundedPage(page);
      if (mode === "dark")
        expect(await brightSurfaces(page, "dialog[open]")).toEqual([]);
      expect(
        (
          await new AxeBuilder({ page })
            .include("dialog[open]")
            .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
            .analyze()
        ).violations,
      ).toEqual([]);
    }
    await page.screenshot({
      path: "/tmp/cozy-recovery-actions-dark-" + width + ".png",
    });
  }
  await page
    .getByLabel("Account email", { exact: true })
    .fill("another@example.test");
  await expect(page.locator(".auth-reset-status")).toBeEmpty();
  await expect(send).toHaveText("Send reset link");
  await back.click();
  await expect(page.getByLabel("Email", { exact: true })).toHaveValue(
    "another@example.test",
  );
});

test("a verified reset link opens the new-password form after a previous logout", async ({
  page,
  backend,
}) => {
  await page.goto("./");
  await signIn(page);
  await signOut(page);
  await requestReset(page);
  await expect.poll(() => backend.recoverCalls).toBe(1);
  await page.goto("./?code=fixture-recovery-code&flow=recovery");
  await expect(
    page.getByRole("dialog", {
      name: "A fresh start for your account",
      exact: true,
    }),
  ).toBeVisible();
  await page.reload();
  const dialog = page.getByRole("dialog", {
    name: "A fresh start for your account",
    exact: true,
  });
  await expect(dialog).toBeVisible();
  await page.setViewportSize({ width: 320, height: 740 });
  await page
    .getByLabel("New password", { exact: true })
    .fill("a-new-private-password");
  await page
    .getByRole("button", { name: "Show new password", exact: true })
    .click();
  await expect(
    page.getByLabel("New password", { exact: true }),
  ).toHaveAttribute("type", "text");
  await page
    .getByRole("button", { name: "Hide new password", exact: true })
    .click();
  await page
    .getByLabel("Repeat new password", { exact: true })
    .fill("a-new-private-password");
  expect(
    (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())
      .violations,
  ).toEqual([]);
  await page.screenshot({ path: "/tmp/cozy-reset-link-mobile.png" });
  await page
    .getByRole("button", { name: "Save new password", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Your password is updated",
      exact: true,
    }),
  ).toBeVisible();
  expect(backend.passwordChanges).toBe(1);
  await page
    .getByRole("link", { name: "Continue to the lab", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Log out", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("verified recovery opens without waiting for classroom services", async ({
  page,
  backend,
}) => {
  await page.goto("./");
  await requestReset(page);
  backend.available = false;
  backend.statusDelay = 20000;
  await page.goto("./?code=fixture-recovery-code");
  await expect(page.getByLabel("New password", { exact: true })).toBeVisible();
  await page
    .getByLabel("New password", { exact: true })
    .fill("a-new-private-password");
  await page
    .getByLabel("Repeat new password", { exact: true })
    .fill("a-new-private-password");
  await page
    .getByRole("button", { name: "Save new password", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Your password is updated",
      exact: true,
    }),
  ).toBeVisible();
  expect(backend.passwordChanges).toBe(1);
});

test("a reset link opened without its browser verification offers a clear retry and cannot change a password", async ({
  page,
  backend,
}) => {
  await page.goto("./?code=fixture-recovery-code&flow=recovery");
  await expect(
    page.getByRole("heading", { name: "Reset your password", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "We couldn’t verify this reset link" }),
  ).toBeVisible();
  await expect(page.getByLabel("New password", { exact: true })).toHaveCount(0);
  expect(backend.passwordChanges).toBe(0);
  expect(backend.tokenCalls).toBe(0);
});

test("expired or reused codes show recovery instructions and never unlock password controls", async ({
  page,
  backend,
}) => {
  await page.goto("./");
  await requestReset(page);
  backend.invalidRecoveryCode = true;
  await page.goto("./?code=fixture-recovery-code&flow=recovery");
  await expect(
    page.getByRole("heading", { name: "Reset your password", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "We couldn’t verify this reset link" }),
  ).toBeVisible();
  await expect(page.getByLabel("New password", { exact: true })).toHaveCount(0);
  expect(backend.passwordChanges).toBe(0);
});

test("a regular signed-in session plus a recovery URL is insufficient to change a password", async ({
  page,
  backend,
}) => {
  await page.goto("./");
  await signIn(page);
  await page.goto("./?flow=recovery");
  await expect(
    page.getByRole("heading", { name: "Reset your password", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("New password", { exact: true })).toHaveCount(0);
  expect(backend.passwordChanges).toBe(0);
});
