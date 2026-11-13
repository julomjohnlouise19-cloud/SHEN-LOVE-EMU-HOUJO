import { avatar as scientistAvatar } from "./avatar";
import {
  classCredits,
  hasPlatform,
  hasStudio,
  getLabSnapshot,
  refreshLab,
} from "../store/platform";
import { pickupLocation, pickupReminder } from "../core/classroom";
import { reservationDetails } from "./reservations";
import { cloudEnabled } from "../store/cloud";
import { cloudNotice } from "./cloud-status";
import { currentUser, dispatch, getState } from "../store";
import { dayKey } from "../core/time";
import { levelOf } from "../core/rules";
import { h, button, modal, progress } from "./dom";
import { icon, mascot } from "./svg";
import { act, go } from "./actions";
import { authModal, profileModal, logoutModal } from "./auth";
import { brandLink } from "./branding";
import { connectionNotice } from "./connectivity";
import { pageNavigation } from "./navigation";
import { attachGuide, guideModal } from "./guide";
import { aboutUsButton } from "./about-button";
let sidebarOpen = false;
let releaseNavigation = () => {};
export function resetNavigation() {
  sidebarOpen = false;
  releaseNavigation();
}
const nav = [
  ["/", "home", "My lab"],
  ["/island", "island", "Science Island"],
  ["/review", "box", "Review Box"],
  ["/sources", "notebook", "Science reading room"],
  ["/suggestions", "heart", "Suggestion box"],
  ["/notebook", "notebook", "My notebook"],
  ["/shop", "shop", "Supply shop"],
  ["/spin", "spin", "Daily spin"],
  ["/leaderboard", "trophy", "Leaderboard"],
  ["/friends", "heart", "Science friends"],
];
const teacherNav = [
  ["/teacher", "home", "Studio overview"],
  ["/teacher/students", "sprout", "Scientists"],
  ["/teacher/reports", "notebook", "Class reports"],
  ["/teacher/suggestions", "heart", "Suggestion inbox"],
  ["/teacher/health", "check", "Record care"],
  ["/teacher/shop", "shop", "Stock & pricing"],
  ["/teacher/claims", "box", "Claims desk"],
  ["/teacher/content", "island", "Science cards"],
  ["/teacher/settings", "settings", "Lab settings"],
  ["/teacher/activity", "clock", "Activity history"],
  ["/", "arrow", "Return to my lab"],
];
export function shell(page: HTMLElement, route: string) {
  releaseNavigation();
  const mobile = window.matchMedia("(max-width: 760px)");
  const user = currentUser(),
    s = getState();
  const today = dayKey({ now: () => Date.now() }, s.rules.timezone),
    due = user?.review.filter((c) => c.due <= today).length ?? 0;
  const level = user ? levelOf(user, s.rules) : 1;
  const teacherMode =
    cloudEnabled &&
    user?.role === "admin" &&
    (route === "/admin" || route.startsWith("/teacher"));
  const activeRoute = route === "/admin" ? "/teacher" : route;
  const connected = cloudEnabled && user?.id !== "guest" && hasPlatform();
  const navigation = h(
    "nav",
    { "aria-label": "Main navigation" },
    ...(teacherMode
      ? teacherNav.filter(([path]) => hasStudio() || path !== "/teacher/health")
      : nav
    ).map(([path, ico, label]) =>
      h(
        "div",
        null,
        !teacherMode && path === "/shop"
          ? h("p", { class: "nav-caption" }, "A LITTLE EXTRA")
          : null,
        h(
          "a",
          {
            href: `#${path}`,
            class: `nav-link ${activeRoute === path || (path === "/island" && route.startsWith("/branch")) ? "active" : ""}`,
            "aria-current": activeRoute === path ? "page" : undefined,
            onClick: closeNavigation,
          },
          icon(ico),
          h("span", null, label),
          path === "/review" && due > 0
            ? h("span", { class: "nav-count" }, due)
            : null,
          path === "/" ? h("span", { class: "nav-dot" }) : null,
        ),
      ),
    ),
  );
  if (cloudEnabled && user && user.id !== "guest" && !teacherMode)
    navigation.append(
      h(
        "a",
        {
          href: "#/records",
          class: `nav-link ${route === "/records" ? "active" : ""}`,
          "aria-current": route === "/records" ? "page" : undefined,
          onClick: closeNavigation,
        },
        icon("notebook"),
        "Saved records",
      ),
    );
  if (user?.role === "admin" && !teacherMode)
    navigation.append(
      h(
        "a",
        {
          href: cloudEnabled ? "#/teacher" : "#/admin",
          class: `nav-link ${route === "/admin" ? "active" : ""}`,
          onClick: closeNavigation,
        },
        icon("settings"),
        cloudEnabled ? "Teacher studio" : "Mission control",
      ),
    );
  navigation.append(aboutUsButton("about-nav-button", closeNavigation));
  const sidebarBrand = brandLink();
  sidebarBrand.addEventListener("click", closeNavigation);
  const aside = h(
    "aside",
    {
      id: "lab-sidebar",
      class: `sidebar ${teacherMode ? "teacher-sidebar" : ""} ${sidebarOpen ? "open" : ""}`,
      "aria-label": "Lab navigation",
    },
    button(
      "Close menu ×",
      () => {
        closeNavigation();
        menuButton.focus({ preventScroll: true });
      },
      "button outline drawer-close",
      { "aria-label": "Close menu" },
    ),
    sidebarBrand,
    h(
      "span",
      { class: "lab-label" },
      teacherMode ? "YOUR CLASSROOM WORKSPACE" : "A HAPPY PLACE TO GET CURIOUS",
    ),
    navigation,
    h(
      "div",
      { class: "drawer-tools" },
      button(
        teacherMode ? "Studio guide" : "How it works",
        () => {
          closeNavigation();
          guideModal();
        },
        "button outline",
        { "aria-label": "Open lab guide" },
      ),
      button(
        "Notifications",
        () => {
          closeNavigation();
          return notificationsModal();
        },
        "button outline",
        {
          "aria-label": "Open notifications",
          "data-drawer-notifications": true,
        },
      ),
    ),
    h(
      "div",
      { class: "sidebar-bottom" },
      h(
        "div",
        { class: "sidebar-note" },
        h("span", { class: "tape" }),
        mascot("cat"),
        h("strong", null, "A little progress, every day."),
        h(
          "p",
          null,
          "You don’t have to know it all.",
          h("br"),
          "Just stay curious.",
        ),
      ),
      button(
        h(
          "span",
          { class: "profile-inner" },
          h(
            "span",
            { class: "mini-avatar" },
            scientistAvatar(
              user?.id ?? "guest",
              user?.name ?? "Scientist",
              user?.avatar ?? "cat",
            ),
          ),
          h(
            "span",
            { class: "profile-text" },
            h("strong", null, user?.name ?? "Hello, scientist"),
            h(
              "small",
              null,
              user?.id === "guest"
                ? "Guest explorer · Grade 7"
                : user
                  ? `Grade ${user.grade} · Level ${level}`
                  : "Make yourself at home",
            ),
          ),
          icon("chevron", 15),
        ),
        () => {
          closeNavigation();
          profileModal();
        },
        "profile-button",
      ),
      user?.id === "guest"
        ? button(
            "Save your progress · Join the lab",
            () => {
              closeNavigation();
              authModal(true);
            },
            "join-link",
          )
        : null,
    ),
  );
  const notices =
    s.notifications.filter((n) => n.userId === user?.id && !n.read).length +
    (getLabSnapshot()?.orders.filter((order) => order.status === "reserved")
      .length ?? 0);
  const backdrop = button(
    "",
    () => {
      closeNavigation();
      menuButton.focus();
    },
    "nav-backdrop",
    { "aria-label": "Close navigation", hidden: !sidebarOpen },
  );
  const menuButton = button(
    icon("menu"),
    () => {
      sidebarOpen = !sidebarOpen;
      syncNavigation();
      if (sidebarOpen)
        aside
          .querySelector<HTMLElement>("nav a")
          ?.focus({ preventScroll: true });
    },
    "icon-button mobile-menu",
    {
      "aria-label": "Toggle navigation",
      "aria-expanded": sidebarOpen,
      "aria-controls": "lab-sidebar",
    },
  );
  function closeNavigation() {
    sidebarOpen = false;
    syncNavigation();
  }
  aside.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeNavigation();
      menuButton.focus();
    } else if (event.key === "Tab" && mobile.matches && sidebarOpen) {
      const controls = [
        ...aside.querySelectorAll<HTMLElement>(
          'a[href], button:not(:disabled), input:not(:disabled), [tabindex="0"]',
        ),
      ].filter((node) => node.getClientRects().length);
      const first = controls[0],
        last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
  });
  const headerBrand = brandLink("#/", true);
  headerBrand.addEventListener("click", closeNavigation);
  const header = h(
    "header",
    { class: "topbar" },
    h("div", { class: "topbar-left" }, menuButton, headerBrand),
    h(
      "div",
      { class: "topbar-actions" },
      button(
        h(
          "span",
          { class: "help-label" },
          teacherMode ? "Studio guide" : "How it works",
          h("span", { class: "question-mark" }, "?"),
        ),
        guideModal,
        "text-button help-button",
      ),
      button(
        h(
          "span",
          null,
          icon("bell", 19),
          notices ? h("i", { class: "notification-dot" }) : null,
        ),
        () => notificationsModal(),
        "icon-button notification-button",
        {
          "aria-label": `Notifications${notices ? `, ${notices} unread` : ""}`,
        },
      ),
      button(
        h(
          "span",
          { class: "balance-inner" },
          icon("coin", 19),
          h(
            "strong",
            connected ? { "data-class-credit": true } : null,
            (connected ? classCredits() : (user?.merits ?? 0)).toLocaleString(),
          ),
          h("span", null, connected ? "class credits" : "merits"),
        ),
        () => go("/shop"),
        "balance-pill",
        {
          "aria-label": `${connected ? classCredits() : (user?.merits ?? 0)} ${connected ? "class credits" : "merits"}, visit supply shop`,
        },
      ),
      button(
        h(
          "span",
          { class: "header-avatar" },
          scientistAvatar(
            user?.id ?? "guest",
            user?.name ?? "Scientist",
            user?.avatar ?? "cat",
          ),
        ),
        profileModal,
        "icon-button avatar-button",
        { "aria-label": "Open scientist profile" },
      ),
      button("Log out", logoutModal, "logout-button", {
        "aria-label": "Log out",
      }),
    ),
  );
  const guideHost = h("div", { class: "guide-host" });
  setTimeout(() => {
    if (route !== "/friends" && route !== "/leaderboard")
      void attachGuide(guideHost);
  }, 0);
  const main = h(
    "main",
    { id: "main", class: "main", tabIndex: -1 },
    pageNavigation(route),
    guideHost,
    page,
  );
  const workspace = h(
    "div",
    { class: "workspace" },
    header,
    connectionNotice(),
    cloudNotice(),
    main,
    h(
      "footer",
      { class: "footer" },
      h(
        "span",
        null,
        icon("heart", 13),
        "Made for curious minds. Grown one discovery at a time.",
      ),
      aboutUsButton(),
      h("span", null, "SCIENCE ONLY. WONDER ALWAYS.", icon("sprout", 14)),
    ),
  );
  function syncNavigation() {
    const open = mobile.matches && sidebarOpen;
    aside.classList.toggle("open", open);
    aside.inert = mobile.matches && !open;
    if (open) {
      aside.setAttribute("role", "dialog");
      aside.setAttribute("aria-modal", "true");
    } else {
      aside.removeAttribute("role");
      aside.removeAttribute("aria-modal");
    }
    backdrop.hidden = !open;
    workspace.inert = open;
    menuButton.setAttribute("aria-expanded", String(open));
    document.documentElement.classList.toggle("navigation-open", open);
  }
  const resizeNavigation = () => {
    const wasOpen = sidebarOpen;
    if (!mobile.matches) sidebarOpen = false;
    syncNavigation();
    if (wasOpen && !mobile.matches) main.focus({ preventScroll: true });
  };
  mobile.addEventListener("change", resizeNavigation);
  releaseNavigation = () => {
    mobile.removeEventListener("change", resizeNavigation);
    workspace.inert = false;
    document.documentElement.classList.remove("navigation-open");
  };
  syncNavigation();
  queueMicrotask(() => {
    refreshNotificationBadges();
    if (
      aside.isConnected &&
      mobile.matches &&
      sidebarOpen &&
      !aside.contains(document.activeElement)
    )
      aside.querySelector<HTMLElement>("nav a")?.focus({ preventScroll: true });
  });
  return h("div", { class: "app-layout" }, aside, backdrop, workspace);
}
export function pageHeading(
  eyebrow: string,
  title: string,
  subtitle: string,
  extra?: HTMLElement,
) {
  return h(
    "div",
    { class: "page-heading" },
    h(
      "div",
      null,
      h("p", { class: "eyebrow" }, eyebrow),
      h("h1", null, title),
      h("p", { class: "page-subtitle" }, subtitle),
    ),
    extra,
  );
}
export const empty = (
  mascotName: string,
  title: string,
  text: string,
  action?: HTMLElement,
) =>
  h(
    "div",
    { class: "empty-state paper" },
    mascot(mascotName),
    h("h2", null, title),
    h("p", { class: "muted" }, text),
    action,
  );
