import { test, expect, exploreAsGuest } from "./fixtures";
import cells from "../src/data/questions/life/cells.json" with { type: "json" };
import type { Question } from "../src/core/types";

test("learning sounds, mute and motion choices persist and respect actual level-ups and device accessibility", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() => {
    const counts = window as unknown as {
      soundNotes: number;
      confettiSeen: boolean;
    };
    counts.soundNotes = 0;
    counts.confettiSeen = false;
    const Native = window.AudioContext;
    window.AudioContext = class extends Native {
      createOscillator() {
        const oscillator = super.createOscillator();
        const start = oscillator.start.bind(oscillator);
        oscillator.start = (when = 0) => {
          counts.soundNotes++;
          start(when);
        };
        return oscillator;
      }
    };
    addEventListener("DOMContentLoaded", () =>
      new MutationObserver(() => {
        if (document.querySelector(".growth-confetti"))
          counts.confettiSeen = true;
      }).observe(document.body, { childList: true }),
    );
  });
  await exploreAsGuest(page);
  await expect(page.locator("html")).toHaveAttribute("data-motion", "full");
  async function profile() {
    await page
      .getByRole("button", { name: "Open scientist profile", exact: true })
      .click();
    await page.getByRole("button", { name: "Appearance", exact: true }).click();
  }
  await profile();
  await expect(
    page.getByRole("button", { name: "Turn on learning sounds", exact: true }),
  ).toBeEnabled();
  expect(
    await page.evaluate(
      () => (window as unknown as { soundNotes: number }).soundNotes,
    ),
  ).toBe(0);
  await page
    .getByRole("button", { name: "Turn on learning sounds", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Mute learning sounds", exact: true }),
  ).toBeEnabled();
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { soundNotes: number }).soundNotes,
      ),
    )
    .toBeGreaterThan(0);
  await page
    .getByRole("combobox", { name: "Animation style", exact: true })
    .selectOption("reduce");
  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
  await page.keyboard.press("Escape");
  await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem("csl:state")!);
    saved.users.find((user: { id: string }) => user.id === "guest").xp =
      saved.rules.xpPerLevel - saved.rules.correctXP;
    localStorage.setItem("csl:state", JSON.stringify(saved));
  });
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
  await page.goto("/#/branch/life");
  await page.getByRole("button", { name: "Open Cells", exact: true }).click();
  await page
    .getByRole("button", { name: "Easy peasy Recall & recognize", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Let’s make a discovery", exact: true })
    .click();
  async function answer() {
    await expect(
      page.getByRole("button", { name: "Check my answer", exact: true }),
    ).toBeVisible();
    const prompt = await page.locator(".question-card > h2").innerText();
    const question = (cells as Question[]).find((q) => q.prompt === prompt)!;
    if (question.options)
      await page
        .getByRole("button", {
          name: question.options.find(
            (option) => option.id === question.answer,
          )!.text,
          exact: false,
        })
        .click();
    else
      await page
        .getByLabel("Your answer", { exact: true })
        .fill(String(question.answer));
    await page
      .getByRole("button", { name: "Check my answer", exact: true })
      .click();
    await expect(page.locator(".answer-feedback")).toBeVisible();
  }
  await expect(
    page.getByRole("button", { name: "Mute learning sounds", exact: true }),
  ).toBeEnabled();
  await answer();
  await expect(page.locator(".growth-celebration")).toContainText("Level 2");
  await expect(page.locator(".growth-confetti")).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { soundNotes: number }).soundNotes,
      ),
    )
    .toBeGreaterThan(0);
  await profile();
  await page
    .getByRole("combobox", { name: "Animation style", exact: true })
    .selectOption("system");
  await expect(page.locator("html")).toHaveAttribute("data-motion", "full");
  await page.keyboard.press("Escape");
  await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem("csl:state")!);
    saved.users.find((user: { id: string }) => user.id === "guest").xp =
      saved.rules.xpPerLevel * 2 - saved.rules.correctXP;
    localStorage.setItem("csl:state", JSON.stringify(saved));
  });
  await page.reload();
  await answer();
  await expect(page.locator(".growth-celebration")).toContainText("Level 3");
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { confettiSeen: boolean }).confettiSeen,
      ),
    )
    .toBe(true);
  await page
    .getByRole("button", { name: "Mute learning sounds", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Turn on learning sounds", exact: true }),
  ).toBeEnabled();
  const count = await page.evaluate(
    () => (window as unknown as { soundNotes: number }).soundNotes,
  );
  await page
    .getByRole("button", { name: "On to the next little wonder", exact: true })
    .click();
  await answer();
  expect(
    await page.evaluate(
      () => (window as unknown as { soundNotes: number }).soundNotes,
    ),
  ).toBe(count);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Turn on learning sounds", exact: true }),
  ).toBeEnabled();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
});

test.describe("budget Android emulation", () => {
  test.use({
    viewport: { width: 360, height: 740 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
    userAgent:
      "Mozilla/5.0 (Linux; Android 12; SM-A035F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
  });
  test("phone controls and badge artwork work with a slow connection and a throttled CPU", async ({
    page,
    context,
  }, info) => {
    test.setTimeout(180000);
    const client = await context.newCDPSession(page);
    await client.send("Network.enable");
    await client.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 180,
      downloadThroughput: 75 * 1024,
      uploadThroughput: 32 * 1024,
      connectionType: "cellular3g",
    });
    await client.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", {
        name: "A little curiosity starts here.",
        exact: true,
      }),
    ).toBeVisible({ timeout: 45000 });
    await page
      .getByRole("button", { name: "Explore as guest", exact: true })
      .tap();
    await expect(
      page.getByRole("button", { name: "Log out", exact: true }),
    ).toBeVisible({ timeout: 30000 });
    await page
      .getByRole("link", { name: "My growth", exact: true })
      .tap();
    await expect(page.locator(".growth-hero h2")).toHaveText(
      "Curious Seedling",
      { timeout: 30000 },
    );
    const buddy = page.locator(".growth-badge-card .growth-buddy img").first();
    await buddy.scrollIntoViewIfNeeded();
    await expect
      .poll(
        () =>
          buddy.evaluate(
            (image: HTMLImageElement) =>
              image.complete && image.naturalWidth > 0,
          ),
        { timeout: 60000 },
      )
      .toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    const undersized = await page
      .locator(".growth-page .button")
      .evaluateAll((buttons) =>
        buttons
          .filter((button) => button.getBoundingClientRect().height < 44)
          .map((button) => button.textContent),
      );
    expect(undersized).toEqual([]);
    await page
      .getByRole("button", { name: "High five, Tabby!", exact: true })
      .tap();
    await expect(page.locator(".growth-mascot-speech")).toContainText(
      "High five",
    );
    const speech = await page.locator(".growth-mascot-speech").elementHandle();
    const beforeCheer = await page.evaluate(() =>
      localStorage.getItem("csl:state"),
    );
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect
      .poll(() => speech!.evaluate((node) => node.isConnected))
      .toBe(false);
    await expect(page.locator(".growth-mascot-speech")).toContainText(
      "High five",
    );
    expect(await page.evaluate(() => localStorage.getItem("csl:state"))).toBe(
      beforeCheer,
    );
    await speech!.dispose();
    await page.screenshot({ path: "/tmp/cozy-budget-android-growth.png" });
    await info.attach("Android performance setup", {
      body: JSON.stringify({
        viewport: "360x740",
        cpuSlowdown: 4,
        downlinkKBps: 75,
        latencyMs: 180,
        hardware: "Emulated; no physical Android handset available",
      }),
      contentType: "application/json",
    });
  });
});
