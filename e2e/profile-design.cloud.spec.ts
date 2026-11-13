import { test, expect, signIn, signOut, users } from "./community-fixtures";
import {
  banner,
  editor,
  closeProfile,
  applyDesign,
} from "./profile-design-helpers";
import type { ProfileDesign } from "../src/core/profile-design";

test("personal designs save to existing accounts before the optional sharing bridge is installed", async ({
  page,
  backend,
}) => {
  const sharedRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/csl_profile_styles"))
      sharedRequests.push(request.url());
  });
  await page.goto("./");
  await signIn(page);
  await page
    .getByRole("button", { name: "Open scientist profile", exact: true })
    .click();
  await page
    .getByLabel("Choose profile photo", { exact: true })
    .setInputFiles(await banner(page));
  await expect.poll(() => backend.profiles[0].photo_path).not.toBeNull();
  const photo = backend.profiles[0].photo_path;
  const credits = backend.credits[users[0].id];
  const design = await editor(page);
  await design
    .getByRole("button", { name: "Choose Moon garden border", exact: true })
    .click();
  await design.getByRole("button", { name: "My banner", exact: true }).click();
  await design
    .getByLabel("Upload your banner", { exact: true })
    .setInputFiles(await banner(page));
  await expect(design.locator(".design-preview-cover img")).toBeVisible();
  await design
    .getByRole("slider", { name: "Vertical image focus", exact: true })
    .fill("100");
  await design
    .getByRole("button", { name: "Preview & finish", exact: true })
    .click();
  expect(backend.designMetadata[users[0].id]).toBeUndefined();
  await applyDesign(design);
  await expect(design).toHaveCount(0);
  expect(backend.designMetadata[users[0].id]).toMatchObject({
    border: "moon-garden",
    y: 100,
    share_banner: false,
  });
  expect(backend.profiles[0].photo_path).toBe(photo);
  expect(backend.credits[users[0].id]).toBe(credits);
  await page.reload();
  const restored = await editor(page);
  await expect(restored.locator(".design-preview-avatar")).toHaveAttribute(
    "data-selected-border",
    "moon-garden",
  );
  await expect(restored.locator(".design-preview-cover img")).toBeVisible();
  await expect(restored.locator(".design-preview-cover img")).toHaveCSS(
    "object-position",
    "50% 100%",
  );
  expect(sharedRequests).toEqual([]);
});

test("a rejected metadata save removes the new upload, keeps the draft and supports retry", async ({
  page,
  backend,
}) => {
  await page.goto("./");
  await signIn(page);
  const design = await editor(page);
  await design.getByRole("button", { name: "My banner", exact: true }).click();
  await design
    .getByLabel("Upload your banner", { exact: true })
    .setInputFiles(await banner(page));
  await expect(design.locator(".design-preview-cover img")).toBeVisible();
  backend.failDesignMetadata = true;
  await applyDesign(design);
  await expect(design.getByRole("alert")).toContainText("could not be saved");
  await expect.poll(() => backend.removedPhotoPaths.length).toBe(1);
  expect(backend.designMetadata[users[0].id]).toBeUndefined();
  await expect(design.locator(".design-review-cover img")).toBeVisible();
  backend.failDesignMetadata = false;
  await applyDesign(design);
  await expect(design).toHaveCount(0);
  const saved = backend.designMetadata[users[0].id] as ProfileDesign;
  expect(saved.banner_path).toBeTruthy();
  expect(backend.removedPhotoPaths).not.toContain(saved.banner_path);
  expect(backend.photoUploads).toBe(2);
});

test("a failed replacement preserves the saved banner and removing it leaves the profile photo alone", async ({
  page,
  context,
  backend,
}) => {
  await page.goto("./");
  await signIn(page);
  let design = await editor(page);
  await design.getByRole("button", { name: "My banner", exact: true }).click();
  await design
    .getByLabel("Upload your banner", { exact: true })
    .setInputFiles(await banner(page));
  await expect(design.locator(".design-preview-cover img")).toBeVisible();
  await applyDesign(design);
  await expect(design).toHaveCount(0);
  const before = structuredClone(
    backend.designMetadata[users[0].id],
  ) as ProfileDesign;
  design = await editor(page);
  await design.getByRole("button", { name: "My banner", exact: true }).click();
  await design
    .getByLabel("Upload your banner", { exact: true })
    .setInputFiles(await banner(page));
  await expect(design.locator(".design-save-status")).toContainText(
    "Banner ready",
  );
  backend.failDesignUploads = true;
  await applyDesign(design);
  await expect(design.getByRole("alert")).toContainText(
    "could not be uploaded",
  );
  expect(backend.designMetadata[users[0].id]).toEqual(before);
  expect(backend.removedPhotoPaths).not.toContain(before.banner_path);
  await design.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(
    page.locator(".scientist-card .profile-cover-image"),
  ).toBeVisible();
  backend.failDesignUploads = false;
  await context.route("**/storage/v1/object/sign/csl-avatars/**", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ message: "Preview temporarily unavailable" }),
      headers: { "access-control-allow-origin": "*" },
    }),
  );
  await page.reload();
  design = await editor(page);
  await design.getByRole("button", { name: "My banner", exact: true }).click();
  await expect(design.locator(".design-banner-notice")).toContainText(
    "has not opened yet",
  );
  await expect(
    design.getByRole("button", { name: "Remove banner", exact: true }),
  ).toBeEnabled();
  await design
    .getByRole("button", { name: "Remove banner", exact: true })
    .click();
  await applyDesign(design);
  await expect(design).toHaveCount(0);
  await expect
    .poll(() => backend.removedPhotoPaths)
    .toContain(before.banner_path);
  expect(backend.designMetadata[users[0].id]).toMatchObject({
    banner_path: null,
    share_banner: false,
  });
  await expect(
    page.locator(".scientist-card .profile-cover-image"),
  ).toHaveCount(0);
});

