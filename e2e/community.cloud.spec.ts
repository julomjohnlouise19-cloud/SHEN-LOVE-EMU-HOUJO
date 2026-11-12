import { test, expect, signIn, signOut, users } from "./community-fixtures";
import AxeBuilder from "@axe-core/playwright";
import { randomUUID } from "node:crypto";
import type { CloudRecord } from "../src/store/cloud";
import { blankCommunitySettings } from "../src/core/community";
const quiz = (
  i: number,
  correct: number,
  extra: Partial<CloudRecord> = {},
): CloudRecord => ({
  id: randomUUID(),
  user_id: users[i].id,
  display_name: `Student ${i + 1}`,
  grade: 8,
  section: "Private section",
  deck_id: "life.cells",
  level: "medium",
  mode: "practice",
  correct,
  total: 8,
  received_at: new Date().toISOString(),
  responses: [],
  ...extra,
});
async function find(page: import("@playwright/test").Page, query = "student2") {
  await page
    .getByRole("searchbox", {
      name: "Classmate's name or sign-in",
      exact: true,
    })
    .fill(query);
  await page
    .getByRole("button", { name: "Find classmates", exact: true })
    .click();
}
test("weekly rankings appear immediately using existing names, keep ties and explain Monday refresh", async ({
  page,
  backend,
}) => {
  backend.rows.push(
    quiz(0, 4),
    quiz(0, 8),
    quiz(0, 6),
    quiz(0, 3, { level: "hard" }),
    quiz(1, 8),
    quiz(1, 3, { deck_id: "chemistry.atoms" }),
  );
  await page.goto("./");
  await signIn(page);
  await page.goto("#/leaderboard");
  const standing = page.getByRole("region", {
    name: "Your discovery standing",
  });
  await expect(standing).toContainText("#1 · 110 discovery points");
  const rows = page.locator(".community-rank-row");
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0).locator(".community-rank-number")).toHaveText("#1");
  await expect(rows.nth(1).locator(".community-rank-number")).toHaveText("#1");
  const week = page.getByRole("region", { name: "Ranking week" });
  await expect(week).toContainText("Monday");
  await expect(week).toContainText("Asia/Manila");
  await expect(week).toContainText("New week in");
  await expect(
    page.getByRole("button", { name: "Choose my username", exact: true }),
  ).toHaveCount(0);
  await rows
    .nth(1)
    .getByRole("button", {
      name: "View Student Two learning card",
      exact: true,
    })
    .click();
  const card = page.getByRole("dialog", {
    name: "Scientist learning card",
    exact: true,
  });
  await expect(card).toContainText("Student Two");
  await expect(card).not.toContainText("student2@example.test");
  await expect(card).not.toContainText("Curiosity");
  await card
    .getByRole("button", { name: "Close and return to page", exact: true })
    .click();
  await page.getByRole("button", { name: "All time", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "All time", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Friends only", exact: true }).click();
  await expect(rows).toHaveCount(1);
  await page
    .getByRole("combobox", { name: "Grade filter", exact: true })
    .selectOption("8");
  await expect(standing).toContainText("Choose All grades");
  await page
    .getByRole("combobox", { name: "Grade filter", exact: true })
    .selectOption("");
  await page.screenshot({
    path: "/tmp/cozy-league-v2-desktop.png",
    fullPage: true,
  });
  await signOut(page);
  await signIn(page, "teacher");
  await page.goto("#/leaderboard");
  await expect(standing).toContainText(
    "Teacher accounts do not enter student rankings.",
  );
});
test("Science friends opens to active classmates and an invitation connects two existing accounts", async ({
  page,
  backend,
  social,
}) => {
  backend.rows.push(quiz(0, 8));
  await page.goto("./");
  await signIn(page);
  await page
    .getByRole("link", { name: "Science friends", exact: true })
    .click();
  const cards = page.getByRole("region", {
    name: "Classmate cards",
    exact: true,
  });
  await expect(
    cards.getByRole("button", {
      name: "View Student Two learning card",
      exact: true,
    }),
  ).toBeVisible();
  await expect(cards).toContainText("Active recently");
  expect(social.directoryCalls).toBeGreaterThan(0);
  await cards.getByRole("button", { name: "Add friend", exact: true }).click();
  await expect.poll(() => social.sent).toBe(1);
  await page.getByRole("button", { name: "Sent (1)", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Cancel invitation", exact: true }),
  ).toBeVisible();
  await signOut(page);
  await signIn(page, "student2");
  await page.goto("#/friends?tab=incoming");
  await page
    .getByRole("button", { name: "Accept invitation", exact: true })
    .click();
  await expect.poll(() => social.links[0].status).toBe("accepted");
  await page
    .getByRole("button", { name: "My friends (1)", exact: true })
    .click();
  await expect(cards).toContainText("Student One");
  await page
    .getByRole("link", { name: "Our discovery league", exact: true })
    .click();
  await expect(page.locator(".community-rank-row")).toHaveCount(2);
  await page
    .locator(".community-rank-list")
    .getByRole("button", {
      name: "View Student One learning card",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Remove friend", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "Remove friend?", exact: true })
    .getByRole("button", { name: "Remove friend", exact: true })
    .click();
  await expect.poll(() => social.links[0].status).toBe("declined");
  await expect(page.locator(".community-rank-row")).toHaveCount(1);
});
test("existing account names and sign-in details find classmates without exposing emails or ambiguous names", async ({
  page,
  backend,
  social,
}) => {
  const other = "10000000-0000-4000-8000-000000000004";
  backend.profiles.push({
    ...backend.profiles[1],
    user_id: other,
    display_name: "Student Two",
  });
  social.settings[other] = { ...blankCommunitySettings(), version: 1 };
  await page.goto("./");
  await signIn(page);
  await page.goto("#/friends");
  await find(page, "Student Two");
  await expect(page.locator(".friend-list .friend-card")).toHaveCount(2);
  const response = page.waitForResponse(
    (r) =>
      r.url().endsWith("/csl_classmate_directory") &&
      r.request().method() === "POST" &&
      r.request().postDataJSON().p_query === "student2@example.test",
  );
  await find(page, "student2@example.test");
  const body = await (await response).json();
  await expect(page.locator(".friend-list .friend-card")).toHaveCount(1);
  expect(body.rows[0].user_id).toBe(users[1].id);
  expect(JSON.stringify(body)).not.toContain("student2@example.test");
  await find(page, "student2");
  await expect(page.locator(".friend-list .friend-card")).toHaveCount(1);
  await find(page, "Nobody named this");
  await expect(
    page.getByRole("heading", { name: "No classmates match yet", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Show all classmates", exact: true })
    .click();
  await expect(page.locator(".friend-list .friend-card")).toHaveCount(2);
});
test("invitations support decline, blocking, unblocking and clear stale-action feedback", async ({
  page,
  social,
}) => {
  await page.goto("./");
  await signIn(page);
  await page.goto("#/friends");
  await page.getByRole("button", { name: "Add friend", exact: true }).click();
  await expect.poll(() => social.sent).toBe(1);
  await signOut(page);
  await signIn(page, "student2");
  await page.goto("#/friends?tab=incoming");
  await page
    .getByRole("button", { name: "Decline invitation", exact: true })
    .click();
  await expect.poll(() => social.links[0].status).toBe("declined");
  await page.getByRole("button", { name: "Classmates", exact: true }).click();
  await page
    .getByRole("button", {
      name: "View Student One learning card",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Block scientist", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "Block scientist?", exact: true })
    .getByRole("button", { name: "Block scientist", exact: true })
    .click();
  await expect.poll(() => social.links[0].status).toBe("blocked");
  await page.getByRole("button", { name: "Blocked", exact: true }).click();
  await page
    .getByRole("button", { name: "Unblock scientist", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "Unblock scientist?", exact: true })
    .getByRole("button", { name: "Unblock scientist", exact: true })
    .click();
  await expect.poll(() => social.links[0].status).toBe("declined");
  await expect(
    page.getByRole("button", { name: "My friends (0)", exact: true }),
  ).toBeVisible();
  social.links[0] = {
    ...social.links[0],
    status: "pending",
    by: users[1].id,
    version: 10,
  };
  await page.getByRole("button", { name: "Sent (0)", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Cancel invitation", exact: true }),
  ).toBeVisible();
  social.links[0].version = 11;
  social.links[0].status = "accepted";
  await page
    .getByRole("button", { name: "Cancel invitation", exact: true })
    .click();
  await expect(page.locator(".friend-control-group .form-error")).toContainText(
    "changed",
  );
  await page
    .getByRole("button", { name: "Refresh circle", exact: true })
    .click();
  await page
    .getByRole("button", { name: "My friends (1)", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Remove friend", exact: true }),
  ).toBeVisible();
});
test("sharing choices have no username form and preserve optional photo sharing and opt-out", async ({
  page,
  backend,
  social,
}) => {
  await page.goto("./");
  await signIn(page);
  await page
    .getByRole("button", { name: "Open scientist profile", exact: true })
    .click();
  const image = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 40;
    c.getContext("2d")!.fillRect(0, 0, 40, 40);
    return c.toDataURL("image/png").split(",")[1];
  });
  await page.getByLabel("Choose profile photo", { exact: true }).setInputFiles({
    name: "science.png",
    mimeType: "image/png",
    buffer: Buffer.from(image, "base64"),
  });
  await expect.poll(() => backend.photoUploads).toBe(1);
  await page
    .getByRole("button", { name: "Classroom sharing", exact: true })
    .click();
  const sharing = page.getByRole("dialog", {
    name: "Your classroom profile",
    exact: true,
  });
  await expect(sharing).toContainText("Student One · your existing account");
  await expect(sharing.getByRole("textbox")).toHaveCount(0);
  await expect(
    sharing.getByRole("checkbox", {
      name: "Show my account name in classmates and rankings",
      exact: true,
    }),
  ).toBeChecked();
  await expect(
    sharing.getByRole("checkbox", {
      name: "Share my profile photo",
      exact: true,
    }),
  ).not.toBeChecked();
  await sharing
    .getByRole("checkbox", { name: "Share my profile photo", exact: true })
    .check();
  await sharing
    .getByRole("button", { name: "Save sharing choices", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "Your scientist profile", exact: true })
    .getByRole("button", { name: "Close and return to page", exact: true })
    .click();
  await signOut(page);
  await signIn(page, "student2");
  await page.goto("#/friends");
  const photo = page.locator(".friend-list").getByRole("img", {
    name: "Student One shared profile photo",
    exact: true,
  });
  await expect(photo).toBeVisible();
  await expect
    .poll(() => photo.evaluate((i) => (i as HTMLImageElement).naturalWidth))
    .toBe(256);
  expect(social.settings[users[0].id].username).toBe("");
  social.settings[users[0].id].share_photo = false;
  await page
    .getByRole("button", { name: "Refresh circle", exact: true })
    .click();
  await expect(photo).toHaveCount(0);
  social.settings[users[0].id].listed = false;
  await page
    .getByRole("button", { name: "Refresh circle", exact: true })
    .click();
  await expect(page.locator(".friend-list .friend-card")).toHaveCount(0);
});
test("the classmate directory and weekly league fit phones with accessible controls", async ({
  page,
  backend,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  backend.rows.push(quiz(0, 8), quiz(1, 5));
  await page.goto("./");
  await signIn(page);
  const guide = page.getByRole("button", {
    name: "Hide guide for now",
    exact: true,
  });
  if (await guide.isVisible()) await guide.click();
  await page.goto("#/friends");
  await expect(page.locator(".friend-list .friend-card")).toHaveCount(1);
  expect(
    (
      await new AxeBuilder({ page })
        .include("#main")
        .withTags(["wcag2a", "wcag2aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "/tmp/cozy-friends-v2-phone.png",
    fullPage: true,
  });
  await page.goto("#/leaderboard");
  await page.getByRole("button", { name: "All time", exact: true }).click();
  await page.getByRole("button", { name: "All time", exact: true }).hover();
  expect(
    (
      await new AxeBuilder({ page })
        .include("#main")
        .withTags(["wcag2a", "wcag2aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "/tmp/cozy-league-v2-phone.png",
    fullPage: true,
  });
});
test("weekly rankings roll over and recent-activity cards refresh without another click", async ({
  page,
  backend,
  social,
}) => {
  social.nowMs = Date.parse("2026-11-15T15:59:30Z");
  backend.rows.push(quiz(0, 8, { received_at: "2026-11-15T14:00:00Z" }));
  await page.clock.install();
  await page.goto("./");
  await signIn(page);
  await page.goto("#/leaderboard");
  const mine = page
    .locator(".community-rank-row")
    .filter({ hasText: "Student One" });
  await expect(mine).toContainText("80 pts");
  await expect(page.locator(".weekly-countdown")).toHaveText("New week in 1m");
  const calls = social.rankingCalls;
  social.nowMs += 61000;
  backend.rows.push(
    quiz(1, 1, { received_at: new Date(social.nowMs).toISOString() }),
  );
  await page.clock.fastForward(61000);
  await expect.poll(() => social.rankingCalls).toBeGreaterThan(calls);
  await expect(mine).toContainText("0 pts");
  await page.getByRole("button", { name: "All time", exact: true }).click();
  await expect(mine).toContainText("80 pts");
  social.presence[users[1].id] = social.nowMs;
  await page.goto("#/friends");
  await expect(
    page.locator(".friend-list .classmate-activity.is-recent"),
  ).toHaveCount(1);
  const before = social.directoryCalls;
  social.nowMs += 180001;
  await page.clock.fastForward(180001);
  await expect.poll(() => social.directoryCalls).toBeGreaterThan(before);
  await expect(
    page.locator(".friend-list .classmate-activity.is-recent"),
  ).toHaveCount(0);
});
test("a crossed invitation still requires acceptance and reports the existing invitation", async ({
  page,
  social,
}) => {
  await page.goto("./");
  await signIn(page);
  await page.goto("#/friends");
  const addFriend = page.getByRole("button", {
    name: "Add friend",
    exact: true,
  });
  await expect(addFriend).toBeVisible();
  social.links.push({
    a: users[0].id,
    b: users[1].id,
    by: users[1].id,
    status: "pending",
    version: 1,
    updated: Date.now(),
  });
  await addFriend.click();
  await expect(
    page.getByText(
      "This scientist already invited you. Open Invitations to reply.",
      { exact: true },
    ),
  ).toBeVisible();
  expect(social.sent).toBe(0);
  await page
    .getByRole("button", { name: "Invitations (1)", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Accept invitation", exact: true })
    .click();
  await expect.poll(() => social.links[0].status).toBe("accepted");
});
test("classrooms awaiting the updated database keep existing profile and account features", async ({
  page,
  backend,
  social,
}) => {
  backend.communityReady = false;
  await page.goto("./");
  await signIn(page);
  await page.goto("#/friends");
  await expect(
    page.getByRole("heading", {
      name: "Your classroom connections are being prepared",
      exact: true,
    }),
  ).toBeVisible();
  expect(social.directoryCalls).toBe(0);
  await page
    .getByRole("button", { name: "Open scientist profile", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Save my profile", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Close and return to page", exact: true })
    .click();
  await signOut(page);
  await signIn(page, "teacher");
  await page.goto("#/leaderboard");
  await expect(
    page.getByRole("link", {
      name: "Open classroom connection setup",
      exact: true,
    }),
  ).toHaveAttribute("href", /COMMUNITY_SETUP/);
});
