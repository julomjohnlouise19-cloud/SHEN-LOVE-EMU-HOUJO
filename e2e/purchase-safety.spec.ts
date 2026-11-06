import { test, expect } from "./fixtures";
test("a changed price is explained inside the open dialog without charging merits", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Hey, curious mind!" }),
  ).toBeVisible();
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("csl:state")!);
    s.users[0].merits = 500;
    localStorage.setItem("csl:state", JSON.stringify(s));
  });
  await page.reload();
  await page.goto("/#/shop");
  await page
    .getByRole("button", { name: "Exchange 35 merits for Little idea pencils" })
    .click();
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("csl:state")!);
    s.items[0].price = 40;
    localStorage.setItem("csl:state", JSON.stringify(s));
  });
  await page
    .getByRole("button", { name: "Exchange 35 merits", exact: true })
    .click();
  await expect(
    page
      .getByRole("dialog")
      .getByText(/The price changed while you were looking/),
  ).toBeVisible();
  expect(
    await page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem("csl:state")!);
      return [s.users[0].merits, s.items[0].stock, s.purchases.length];
    }),
  ).toEqual([500, 24, 0]);
});
test("a double click creates one purchase and one deduction", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Hey, curious mind!" }),
  ).toBeVisible();
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("csl:state")!);
    s.users[0].merits = 500;
    localStorage.setItem("csl:state", JSON.stringify(s));
  });
  await page.reload();
  await page.goto("/#/shop");
  await page
    .getByRole("button", { name: "Exchange 35 merits for Little idea pencils" })
    .click();
  await page
    .getByRole("button", { name: "Exchange 35 merits", exact: true })
    .evaluate((button: HTMLButtonElement) => {
      button.click();
      button.click();
    });
  await expect(page.locator(".claim-code")).toBeVisible();
  expect(
    await page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem("csl:state")!);
      return [s.users[0].merits, s.items[0].stock, s.purchases.length];
    }),
  ).toEqual([465, 23, 1]);
});
