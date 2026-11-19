import AxeBuilder from "@axe-core/playwright";
import { test, expect, users } from "./wheel-fixtures";
import { signIn, signOut } from "./cloud-fixtures";
import {
  visitRenderedRoute,
  displayMode,
  brightSurfaces,
  boundedPage,
} from "./interface-helpers";

test("daily wheel awards shared class credits, refreshes the wallet and keeps the same receipt", async ({
  page,
  backend,
  wheel,
}) => {
  await page.goto("./");
  await signIn(page);
  await visitRenderedRoute(page, "/spin");
  const before = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("csl:state")!).users.find(
        (u: { id: string }) => u.id === "00000000-0000-4000-8000-000000000001",
      ).merits,
  );
  await page
    .getByRole("button", { name: "Spin for class credits", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Your daily discovery", exact: true }),
  ).toContainText("5 class credits saved");
  await expect.poll(() => backend.credits[users[0].id]).toBe(205);
  await expect(page.locator(".balance-pill")).toContainText("205");
  expect(wheel.claims.size).toBe(1);
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("csl:state")!).users.find(
          (u: { id: string }) =>
            u.id === "00000000-0000-4000-8000-000000000001",
        ).merits,
    ),
  ).toBe(before);
  await page.reload();
  await expect(page.locator(".spin-availability")).toHaveText(
    "Today’s spin is complete",
  );
  await expect(
    page.getByRole("button", { name: "Spin for class credits", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Refresh wheel", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "Your daily discovery", exact: true }),
  ).toContainText("5 class credits saved");
  await expect(
    page.getByRole("heading", { name: "5 class credits saved", exact: true }),
  ).toHaveCount(1);
  await expect(page.locator(".wheel-next-spin time")).toHaveAttribute(
    "datetime",
    "2026-11-19",
  );
  await expect(page.locator("#toasts")).not.toContainText(
    "class credits saved to your wallet",
  );
  expect(wheel.requests).toHaveLength(1);
  const shop = page.getByRole("button", {
    name: "Visit the supply shop",
    exact: true,
  });
  await shop.focus();
  const reads = wheel.reads;
  await page.evaluate(
    (owner) =>
      window.dispatchEvent(
        new CustomEvent("csl:daily-wheel", { detail: owner }),
      ),
    users[0].id,
  );
  await expect.poll(() => wheel.reads).toBeGreaterThan(reads);
  await expect(shop).toBeFocused();
  await displayMode(page, "dark");
  for (const width of [1280, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await boundedPage(page);
    expect(await brightSurfaces(page, "#main")).toEqual([]);
    expect(
      (
        await new AxeBuilder({ page })
          .include("#main")
          .withTags(["wcag2a", "wcag2aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await page.screenshot({ path: `/tmp/cozy-class-wheel-dark-${width}.png` });
  }
});

test("a lost spin response retries the same request without awarding twice", async ({
  page,
  backend,
  wheel,
}) => {
  wheel.failAfter = true;
  await page.goto("./");
  await signIn(page);
  await visitRenderedRoute(page, "/spin");
  const spin = page.getByRole("button", {
    name: "Spin for class credits",
    exact: true,
  });
  await spin.click();
  await expect(page.locator(".class-wheel-page .form-error")).toContainText(
    "interrupted",
  );
  expect(backend.credits[users[0].id]).toBe(205);
  await spin.click();
  await expect(
    page.getByRole("region", { name: "Your daily discovery", exact: true }),
  ).toContainText("5 class credits saved");
  expect(wheel.requests).toHaveLength(2);
  expect(wheel.requests[0]).toBe(wheel.requests[1]);
  expect(wheel.claims.size).toBe(1);
  expect(backend.credits[users[0].id]).toBe(205);
});

test("two tabs share one daily outcome and the next day opens a durable zero-credit discovery", async ({
  page,
  context,
  backend,
  wheel,
}) => {
  let release = () => {};
  wheel.holdSpin = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.goto("./");
  await signIn(page);
  await visitRenderedRoute(page, "/spin");
  const other = await context.newPage();
  await other.goto("./#/spin");
  await expect(
    other.getByRole("button", { name: "Spin for class credits", exact: true }),
  ).toBeEnabled();
  await Promise.all(
    [page, other].map((p) =>
      p
        .getByRole("button", { name: "Spin for class credits", exact: true })
        .click(),
    ),
  );
  await expect.poll(() => wheel.requests.length).toBe(2);
  release();
  wheel.holdSpin = undefined;
  for (const tab of [page, other])
    await expect(tab.locator(".spin-availability")).toHaveText(
      "Today’s spin is complete",
    );
  expect(backend.credits[users[0].id]).toBe(205);
  expect(wheel.claims.size).toBe(1);
  wheel.day = "2026-11-19";
  wheel.prize = 0;
  wheel.slot = 0;
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await page
    .getByRole("button", { name: "Spin for class credits", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Your daily discovery", exact: true }),
  ).toContainText("No class credits this spin. Your balance stays the same.");
  await expect(
    page.getByRole("button", { name: "Refresh wheel", exact: true }),
  ).toHaveCount(0);
  await expect(page.locator(".wheel-next-spin time")).toHaveAttribute(
    "datetime",
    "2026-11-20",
  );
  await expect(page.locator("#toasts")).not.toContainText("0 class credits");
  await page.reload();
  await expect(page.locator(".spin-availability")).toHaveText(
    "Today’s spin is complete",
  );
  const discovery = page.getByRole("region", {
    name: "Your daily discovery",
    exact: true,
  });
  await displayMode(page, "dark");
  for (const width of [1280, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await boundedPage(page);
    expect(
      (
        await new AxeBuilder({ page })
          .include("#main")
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await discovery.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `/tmp/cozy-wheel-zero-clean-${width}.png` });
  }
  await discovery
    .getByRole("button", { name: "Explore Science Island", exact: true })
    .click();
  await expect(page).toHaveURL(/#\/island$/);
  expect(backend.credits[users[0].id]).toBe(205);
  expect(wheel.claims.size).toBe(2);
});

test("an interrupted wheel read has a working retry without a refresh control", async ({
  page,
  wheel,
  backend,
}) => {
  wheel.failRead = true;
  await page.goto("./");
  await signIn(page);
  await visitRenderedRoute(page, "/spin");
  const error = page.locator(".class-wheel-page .form-error");
  await expect(error).toContainText("could not connect");
  await expect(
    page.getByRole("button", { name: "Refresh wheel", exact: true }),
  ).toHaveCount(0);
  wheel.failRead = false;
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Spin for class credits", exact: true }),
  ).toBeEnabled();
  await expect(error).toHaveCount(0);
  expect(wheel.requests).toHaveLength(0);
  expect(backend.credits[users[0].id]).toBe(200);
});

test("late spin responses stay with the original account after logout", async ({
  page,
  backend,
  wheel,
}) => {
  let release = () => {};
  wheel.holdSpin = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.goto("./");
  await signIn(page);
  await visitRenderedRoute(page, "/spin");
  await page
    .getByRole("button", { name: "Spin for class credits", exact: true })
    .click();
  await expect.poll(() => wheel.requests.length).toBe(1);
  await signOut(page);
  await signIn(page, "student2");
  await visitRenderedRoute(page, "/spin");
  release();
  await expect.poll(() => backend.credits[users[0].id]).toBe(205);
  expect(backend.credits[users[1].id]).toBe(200);
  await expect(
    page.getByRole("button", { name: "Spin for class credits", exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByRole("region", { name: "Your daily discovery", exact: true }),
  ).toHaveCount(0);
});

test("cloud guests and classrooms awaiting activation get an honest class-credit entry", async ({
  page,
  backend,
  wheel,
}) => {
  backend.dailyWheelReady = false;
  await page.goto("./");
  await page
    .getByRole("button", { name: "Explore as guest", exact: true })
    .click();
  await visitRenderedRoute(page, "/spin");
  await expect(
    page.getByRole("button", { name: "Sign in to spin", exact: true }),
  ).toBeVisible();
  expect(wheel.reads).toBe(0);
  await expect(page.locator(".class-wheel-page")).not.toContainText(
    "practice merits",
  );
  await signOut(page);
  await signIn(page);
  await visitRenderedRoute(page, "/spin");
  await expect(page.locator(".class-wheel-page")).toContainText(
    "Your teacher is preparing class rewards",
  );
  await expect(
    page.getByRole("button", { name: "Spin for class credits", exact: true }),
  ).toBeDisabled();
  expect(wheel.requests).toHaveLength(0);
  expect(backend.credits[users[0].id]).toBe(200);
});

test("teachers preview the student wheel and edit the configured maximum", async ({
  page,
  backend,
  wheel,
}) => {
  await page.goto("./");
  await signIn(page, "teacher");
  await visitRenderedRoute(page, "/spin");
  await expect(page.locator(".class-wheel-page")).toContainText(
    "Student reward preview",
  );
  await expect(
    page.getByRole("button", { name: "Spin for class credits", exact: true }),
  ).toBeDisabled();
  expect(wheel.requests).toHaveLength(0);
  expect(backend.credits[users[2].id]).toBe(200);
  await visitRenderedRoute(page, "/teacher/settings");
  await expect(
    page.getByLabel("Daily class-credit spin maximum", { exact: true }),
  ).toHaveValue(String(backend.rules.spinMax));
});
