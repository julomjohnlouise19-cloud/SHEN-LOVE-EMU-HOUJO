import { test, expect, exploreAsGuest } from "./fixtures";
import AxeBuilder from "@axe-core/playwright";

for (const topic of [
  {
    name: "Anatomy & Body Systems",
    branch: "life",
    model: "Human anatomy: an organ map",
    part: "Heart",
    explanation: "muscular pump",
    source: "Anatomy and Physiology 2e",
  },
  {
    name: "Volcanoes & Earthquakes",
    branch: "earth",
    model: "Inside a volcano",
    part: "Magma storage",
    explanation: "outer core",
    source: "Volcano and Earthquake Information",
  },
]) {
  test(`${topic.name} has complete study notes, a labelled model, sources and a playable deck`, async ({
    page,
  }) => {
    await exploreAsGuest(page, "/#/sources");
    await page
      .getByRole("searchbox", { name: "Search science references" })
      .fill(topic.name);
    await page
      .getByRole("button", {
        name: `Read ${topic.name} study guide`,
        exact: true,
      })
      .click();
    const notes = page.getByRole("dialog", {
      name: `${topic.name} · study notes`,
      exact: true,
    });
    await expect(notes.locator(".study-citations")).toContainText(topic.source);
    await notes
      .getByRole("button", { name: "Explore the labels", exact: true })
      .click();
    const model = page.getByRole("dialog", { name: topic.model, exact: true });
    await model.getByRole("button", { name: topic.part, exact: true }).click();
    await expect(model.locator(".illustration-explanation")).toContainText(
      topic.explanation,
    );
    await page.setViewportSize({ width: 320, height: 740 });
    expect(
      (
        await new AxeBuilder({ page })
          .include(".illustration-dialog")
          .withTags(["wcag2a", "wcag2aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await page.screenshot({
      path: `/tmp/cozy-${topic.branch}-topic-model.png`,
    });
    await model
      .getByRole("button", { name: "Close and return to page", exact: true })
      .click();
    await notes.locator(".study-check summary").click();
    await expect(notes.locator(".study-check p")).toBeVisible();
    await notes
      .getByRole("button", { name: "Close and return to page", exact: true })
      .click();
    await page.goto(`/#/branch/${topic.branch}`);
    await page
      .getByRole("button", { name: `Open ${topic.name}`, exact: true })
      .click();
    await page
      .getByRole("button", { name: "Let’s make a discovery", exact: true })
      .click();
    await expect(page.locator(".question-card")).toBeVisible();
    await expect(page.locator(".question-card")).not.toBeEmpty();
  });
}
