import { expect, type Page } from "@playwright/test";

export async function editor(page: Page) {
  const profile = page.getByRole("dialog", {
    name: "Your scientist profile",
    exact: true,
  });
  if (!(await profile.isVisible()))
    await page
      .getByRole("button", { name: "Open scientist profile", exact: true })
      .click();
  await profile
    .getByRole("button", { name: "Borders & banner", exact: true })
    .click();
  const design = page.getByRole("dialog", {
    name: "Your profile design",
    exact: true,
  });
  await expect(design).toBeVisible();
  return design;
}

export async function banner(page: Page) {
  const data = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 700;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#173f63";
    ctx.fillRect(0, 0, 400, 350);
    ctx.fillStyle = "#f4d584";
    ctx.fillRect(0, 350, 400, 350);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  return {
    name: "my-cover.png",
    mimeType: "image/png",
    buffer: Buffer.from(data, "base64"),
  };
}

export async function closeProfile(page: Page) {
  await page
    .getByRole("dialog", { name: "Your scientist profile", exact: true })
    .getByRole("button", { name: "Close and return to page", exact: true })
    .click();
}
