import { test, expect, signIn, signOut, users } from "./community-fixtures";
import AxeBuilder from "@axe-core/playwright";
import { randomUUID } from "node:crypto";
import type { CloudRecord } from "../src/store/cloud";
const quiz = (
  index: number,
  correct: number,
  extra: Partial<CloudRecord> = {},
): CloudRecord => ({
  id: randomUUID(),
  user_id: users[index].id,
  display_name: `Student ${index + 1}`,
  grade: 8,
  section: "Private class",
  deck_id: "life.cells",
  level: "medium",
  mode: "practice",
  correct,
  total: 8,
  received_at: new Date().toISOString(),
  responses: [],
  ...extra,
});
async function find(
  page: import("@playwright/test").Page,
  handle = "@CURIOUS_2",
) {
  await page
    .getByRole("searchbox", { name: "Friend’s username", exact: true })
    .fill(handle);
  await page
    .getByRole("button", { name: "Find scientist", exact: true })
    .click();
}
test("shared rankings count daily bests, preserve ties, expose only shared profile fields and support period filters", async ({
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
  backend.preferences[users[0].id] = {
    theme: "meadow",
    bio: "My private introduction",
  };
  await page.goto("./");
  await signIn(page);
  await page.getByRole("link", { name: "Leaderboard", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "Grow curious. Rise together.",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Your discovery standing" }),
  ).toContainText("#1 · 110 discovery points");
  const rows = page.locator(".community-rank-row");
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0).locator(".community-rank-number")).toHaveText("#1");
  await expect(rows.nth(1).locator(".community-rank-number")).toHaveText("#1");
  await expect(rows.nth(1)).not.toContainText("Curiosity");
  await page.screenshot({
    path: "/tmp/cozy-community-leaderboard-desktop.png",
    fullPage: true,
  });
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
  await expect(card).toContainText("@curious_2");
  await expect(card).not.toContainText("student2@example.test");
  await expect(card).not.toContainText("Private class");
  await expect(
    card.getByRole("img", {
      name: "Student Two shared profile photo",
      exact: true,
    }),
  ).toHaveCount(0);
  await card
    .getByRole("button", { name: "Close and return to page", exact: true })
    .click();
  await page.getByRole("button", { name: "All time", exact: true }).click();
  await expect(page).toHaveURL(/period=all/);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "All time", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Friends only", exact: true }).click();
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("Student One");
  await page
    .getByRole("combobox", { name: "Grade filter", exact: true })
    .selectOption("8");
  await expect(
    page.getByRole("region", { name: "Your discovery standing" }),
  ).toContainText("Choose All grades");
  await page
    .getByRole("combobox", { name: "Grade filter", exact: true })
    .selectOption("");
  await expect(rows).toHaveCount(1);
  await signOut(page);
  await signIn(page, "teacher");
  await page.goto("#/leaderboard");
  await expect(
    page.getByRole("region", { name: "Your discovery standing" }),
  ).toContainText("Teacher accounts do not enter student rankings.");
});

