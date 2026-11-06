import { test as base, expect } from "@playwright/test";
export const test = base.extend<{ consoleCheck: void }>({
  consoleCheck: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });
      await use();
      expect(
        errors,
        "Every browser scenario must finish without console errors",
      ).toEqual([]);
    },
    { auto: true },
  ],
});
export { expect };
