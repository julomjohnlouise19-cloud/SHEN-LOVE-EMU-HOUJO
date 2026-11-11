import { test, expect, users } from "./cloud-fixtures";
import { initialState, newUser } from "../src/store/seed";

test("a recreated account with a cached email enters its own lab without inheriting the old identity", async ({
  page,
  context,
  backend,
}) => {
  const now = Date.now();
  const state = initialState("", "", now);
  const old = newUser(
    "previous-cloud-identity",
    users[0].email,
    "Previous scientist",
    now,
  );
  old.role = "admin";
  old.notes.push({
    id: "old-private-note",
    title: "Previous identity notebook",
    text: "This must stay with the previous account.",
    topic: "life.cells",
    created: now,
  });
  state.users.push(old);
  await context.addInitScript((seed) => {
    if (!localStorage.getItem("csl:state"))
      localStorage.setItem("csl:state", JSON.stringify(seed));
  }, state);
  await page.goto("./#/welcome");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByLabel("Email", { exact: true }).fill(users[0].email);
  await page.getByLabel("Password", { exact: true }).fill("cloud-password-123");
  await page.getByRole("button", { name: "Welcome back", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Hey, Student!", exact: true }),
  ).toBeVisible();
  await expect(page).toHaveURL(/#\/$/);
  expect(backend.tokenCalls).toBe(1);
  await expect(
    page.getByRole("link", { name: "Teacher studio", exact: true }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(
      ({ previous, current }) => {
        const saved = JSON.parse(localStorage.getItem("csl:state")!);
        return {
          previousNote: saved.users.find(
            (u: { id: string }) => u.id === previous,
          )?.notes[0]?.title,
          currentNotes: saved.users.find(
            (u: { id: string }) => u.id === current,
          )?.notes.length,
          uniqueNames:
            new Set(saved.users.map((u: { username: string }) => u.username))
              .size === saved.users.length,
        };
      },
      { previous: old.id, current: users[0].id },
    ),
  ).toEqual({
    previousNote: "Previous identity notebook",
    currentNotes: 0,
    uniqueNames: true,
  });
  await page.goto("#/notebook");
  await expect(
    page.getByRole("heading", {
      name: "Previous identity notebook",
      exact: true,
    }),
  ).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Log out", exact: true }),
  ).toBeVisible();
});

test("a previously duplicated account cache repairs itself and keeps the verified notebook and destination", async ({
  page,
  context,
}) => {
  const now = Date.now();
  const state = initialState("", "", now);
  const scientist = newUser(users[0].id, users[0].email, "Student One", now);
  scientist.notes.push({
    id: "own-note",
    title: "My own saved observation",
    text: "This belongs to my verified account.",
    topic: "life.cells",
    created: now,
  });
  state.users.push(
    newUser("earlier-cached-identity", users[0].email, "Earlier account", now),
  );
  state.users.push(scientist);
  await context.addInitScript((seed) => {
    if (!localStorage.getItem("csl:state"))
      localStorage.setItem("csl:state", JSON.stringify(seed));
  }, state);
  await page.goto("./#/welcome?next=%2Fnotebook");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByLabel("Email", { exact: true }).fill(users[0].email);
  await page.getByLabel("Password", { exact: true }).fill("cloud-password-123");
  await page.getByRole("button", { name: "Welcome back", exact: true }).click();
  await expect(page).toHaveURL(/#\/notebook$/);
  await expect(
    page.getByRole("heading", {
      name: "My own saved observation",
      exact: true,
    }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        Object.keys(localStorage).filter((key) =>
          key.startsWith("csl:corrupt:"),
        ).length,
    ),
  ).toBe(0);
});

test("a verified teacher with an old cached email enters the separate teacher studio", async ({
  page,
  context,
}) => {
  const now = Date.now();
  const state = initialState("", "", now);
  state.users.push(
    newUser("old-teacher-identity", users[2].email, "Previous account", now),
  );
  await context.addInitScript((seed) => {
    if (!localStorage.getItem("csl:state"))
      localStorage.setItem("csl:state", JSON.stringify(seed));
  }, state);
  await page.goto("./#/welcome");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByLabel("Email", { exact: true }).fill(users[2].email);
  await page.getByLabel("Password", { exact: true }).fill("cloud-password-123");
  await page.getByRole("button", { name: "Welcome back", exact: true }).click();
  await expect(page).toHaveURL(/#\/teacher$/);
  await expect(
    page.getByRole("heading", { name: "Teacher studio", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Arcade reports", exact: true }),
  ).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Teacher studio", exact: true }),
  ).toBeVisible();
});