test("an in-flight save stays bound to its verified owner across logout and another sign-in", async ({
  page,
  context,
  backend,
}) => {
  await page.goto("./");
  await signIn(page);
  const design = await editor(page);
  await design
    .getByRole("button", { name: "Choose Ocean treasures border", exact: true })
    .click();
  let release!: () => void, reached!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const waiting = new Promise<void>((resolve) => {
    reached = resolve;
  });
  await context.route("**/auth/v1/user", async (route) => {
    if (
      route.request().method() === "PUT" &&
      route.request().postDataJSON()?.data?.csl_profile_style
    ) {
      reached();
      await gate;
    }
    await route.fallback();
  });
  await applyDesign(design);
  await waiting;
  try {
    await page.keyboard.press("Escape");
    await closeProfile(page);
    await signOut(page);
    await signIn(page, "student2");
    release();
    await expect
      .poll(() => backend.designMetadata[users[0].id])
      .toMatchObject({ border: "ocean-treasures" });
    expect(backend.designMetadata[users[1].id]).toBeUndefined();
    const other = await editor(page);
    await expect(other.locator(".design-preview-avatar")).toHaveAttribute(
      "data-selected-border",
      "",
    );
    await expect(other.locator(".design-preview-cover img")).toHaveCount(0);
  } finally {
    release();
  }
});

test("shared borders preserve banner consent and teachers can review a private banner", async ({
  page,
  backend,
}) => {
  backend.profileStylesReady = true;
  await page.goto("./");
  await signIn(page);
  let design = await editor(page);
  await design
    .getByRole("button", { name: "Choose Ocean treasures border", exact: true })
    .click();
  await design.getByRole("button", { name: "My banner", exact: true }).click();
  await design
    .getByLabel("Upload your banner", { exact: true })
    .setInputFiles(await banner(page));
  await expect(design.locator(".design-preview-cover img")).toBeVisible();
  await expect(
    design.getByRole("checkbox", {
      name: "Show my banner on my shared learning card",
      exact: true,
    }),
  ).not.toBeChecked();
  await applyDesign(design);
  await expect(design).toHaveCount(0);
  await closeProfile(page);
  await signOut(page);
  await signIn(page, "student2");
  await page.goto("#/leaderboard");
  await page
    .getByRole("button", {
      name: "View Student One learning card",
      exact: true,
    })
    .first()
    .click();
  const card = page.getByRole("dialog", {
    name: "Scientist learning card",
    exact: true,
  });
  await expect(
    card.locator("[data-selected-border='ocean-treasures']"),
  ).toBeVisible();
  await expect(card.locator(".profile-cover-image")).toHaveCount(0);
  await page.setViewportSize({ width: 320, height: 740 });
  expect(
    await card.evaluate((node) => node.scrollWidth <= node.clientWidth),
  ).toBe(true);
  await expect(card.locator(".profile-frame-face")).toBeVisible();
  await card
    .getByRole("button", { name: "Close and return to page", exact: true })
    .click();
  await signOut(page);
  await page.setViewportSize({ width: 1280, height: 720 });
  await signIn(page, "teacher");
  await page.getByRole("link", { name: "Scientists", exact: true }).click();
  await page
    .getByRole("row")
    .filter({ hasText: "Student One" })
    .getByRole("button", { name: "View profile", exact: true })
    .click();
  const teacherCard = page.getByRole("dialog", {
    name: "Scientist profile",
    exact: true,
  });
  await expect(
    teacherCard.locator("[data-selected-border='ocean-treasures']"),
  ).toBeVisible();
  await expect(teacherCard.locator(".profile-cover-image")).toBeVisible();
  await teacherCard
    .getByRole("button", { name: "Close and return to page", exact: true })
    .click();
  await signOut(page);
  await signIn(page);
  design = await editor(page);
  await design.getByRole("button", { name: "My banner", exact: true }).click();
  await design
    .getByRole("checkbox", {
      name: "Show my banner on my shared learning card",
      exact: true,
    })
    .check();
  await applyDesign(design);
  await expect(design).toHaveCount(0);
  await closeProfile(page);
  await signOut(page);
  await signIn(page, "student2");
  await page.goto("#/leaderboard");
  await page
    .getByRole("button", {
      name: "View Student One learning card",
      exact: true,
    })
    .first()
    .click();
  await expect(card.locator(".profile-cover-image")).toBeVisible();
});
