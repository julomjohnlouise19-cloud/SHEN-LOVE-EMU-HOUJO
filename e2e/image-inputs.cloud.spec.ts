import { test, expect, signIn, signOut, users } from "./cloud-fixtures";
import {
  applyDesign,
  banner,
  closeProfile,
  editor,
} from "./profile-design-helpers";

for (const input of ["photo", "banner"] as const) {
  for (const failure of ["empty labels", "decoding fallback"] as const) {
    test(`${input} accepts real images with ${failure}`, async ({
      page,
      backend,
    }) => {
      if (failure === "decoding fallback")
        await page.addInitScript(() =>
          Object.defineProperty(globalThis, "createImageBitmap", {
            value: undefined,
            configurable: true,
          }),
        );
      await page.goto("./");
      await signIn(page);
      const file = await banner(page);
      if (failure === "empty labels") {
        file.mimeType = "";
        file.name = "camera-photo";
      }
      if (input === "photo") {
        await page
          .getByRole("button", { name: "Open scientist profile", exact: true })
          .click();
        await page
          .getByLabel("Choose profile photo", { exact: true })
          .setInputFiles(file);
        await expect.poll(() => backend.photoUploads).toBe(1);
        await expect(page.locator(".profile-photo-editor img")).toBeVisible();
      } else {
        const design = await editor(page);
        await design
          .getByRole("button", { name: "My banner", exact: true })
          .click();
        await design
          .getByLabel("Upload your banner", { exact: true })
          .setInputFiles(file);
        await expect(design.locator(".design-preview-cover img")).toBeVisible();
        expect(backend.photoUploads).toBe(0);
      }
    });
  }
}

for (const input of ["photo", "banner"] as const) {
  test(`${input} keeps the saved image on a corrupt file and accepts a camera-sized retry`, async ({
    page,
    backend,
  }) => {
    await page.goto("./");
    await signIn(page);
    const file = await banner(page);
    const dialog = input === "banner" ? await editor(page) : null;
    if (!dialog)
      await page
        .getByRole("button", { name: "Open scientist profile", exact: true })
        .click();
    const scope = dialog ?? page.locator(".profile-photo-editor");
    const picker = scope.getByLabel(
      input === "photo" ? "Choose profile photo" : "Upload your banner",
      { exact: true },
    );
    await picker.setInputFiles(file);
    if (dialog) {
      await expect(dialog.locator(".design-preview-cover img")).toBeVisible();
      await applyDesign(dialog);
      await expect(dialog).toHaveCount(0);
    } else {
      await expect.poll(() => backend.profiles[0].photo_path).not.toBeNull();
    }
    const savedPhoto = backend.profiles[0].photo_path;
    const savedDesign = structuredClone(backend.designMetadata[users[0].id]);
    const current = dialog ? await editor(page) : scope;
    const retry = current.getByLabel(
      input === "photo" ? "Choose profile photo" : "Upload your banner",
      { exact: true },
    );
    await retry.setInputFiles({ ...file, buffer: file.buffer.subarray(0, 33) });
    await expect(current.getByRole("alert")).not.toBeEmpty();
    expect(backend.profiles[0].photo_path).toBe(savedPhoto);
    expect(backend.designMetadata[users[0].id]).toEqual(savedDesign);
    // Camera files can have large trailing metadata; the decoded image is still small.
    await retry.setInputFiles({
      ...file,
      buffer: Buffer.concat([file.buffer, Buffer.alloc(6 * 1024 * 1024)]),
    });
    await expect(current.locator('.form-error[role="alert"]')).toBeEmpty();
    if (dialog) {
      await expect(current.locator(".design-save-status")).toContainText(
        "Banner ready",
      );
      await applyDesign(current);
      await expect(current).toHaveCount(0);
      expect(backend.profiles[0].photo_path).toBe(savedPhoto);
    } else {
      await expect.poll(() => backend.photoUploads).toBe(2);
      await expect(current.locator(".photo-upload-status")).toContainText(
        "Your photo is saved",
      );
      expect(backend.designMetadata[users[0].id]).toEqual(savedDesign);
    }
    expect(backend.photoUploads).toBe(2);
  });
}

