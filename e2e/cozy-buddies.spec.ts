import { test, expect, exploreAsGuest } from "./fixtures";
import { displayMode } from "./interface-helpers";
import cells from "../src/data/questions/life/cells.json" with { type: "json" };
import type { Question } from "../src/core/types";

test("Cozy buddies offer four focused suggestions, precise tasks and useful gated or review actions", async ({
  page,
}) => {
  await exploreAsGuest(page, "/#/growth");
  await expect(page.locator(".growth-badge-card")).toHaveCount(11);
  await expect(page.locator(".growth-stats")).toContainText("0/43");
  const chooser = page.getByRole("combobox", {
    name: "Choose my next badge goal",
    exact: true,
  });
  await expect(chooser.locator("option")).toHaveCount(4);
  expect(
    await chooser
      .locator("option")
      .evaluateAll((nodes) =>
        nodes.every(
          (node) => !(node as HTMLOptionElement).value.startsWith("topic:"),
        ),
      ),
  ).toBe(true);
  await page
    .getByRole("button", {
      name: "Careful Lab Paws · in progress",
      exact: true,
    })
    .click();
  const detail = page.getByRole("dialog", {
    name: "Careful Lab Paws",
    exact: true,
  });
  await expect(detail).toContainText("at least seven correct");
  await expect(detail).toContainText("The Skills Lab opens at Level");
  await detail
    .getByRole("button", { name: "Make this my little goal", exact: true })
    .click();
  await expect(chooser).toHaveValue("buddy:careful-paws");
  await expect(chooser.locator("option")).toHaveCount(4);
  await expect(page.locator(".growth-goal-count")).toHaveText(
    "0 of 7 correct in a finished Skills deck",
  );
  await page
    .getByRole("button", { name: "Build my Skills Lab level", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Cells", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Aha Again · in progress", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Open my Review Box", exact: true })
    .click();
  await expect(page).toHaveURL(/#\/review$/);
  expect(
    await page.evaluate(() => {
      const user = JSON.parse(localStorage.getItem("csl:state")!).users.find(
        (value: { id: string }) => value.id === "guest",
      );
      return [user.xp, user.badges.length];
    }),
  ).toEqual([0, 0]);
});

test("a real answer earns a new animal once and its popup and profile pin remain usable on a phone", async ({
  page,
}) => {
  await exploreAsGuest(page, "/#/growth");
  await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("csl:state")!);
    state.users.find((value: { id: string }) => value.id === "guest").mastery[
      "life.cells"
    ] = { attempts: 19, correct: 19, completed: 2 };
    localStorage.setItem("csl:state", JSON.stringify(state));
  });
  await page.reload();
  await displayMode(page, "dark");
  await page.setViewportSize({ width: 320, height: 740 });
  await expect(page.locator(".growth-goal-copy h2")).toHaveText(
    "Brave Little Bean",
  );
  await page
    .getByRole("button", { name: "Practice for this badge", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Let’s make a discovery", exact: true })
    .click();
  const prompt = await page.locator(".question-card > h2").innerText();
  const question = (cells as Question[]).find(
    (value) => value.prompt === prompt,
  )!;
  if (question.options)
    await page
      .getByRole("button", {
        name: question.options.find((option) => option.id === question.answer)!
          .text,
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
  const popup = page.locator(".toast:has(.achievement-toast-copy)").last();
  await expect(popup).toContainText("Brave Little Bean");
  await expect(popup.locator(".cozy-crew-buddy img")).toHaveAttribute(
    "src",
    /cozy-crew\.webp$/,
  );
  const shortcut = popup.getByRole("button", {
    name: "My badges",
    exact: true,
  });
  const bounds = await shortcut.boundingBox();
  expect(bounds!.height).toBeGreaterThanOrEqual(44);
  await shortcut.click();
  await page
    .getByRole("button", { name: "Brave Little Bean · earned", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Display on my profile", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Display Brave Little Bean", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Save my badges", exact: true })
    .click();
  await expect(
    page.locator('[data-displayed-badge="buddy:brave-bean"]'),
  ).toHaveCount(1);
  await page.screenshot({ path: "/tmp/cozy-new-buddy-pin-dark-320.png" });
  await page.reload();
  await page
    .getByRole("button", { name: "Arrange my badge shelf", exact: true })
    .click();
  await expect(
    page.locator('[data-displayed-badge="buddy:brave-bean"]'),
  ).toHaveCount(1);
});
