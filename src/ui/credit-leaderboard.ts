import { currentUser } from "../store";
import { classCredits } from "../store/platform";
import {
  communityReady,
  creditRankingsReady,
  creditRanking,
  communityHome,
  loadSharedPhotos,
} from "../store/community";
import type {
  CommunityHome,
  CreditStanding,
  ScientistCard,
  CommunityScope,
} from "../core/community";
import { h, button, field } from "./dom";
import { icon, mascot } from "./svg";
import { pageHeading } from "./shell";

interface CreditUi {
  entry: () => HTMLElement;
  profile: (
    card: ScientistCard,
    home: CommunityHome,
    changed: () => void,
  ) => HTMLElement;
  sharing: (saved?: () => void) => unknown;
}
let cached:
  | {
      owner: string;
      route: string;
      node: HTMLElement;
      refresh: () => Promise<void>;
      loaded: number;
    }
  | undefined;
export async function creditLeaderboardPage(ui: CreditUi) {
  const owner = currentUser()!.id;
  if (cached?.owner === owner && cached.route === location.hash) {
    if (!cached.node.isConnected) void cached.refresh();
    return cached.node;
  }
  const page = h(
    "div",
    { class: "community-page credit-league page-enter" },
    pageHeading(
      "THE CLASS-CREDIT LEAGUE",
      "Earn, explore, rise together.",
      "See current class-credit balances and celebrate your fellow scientists.",
    ),
  );
  if (!communityReady()) {
    page.append(ui.entry());
    return page;
  }
  if (!creditRankingsReady()) {
    page.append(
      h(
        "section",
        { class: "community-gate paper" },
        icon("trophy", 44),
        h("h2", null, "Class-credit rankings are being prepared"),
        h(
          "p",
          null,
          "Your current balance and saved learning records are safe. Your teacher needs to activate credit rankings for this classroom.",
        ),
        currentUser()?.role !== "admin"
          ? h("strong", null, `${classCredits()} class credits in your account`)
          : null,
        currentUser()?.role === "admin"
          ? h(
              "a",
              {
                class: "button primary",
                href: "https://github.com/julomjohnlouise19-cloud/SHEN-LOVE-EMU-HOUJO/blob/main/docs/CREDIT_RANKINGS_SETUP.md",
                rel: "external noreferrer",
              },
              "Open credit-ranking setup",
            )
          : null,
        h(
          "a",
          { class: "button outline", href: "#/friends" },
          "My science friends",
        ),
      ),
    );
    return page;
  }
  let home: CommunityHome;
  try {
    home = await communityHome();
  } catch (error) {
    page.append(
      h(
        "p",
        { role: "alert", class: "form-error" },
        error instanceof Error ? error.message : "Please try again.",
      ),
    );
    return page;
  }
  let scope: CommunityScope =
    new URLSearchParams(location.hash.split("?")[1]).get("scope") === "friends"
      ? "friends"
      : "school";
  let offset = 0,
    serial = 0;
  const count = (value: number) => value.toLocaleString();
  const standings = h("div", { class: "community-standings" });
  const status = h("p", { class: "community-load-status", role: "status" });
  const own = h("section", {
    class: "your-discovery-card",
    "aria-label": "Your credit standing",
  });
  const groups = h("div", {
    class: "community-toggle",
    "aria-label": "Ranking group",
  });
  const grade = h(
    "select",
    null,
    h("option", { value: "" }, "All grades"),
    ...[7, 8, 9, 10].map((n) =>
      h("option", { value: n }, `Grade ${n} · shared profiles`),
    ),
  );
  const hero = h(
    "section",
    { class: "league-week-card", "aria-label": "Live class-credit rankings" },
    h(
      "span",
      { class: "league-week-emblem", "aria-hidden": true },
      icon("trophy", 44),
    ),
    h(
      "div",
      null,
      h("p", { class: "eyebrow" }, "YOUR BALANCE. YOUR CURRENT STANDING."),
      h("h2", null, "The class-credit leaderboard"),
      h(
        "p",
        null,
        "Highest current balance first. Equal balances share a rank.",
      ),
    ),
    h(
      "div",
      { class: "league-week-timer" },
      h("strong", { class: "credit-live-label" }, "Current balances"),
      h("small", null, "Standings refresh automatically"),
    ),
  );
  function drawOwn(card: CreditStanding | null) {
    own.replaceChildren(
      h(
        "div",
        null,
        h("p", { class: "eyebrow" }, "YOUR PLACE IN THE CLASSROOM"),
        h(
          "h2",
          null,
          card
            ? `#${card.rank} · ${count(card.credits)} class credits`
            : home.teacher
              ? "A teacher’s view of class credit standings"
              : home.settings.listed
                ? "Your account is ready"
                : "Your profile sharing is paused",
        ),
        h(
          "p",
          null,
          card
            ? "Earning credits increases your balance. Reserving supplies and other spending can change your position."
            : home.teacher
              ? "Teacher accounts do not compete in student rankings."
              : home.settings.listed
                ? "Choose All grades to include profiles without a shared grade."
                : "Your existing account can rejoin the standings from sharing choices.",
        ),
      ),
      home.teacher
        ? h(
            "a",
            { class: "button outline", href: "#/teacher/students" },
            "Open Scientists",
          )
        : button(
            "Sharing choices",
            () =>
              ui.sharing(() => {
                void refresh();
              }),
            "button primary",
          ),
      h(
        "a",
        { class: "button outline", href: "#/friends" },
        "My science friends",
      ),
    );
  }
  const changed = () => {
    void refresh();
  };
  async function refresh() {
    const request = ++serial;
    status.textContent = "Refreshing class-credit balances…";
    try {
      const [result, latest] = await Promise.all([
        creditRanking(scope, offset, grade.value ? Number(grade.value) : null),
        communityHome(),
      ]);
      if (request !== serial || currentUser()?.id !== owner) return;
      home = latest;
      const rows = [...result.rows].sort((a, b) => b.credits - a.credits);
      if (cached?.node === page) cached.loaded = Date.now();
      drawOwn(result.you);
      standings.replaceChildren();
      if (!rows.length)
        standings.append(
          h(
            "div",
            { class: "community-empty paper" },
            mascot("sprout"),
            h(
              "h2",
              null,
              scope === "friends"
                ? "Your science circle starts here"
                : "A little room for growing scientists",
            ),
            h(
              "p",
              null,
              scope === "friends"
                ? "Accept a classmate’s invitation to compare your class credits."
                : "Student profiles appear according to their classroom sharing choices.",
            ),
            h(
              "a",
              {
                class: "button primary",
                href: scope === "friends" ? "#/friends" : "#/island",
              },
              scope === "friends" ? "Find a science friend" : "Explore science",
            ),
          ),
        );
      if (rows.length)
        standings.append(
          h(
            "div",
            { class: "league-ranking-heading" },
            h("h2", null, "Class-credit standings"),
            h(
              "p",
              { id: "ranking-order-note" },
              h(
                "span",
                { class: "ranking-order-pill" },
                icon("trophy", 15),
                "Highest credits first",
              ),
              h(
                "span",
                null,
                "Equal balances share a rank. Your saved wallet determines your place.",
              ),
            ),
          ),
        );
      if (!offset && rows.length)
        standings.append(
          h(
            "section",
            { class: "community-podium", "aria-label": "Leading scientists" },
            ...rows
              .slice(0, 3)
              .map((card) =>
                h(
                  "article",
                  { class: `podium-place place-${Math.min(card.rank, 3)}` },
                  h(
                    "span",
                    { class: "podium-rank" },
                    icon("trophy", 22),
                    `#${card.rank}`,
                  ),
                  h(
                    "p",
                    { class: "podium-honor" },
                    card.rank === 1
                      ? "Class-credit leader"
                      : card.rank === 2
                        ? "Curious achiever"
                        : "Rising scientist",
                  ),
                  ui.profile(card, home, changed),
                  h(
                    "strong",
                    { class: "podium-points" },
                    `${count(card.credits)} credits`,
                  ),
                  h("p", null, "Current class-credit balance"),
                ),
              ),
          ),
        );
      standings.append(
        h(
          "ol",
          {
            class: "community-rank-list",
            "aria-label": "Student rankings",
            "aria-describedby": rows.length ? "ranking-order-note" : undefined,
            start: offset + 1,
          },
          ...rows.map((card) =>
            h(
              "li",
              {
                class: `community-rank-row ${card.user_id === owner ? "is-you" : ""}`,
                "data-rank": card.rank,
              },
              h(
                "span",
                { class: "community-rank-number" },
                card.rank <= 3
                  ? icon(card.rank === 1 ? "trophy" : "star", 15)
                  : null,
                `#${card.rank}`,
              ),
              ui.profile(card, home, changed),
              h(
                "div",
                { class: "community-rank-score" },
                h("strong", null, `${count(card.credits)} credits`),
                h("small", null, "Class credits"),
              ),
              card.user_id === owner
                ? h("span", { class: "community-pill" }, "You")
                : card.relationship === "friends"
                  ? h(
                      "span",
                      { class: "community-pill" },
                      icon("heart", 13),
                      "Friend",
                    )
                  : null,
            ),
          ),
        ),
      );
      status.textContent = `${result.total} ${result.total === 1 ? "scientist" : "scientists"} · Current class credits · ${scope === "school" ? "Classroom" : "Friends"}`;
      standings.append(
        h(
          "nav",
          { class: "community-pagination", "aria-label": "Ranking pages" },
          button(
            "Previous rankings",
            () => {
              offset = Math.max(0, offset - 20);
              void refresh();
            },
            "button outline",
            { disabled: offset === 0 },
          ),
          h(
            "span",
            null,
            result.total
              ? `${offset + 1}–${Math.min(offset + 20, result.total)} of ${result.total}`
              : "0 scientists",
          ),
          button(
            "Next rankings",
            () => {
              offset += 20;
              void refresh();
            },
            "button outline",
            { disabled: offset + 20 >= result.total },
          ),
        ),
      );
      void loadSharedPhotos(rows);
    } catch (error) {
      if (request === serial)
        status.textContent =
          error instanceof Error ? error.message : "Please try again.";
    }
  }
  function sync() {
    groups
      .querySelectorAll<HTMLElement>("[data-scope]")
      .forEach((node) =>
        node.setAttribute("aria-pressed", String(node.dataset.scope === scope)),
      );
    history.replaceState(null, "", `#/leaderboard?scope=${scope}`);
    offset = 0;
    cached = {
      owner,
      node: page,
      route: location.hash,
      refresh,
      loaded: Date.now(),
    };
    void refresh();
  }
  for (const [id, label] of [
    ["school", "Classroom"],
    ["friends", "Friends only"],
  ] as const)
    groups.append(
      button(
        label,
        () => {
          scope = id;
          sync();
        },
        "button outline",
        { "data-scope": id, "aria-pressed": scope === id },
      ),
    );
  grade.addEventListener("change", sync);
  page.append(
    hero,
    h(
      "section",
      {
        class: "community-toolbar paper",
        "aria-label": "Leaderboard controls",
      },
      groups,
      field("Grade filter", grade),
      button("Refresh rankings", refresh, "button outline"),
    ),
    status,
    standings,
    own,
    h(
      "details",
      { class: "community-scoring paper" },
      h("summary", null, "How do credit rankings work?"),
      h(
        "p",
        null,
        "Rankings use the current class credits saved in each student’s classroom wallet. Earning credits, reservations, refunds and audited teacher adjustments can change the order. Equal balances share a rank.",
      ),
      h(
        "p",
        null,
        "Balances do not reset each week. Teachers do not compete; hidden, blocked and banned profiles follow the classroom access rules. Quiz results and learning levels stay in your learning records.",
      ),
    ),
  );
  cached = {
    owner,
    node: page,
    route: location.hash,
    refresh,
    loaded: Date.now(),
  };
  drawOwn(null);
  await refresh();
  return page;
}
function refreshVisible(force = false) {
  if (
    document.activeElement?.closest(
      ".community-rank-list,.community-pagination",
    )
  )
    return;
  if (
    !cached ||
    !cached.node.isConnected ||
    cached.owner !== currentUser()?.id ||
    document.hidden ||
    !navigator.onLine ||
    document.querySelector("dialog[open]")
  )
    return;
  if (Date.now() - cached.loaded >= (force ? 15000 : 30000)) {
    cached.loaded = Date.now();
    void cached.refresh();
  }
}
window.setInterval(() => refreshVisible(), 30000);
window.addEventListener("focus", () => refreshVisible(true));
document.addEventListener("visibilitychange", () => refreshVisible(true));
window.addEventListener("csl:community", () => {
  if (cached?.node.isConnected) void cached.refresh();
  else cached = undefined;
});
window.addEventListener("csl:platform", () => {
  if (cached?.owner !== currentUser()?.id) cached = undefined;
});