test("resetting a banner cancels a pending image without restoring a late preview", async ({
  page,
  backend,
}) => {
  await page.addInitScript(() => {
    const decode = createImageBitmap.bind(globalThis);
    Object.defineProperty(globalThis, "createImageBitmap", {
      configurable: true,
      value: async (...args: Parameters<typeof createImageBitmap>) => {
        const bitmap = await decode(...args);
        await new Promise<void>((resolve) => {
          Object.assign(window, { releaseBannerDecode: resolve });
        });
        return bitmap;
      },
    });
  });
  await page.goto("./");
  await signIn(page);
  const design = await editor(page);
  await design
    .getByLabel("Upload your banner", { exact: true })
    .setInputFiles(await banner(page));
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          typeof (window as unknown as { releaseBannerDecode?: () => void })
            .releaseBannerDecode,
      ),
    )
    .toBe("function");
  await design
    .getByRole("button", { name: "Reset banner", exact: true })
    .click();
  await page.evaluate(() =>
    (
      window as unknown as { releaseBannerDecode: () => void }
    ).releaseBannerDecode(),
  );
  await expect(design.locator(".design-preview-cover img")).toHaveCount(0);
  await applyDesign(design);
  await expect(design).toHaveCount(0);
  expect(backend.photoUploads).toBe(0);
  expect(backend.designMetadata[users[0].id]).toMatchObject({
    banner_path: null,
  });
});

test("removing a photo succeeds when old-file cleanup is temporarily unavailable", async ({
  page,
  context,
  backend,
}) => {
  await page.goto("./");
  await signIn(page);
  await page
    .getByRole("button", { name: "Open scientist profile", exact: true })
    .click();
  const photo = page.locator(".profile-photo-editor");
  await photo
    .getByLabel("Choose profile photo", { exact: true })
    .setInputFiles(await banner(page));
  await expect.poll(() => backend.profiles[0].photo_path).not.toBeNull();
  await context.route("**/storage/v1/object/csl-avatars", (route) =>
    route.request().method() === "DELETE"
      ? route.fulfill({
          status: 503,
          contentType: "application/json",
          body: "{}",
          headers: { "access-control-allow-origin": "*" },
        })
      : route.fallback(),
  );
  await photo
    .getByRole("button", { name: "Remove photo", exact: true })
    .click();
  await expect.poll(() => backend.profiles[0].photo_path).toBeNull();
  await expect(photo.locator("img")).toHaveCount(0);
  await expect(photo.getByRole("alert")).toBeEmpty();
  await expect(photo.locator(".photo-upload-status")).toContainText(
    "illustrated avatar is ready",
  );
});

test("a photo upload cannot attach to a different account after sign-in changes", async ({
  page,
  context,
  backend,
}) => {
  await page.goto("./");
  await signIn(page);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let reached!: () => void;
  const waiting = new Promise<void>((resolve) => {
    reached = resolve;
  });
  await context.route("**/storage/v1/object/csl-avatars/**", async (route) => {
    if (route.request().method() === "POST") {
      reached();
      await gate;
    }
    await route.fallback();
  });
  await page
    .getByRole("button", { name: "Open scientist profile", exact: true })
    .click();
  await page
    .getByLabel("Choose profile photo", { exact: true })
    .setInputFiles(await banner(page));
  await waiting;
  try {
    await closeProfile(page);
    await signOut(page);
    await signIn(page, "student2");
    release();
    await expect.poll(() => backend.removedPhotoPaths.length).toBe(1);
    expect(backend.profiles[0].photo_path).toBeNull();
    expect(backend.profiles[1].photo_path).toBeNull();
    await page
      .getByRole("button", { name: "Open scientist profile", exact: true })
      .click();
    await expect(page.locator(".profile-photo-editor img")).toHaveCount(0);
  } finally {
    release();
  }
});
