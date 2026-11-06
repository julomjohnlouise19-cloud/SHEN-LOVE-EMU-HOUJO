import { test, expect } from "@playwright/test";
import { resolve } from "node:path";

test.use({ javaScriptEnabled: false });

test("raw source HTML provides a styled online-lab link without app scripts", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.setViewportSize({ width: 390, height: 844 });
  // Managed Chromium blocks file://; serve the exact source without Vite transforms.
  await page.route("**/downloaded-index.html", (route) =>
    route.fulfill({ path: resolve("index.html"), contentType: "text/html" }),
  );
  await page.goto("/downloaded-index.html");
  await expect(
    page.getByRole("heading", { name: "Getting your little lab ready…" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "open the online science lab" }),
  ).toHaveAttribute(
    "href",
    "https://julomjohnlouise19-cloud.github.io/SHEN-LOVE-EMU-HOUJO/",
  );
  await expect(
    page.getByText(
      "A downloaded HTML file cannot run the full game on its own.",
    ),
  ).toBeVisible();
  await expect(
    page.getByText("The lab needs JavaScript enabled in your browser."),
  ).toBeVisible();
  await expect(page.locator(".startup-screen")).toHaveCSS(
    "background-color",
    "rgb(247, 246, 237)",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "/tmp/cozy-downloaded-html.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
