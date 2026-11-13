import { currentUser } from "../store";
import { cloudEnabled, cloudUserId } from "../store/cloud";
import {
  communityReady,
  communityHome,
  saveCommunityProfile,
  communityRanking,
  classmateDirectory,
  friendsList,
  friendAction,
  scientistCard,
  loadSharedPhotos,
} from "../store/community";
import type {
  CommunityHome,
  ScientistCard,
  CommunityPeriod,
  CommunityScope,
} from "../core/community";
import { weeklyCountdown } from "../core/community";
import { h, button, field, input, modal, toast } from "./dom";
import { icon, mascot } from "./svg";
import { communityAvatar } from "./community-avatar";
import { go } from "./actions";
import { pageHeading } from "./shell";

const message = (e: unknown) =>
  e instanceof Error ? e.message : "Please try again.";
const pages = new Map<
  string,
  {
    owner: string;
    node: HTMLElement;
    route: string;
    refresh: () => Promise<void>;
    tick?: () => void;
    loadedAt?: number;
  }
>();
function entryGate() {
  const user = currentUser();
  return h(
    "section",
    { class: "community-gate paper" },
    mascot("sprout"),
    h(
      "h2",
      null,
      !cloudEnabled || user?.id === "guest"
        ? "A classroom account connects your science circle"
        : "Your classroom connections are being prepared",
    ),
    h(
      "p",
      null,
      !cloudEnabled || user?.id === "guest"
        ? "Sign in with your existing classroom account to see classmates, compare discoveries and add friends."
        : "Your saved discoveries are safe. Your teacher needs to activate the shared leaderboard and friends service before your class can join.",
    ),
    cloudEnabled && user?.id === "guest"
      ? button(
          "Sign in to connect",
          async () => (await import("./auth")).authModal(),
          "button primary",
        )
      : null,
    user?.role === "admin"
      ? h(
          "a",
          {
            class: "button primary",
            href: "https://github.com/julomjohnlouise19-cloud/SHEN-LOVE-EMU-HOUJO/blob/main/docs/COMMUNITY_SETUP.md",
            rel: "external noreferrer",
          },
          "Open classroom connection setup",
        )
      : null,
    h("a", { href: "#/island", class: "button outline" }, "Explore science"),
  );
}
export async function communitySettingsModal(onSaved: () => void = () => {}) {
  if (!communityReady()) {
    modal("Your classroom profile", [entryGate()]);
    return;
  }
  const actor = currentUser()?.id;
  const home = await communityHome();
  if (currentUser()?.id !== actor) return;
  if (home.teacher) {
    modal("Your classroom profile", [
      h(
        "p",
        null,
        "Teachers can view the class leaderboard. Friend requests connect student accounts.",
      ),
    ]);
    return;
  }
  let settings = home.settings;
  const choice = (label: string, checked: boolean) => {
    const box = h("input", { type: "checkbox", checked });
    return {
      box,
      node: h(
        "label",
        { class: "community-choice" },
        box,
        h("span", null, label),
      ),
    };
  };
  const listed = choice(
    "Show my account name in classmates and rankings",
    settings.listed,
  );
  const photo = choice("Share my profile photo", settings.share_photo);
  const bio = choice("Share my introduction", settings.share_bio);
  const grade = choice("Share my grade level", settings.share_grade);
  const error = h("p", { class: "form-error", role: "alert" });
  const { close } = modal("Your classroom profile", [
    h("p", { class: "eyebrow" }, "YOUR NAME IN THE SCIENCE CIRCLE"),
    h(
      "p",
      null,
      "Classmates see your existing account name and learning achievements. Choose the extra details you want to share. Sign-in emails, section, notebook pages and account settings stay private.",
    ),
    h(
      "p",
      { class: "community-account-name" },
      h("strong", null, currentUser()!.name),
      " · your existing account",
    ),
    listed.node,
    photo.node,
    bio.node,
    grade.node,
    h(
      "p",
      { class: "community-note" },
      "You can hide your name from classmates and rankings at any time. Existing friends are retained while sharing is off.",
    ),
    error,
    button(
      "Save sharing choices",
      async () => {
        error.textContent = "";
        try {
          const result = await saveCommunityProfile({
            username: settings.username,
            listed: listed.box.checked,
            share_photo: photo.box.checked,
            share_bio: bio.box.checked,
            share_grade: grade.box.checked,
            version: settings.version,
          });
          settings = result.settings;
          close();
          toast("Your classroom profile is saved.");
          onSaved();
        } catch (e) {
          error.textContent = message(e);
        }
      },
      "button primary",
    ),
    button(
      "Reload saved choices",
      async () => {
        try {
          const result = await communityHome();
          settings = result.settings;
          listed.box.checked = settings.listed;
          photo.box.checked = settings.share_photo;
          bio.box.checked = settings.share_bio;
          grade.box.checked = settings.share_grade;
          error.textContent = "";
        } catch (e) {
          error.textContent = message(e);
        }
      },
      "button outline",
    ),
  ]);
}
function friendControls(
  card: ScientistCard,
  home: CommunityHome,
  changed: () => void,
  compact = false,
) {
  if (card.user_id === currentUser()?.id || home.teacher) return h("div");
  if (!home.settings.listed)
    return button(
      "Manage sharing to connect",
      () => communitySettingsModal(changed),
      "button outline",
    );
  const error = h("p", { class: "form-error", role: "alert" });
  const controls = h("div", { class: "friend-actions" });
  const action = (
    label: string,
    kind: Parameters<typeof friendAction>[0],
    confirm = false,
  ) => {
    const requestId = crypto.randomUUID();
    const run = async () => {
      error.textContent = "";
      try {
        const result = await friendAction(kind, card, requestId);
        toast(
          kind === "send" && result.state === "incoming"
            ? "This scientist already invited you. Open Invitations to reply."
            : kind === "send" && result.state === "friends"
              ? "You are already science friends."
              : {
                  send: "Friend request sent.",
                  accept: "You are now science friends!",
                  decline: "Invitation declined.",
                  cancel: "Invitation cancelled.",
                  remove: "Friend removed.",
                  block: "Scientist blocked.",
                  unblock: "Scientist unblocked.",
                }[kind],
        );
        changed();
        return true;
      } catch (e) {
        error.textContent = message(e);
        return false;
      }
    };
    return button(
      label,
      async () => {
        if (!confirm) {
          await run();
          return;
        }
        const detail =
          kind === "block"
            ? "You will be hidden from each other in classmates and rankings, and friend requests will stop. An existing friendship will be removed."
            : kind === "remove"
              ? "This removes your friendship. Another invitation needs to be accepted before you become friends again."
              : "This removes your block. It does not restore a previous friendship.";
        const localError = h("p", { class: "form-error", role: "alert" });
        const { close } = modal(`${label}?`, [
          h("p", null, card.display_name),
          h("p", null, detail),
          localError,
          button(
            label,
            async () => {
              if (await run()) close();
              else localError.textContent = error.textContent;
            },
            "button primary",
          ),
        ]);
      },
      kind === "accept" || kind === "send"
        ? "button primary"
        : "button outline",
    );
  };
  if (card.relationship === "none")
    controls.append(action("Add friend", "send"));
  if (card.relationship === "incoming")
    controls.append(
      action("Accept invitation", "accept"),
      action("Decline invitation", "decline"),
    );
  if (card.relationship === "outgoing")
    controls.append(
      h("span", { class: "community-pill" }, "Invitation sent"),
      action("Cancel invitation", "cancel"),
    );
  if (card.relationship === "friends")
    controls.append(
      h(
        "span",
        { class: "community-pill" },
        icon("heart", 14),
        "Science friends",
      ),
      ...(compact ? [] : [action("Remove friend", "remove", true)]),
    );
  if (card.relationship === "blocked")
    controls.append(action("Unblock scientist", "unblock", true));
  else if (!compact) controls.append(action("Block scientist", "block", true));
  return h("div", { class: "friend-control-group" }, controls, error);
}
async function openScientist(
  id: string,
  home: CommunityHome,
  changed: () => void,
) {
  const actor = currentUser()?.id;
  const body = h(
    "div",
    { class: "community-public-card" },
    h("p", { role: "status" }, "Opening this scientist’s shared profile…"),
  );
  const { dialog, close } = modal("Scientist learning card", [body], true);
  try {
    const card = await scientistCard(id);
    if (!dialog.isConnected || currentUser()?.id !== actor) return;
    if (!card) {
      body.replaceChildren(
        h("h3", null, "This profile is unavailable"),
        h("p", null, "The scientist may have changed their sharing choices."),
      );
      return;
    }
    body.replaceChildren(
      h(
        "div",
        { class: "community-profile-hero" },
        communityAvatar(card.user_id, card.display_name),
        h(
          "div",
          null,
          h("p", { class: "eyebrow" }, "A FELLOW CURIOUS MIND"),
          h("h3", null, card.display_name),
          activityBadge(card),
          card.grade
            ? h("span", { class: "community-pill" }, `Grade ${card.grade}`)
            : null,
        ),
      ),
      ...(card.bio ? [h("p", { class: "community-bio" }, card.bio)] : []),
      h(
        "div",
        { class: "community-stats" },
        ...[
          [card.points, "All-time points"],
          [card.level, "Discovery level"],
          [card.discoveries, "Best discoveries"],
        ].map(([value, label]) =>
          h("div", null, h("strong", null, value), h("span", null, label)),
        ),
      ),
      h(
        "p",
        { class: "community-note" },
        "Achievements come from saved quiz results. Ten points per correct answer in each day's best deck and difficulty result.",
      ),
      friendControls(card, home, () => {
        close();
        changed();
      }),
    );
    void loadSharedPhotos([card]);
  } catch (e) {
    if (body.isConnected)
      body.replaceChildren(
        h("p", { role: "alert", class: "form-error" }, message(e)),
      );
  }
}
function profileButton(
  card: ScientistCard,
  home: CommunityHome,
  changed: () => void,
) {
  return button(
    h(
      "span",
      { class: "community-identity" },
      communityAvatar(card.user_id, card.display_name),
      h(
        "span",
        null,
        h("strong", null, card.display_name),
        activityBadge(card),
        card.grade ? h("small", null, `Grade ${card.grade}`) : null,
      ),
    ),
    () => openScientist(card.user_id, home, changed),
    "community-profile-button",
    { "aria-label": `View ${card.display_name} learning card` },
  );
}
function activityBadge(card: ScientistCard) {
  return h(
    "small",
    { class: `classmate-activity ${card.active_recently ? "is-recent" : ""}` },
    card.relationship === "blocked"
      ? "Blocked"
      : card.active_recently
        ? "Active recently"
        : "Classmate",
  );
}
function pageCache(path: string) {
  const cached = pages.get(path);
  if (
    !cached ||
    cached.owner !== currentUser()?.id ||
    cached.route !== location.hash
  )
    return undefined;
  if (!cached.node.isConnected) void cached.refresh();
  return cached.node;
}
export async function studentLeaderboardPage() {
  const mounted = pageCache("leaderboard");
  if (mounted) return mounted;
  const owner = currentUser()!.id;
  const page = h(
    "div",
    { class: "community-page page-enter" },
    pageHeading(
      "THE SCIENCE LEAGUE",
      "Grow curious. Rise together.",
      "Celebrate discoveries, meet fellow scientists, and make your next answer count.",
    ),
  );
  if (!communityReady()) {
    page.append(entryGate());
    return page;
  }
  let home: CommunityHome;
  try {
    home = await communityHome();
  } catch (e) {
    page.append(
      h("p", { role: "alert", class: "form-error" }, message(e)),
      button(
        "Try again",
        () => {
          pages.delete("leaderboard");
          go("/leaderboard");
        },
        "button outline",
      ),
    );
    return page;
  }
  const params = new URLSearchParams(location.hash.split("?")[1]);
  let period: CommunityPeriod = params.get("period") === "all" ? "all" : "week";
  let scope: CommunityScope =
    params.get("scope") === "friends" ? "friends" : "school";
  let offset = 0,
    serial = 0;
  const standings = h("div", { class: "community-standings" });
  const status = h("p", { role: "status", class: "community-load-status" });
  const own = h("section", {
    class: "your-discovery-card",
    "aria-label": "Your discovery standing",
  });
  const periodButtons = h("div", {
    class: "community-toggle",
    "aria-label": "Ranking period",
  });
  const scopeButtons = h("div", {
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
  const weekTitle = h("h2", null, "This week's science league");
  const weekDates = h("p", null, "Weekly standings refresh every Monday.");
  const countdown = h("strong", { class: "weekly-countdown" });
  const weekHero = h(
    "section",
    { class: "league-week-card", "aria-label": "Ranking week" },
    h(
      "span",
      { class: "league-week-emblem", "aria-hidden": true },
      icon("trophy", 44),
    ),
    h(
      "div",
      null,
      h("p", { class: "eyebrow" }, "A FRESH WEEK OF DISCOVERIES"),
      weekTitle,
      weekDates,
    ),
    h(
      "div",
      { class: "league-week-timer" },
      countdown,
      h("small", null, "Standings update automatically"),
    ),
  );
  let refreshAt = "",
    serverNow = 0,
    receivedAt = 0;
  const tick = () => {
    if (refreshAt && Number.isFinite(serverNow))
      countdown.textContent = weeklyCountdown(
        serverNow + Date.now() - receivedAt,
        refreshAt,
      );
  };
  const drawOwn = (card: ScientistCard | null) => {
    own.replaceChildren(
      h(
        "div",
        null,
        h("p", { class: "eyebrow" }, "YOUR NEXT LITTLE VICTORY"),
        h(
          "h2",
          null,
          card
            ? `#${card.rank} · ${card.points} discovery points`
            : home.teacher
              ? "A teacher's view of growing minds"
              : home.settings.listed
                ? "Your shared profile is ready"
                : "Your science story belongs here",
        ),
        h(
          "p",
          null,
          card
            ? `${card.discoveries} best discoveries ${period === "week" ? "this week" : "so far"}. Equal points share a rank.`
            : home.teacher
              ? "Celebrate your students' discoveries. Teacher accounts do not enter student rankings."
              : home.settings.listed
                ? "Choose All grades to include profiles without a shared grade. Your classroom sharing choices are saved."
                : "Your existing account name is ready. You can show it in the league from sharing choices.",
        ),
      ),
      home.teacher
        ? h(
            "a",
            { class: "button outline", href: "#/teacher/students" },
            "Open Scientists",
          )
        : button(
            home.settings.listed
              ? "Sharing choices"
              : "Manage classroom sharing",
            () =>
              communitySettingsModal(() => {
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
  };
  const refresh = async () => {
    const request = ++serial;
    status.textContent = "Refreshing the science league…";
    try {
      const [result, latest] = await Promise.all([
        communityRanking(
          period,
          scope,
          offset,
          grade.value ? Number(grade.value) : null,
        ),
        communityHome(),
      ]);
      if (request !== serial || currentUser()?.id !== owner) return;
      // Ranks and pagination remain server-owned. Preserve its tie order while
      // ensuring the visible cards always show the highest verified points first.
      const rows = [...result.rows].sort((a, b) => b.points - a.points);
      home = latest;
      refreshAt = result.refresh_at;
      serverNow = Date.parse(result.server_now);
      receivedAt = Date.now();
      if (refreshAt && Number.isFinite(serverNow)) {
        const dayLabel = (value: string) =>
          new Date(`${value}T12:00:00Z`).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            timeZone: "UTC",
          });
        weekTitle.textContent = `${dayLabel(result.week_start)} – ${dayLabel(result.week_end)}`;
        weekDates.textContent = `Resets ${new Date(refreshAt).toLocaleString(undefined, { timeZone: result.timezone, weekday: "long", hour: "numeric", minute: "2-digit" })} · ${result.timezone}`;
        tick();
      }
      const cached = pages.get("leaderboard");
      if (cached) cached.loadedAt = Date.now();
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
                : "A new league of discoveries",
            ),
            h(
              "p",
              null,
              scope === "friends"
                ? "Find a classmate and accept an invitation to compare discoveries together."
                : "Active student accounts appear automatically. Complete a science quiz to begin your points story.",
            ),
            h(
              "a",
              {
                class: "button primary",
                href: scope === "friends" ? "#/friends" : "#/island",
              },
              scope === "friends"
                ? "Find a science friend"
                : "Start discovering",
            ),
          ),
        );
      if (rows.length)
        standings.append(
          h(
            "div",
            { class: "league-ranking-heading" },
            h("h2", null, "The discovery leaderboard"),
            h(
              "p",
              { id: "ranking-order-note" },
              h(
                "span",
                { class: "ranking-order-pill" },
                icon("trophy", 15),
                "Highest points first",
              ),
              h(
                "span",
                null,
                "Equal points share a rank. Every discovery counts.",
              ),
            ),
          ),
        );
      if (!offset && rows.length)
        standings.append(
          h(
            "section",
            { class: "community-podium", "aria-label": "Leading scientists" },
            ...rows.slice(0, 3).map((card) =>
              h(
                "article",
                { class: `podium-place place-${Math.min(card.rank ?? 3, 3)}` },
                h(
                  "span",
                  { class: "podium-rank" },
                  icon("trophy", 22),
                  `#${card.rank}`,
                ),
                h(
                  "p",
                  { class: "podium-honor" },
                  card.points === 0
                    ? "Your next discovery awaits"
                    : card.rank === 1
                      ? "Discovery leader"
                      : card.rank === 2
                        ? "Curious achiever"
                        : "Rising scientist",
                ),
                profileButton(card, home, () => {
                  void refresh();
                }),
                h(
                  "strong",
                  { class: "podium-points" },
                  `${card.points} points`,
                ),
                h("p", null, `${card.discoveries} best discoveries`),
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
                card.rank && card.rank <= 3
                  ? icon(card.rank === 1 ? "trophy" : "star", 15)
                  : null,
                `#${card.rank}`,
              ),
              profileButton(card, home, () => {
                void refresh();
              }),
              h(
                "div",
                { class: "community-rank-score" },
                h("strong", null, `${card.points} pts`),
                h("small", null, `Discovery level ${card.level}`),
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
      status.textContent = `${result.total} ${result.total === 1 ? "scientist" : "scientists"} · ${period === "week" ? "This week" : "All time"} · ${scope === "school" ? "Classroom" : "Friends"}`;
      const pager = h(
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
      );
      standings.append(pager);
      void loadSharedPhotos(rows);
    } catch (e) {
      if (request === serial) status.textContent = message(e);
    }
  };
  const sync = () => {
    for (const n of periodButtons.querySelectorAll<HTMLElement>(
      "[data-period]",
    ))
      n.setAttribute("aria-pressed", String(n.dataset.period === period));
    for (const n of scopeButtons.querySelectorAll<HTMLElement>("[data-scope]"))
      n.setAttribute("aria-pressed", String(n.dataset.scope === scope));
    history.replaceState(
      null,
      "",
      `#/leaderboard?period=${period}&scope=${scope}`,
    );
    pages.set("leaderboard", {
      owner,
      node: page,
      route: location.hash,
      refresh,
      tick,
      loadedAt: Date.now(),
    });
    offset = 0;
    void refresh();
  };
  for (const [id, label] of [
    ["week", "This week"],
    ["all", "All time"],
  ] as const)
    periodButtons.append(
      button(
        label,
        () => {
          period = id;
          sync();
        },
        "button outline",
        { "data-period": id, "aria-pressed": id === period },
      ),
    );
  for (const [id, label] of [
    ["school", "Classroom"],
    ["friends", "Friends only"],
  ] as const)
    scopeButtons.append(
      button(
        label,
        () => {
          scope = id;
          sync();
        },
        "button outline",
        { "data-scope": id, "aria-pressed": id === scope },
      ),
    );
  grade.addEventListener("change", sync);
  page.append(
    weekHero,
    h(
      "section",
      {
        class: "community-toolbar paper",
        "aria-label": "Leaderboard controls",
      },
      periodButtons,
      scopeButtons,
      field("Grade filter", grade),
      button("Refresh rankings", refresh, "button outline"),
    ),
    status,
    standings,
    own,
    h(
      "details",
      { class: "community-scoring paper" },
      h("summary", null, "How do discovery points work?"),
      h(
        "p",
        null,
        "Earn ten points per correct answer in your best completed quiz for each deck, difficulty and classroom day. Repeating the same quiz can improve that best result; it does not stack repeated points. A different day or deck adds a new discovery. Weeks start on Monday in the classroom timezone.",
      ),
      h(
        "p",
        null,
        "Rankings use saved quiz results and exclude archived evidence and teacher accounts. Discovery level uses the XP value of your best saved results: 12 per correct answer and 3 per other answer, with 120 XP per level. Your profile's device practice XP remains separate.",
      ),
    ),
  );
  pages.set("leaderboard", {
    owner,
    node: page,
    route: location.hash,
    refresh,
    tick,
    loadedAt: Date.now(),
  });
  drawOwn(null);
  await refresh();
  return page;
}

export async function friendsPage() {
  const mounted = pageCache("friends");
  if (mounted) return mounted;
  const owner = currentUser()!.id;
  const page = h(
    "div",
    { class: "community-page friends-page-v2 page-enter" },
    pageHeading(
      "YOUR LITTLE SCIENCE CIRCLE",
      "Meet classmates. Make discoveries.",
      "Your existing account is all you need. Find a familiar face and say hello.",
    ),
  );
  if (!communityReady()) {
    page.append(entryGate());
    return page;
  }
  let home: CommunityHome;
  try {
    home = await communityHome();
  } catch (e) {
    page.append(h("p", { role: "alert", class: "form-error" }, message(e)));
    return page;
  }
  if (home.teacher) {
    page.append(
      h(
        "section",
        { class: "community-empty paper" },
        h("h2", null, "Your scientists are growing together"),
        h(
          "p",
          null,
          "Friend requests connect student accounts. Review your classroom profiles and account access from Teacher Studio.",
        ),
        h(
          "a",
          { href: "#/teacher/students", class: "button primary" },
          "Open Scientists",
        ),
      ),
    );
    return page;
  }
  const requested = new URLSearchParams(location.hash.split("?")[1]).get("tab");
  type FriendTab = "discover" | "friends" | "incoming" | "outgoing" | "blocked";
  let kind: FriendTab =
    requested === "friends" ||
    requested === "incoming" ||
    requested === "outgoing" ||
    requested === "blocked"
      ? requested
      : "discover";
  let offset = 0,
    sequence = 0,
    appliedQuery = "",
    activeOnly = false;
  const identity = h("section", {
    class: "friend-welcome-card",
    "aria-label": "Your science circle",
  });
  const tabs = h("nav", {
    class: "community-toggle friend-tabs",
    "aria-label": "Friend lists",
  });
  const status = h("p", { class: "community-load-status", role: "status" });
  const list = h("section", {
    class: "friend-list",
    "aria-label": "Classmate cards",
  });
  const search = input(
    "friend-account",
    "Account name or existing sign-in",
    "",
    "search",
  );
  search.required = false;
  search.maxLength = 254;
  search.autocapitalize = "none";
  search.spellcheck = false;
  const filterButtons = h("div", {
    class: "community-toggle classmate-filters",
    "aria-label": "Classmate activity",
  });
  const cardRow = (card: ScientistCard) =>
    h(
      "article",
      { class: "friend-card paper" },
      profileButton(card, home, changed),
      h(
        "p",
        { class: "friend-card-achievement" },
        card.relationship === "blocked"
          ? "Hidden from your science circle"
          : `${card.points} points · Discovery level ${card.level}`,
      ),
      friendControls(card, home, changed, kind === "discover"),
    );
  function remember() {
    pages.set("friends", {
      owner,
      node: page,
      route: location.hash,
      refresh,
      loadedAt: Date.now(),
    });
  }
  function changed() {
    void refresh();
  }
  function changeView(value: FriendTab) {
    kind = value;
    offset = 0;
    history.replaceState(
      null,
      "",
      `#/friends${kind === "discover" ? "" : `?tab=${kind}`}`,
    );
    remember();
    void refresh();
  }
  const refresh = async () => {
    const request = ++sequence;
    status.textContent = "Finding familiar faces…";
    try {
      const [rows, latest] = await Promise.all([
        kind === "discover"
          ? classmateDirectory(appliedQuery, activeOnly, offset)
          : friendsList(kind, offset),
        communityHome(),
      ]);
      if (request !== sequence || currentUser()?.id !== owner) return;
      home = latest;
      identity.replaceChildren(
        h(
          "span",
          { class: "friend-welcome-art", "aria-hidden": true },
          mascot("cat"),
          icon("heart", 22),
        ),
        h(
          "div",
          null,
          h("h2", null, `Hi, ${currentUser()!.name}!`),
          h("p", null, "Your existing account is ready to connect."),
          !home.settings.listed
            ? h(
                "p",
                null,
                "Your name is hidden. You can show it again from Sharing choices.",
              )
            : null,
        ),
        h(
          "div",
          { class: "friend-welcome-actions" },
          h(
            "a",
            { href: "#/leaderboard?scope=friends", class: "button primary" },
            "Our discovery league",
          ),
          button(
            "Sharing choices",
            () => communitySettingsModal(changed),
            "button outline",
          ),
        ),
      );
      for (const tab of tabs.querySelectorAll<HTMLElement>(
        "[data-friend-kind]",
      )) {
        const value = tab.dataset.friendKind;
        tab.setAttribute("aria-pressed", String(value === kind));
        tab.textContent =
          value === "discover"
            ? "Classmates"
            : value === "friends"
              ? `My friends (${home.friends})`
              : value === "incoming"
                ? `Invitations (${home.incoming})`
                : value === "outgoing"
                  ? `Sent (${home.outgoing})`
                  : "Blocked";
      }
      filterButtons.hidden = kind !== "discover";
      for (const node of filterButtons.querySelectorAll<HTMLElement>(
        "[data-active-filter]",
      ))
        node.setAttribute(
          "aria-pressed",
          String((node.dataset.activeFilter === "recent") === activeOnly),
        );
      list.classList.toggle("classmate-grid", rows.rows.length > 0);
      list.replaceChildren(...rows.rows.map(cardRow));
      if (!rows.rows.length)
        list.append(
          h(
            "div",
            { class: "community-empty paper" },
            mascot("sprout"),
            h(
              "h2",
              null,
              kind === "discover"
                ? appliedQuery
                  ? "No classmates match yet"
                  : activeOnly
                    ? "A quiet moment in the lab"
                    : "Your science circle is growing"
                : kind === "incoming"
                  ? "No invitations waiting"
                  : kind === "outgoing"
                    ? "No invitations on their way"
                    : kind === "blocked"
                      ? "Your blocked list is clear"
                      : "Your next science friend is one hello away",
            ),
            h(
              "p",
              null,
              kind === "discover"
                ? activeOnly
                  ? "Try All classmates to find someone and send an invitation for later."
                  : "Use an existing account name or sign-in. Active student accounts appear here automatically."
                : kind === "friends"
                  ? "Open Classmates and add a familiar face. They join your circle after accepting."
                  : "This list updates automatically while you are here.",
            ),
            kind === "discover" && (activeOnly || appliedQuery)
              ? button(
                  "Show all classmates",
                  () => {
                    activeOnly = false;
                    appliedQuery = "";
                    search.value = "";
                    changeView("discover");
                  },
                  "button outline",
                )
              : null,
          ),
        );
      status.textContent =
        kind === "discover"
          ? `${rows.total} ${rows.total === 1 ? "classmate" : "classmates"} · ${rows.active_count ?? 0} active recently · updates automatically`
          : `${rows.total} ${rows.total === 1 ? "scientist" : "scientists"} in this list`;
      page.querySelector(".friend-page-controls")?.remove();
      page.append(
        h(
          "nav",
          {
            class: "community-pagination friend-page-controls",
            "aria-label": "Friend pages",
          },
          button(
            "Previous scientists",
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
            rows.total
              ? `${offset + 1}–${Math.min(offset + 20, rows.total)} of ${rows.total}`
              : "0 scientists",
          ),
          button(
            "Next scientists",
            () => {
              offset += 20;
              void refresh();
            },
            "button outline",
            { disabled: offset + 20 >= rows.total },
          ),
        ),
      );
      const cached = pages.get("friends");
      if (cached) cached.loadedAt = Date.now();
      void loadSharedPhotos(rows.rows);
    } catch (e) {
      if (request === sequence) status.textContent = message(e);
    }
  };
  const searchForm = h(
    "form",
    { class: "friend-search paper" },
    field(
      "Classmate's name or sign-in",
      search,
      "A name, existing login name or exact sign-in email works. Emails stay private.",
    ),
    h(
      "div",
      { class: "friend-search-actions" },
      button(
        "Find classmates",
        () => {
          appliedQuery = search.value.trim();
          activeOnly = false;
          changeView("discover");
        },
        "button primary",
      ),
      button(
        "Clear search",
        () => {
          appliedQuery = "";
          search.value = "";
          activeOnly = false;
          changeView("discover");
        },
        "button outline",
      ),
    ),
  );
  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    searchForm.querySelector<HTMLButtonElement>("button")?.click();
  });
  for (const value of [
    "discover",
    "friends",
    "incoming",
    "outgoing",
    "blocked",
  ] as const)
    tabs.append(
      button(value, () => changeView(value), "button outline", {
        "data-friend-kind": value,
        "aria-pressed": value === kind,
      }),
    );
  filterButtons.append(
    button(
      "All classmates",
      () => {
        activeOnly = false;
        changeView("discover");
      },
      "button outline",
      { "data-active-filter": "all", "aria-pressed": true },
    ),
    button(
      "Active recently",
      () => {
        activeOnly = true;
        changeView("discover");
      },
      "button outline",
      { "data-active-filter": "recent", "aria-pressed": false },
    ),
  );
  page.append(
    identity,
    searchForm,
    h(
      "div",
      { class: "friend-list-toolbar" },
      tabs,
      button("Refresh circle", refresh, "button outline"),
    ),
    filterButtons,
    status,
    list,
  );
  remember();
  await refresh();
  return page;
}

window.addEventListener("csl:platform", () => {
  if (!cloudUserId()) pages.clear();
});
function refreshVisibleCommunity(force = false) {
  if (document.hidden || !navigator.onLine || !communityReady()) return;
  for (const entry of pages.values()) {
    if (!entry.node.isConnected || entry.owner !== currentUser()?.id) continue;
    entry.tick?.();
    if (
      document.querySelector("dialog[open]") ||
      document.activeElement?.closest(
        ".friend-list,.community-rank-list,.community-pagination",
      )
    )
      continue;
    if (Date.now() - (entry.loadedAt ?? 0) >= (force ? 15000 : 60000)) {
      entry.loadedAt = Date.now();
      void entry.refresh();
    }
  }
}
window.setInterval(() => refreshVisibleCommunity(), 30000);
window.addEventListener("focus", () => refreshVisibleCommunity(true));
document.addEventListener("visibilitychange", () =>
  refreshVisibleCommunity(true),
);
