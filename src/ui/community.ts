import { currentUser } from "../store";
import { cloudEnabled, cloudUserId } from "../store/cloud";
import {
  communityReady,
  communityHome,
  saveCommunityProfile,
  communityRanking,
  findScientist,
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
        ? "Sign in with your classroom account to compare saved discoveries, choose a username and invite friends."
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
        "Teachers can view the class leaderboard. Student usernames and friend requests belong to student accounts.",
      ),
    ]);
    return;
  }
  let settings = home.settings;
  const username = input(
    "community-username",
    "curious_mina",
    settings.username,
  );
  username.minLength = 3;
  username.maxLength = 20;
  username.autocapitalize = "none";
  username.spellcheck = false;
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
    "Join the student leaderboard and username search",
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
      "When you join, signed-in classmates can see your display name, username and learning achievements. Choose the extra details you want to share. Email, section, notebook pages and account settings stay private.",
    ),
    field(
      "Classroom username",
      username,
      "3–20 characters: start with a letter, then use letters, numbers or underscores. This is separate from your sign-in email.",
    ),
    listed.node,
    photo.node,
    bio.node,
    grade.node,
    h(
      "p",
      { class: "community-note" },
      "You can leave the leaderboard and username search whenever you like. Existing friends are hidden while sharing is off.",
    ),
    error,
    button(
      "Save classroom profile",
      async () => {
        error.textContent = "";
        try {
          const result = await saveCommunityProfile({
            username: username.value,
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
          username.value = settings.username;
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
) {
  if (card.user_id === currentUser()?.id || home.teacher) return h("div");
  if (!home.settings.listed)
    return button(
      "Choose a username to connect",
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
            ? "You will be hidden from each other in username search and rankings, and friend requests will stop. An existing friendship will be removed."
            : kind === "remove"
              ? "This removes your friendship. Another invitation needs to be accepted before you become friends again."
              : "This removes your block. It does not restore a previous friendship.";
        const localError = h("p", { class: "form-error", role: "alert" });
        const { close } = modal(`${label}?`, [
          h("p", null, `${card.display_name} · @${card.username || "hidden"}`),
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
      action("Remove friend", "remove", true),
    );
  if (card.relationship === "blocked")
    controls.append(action("Unblock scientist", "unblock", true));
  else controls.append(action("Block scientist", "block", true));
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
          h("p", null, `@${card.username}`),
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
        h("small", null, `@${card.username}`),
        card.grade ? h("small", null, `Grade ${card.grade}`) : null,
      ),
    ),
    () => openScientist(card.user_id, home, changed),
    "community-profile-button",
    { "aria-label": `View ${card.display_name} learning card` },
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
              : "Your science story belongs here",
        ),
        h(
          "p",
          null,
          card
            ? `${card.discoveries} best discoveries ${period === "week" ? "this week" : "so far"}. Equal points share a rank.`
            : "Choose your classroom username and join the leaderboard when you are ready.",
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
              ? `@${home.settings.username} · edit sharing`
              : "Choose my username",
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
      home = latest;
      drawOwn(result.you);
      standings.replaceChildren();
      if (!result.rows.length)
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
                ? "Invite a classmate by username, then accept a request to compare discoveries together."
                : "Students who join classroom sharing will appear here. Complete a science quiz to begin your points story.",
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
      if (!offset && result.rows.length)
        standings.append(
          h(
            "section",
            { class: "community-podium", "aria-label": "Leading scientists" },
            ...result.rows.slice(0, 3).map((card) =>
              h(
                "article",
                { class: `podium-place place-${Math.min(card.rank ?? 3, 3)}` },
                h(
                  "span",
                  { class: "podium-rank" },
                  icon("trophy", 22),
                  `#${card.rank}`,
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
          "div",
          { class: "community-rank-list", "aria-label": "Student rankings" },
          ...result.rows.map((card) =>
            h(
              "article",
              {
                class: `community-rank-row ${card.user_id === owner ? "is-you" : ""}`,
              },
              h("span", { class: "community-rank-number" }, `#${card.rank}`),
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
      void loadSharedPhotos(result.rows);
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
    own,
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
    { class: "community-page page-enter" },
    pageHeading(
      "A LITTLE SCIENCE CIRCLE",
      "Curiosity is better with friends.",
      "Find a classmate by username, share discoveries, and cheer each other on.",
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
        h("h2", null, "Look after your scientists from Teacher Studio"),
        h(
          "p",
          null,
          "Friend requests connect student accounts. You can review classroom profiles and learning from your studio.",
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
  let kind: "friends" | "incoming" | "outgoing" | "blocked" =
    requested === "incoming" ||
    requested === "outgoing" ||
    requested === "blocked"
      ? requested
      : "friends";
  let offset = 0,
    sequence = 0,
    searchSequence = 0;
  const identity = h("section", { class: "friend-identity paper" });
  const tabs = h("nav", {
    class: "community-toggle friend-tabs",
    "aria-label": "Friend lists",
  });
  const status = h("p", { class: "community-load-status", role: "status" });
  const list = h("section", {
    class: "friend-list",
    "aria-label": "Your science circle",
  });
  const search = input(
    "friend-username",
    "Enter an exact username",
    "",
    "search",
  );
  search.required = false;
  search.maxLength = 21;
  search.autocapitalize = "none";
  search.spellcheck = false;
  const result = h("div", {
    class: "friend-search-result",
    "aria-live": "polite",
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
      friendControls(card, home, changed),
    );
  function changed() {
    result.replaceChildren();
    void refresh();
  }
  const refresh = async () => {
    const request = ++sequence;
    status.textContent = "Refreshing your science circle…";
    try {
      const [rows, latest] = await Promise.all([
        friendsList(kind, offset),
        communityHome(),
      ]);
      if (request !== sequence || currentUser()?.id !== owner) return;
      home = latest;
      identity.replaceChildren(
        h(
          "div",
          null,
          h("p", { class: "eyebrow" }, "YOUR CLASSROOM IDENTITY"),
          h(
            "h2",
            null,
            home.settings.username
              ? `@${home.settings.username}`
              : "Choose your scientist username",
          ),
          h(
            "p",
            null,
            `${home.friends} friends · ${home.incoming} incoming · ${home.outgoing} sent`,
          ),
          !home.settings.listed
            ? h(
                "p",
                null,
                "Join classroom sharing to appear in username search and exchange friend requests.",
              )
            : null,
        ),
        button(
          home.settings.username
            ? "Edit classroom profile"
            : "Choose my username",
          () => communitySettingsModal(changed),
          "button primary",
        ),
        h(
          "a",
          { href: "#/leaderboard?scope=friends", class: "button outline" },
          "Compare discoveries",
        ),
      );
      for (const tab of tabs.querySelectorAll<HTMLElement>(
        "[data-friend-kind]",
      )) {
        const value = tab.dataset.friendKind;
        tab.setAttribute("aria-pressed", String(value === kind));
        tab.textContent =
          value === "friends"
            ? `My friends (${home.friends})`
            : value === "incoming"
              ? `Invitations (${home.incoming})`
              : value === "outgoing"
                ? `Sent (${home.outgoing})`
                : "Blocked";
      }
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
              kind === "incoming"
                ? "No invitations waiting"
                : kind === "outgoing"
                  ? "No invitations on their way"
                  : kind === "blocked"
                    ? "Your blocked list is clear"
                    : "Every science circle starts with hello",
            ),
            h(
              "p",
              null,
              kind === "friends"
                ? "Ask a classmate for their username and find them above. They will appear here after accepting your invitation."
                : "Use Refresh circle to check for the latest changes.",
            ),
          ),
        );
      status.textContent = `${rows.total} ${rows.total === 1 ? "scientist" : "scientists"} in this list`;
      list.append(
        h(
          "nav",
          { class: "community-pagination", "aria-label": "Friend pages" },
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
      void loadSharedPhotos(rows.rows);
    } catch (e) {
      if (request === sequence) status.textContent = message(e);
    }
  };
  const searchForm = h(
    "form",
    { class: "friend-search paper" },
    h("h2", null, "Find your next science friend"),
    field(
      "Friend’s username",
      search,
      "Use their complete username, with or without @. Ten invitations per day.",
    ),
    button(
      "Find scientist",
      async () => {
        const request = ++searchSequence;
        result.replaceChildren(
          h("p", { role: "status" }, "Looking for that scientist…"),
        );
        try {
          const found = await findScientist(search.value);
          if (request !== searchSequence || currentUser()?.id !== owner) return;
          result.replaceChildren(
            found
              ? cardRow(found)
              : h(
                  "div",
                  { class: "community-search-empty" },
                  h("h3", null, "No shared profile found"),
                  h(
                    "p",
                    null,
                    "Check the exact username. Your classmate also needs to join classroom sharing.",
                  ),
                ),
          );
          if (found) void loadSharedPhotos([found]);
        } catch (e) {
          if (request === searchSequence)
            result.replaceChildren(
              h("p", { role: "alert", class: "form-error" }, message(e)),
            );
        }
      },
      "button primary",
    ),
    result,
  );
  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    searchForm.querySelector<HTMLButtonElement>("button")?.click();
  });
  for (const value of ["friends", "incoming", "outgoing", "blocked"] as const)
    tabs.append(
      button(
        value,
        () => {
          kind = value;
          offset = 0;
          history.replaceState(null, "", `#/friends?tab=${kind}`);
          pages.set("friends", {
            owner,
            node: page,
            route: location.hash,
            refresh,
          });
          void refresh();
        },
        "button outline",
        { "data-friend-kind": value, "aria-pressed": value === kind },
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
    status,
    list,
  );
  pages.set("friends", { owner, node: page, route: location.hash, refresh });
  await refresh();
  return page;
}
window.addEventListener("csl:platform", () => {
  if (!cloudUserId()) pages.clear();
});