export function helpModal() {
  modal("A little science. A lot of discovery.", [
    h(
      "div",
      { class: "help-steps" },
      ...[
        [
          "1",
          "Follow your curiosity",
          "Choose a science branch, a deck, and a comfortable level. Grades are recommendations, not locks.",
        ],
        [
          "2",
          "Make eight little discoveries",
          "Try each card. Explanations and gentle hints help the science click. Mix-ups become spaced Review Box cards.",
        ],
        [
          "3",
          "Grow and give yourself a treat",
          "Earn XP and merits, complete daily quests, and exchange merits for school supplies.",
        ],
      ].map(([n, title, desc]) =>
        h(
          "div",
          null,
          h("span", { class: "step-number" }, n),
          h(
            "div",
            null,
            h("h3", null, title),
            h("p", { class: "muted" }, desc),
          ),
        ),
      ),
    ),
    h(
      "div",
      { class: "notice" },
      cloudEnabled
        ? "Signed-in accounts save profiles, photos and completed quizzes. Class credits and supply reservations are shared with your classroom. Notebook pages, practice XP, quests and spins stay on this device. Teachers verify physical collection."
        : "This is a local demo. Accounts and balances stay in this browser. Supply claims need school verification at the Grade 10 SSC room; no real purchase is placed online.",
    ),
    button(
      "Let’s get curious",
      () => {
        document.querySelector("dialog")?.close();
        go("/island");
      },
      "button primary full",
    ),
  ]);
}
function refreshNotificationBadges() {
  const state = getState();
  if (!state) return;
  const user = currentUser();
  const pending =
    getLabSnapshot()?.orders.filter((order) => order.status === "reserved")
      .length ?? 0;
  const count =
    state.notifications.filter((n) => n.userId === user?.id && !n.read).length +
    pending;
  document
    .querySelectorAll<HTMLElement>(".notification-button")
    .forEach((node) => {
      node.setAttribute(
        "aria-label",
        `Notifications${count ? `, ${count} updates` : ""}`,
      );
      const holder = node.querySelector("span");
      holder?.querySelector(".notification-dot")?.remove();
      if (count) holder?.append(h("i", { class: "notification-dot" }));
    });
  document
    .querySelectorAll<HTMLElement>("[data-drawer-notifications]")
    .forEach((node) => {
      node.textContent = pending
        ? `Notifications · ${pending} to collect`
        : "Notifications";
    });
}
window.addEventListener("csl:platform", refreshNotificationBadges);
async function notificationsModal() {
  const user = currentUser();
  if (!user) return;
  let refreshFailed = false;
  if (cloudEnabled && user.id !== "guest" && hasPlatform())
    await refreshLab(true).catch(() => {
      refreshFailed = true;
    });
  if (currentUser()?.id !== user.id) return;
  const pending =
    getLabSnapshot()?.orders.filter((order) => order.status === "reserved") ??
    [];
  const location = pickupLocation(getLabSnapshot()?.rules);
  const notices = getState()
    .notifications.filter((n) => n.userId === user?.id)
    .slice(-30)
    .reverse();
  const { close } = modal("Little lab updates", [
    pending.length
      ? h(
          "section",
          { class: "pickup-reminders", "aria-label": "Pending supply pickups" },
          h("h3", null, "A little reward is waiting"),
          ...pending.map((order) =>
            h(
              "article",
              { class: "pickup-reminder" },
              h("h4", null, order.item_name),
              h("p", null, pickupReminder(order.item_name, location)),
              h("p", null, "Claim code: ", h("strong", null, order.code)),
              button(
                "View pickup details",
                () => {
                  close();
                  reservationDetails(order);
                },
                "button outline",
              ),
            ),
          ),
          h(
            "small",
            null,
            "Pickup reminders stay here until the teacher records collection or cancels the reservation.",
          ),
        )
      : null,
    refreshFailed
      ? h(
          "p",
          { class: "notice" },
          "Connect to refresh your latest supply updates. Any saved pickup details are still shown below.",
        )
      : null,
    notices.length
      ? h(
          "div",
          { class: "notice-list" },
          ...notices.map((n) =>
            h(
              "div",
              { class: `notification ${n.read ? "" : "unread"}` },
              icon("bell"),
              h(
                "div",
                null,
                h("p", null, n.text),
                h(
                  "small",
                  { class: "muted" },
                  new Date(n.time).toLocaleString("en-PH", {
                    timeZone: getState().rules.timezone,
                  }),
                ),
              ),
            ),
          ),
        )
      : !pending.length
        ? h(
            "p",
            { class: "muted" },
            "All quiet in the lab. We’ll keep your discoveries and supply updates here.",
          )
        : null,
  ]);
  if (notices.some((n) => !n.read))
    void act(() => dispatch({ type: "ReadNotifications" }))();
}
export function levelCard() {
  const u = currentUser()!;
  const r = getState().rules;
  return h(
    "div",
    { class: "level-card" },
    h("span", { class: "level-badge" }, icon("star", 18)),
    h(
      "div",
      null,
      h("strong", null, `Level ${levelOf(u, r)} · Curious explorer`),
      progress(
        ((u.xp % r.xpPerLevel) / r.xpPerLevel) * 100,
        "Progress to next level",
      ),
      h(
        "small",
        { class: "muted" },
        `${u.xp % r.xpPerLevel} / ${r.xpPerLevel} XP to your next level`,
      ),
    ),
  );
}

export function teacherHelpModal() {
  modal("A calm place to care for your class", [
    h(
      "ol",
      { class: "learning-help" },
      ...[
        "Review class reports by grade, section or science deck. Open a quiz to see submitted answers and add a teacher note.",
        "View scientist profiles and photos, ban or restore classroom access, or adjust class credits with a clear reason. Existing discoveries stay saved.",
        "Manage supply prices and available stock. Verify the student's code before recording collection; cancellations return stock and credits together.",
        "Review science cards before saving changes. Earlier versions stay available for quizzes that were already started.",
        "Tune learning rewards and daily limits for your class. Activity history records your edits so the class can review a change.",
        ...(hasStudio()
          ? [
              "Use class reports and record care to filter quiz history, archive reviewed results and restore evidence. Original scores and credits stay in place.",
              "Manage another active account’s teaching access in Scientists. Changes need a reason; your own teaching role remains protected.",
            ]
          : []),
      ].map((text) => h("li", null, text)),
    ),
  ]);
}
