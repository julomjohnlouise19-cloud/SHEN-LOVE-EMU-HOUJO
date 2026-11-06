import { currentUser, dispatch, getState } from "../store";
import { dayKey } from "../core/time";
import { levelOf } from "../core/rules";
import { h, button, modal, progress } from "./dom";
import { icon, mascot } from "./svg";
import { act, go } from "./actions";
import { authModal, profileModal } from "./auth";
let sidebarOpen = false;
const nav = [
  ["/", "home", "My lab"],
  ["/island", "island", "Science Island"],
  ["/review", "box", "Review Box"],
  ["/notebook", "notebook", "My notebook"],
  ["/shop", "shop", "Supply shop"],
  ["/spin", "spin", "Daily spin"],
  ["/leaderboard", "trophy", "Leaderboard"],
];
export function shell(page: HTMLElement, route: string) {
  const user = currentUser(),
    s = getState();
  const today = dayKey({ now: () => Date.now() }, s.rules.timezone),
    due = user?.review.filter((c) => c.due <= today).length ?? 0;
  const level = user ? levelOf(user, s.rules) : 1;
  const navigation = h(
    "nav",
    { "aria-label": "Main navigation" },
    ...nav.map(([path, ico, label], i) =>
      h(
        "div",
        null,
        i === 4 ? h("p", { class: "nav-caption" }, "A LITTLE EXTRA") : null,
        h(
          "a",
          {
            href: `#${path}`,
            class: `nav-link ${route === path || (path === "/island" && route.startsWith("/branch")) ? "active" : ""}`,
            "aria-current": route === path ? "page" : undefined,
            onClick: () => {
              sidebarOpen = false;
              aside.classList.remove("open");
              backdrop.hidden = true;
            },
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
  if (user?.role === "admin")
    navigation.append(
      h(
        "a",
        {
          href: "#/admin",
          class: `nav-link ${route === "/admin" ? "active" : ""}`,
        },
        icon("settings"),
        "Mission control",
      ),
    );
  const aside = h(
    "aside",
    { class: `sidebar ${sidebarOpen ? "open" : ""}` },
    h(
      "a",
      { class: "brand", href: "#/", "aria-label": "Cozy Science Lab home" },
      h("span", { class: "brand-icon" }, icon("flask", 31)),
      h(
        "span",
        null,
        "cozy science",
        h("strong", null, "lab", h("span", { class: "brand-star" }, "✳")),
      ),
    ),
    h("span", { class: "lab-label" }, "A HAPPY PLACE TO GET CURIOUS"),
    navigation,
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
          h("span", { class: "mini-avatar" }, mascot(user?.avatar ?? "cat")),
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
        profileModal,
        "profile-button",
      ),
      user?.id === "guest"
        ? button(
            "Save your progress · Join the lab",
            () => authModal(true),
            "join-link",
          )
        : null,
    ),
  );
  const notices = s.notifications.filter(
    (n) => n.userId === user?.id && !n.read,
  ).length;
  const backdrop = button(
    "",
    () => {
      sidebarOpen = false;
      aside.classList.remove("open");
      backdrop.hidden = true;
    },
    "nav-backdrop",
    { "aria-label": "Close navigation", hidden: !sidebarOpen },
  );
  const header = h(
    "header",
    { class: "topbar" },
    h(
      "div",
      { class: "topbar-left" },
      button(
        icon("menu"),
        () => {
          sidebarOpen = !sidebarOpen;
          aside.classList.toggle("open", sidebarOpen);
          backdrop.hidden = !sidebarOpen;
        },
        "icon-button mobile-menu",
        { "aria-label": "Toggle navigation", "aria-expanded": sidebarOpen },
      ),
      h(
        "span",
        { class: "breadcrumb" },
        icon("sprout", 17),
        "Your daily dose of wonder",
        h("span", { class: "breadcrumb-dot" }, "✦"),
      ),
    ),
    h(
      "div",
      { class: "topbar-actions" },
      button(
        h(
          "span",
          { class: "help-label" },
          "How it works",
          h("span", { class: "question-mark" }, "?"),
        ),
        helpModal,
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
          h("strong", null, (user?.merits ?? 0).toLocaleString()),
          h("span", null, "merits"),
        ),
        () => go("/shop"),
        "balance-pill",
        { "aria-label": `${user?.merits ?? 0} merits, visit supply shop` },
      ),
      button(
        h("span", { class: "header-avatar" }, mascot(user?.avatar ?? "cat")),
        profileModal,
        "icon-button avatar-button",
        { "aria-label": "Open scientist profile" },
      ),
    ),
  );
  const main = h("main", { id: "main", class: "main", tabIndex: -1 }, page);
  return h(
    "div",
    { class: "app-layout" },
    aside,
    backdrop,
    h(
      "div",
      { class: "workspace" },
      header,
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
        h("span", null, "SCIENCE ONLY. WONDER ALWAYS.", icon("sprout", 14)),
      ),
    ),
  );
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
      "This is a local demo. Accounts and balances stay in this browser. Supply claims need school verification at the Grade 10 SSC room; no real purchase is placed online.",
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
function notificationsModal() {
  const user = currentUser(),
    notices = getState()
      .notifications.filter((n) => n.userId === user?.id)
      .slice(-30)
      .reverse();
  modal("Little lab updates", [
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
      : h(
          "p",
          { class: "muted" },
          "All quiet in the lab. We’ll keep your discoveries and supply updates here.",
        ),
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