test("a username invitation reaches its recipient, needs acceptance and connects the friends ranking", async ({
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
  await find(page);
  await page
    .locator(".friend-search-result")
    .getByRole("button", { name: "Add friend", exact: true })
    .click();
  await expect.poll(() => social.sent).toBe(1);
  expect(social.links[0].status).toBe("pending");
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
  await expect(
    page.getByRole("button", {
      name: "View Student One learning card",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Compare discoveries", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Friends only", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
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

test("students can decline, block and unblock without restoring a friendship, and stale requests explain the conflict", async ({
  page,
  social,
}) => {
  await page.goto("./");
  await signIn(page);
  await page.goto("#/friends");
  await find(page);
  await page.getByRole("button", { name: "Add friend", exact: true }).click();
  await expect.poll(() => social.sent).toBe(1);
  await signOut(page);
  await signIn(page, "student2");
  await page.goto("#/friends?tab=incoming");
  await page
    .getByRole("button", { name: "Decline invitation", exact: true })
    .click();
  await expect.poll(() => social.links[0].status).toBe("declined");
  await find(page, "curious_1");
  await page
    .locator(".friend-search-result")
    .getByRole("button", { name: "Block scientist", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "Block scientist?", exact: true })
    .getByRole("button", { name: "Block scientist", exact: true })
    .click();
  await expect.poll(() => social.links[0].status).toBe("blocked");
  await page.getByRole("button", { name: "Blocked", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Unblock scientist", exact: true }),
  ).toBeVisible();
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

test("classroom sharing is deliberate, unique usernames persist and only an opted-in photo is shown to classmates", async ({
  page,
  backend,
  social,
}) => {
  social.settings[users[0].id].listed = false;
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
    .getByRole("button", { name: "Classroom profile & username", exact: true })
    .click();
  const settings = page.getByRole("dialog", {
    name: "Your classroom profile",
    exact: true,
  });
  await expect(
    settings.getByRole("checkbox", {
      name: "Join the student leaderboard and username search",
      exact: true,
    }),
  ).not.toBeChecked();
  await expect(
    settings.getByRole("checkbox", {
      name: "Share my profile photo",
      exact: true,
    }),
  ).not.toBeChecked();
  await settings
    .getByRole("textbox", { name: "Classroom username", exact: true })
    .fill("CURIOUS_2");
  await settings
    .getByRole("button", { name: "Save classroom profile", exact: true })
    .click();
  await expect(settings.getByRole("alert")).toContainText("already taken");
  await settings
    .getByRole("textbox", { name: "Classroom username", exact: true })
    .fill("Nova_Scientist");
  await settings
    .getByRole("checkbox", {
      name: "Join the student leaderboard and username search",
      exact: true,
    })
    .check();
  await settings
    .getByRole("checkbox", { name: "Share my profile photo", exact: true })
    .check();
  await settings
    .getByRole("button", { name: "Save classroom profile", exact: true })
    .click();
  await expect(settings).toHaveCount(0);
  await page
    .getByRole("dialog", { name: "Your scientist profile", exact: true })
    .getByRole("button", { name: "Close and return to page", exact: true })
    .click();
  await signOut(page);
  await signIn(page, "student2");
  await page.goto("#/friends");
  await find(page, "nova_scientist");
  const shared = page.locator(".friend-search-result").getByRole("img", {
    name: "Student One shared profile photo",
    exact: true,
  });
  await expect(shared).toBeVisible();
  await expect
    .poll(() =>
      shared.evaluate((img) => (img as HTMLImageElement).naturalWidth),
    )
    .toBe(256);
  expect(social.settings[users[0].id]).toMatchObject({
    username: "nova_scientist",
    listed: true,
    share_photo: true,
    share_bio: false,
    share_grade: false,
  });
  social.settings[users[0].id].share_photo = false;
  await find(page, "nova_scientist");
  await expect(shared).toHaveCount(0);
});

test("rankings, shared cards and friend controls remain accessible and stable on a narrow phone", async ({
  page,
  backend,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  backend.rows.push(quiz(0, 8), quiz(1, 5));
  await page.goto("./");
  await signIn(page);
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
    path: "/tmp/cozy-community-leaderboard-phone.png",
    fullPage: true,
  });
  await page
    .locator(".community-rank-list")
    .getByRole("button", {
      name: "View Student Two learning card",
      exact: true,
    })
    .click();
  expect(
    (
      await new AxeBuilder({ page })
        .include("dialog")
        .withTags(["wcag2a", "wcag2aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Close and return to page", exact: true })
    .click();
  await page.goto("#/friends");
  await find(page);
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
    path: "/tmp/cozy-community-friends-phone.png",
    fullPage: true,
  });
});

test("a crossed invitation explains the existing request and still requires recipient acceptance", async ({
  page,
  social,
}) => {
  await page.goto("./");
  await signIn(page);
  await page.goto("#/friends");
  await find(page);
  social.links.push({
    a: users[0].id,
    b: users[1].id,
    by: users[1].id,
    status: "pending",
    version: 1,
    updated: Date.now(),
  });
  await page.getByRole("button", { name: "Add friend", exact: true }).click();
  await expect(
    page.getByText(
      "This scientist already invited you. Open Invitations to reply.",
      { exact: true },
    ),
  ).toBeVisible();
  expect(social.sent).toBe(0);
  expect(social.links[0].status).toBe("pending");
  await page
    .getByRole("button", { name: "Invitations (1)", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Accept invitation", exact: true })
    .click();
  await expect.poll(() => social.links[0].status).toBe("accepted");
});

test("an existing classroom without the community upgrade keeps account features usable and shows honest activation guidance", async ({
  page,
  backend,
  social,
}) => {
  backend.communityReady = false;
  await page.goto("./");
  await signIn(page);
  await page.goto("#/leaderboard");
  await expect(
    page.getByRole("heading", {
      name: "Your classroom connections are being prepared",
      exact: true,
    }),
  ).toBeVisible();
  await page.goto("#/friends");
  await expect(
    page.getByRole("heading", {
      name: "Your classroom connections are being prepared",
      exact: true,
    }),
  ).toBeVisible();
  expect(social.searches).toBe(0);
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
