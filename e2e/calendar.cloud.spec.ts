import AxeBuilder from "@axe-core/playwright";
import { test, expect, users, addDays } from "./calendar-fixtures";
import { signIn, signOut, host } from "./cloud-fixtures";

test("daily claims save real account credits once, refresh competing tabs and persist after reload", async ({
  page,
  context,
  backend,
  calendar,
}) => {
  await page.goto("./");
  await signIn(page);
  const origin = page.url();
  const reward = page.locator("[data-daily-rewards-button]");
  await expect(reward).toHaveAttribute("data-reward-state", "ready");
  await reward.click();
  await expect(
    page.getByRole("dialog", { name: "Daily rewards", exact: true }),
  ).toBeVisible();
  expect(page.url()).toBe(origin);
  await expect(page.getByRole("gridcell")).toHaveCount(7);
  const other = await context.newPage();
  await other.goto("./#/island");
  await other.locator("[data-daily-rewards-button]").click();
  await expect(
    other.getByRole("button", { name: "Claim 5 class credits", exact: true }),
  ).toBeEnabled({ timeout: 20000 });
  const initial = backend.credits[users[0].id];
  await page
    .getByRole("button", { name: "Claim 5 class credits", exact: true })
    .click();
  await expect(page.locator(".calendar-live")).toContainText(
    "5 class credits claimed",
  );
  await expect(
    other.getByRole("button", { name: "Claimed today", exact: true }),
  ).toBeDisabled();
  await expect(reward).toHaveAttribute("data-reward-state", "claimed");
  expect(backend.credits[users[0].id]).toBe(initial + 5);
  expect(calendar.calendars[users[0].id].claims).toHaveLength(1);
  expect(calendar.requests[0].owner).toBe(users[0].id);
  await page.reload();
  await expect(reward).toHaveAttribute("data-reward-state", "claimed");
  await reward.click();
  await expect(
    page.getByRole("button", { name: "Claimed today", exact: true }),
  ).toBeDisabled();
  await expect(page.locator("[data-calendar-day='1']")).toContainText(
    "Claimed",
  );
  expect(backend.credits[users[0].id]).toBe(initial + 5);
});

test("a delayed calendar read cannot restore the ready marker after a successful popup claim", async ({
  page,
  backend,
  calendar,
}) => {
  await page.goto("./");
  await signIn(page);
  const reward = page.locator("[data-daily-rewards-button]");
  await expect(reward).toHaveAttribute("data-reward-state", "ready");
  await reward.click();
  await expect(
    page.getByRole("button", { name: "Claim 5 class credits", exact: true }),
  ).toBeEnabled();
  let release!: () => void,
    entered = false;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  const stale = {
    version: 1,
    student: true,
    enabled: true,
    timezone: "Asia/Manila",
    server_day: calendar.day,
    started_on: null,
    day_index: 1,
    daily_credits: 5,
    weekly_credits: 10,
    eligible: true,
    balance: backend.credits[users[0].id],
    claims: [],
  };
  await page.route(`${host}/rest/v1/rpc/csl_daily_calendar`, async (route) => {
    if (route.request().method() === "OPTIONS") return route.fallback();
    entered = true;
    await held;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-headers": "*",
      },
      body: JSON.stringify(stale),
    });
  });
  try {
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect.poll(() => entered).toBe(true);
    await page
      .getByRole("button", { name: "Claim 5 class credits", exact: true })
      .click();
    await expect(reward).toHaveAttribute("data-reward-state", "claimed");
    const response = page.waitForResponse(
      `${host}/rest/v1/rpc/csl_daily_calendar`,
    );
    release();
    await (await response).finished();
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    await expect(
      page.getByRole("button", { name: "Claimed today", exact: true }),
    ).toBeDisabled();
    await expect(reward).toHaveAttribute("data-reward-state", "claimed");
    expect(calendar.calendars[users[0].id].claims).toHaveLength(1);
  } finally {
    release();
  }
});

