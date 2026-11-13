import { currentUser } from "../store";
import { cloudEnabled, cloudUserId } from "../store/cloud";
import {
  communityReady,
  communityHome,
  saveCommunityProfile,
  classmateDirectory,
  friendsList,
  friendAction,
  scientistCard,
  loadSharedPhotos,
} from "../store/community";
import type { CommunityHome, ScientistCard } from "../core/community";
import { creditLeaderboardPage } from "./credit-leaderboard";
import { h, button, field, input, modal, toast } from "./dom";
import { icon, mascot } from "./svg";
import { communityAvatar } from "./community-avatar";
import { withProfileBanner } from "./profile-banner";
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
    "Show my account name and class credits in classmates and rankings",
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
      "When listed, classmates see your existing account name, learning achievements and current class-credit balance in rankings. Choose the extra details you want to share. Sign-in emails, section, notebook pages and account settings stay private.",
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
      withProfileBanner(
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
        card.user_id,
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
export function studentLeaderboardPage() {
  return creditLeaderboardPage({
    entry: entryGate,
    profile: profileButton,
    sharing: communitySettingsModal,
  });
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
