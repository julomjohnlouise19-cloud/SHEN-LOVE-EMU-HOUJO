import { expect, type Page } from "@playwright/test";

export async function displayMode(page: Page, mode: "light" | "dark") {
  await page
    .getByRole("button", { name: "Open scientist profile", exact: true })
    .click();
  await page.getByRole("button", { name: "Appearance", exact: true }).click();
  const control = page.getByRole("switch", { name: "Dark mode", exact: true });
  if ((await control.isChecked()) !== (mode === "dark"))
    await page.locator(".dark-mode-switch").click();
  await expect(page.locator("html")).toHaveAttribute("data-color-mode", mode);
  await page
    .getByRole("dialog", { name: "Your scientist profile", exact: true })
    .getByRole("button", { name: "Close and return to page", exact: true })
    .click();
}

export async function boundedPage(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}

export async function visitRenderedRoute(page: Page, route: string) {
  await page.goto(`#${route}`);
  await expect(page.locator("#main")).toHaveAttribute("data-page-route", route);
}

export async function brightSurfaces(page: Page, scope = "body") {
  return page.locator(scope).evaluate((root) => {
    const selectors = [
      ".paper",
      ".review-intro",
      ".boss-card",
      ".researcher-card",
      ".researcher-card-top",
      ".researcher-hobbies li",
      ".about-intro-badges > span",
      ".about-introduction",
      ".auth-email",
      ".auth-fields",
      ".auth-mail-help",
      ".terms-agreement",
      "dialog",
      ".empty-state",
      ".welcome-hero",
      ".hero-card",
      ".calendar-board",
      ".class-shop-card",
      ".friend-card",
      ".level-card",
      ".badge",
      ".experiment-readout",
      ".activity-round-progress",
      ".daily-challenge",
      ".record-card",
      ".design-tabs",
      ".design-position-controls",
      ".design-upload-zone",
      ".design-upload-icon",
      ".design-review-details",
      ".design-review-views",
      ".design-preview-state",
      ".design-share-choice",
      ".spin-discovery-card",
      "button",
      "input:not([type=checkbox]):not([type=radio]):not([type=range])",
      "select",
      "textarea",
    ].join(",");
    const luminance = (raw: string) => {
      const channels = raw.match(/[\d.]+/g)?.map(Number) ?? [];
      if (
        channels.length < 3 ||
        (channels[3] !== undefined && channels[3] < 0.85)
      )
        return 0;
      const rgb = channels
        .slice(0, 3)
        .map((n) => n / 255)
        .map((n) => (n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4));
      return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
    };
    return [...root.querySelectorAll<HTMLElement>(selectors)].flatMap(
      (node) => {
        const rect = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        if (
          !rect.width ||
          !rect.height ||
          style.visibility === "hidden" ||
          node.closest("[hidden]")
        )
          return [];
        const colors = [
          style.backgroundColor,
          ...(style.backgroundImage.includes("url(")
            ? []
            : [...style.backgroundImage.matchAll(/rgba?\([^)]+\)/g)].map(
                (match) => match[0],
              )),
        ];
        if (!colors.some((color) => luminance(color) > 0.4)) return [];
        return [
          {
            tag: node.tagName,
            classes: node.className,
            text: node.textContent?.trim().slice(0, 100),
            colors,
          },
        ];
      },
    );
  });
}