test("rewards open immediately and can close and reopen while account status is still loading", async ({
  page,
  backend,
  calendar,
}) => {
  backend.credits[users[0].id] = 1234567;
  await page.setViewportSize({ width: 320, height: 568 });
  let release!: () => void,
    reads = 0;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(`${host}/rest/v1/rpc/csl_daily_calendar`, async (route) => {
    if (route.request().method() === "OPTIONS") return route.fallback();
    reads++;
    await held;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-headers": "*",
      },
      body: JSON.stringify({
        version: 1,
        student: true,
        enabled: true,
        timezone: "Asia/Manila",
        server_day: calendar.day,
        started_on: null,
        day_index: 1,
        daily_credits: 5,
        weekly_credits: 10,
        eligible: true,
        balance: backend.credits[users[0].id],
        claims: [],
      }),
    });
  });
  try {
    await page.goto("./");
    await signIn(page);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const origin = page.url(),
      reward = page.locator("[data-daily-rewards-button]");
    await reward.click();
    const dialog = page.getByRole("dialog", {
      name: "Daily rewards",
      exact: true,
    });
    await expect(dialog).toContainText("Opening your daily rewards");
    await dialog
      .getByRole("button", { name: "Close and return to page", exact: true })
      .click();
    await expect(reward).toBeEnabled();
    await expect(reward).toBeFocused();
    await expect(
      page.getByRole("button", { name: "Log out", exact: true }),
    ).toBeInViewport();
    await reward.click();
    await expect(dialog).toContainText("Opening your daily rewards");
    expect(reads).toBe(1);
    release();
    await expect(dialog.getByRole("gridcell")).toHaveCount(7);
    await expect(page.getByRole("dialog")).toHaveCount(1);
    expect(page.url()).toBe(origin);
    expect(calendar.requests).toHaveLength(0);
  } finally {
    release();
  }
});

test("the seventh dated day awards the bonus, missed days stay missed and the trail ends", async ({
  page,
  backend,
  calendar,
}) => {
  const owner = users[0].id;
  calendar.calendars[owner] = {
    start: addDays(calendar.day, -6),
    daily: 5,
    weekly: 10,
    claims: [
      { day_number: 1, claim_date: addDays(calendar.day, -6), credits: 5 },
    ],
  };
  await page.goto("./");
  await signIn(page);
  await page.goto("./#/daily-rewards");
  await expect(page.locator("[data-calendar-day='2']")).toContainText("Missed");
  await page.locator("[data-calendar-day='2']").click();
  await expect(page.getByRole("dialog")).toContainText(
    "cannot be claimed later",
  );
  await page.keyboard.press("Escape");
  const initial = backend.credits[owner];
  await page
    .getByRole("button", { name: "Claim 10 class credits", exact: true })
    .click();
  await expect(page.locator(".calendar-live")).toContainText(
    "10 class credits claimed",
  );
  expect(backend.credits[owner]).toBe(initial + 10);
  calendar.day = addDays(calendar.day, 43);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Calendar complete", exact: true }),
  ).toBeDisabled();
  await expect(page.locator("[data-calendar-day='7']")).toContainText(
    "Claimed",
  );
  expect(calendar.calendars[owner].claims).toHaveLength(2);
});

test("a lost receipt recovers saved credits and retries the same claim ID across the next day", async ({
  page,
  backend,
  calendar,
}) => {
  await page.goto("./");
  await signIn(page);
  await page.goto("./#/daily-rewards");
  const initial = backend.credits[users[0].id];
  calendar.loseNextReceipt = true;
  await page
    .getByRole("button", { name: "Claim 5 class credits", exact: true })
    .click();
  await expect(page.locator(".calendar-live")).toContainText(
    "Connection interrupted",
  );
  await expect(
    page.getByRole("button", { name: "Claimed today", exact: true }),
  ).toBeDisabled();
  expect(backend.credits[users[0].id]).toBe(initial + 5);
  calendar.day = addDays(calendar.day, 1);
  await page.reload();
  await page
    .getByRole("button", { name: "Claim 5 class credits", exact: true })
    .click();
  await expect(page.locator(".calendar-live")).toContainText(
    "was already saved",
  );
  expect(calendar.requests[0].request).toBe(calendar.requests[1].request);
  expect(calendar.requests[0].date).toBe(calendar.requests[1].date);
  expect(backend.credits[users[0].id]).toBe(initial + 5);
  await page
    .getByRole("button", { name: "Claim 5 class credits", exact: true })
    .click();
  await expect(page.locator(".calendar-live")).toContainText(
    "Day 2 is stamped",
  );
  expect(backend.credits[users[0].id]).toBe(initial + 10);
  expect(calendar.requests[2].request).not.toBe(calendar.requests[0].request);
});

