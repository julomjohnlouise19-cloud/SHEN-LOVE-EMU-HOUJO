import type { Page } from "@playwright/test";
import { test, expect } from "./fixtures";
import AxeBuilder from "@axe-core/playwright";
async function ready(page: Page) {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Hey, curious mind!" }),
  ).toBeVisible();
}
async function admin(page: Page) {
  await page.goto("/#/admin");
  await page.getByRole("button", { name: "Admin sign in" }).click();
  await page.getByLabel("Username", { exact: true }).fill("admin");
  await page.getByLabel("Password", { exact: true }).fill("admin123");
  await page.getByRole("button", { name: "Welcome back", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "A little care makes a lab grow." }),
  ).toBeVisible();
}
test("phase 3: all branch decks, Skills Lab gate, seeded share links and calculation practice", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await ready(page);
  for (const id of ["life", "chemistry", "physics", "earth"]) {
    await page.goto(`/#/branch/${id}`);
    await expect(page.locator(".deck-card")).toHaveCount(6);
  }
  await page.goto("/#/branch/skills");
  await expect(
    page.getByRole("heading", { name: "A little more growing to do" }),
  ).toBeVisible();
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("csl:state")!);
    s.users[0].xp = 360;
    localStorage.setItem("csl:state", JSON.stringify(s));
  });
  await page.reload();
  await expect(page.locator(".deck-card")).toHaveCount(3);
  await page.goto("/#/branch/life");
  await page.getByRole("button", { name: "Open Cells", exact: true }).click();
  await page.getByRole("button", { name: "Share a little challenge" }).click();
  const link = await page.getByLabel("Your seeded challenge link").inputValue();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.goto(link);
  await page
    .getByRole("button", { name: "Accept this little challenge" })
    .click();
  await expect(page.locator(".question-card")).toBeVisible();
  const first = await page.locator(".question-card > h2").innerText();
  await page.goto(link);
  await page
    .getByRole("button", { name: "Accept this little challenge" })
    .click();
  await expect(page.locator(".question-card > h2")).toHaveText(first);
  await page.goto("/#/experiment");
  await page.getByRole("slider", { name: "Cart mass in kilograms" }).fill("2");
  await expect(page.locator(".experiment-readout strong")).toHaveText(
    "4.00 m/s²",
  );
  await page.getByRole("button", { name: "Try my little experiment" }).click();
  await expect(
    page.getByRole("button", { name: "Pause my little experiment" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("combobox", { name: "Calculation topic" })
    .selectOption("speed");
  const prompt = await page.locator(".calculation-prompt").innerText();
  const values = prompt.match(/travels (\d+) m in (\d+) s/)!;
  expect(values).toBeTruthy();
  await page
    .getByLabel("Answer in m/s", { exact: true })
    .fill(String(Number(values[1]) / Number(values[2])));
  await page.getByRole("button", { name: "Check my calculation" }).click();
  await expect(page.locator(".calculation-feedback")).toContainText("A-ha!");
  expect(errors).toEqual([]);
});
test("phase 4: a new account hashes its password, blocks admin access, and can change its password", async ({
  page,
}) => {
  await ready(page);
  await page
    .getByRole("button", { name: "Save your progress · Join the lab" })
    .click();
  await page.getByLabel("Your name", { exact: true }).fill("Mika Santos");
  await page.getByLabel("Username", { exact: true }).fill("mika_science");
  await page.getByLabel("Password", { exact: true }).fill("mika-demo-123");
  await page
    .getByRole("combobox", { name: "Grade", exact: true })
    .selectOption("7");
  await page.getByLabel("Section (optional)").fill("SSC Curiosity");
  await page.getByRole("button", { name: "Make my little lab" }).click();
  await expect(page.getByRole("heading", { name: "Hey, Mika!" })).toBeVisible();
  expect(
    await page.evaluate(() => {
      const u = JSON.parse(localStorage.getItem("csl:state")!).users.find(
        (u: { username: string }) => u.username === "mika_science",
      );
      return {
        hashLength: u.hash.length,
        saltLength: u.salt.length,
        role: u.role,
        balance: u.merits,
      };
    }),
  ).toEqual({ hashLength: 64, saltLength: 32, role: "student", balance: 24 });
  await page.goto("/#/admin");
  await expect(
    page.getByRole("heading", { name: "A space for our SSC teachers." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Open scientist profile" }).click();
  await page.getByRole("button", { name: "Change my demo password" }).click();
  await page
    .getByLabel("Current password", { exact: true })
    .fill("mika-demo-123");
  await page.getByLabel("New password", { exact: true }).fill("mika-fresh-456");
  await page.getByRole("button", { name: "Save new password" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Demo password changed." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Open scientist profile" }).click();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Hey, curious mind!" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Open scientist profile" }).click();
  await page.getByRole("button", { name: "Create an account" }).click();
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByLabel("Username", { exact: true }).fill("mika_science");
  await page.getByLabel("Password", { exact: true }).fill("mika-demo-123");
  await page.getByRole("button", { name: "Welcome back", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("isn’t quite right");
  await page.getByLabel("Password", { exact: true }).fill("mika-fresh-456");
  await page.getByRole("button", { name: "Welcome back", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Hey, Mika!" })).toBeVisible();
});
test("phase 4: login cooldown persists across a reload", async ({ page }) => {
  await ready(page);
  await adminLoginForm();
  async function adminLoginForm() {
    await page.goto("/#/admin");
    await page.getByRole("button", { name: "Admin sign in" }).click();
    await page.getByLabel("Username", { exact: true }).fill("admin");
  }
  for (let i = 0; i < 5; i++) {
    await page.getByLabel("Password", { exact: true }).fill(`wrong-demo-${i}`);
    await page
      .getByRole("button", { name: "Welcome back", exact: true })
      .click();
    await expect(page.getByRole("alert")).toContainText("isn’t quite right");
  }
  await page.reload();
  await adminLoginForm();
  await page.getByLabel("Password", { exact: true }).fill("admin123");
  await page.getByRole("button", { name: "Welcome back", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Take a breath.");
});
test("phase 4: unsafe user text is displayed as text", async ({ page }) => {
  await ready(page);
  await page.goto("/#/notebook");
  await page.getByRole("button", { name: "A fresh little page" }).click();
  const payload = "<img src=x onerror=alert(1)>";
  await page.getByLabel("Give your thought a title").fill(payload);
  await page
    .getByLabel("Your science note")
    .fill(
      "A cell membrane controls entry and exit. <script>window.pwned = true</script>",
    );
  await page
    .getByRole("button", { name: "Keep this thought", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: payload, exact: true }),
  ).toBeVisible();
  await expect(page.locator("img")).toHaveCount(0);
  expect(await page.evaluate(() => "pwned" in window)).toBe(false);
});
test("phase 4: corrupt JSON is quarantined and safe defaults load", async ({
  page,
  context,
}) => {
  await context.addInitScript(() => {
    if (!localStorage.getItem("csl:state"))
      localStorage.setItem("csl:state", "{broken");
  });
  await ready(page);
  expect(
    await page.evaluate(
      () =>
        Object.keys(localStorage).filter((k) => k.startsWith("csl:corrupt:"))
          .length,
    ),
  ).toBe(1);
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("csl:state")!).version,
    ),
  ).toBe(3);
});
test("phase 4: quota failure leaves balance and spin untouched and offers backup export", async ({
  page,
}) => {
  await ready(page);
  const balance = await page.evaluate(
    () => JSON.parse(localStorage.getItem("csl:state")!).users[0].merits,
  );
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "csl:state")
        throw new DOMException("Test storage is full", "QuotaExceededError");
      original.call(this, key, value);
    };
  });
  await page.goto("/#/spin");
  await page.getByRole("button", { name: "Let’s give it a spin" }).click();
  await expect(
    page.getByRole("button", { name: "Export backup", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => {
      const u = JSON.parse(localStorage.getItem("csl:state")!).users[0];
      return { merits: u.merits, daily: Object.keys(u.daily).length };
    }),
  ).toEqual({ merits: balance, daily: 0 });
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export backup", exact: true })
    .click();
  expect((await download).suggestedFilename()).toBe("cozy-science-backup.json");
});
test("phase 4: lease fallback also protects the last item across tabs", async ({
  page,
  context,
}) => {
  await context.addInitScript(() =>
    Object.defineProperty(navigator, "locks", {
      value: undefined,
      configurable: true,
    }),
  );
  await ready(page);
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("csl:state")!);
    s.users[0].merits = 500;
    s.items[0].stock = 1;
    localStorage.setItem("csl:state", JSON.stringify(s));
  });
  await page.reload();
  const other = await context.newPage();
  await other.goto("/#/shop");
  await page.goto("/#/shop");
  for (const p of [page, other])
    await p
      .getByRole("button", {
        name: "Exchange 35 merits for Little idea pencils",
      })
      .click();
  await Promise.all([
    page
      .getByRole("button", { name: "Exchange 35 merits", exact: true })
      .click(),
    other
      .getByRole("button", { name: "Exchange 35 merits", exact: true })
      .click(),
  ]);
  await expect
    .poll(() =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem("csl:state")!).purchases.length,
      ),
    )
    .toBe(1);
  expect(
    await page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem("csl:state")!);
      return [s.items[0].stock, s.users[0].merits];
    }),
  ).toEqual([0, 465]);
  await other.close();
});
test("phase 4: invalid backup cannot replace state", async ({ page }) => {
  await ready(page);
  await admin(page);
  await page.getByRole("button", { name: "Audit & backup" }).click();
  await page.getByLabel("Backup JSON file").setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":3,"users":[]}'),
  });
  await page.getByRole("button", { name: "Validate & restore backup" }).click();
  await expect(page.locator("#toasts")).toContainText(
    "not a valid Cozy Science Lab backup",
  );
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("csl:state")!).users.length,
    ),
  ).toBe(2);
});
test("phase 4: a complete first-load cache works after going offline", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await ready(page);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise<void>((resolve) =>
        navigator.serviceWorker.addEventListener(
          "controllerchange",
          () => resolve(),
          { once: true },
        ),
      );
  });
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Hey, curious mind!" }),
  ).toBeVisible();
  await page.goto("/#/branch/chemistry");
  await page
    .getByRole("button", {
      name: "Open Atoms & the Periodic Table",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "Let’s make a discovery" }).click();
  await expect(page.locator(".question-card")).toBeVisible();
  expect(errors).toEqual([]);
  await context.setOffline(false);
});
test("phase 4: accessible Science Island, branch and mobile learning pages", async ({
  page,
}) => {
  await ready(page);
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of [
    "island",
    "branch/life",
    "shop",
    "review",
    "quests",
    "experiment",
  ]) {
    await page.goto(`/#/${route}`);
    await expect(page.locator("main h1")).toBeVisible();
    const violations = (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations.map((v) => ({
      id: v.id,
      targets: v.nodes.map((n) => n.target),
    }));
    expect(violations, route).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      route,
    ).toBe(true);
  }
});
