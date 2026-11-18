import { test, expect, signIn, signOut, users } from "./cloud-fixtures";
import { schoolSections } from "../src/data/sections";

test("profile section dropdowns share signup choices, preserve legacy sections and save teacher changes", async ({
  page,
  backend,
}) => {
  backend.profiles[0].section = "Curiosity Club";
  await page.goto("./");
  await signIn(page);
  await page
    .getByRole("button", { name: "Open scientist profile", exact: true })
    .click();
  const section = page.getByRole("combobox", { name: "Section", exact: true });
  await expect(section).toHaveValue("Curiosity Club");
  for (const choice of schoolSections)
    await expect(
      section.getByRole("option", { name: choice, exact: true }),
    ).toHaveCount(1);
  await page.getByLabel("Name", { exact: true }).fill("Curious Scientist");
  await page
    .getByRole("button", { name: "Save my profile", exact: true })
    .click();
  await expect.poll(() => backend.profiles[0].section).toBe("Curiosity Club");
  await page
    .getByRole("button", { name: "Open scientist profile", exact: true })
    .click();
  await expect(section).toHaveValue("Curiosity Club");
  await section.selectOption("Estiola");
  await page
    .getByRole("button", { name: "Save my profile", exact: true })
    .click();
  await expect.poll(() => backend.profiles[0].section).toBe("Estiola");
  await page.reload();
  await page
    .getByRole("button", { name: "Open scientist profile", exact: true })
    .click();
  await expect(section).toHaveValue("Estiola");
  await page.keyboard.press("Escape");
  await signOut(page);
  await signIn(page, "teacher");
  await page.getByRole("link", { name: "Scientists", exact: true }).click();
  await page
    .getByRole("row")
    .filter({ hasText: "Curious Scientist" })
    .getByRole("button", { name: "Edit profile", exact: true })
    .click();
  const teacherSection = page
    .getByRole("dialog")
    .getByRole("combobox", { name: "Section", exact: true });
  await expect(teacherSection).toHaveValue("Estiola");
  await teacherSection.selectOption("Grejalde");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect
    .poll(
      () => backend.profiles.find((p) => p.user_id === users[0].id)!.section,
    )
    .toBe("Grejalde");
});
