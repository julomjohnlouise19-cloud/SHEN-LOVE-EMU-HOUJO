import type { Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { test, expect, exploreAsGuest } from "./fixtures";

const welcomeTitle = "A little curiosity starts here.";
async function join(page: Page) {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await page.getByLabel("Your name", { exact: true }).fill("Sky Reyes");
  await page.getByLabel("Username", { exact: true }).fill("sky_science");
  await page.getByLabel("Password", { exact: true }).fill("sky-demo-123");
  await page.getByRole("button", { name: "Make my little lab" }).click();
  await expect(page.getByRole("heading", { name: "Hey, Sky!" })).toBeVisible();
}
async function confirmLogout(page: Page) {
  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await page.getByRole("button", { name: "Log out now" }).click();
  await expect(page.getByRole("heading", { name: welcomeTitle })).toBeVisible();
}

test("first visitors get a separate accessible welcome hub with no automatic session", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: welcomeTitle })).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Main navigation" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Create account", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => ({
      token: sessionStorage.getItem("csl:session"),
      sessions: JSON.parse(localStorage.getItem("csl:state")!).sessions.length,
    })),
  ).toEqual({ token: null, sessions: 0 });
  await page.getByRole("link", { name: "Skip to content" }).focus();
  await page.keyboard.press("Enter");
  expect(await page.evaluate(() => document.activeElement?.id)).toBe("main");
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await page.screenshot({
    path: "/tmp/cozy-welcome-desktop.png",
    fullPage: true,
  });
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.screenshot({
    path: "/tmp/cozy-welcome-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("dialog").getByLabel("Username", { exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.reload();
  await expect(page.getByRole("heading", { name: welcomeTitle })).toBeVisible();
});

test("account logout can be cancelled, then revokes the session and preserves discoveries behind sign-in", async ({
  page,
}) => {
  await join(page);
  await page.goto("/#/notebook");
  await page.getByRole("button", { name: "A fresh little page" }).click();
  await page
    .getByLabel("Give your thought a title")
    .fill("Sky’s private discovery");
  await page
    .getByLabel("Your science note")
    .fill("Cell membranes control entry and exit.");
  await page
    .getByRole("button", { name: "Keep this thought", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Sky’s private discovery" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Log out of your lab?" }),
  ).toBeVisible();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.screenshot({
    path: "/tmp/cozy-logout-dialog.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Keep exploring", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Sky’s private discovery" }),
  ).toBeVisible();
  await confirmLogout(page);
  expect(
    await page.evaluate(() => ({
      token: sessionStorage.getItem("csl:session"),
      sessions: JSON.parse(localStorage.getItem("csl:state")!).sessions.length,
    })),
  ).toEqual({ token: null, sessions: 0 });
  await page.reload();
  await expect(page.getByRole("heading", { name: welcomeTitle })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("heading", { name: welcomeTitle })).toBeVisible();
  await expect(
    page.getByText("Sky’s private discovery", { exact: true }),
  ).toHaveCount(0);
  await page.goto("/#/notebook");
  await expect(page.getByRole("heading", { name: welcomeTitle })).toBeVisible();
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByLabel("Username", { exact: true }).fill("sky_science");
  await page.getByLabel("Password", { exact: true }).fill("sky-demo-123");
  await page.getByRole("button", { name: "Welcome back", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Sky’s private discovery" }),
  ).toBeVisible();
});

test("guest entry preserves challenge links and mobile logout stays signed out after reload", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await exploreAsGuest(page, "/#/challenge/life.cells?level=hard&seed=123456");
  await expect(
    page.getByRole("heading", { name: "A little challenge from a friend." }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "life.cells · hard. Same science, same shuffle. Your usual daily cap applies.",
      { exact: true },
    ),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Accept this little challenge" })
    .click();
  await expect(page.locator(".question-card")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await confirmLogout(page);
  await page.reload();
  await expect(page.getByRole("heading", { name: welcomeTitle })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Log out", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Explore as guest", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Hey, curious mind!" }),
  ).toBeVisible();
});

test("expired sessions close private dialogs and return to the welcome hub without a guest login", async ({
  page,
}) => {
  await join(page);
  await page.getByRole("button", { name: "Open scientist profile" }).click();
  await expect(
    page.getByRole("dialog", { name: "Your scientist profile" }),
  ).toBeVisible();
  await page.clock.install();
  await page.clock.fastForward(8 * 60 * 60 * 1000 + 2000);
  await expect(page.getByRole("heading", { name: welcomeTitle })).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(
    await page.evaluate(() => sessionStorage.getItem("csl:session")),
  ).toBeNull();
});

test("cross-tab revocation closes private profile dialogs while the other tab stays signed out", async ({
  page,
  context,
}) => {
  await join(page);
  await page.getByRole("button", { name: "Open scientist profile" }).click();
  const other = await context.newPage();
  await other.goto("/");
  await expect(
    other.getByRole("heading", { name: welcomeTitle }),
  ).toBeVisible();
  await other.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("csl:state")!);
    localStorage.setItem(
      "csl:state",
      JSON.stringify({ ...state, rev: state.rev + 1, sessions: [] }),
    );
  });
  await expect(page.getByRole("heading", { name: welcomeTitle })).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(
    await page.evaluate(() => sessionStorage.getItem("csl:session")),
  ).toBeNull();
  await other.close();
});

test("logout clears the tab credential even if browser storage rejects the revocation write", async ({
  page,
}) => {
  await exploreAsGuest(page);
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "csl:state")
        throw new DOMException("Test storage is full", "QuotaExceededError");
      return original.call(this, key, value);
    };
  });
  await confirmLogout(page);
  expect(
    await page.evaluate(() => sessionStorage.getItem("csl:session")),
  ).toBeNull();
  await expect(
    page.getByText(
      "You’re logged out of this tab. Browser storage couldn’t be updated.",
      { exact: true },
    ),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: welcomeTitle })).toBeVisible();
});