test("student calendars and practice journals stay separate when accounts change", async ({
  page,
  calendar,
}) => {
  await page.goto("./");
  await signIn(page);
  await page.goto("./#/daily-rewards");
  await page
    .getByRole("button", { name: "Claim 5 class credits", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Claimed today", exact: true }),
  ).toBeDisabled();
  await page.goto("./#/island/activities/cards?topic=life");
  await page.locator("[data-focus-key=flip-card]").click();
  await page.getByRole("button", { name: "I know this", exact: true }).click();
  await signOut(page);
  await signIn(page, "student2");
  await page.goto("./#/daily-rewards");
  await expect(
    page.getByRole("button", { name: "Claim 5 class credits", exact: true }),
  ).toBeEnabled();
  expect(calendar.calendars[users[1].id]).toBeUndefined();
  await page.goto("./#/island/activities/cards?topic=life");
  await expect(page.locator(".activity-round-progress strong")).toHaveText(
    "0 / 8",
  );
  await expect(page.locator("[data-focus-key=flip-card]")).toBeVisible();
});

test("teacher reward controls apply only after confirmation and recover from save errors", async ({
  page,
  calendar,
}) => {
  await page.goto("./");
  await signIn(page, "teacher");
  await page.goto("./#/teacher/settings");
  const panel = page.getByRole("region", {
    name: "Daily calendar controls",
    exact: true,
  });
  await panel
    .getByRole("checkbox", { name: "Enable daily claim calendar", exact: true })
    .uncheck();
  await panel.getByLabel("Daily class credits", { exact: true }).fill("7");
  await panel
    .getByLabel("Seventh-day class credits", { exact: true })
    .fill("15");
  await panel
    .getByRole("button", { name: "Save calendar settings", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "Pause daily claims. New calendars will award 7",
  );
  expect(calendar.settings.enabled).toBe(true);
  calendar.failSettings = true;
  await page
    .getByRole("button", { name: "Confirm calendar settings", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "Settings were not saved",
  );
  expect(calendar.settingsWrites).toBe(0);
  calendar.failSettings = false;
  await page
    .getByRole("button", { name: "Confirm calendar settings", exact: true })
    .click();
  await expect(panel.locator(".calendar-settings-status")).toHaveText(
    "Calendar settings saved.",
  );
  expect(calendar.settings).toMatchObject({
    enabled: false,
    daily_credits: 7,
    weekly_credits: 15,
    version: 2,
  });
  await page.reload();
  await expect(
    panel.getByRole("checkbox", {
      name: "Enable daily claim calendar",
      exact: true,
    }),
  ).not.toBeChecked();
  await expect(
    panel.getByLabel("Daily class credits", { exact: true }),
  ).toHaveValue("7");
  await page.goto("./#/daily-rewards");
  await expect(
    page.getByRole("button", { name: "Student rewards preview", exact: true }),
  ).toBeDisabled();
});

test("calendar fits a 320-pixel phone with readable days and keyboard navigation", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto("./");
  await signIn(page);
  await page.goto("./#/daily-rewards");
  await expect(
    page.getByRole("button", { name: "Claim 5 class credits", exact: true }),
  ).toBeEnabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.locator("[data-calendar-day='1']").focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.locator("[data-calendar-day='8']")).toBeFocused();
  await page.keyboard.press("End");
  await expect(page.locator("[data-calendar-day='14']")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toContainText(
    "cannot be claimed early",
  );
  await page.keyboard.press("Escape");
  expect(
    (
      await new AxeBuilder({ page })
        .include(".daily-calendar-page")
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page
    .getByRole("button", { name: "Show today in the calendar", exact: true })
    .click();
  await page.evaluate(() => {
    (document.activeElement as HTMLElement)?.blur();
    window.scrollTo(0, 0);
  });
  await page.screenshot({
    path: testInfo.outputPath("calendar-phone.png"),
    fullPage: true,
  });
  await page.screenshot({
    path: "/tmp/cozy-daily-calendar-phone.png",
    fullPage: true,
  });
});

test("guest Records offers direct sign-in and uninstalled calendar stays an honest preview", async ({
  page,
  backend,
}) => {
  backend.dailyCalendarReady = false;
  await page.goto("./#/records");
  await page
    .getByRole("button", { name: "Explore as guest", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Sign in to save progress", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Email", exact: true }),
  ).toBeVisible();
  expect(backend.tokenCalls).toBe(0);
  await page.keyboard.press("Escape");
  await page.goto("./#/daily-rewards");
  await expect(
    page.getByRole("button", { name: "Calendar preview", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", {
      name: "Sign in to start my calendar",
      exact: true,
    }),
  ).toBeVisible();
  expect(backend.signupCalls).toBe(0);
});
