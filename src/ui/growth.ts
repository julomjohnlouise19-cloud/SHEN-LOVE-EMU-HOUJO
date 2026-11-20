import {
  cozyTitles,
  learningGrowth,
  learningBadges,
  activeLearningStreak,
  type LearningBadge,
} from "../core/growth";
import { dayKey } from "../core/time";
import { branches, deckById } from "../data/catalog";
import { currentUser, getState, clock } from "../store";
import { h, button, progress, modal, input } from "./dom";
import { icon, mascot } from "./svg";
import { pageHeading } from "./shell";
import { go } from "./actions";
import { openDeck } from "./learn";
import { badgeArtwork, titleBuddy } from "./badge-art";
import { learningCalendar } from "./learning-calendar";

export function growthPage() {
  const user = currentUser()!,
    state = getState();
  const today = dayKey(clock, state.rules.timezone);
  const growth = learningGrowth(user, state.rules);
  const badges = learningBadges(user, state.runs, today);
  const earned = badges.filter((badge) => badge.earned).length;
  let kind = "milestones",
    branch = "all",
    earnedOnly = false,
    cheer = 0;
  const root = h("div", { class: "page-enter growth-page" });
  const cheers = [
    "Every question plants a little seed. I’m cheering for you!",
    "High five, scientist! Small discoveries still count.",
    "A mix-up is a clue. Read the feedback and try again.",
    "Your titles grow with XP. Your curiosity is already yours.",
  ];
  const speech = h(
    "p",
    { class: "growth-mascot-speech", role: "status", "aria-live": "polite" },
    cheers[0],
  );
  const companion = h(
    "div",
    { class: "growth-companion" },
    mascot("cat", "growth-tabby"),
    h("strong", null, "Tabby’s rooting for you"),
    speech,
    button(
      h("span", null, icon("heart", 16), "High five, Tabby!"),
      () => {
        cheer = (cheer + 1) % cheers.length;
        speech.textContent = cheers[cheer];
        companion.classList.remove("is-cheering");
        requestAnimationFrame(() => companion.classList.add("is-cheering"));
      },
      "button outline",
    ),
  );

  function badgeDetail(badge: LearningBadge) {
    const deck = badge.topicId ? deckById(badge.topicId) : undefined;
    const { close } = modal(badge.name, [
      badgeArtwork(badge, "large"),
      h(
        "p",
        { class: "growth-detail-status" },
        badge.earned
          ? "Earned · yours to keep"
          : "A little goal to grow toward",
      ),
      h("p", null, badge.description),
      progress((badge.progress / badge.target) * 100, `${badge.name} progress`),
      h(
        "p",
        { class: "muted" },
        `${badge.progress} / ${badge.target}${badge.id === "week-streak" ? " days" : badge.id === "ten-right" || badge.id === "perfect-easy" ? " correct" : " completed"}`,
      ),
      button(
        badge.earned
          ? "Explore another topic"
          : deck
            ? `Practice ${deck.name}`
            : badge.id === "perfect-easy"
              ? "Try an easy Cells deck"
              : "Find my next discovery",
        () => {
          close();
          if (!badge.earned && (deck || badge.id === "perfect-easy"))
            openDeck(deck?.id ?? "life.cells", "easy");
          else go("/island");
        },
        "button primary full",
      ),
      h(
        "small",
        { class: "growth-device-note" },
        "Learning badges are saved for this account on this device. They do not spend or award class credits.",
      ),
    ]);
  }

  const search = input("badge-search", "Find a science topic or badge");
  search.type = "search";
  search.setAttribute("aria-label", "Find a learning badge");
  const list = h("div", { class: "growth-badge-grid" });
  const count = h("p", {
    class: "growth-filter-count",
    role: "status",
    "aria-live": "polite",
  });
  const branchSelect = h(
    "select",
    { "aria-label": "Badge science branch" },
    h("option", { value: "all" }, "All science branches"),
    ...branches.map((value) => h("option", { value: value.id }, value.name)),
  );
  const kindButtons = h("div", {
    class: "growth-filters",
    "aria-label": "Badge collections",
  });
  const earnedToggle = button(
    "Earned only",
    () => {
      earnedOnly = !earnedOnly;
      earnedToggle.setAttribute("aria-pressed", String(earnedOnly));
      renderBadges();
    },
    "button outline",
    { "aria-pressed": false },
  );
  function renderBadges() {
    const query = search.value.trim().toLocaleLowerCase();
    const shown = badges.filter(
      (badge) =>
        (kind === "all" ||
          (kind === "topics" ? !!badge.topicId : !badge.topicId)) &&
        (kind !== "topics" || branch === "all" || badge.branch === branch) &&
        (!earnedOnly || badge.earned) &&
        `${badge.name} ${badge.description}`
          .toLocaleLowerCase()
          .includes(query),
    );
    count.textContent = `${shown.length} ${shown.length === 1 ? "badge" : "badges"} shown · ${shown.filter((badge) => badge.earned).length} earned`;
    list.classList.toggle(
      "is-milestones",
      kind === "milestones" && shown.length === 5,
    );
    list.replaceChildren(
      ...shown.map((badge) =>
        button(
          h(
            "span",
            { class: "growth-badge-content" },
            badgeArtwork(badge),
            h("strong", null, badge.name),
            h(
              "span",
              { class: "growth-badge-status" },
              icon(badge.earned ? "check" : "lock", 14),
              badge.earned ? "Earned" : "Still growing",
            ),
            h("span", { class: "growth-badge-description" }, badge.description),
            h(
              "span",
              { class: "growth-mini-track", "aria-hidden": true },
              h("span", {
                style: `width:${(badge.progress / badge.target) * 100}%`,
              }),
            ),
            h(
              "small",
              null,
              `${badge.progress} / ${badge.target} · Tap for details`,
            ),
          ),
          () => badgeDetail(badge),
          `growth-badge-card ${badge.earned ? "is-earned" : ""}`,
          {
            "aria-label": `${badge.name} · ${badge.earned ? "earned" : "in progress"}`,
            "data-learning-badge": badge.id,
          },
        ),
      ),
    );
    if (!shown.length)
      list.append(
        h(
          "div",
          { class: "growth-empty" },
          icon("sprout", 32),
          h("h3", null, "A little room to grow"),
          h("p", null, "Try another search or show all your badges."),
          button(
            "Reset badge filters",
            () => {
              kind = "all";
              branch = "all";
              earnedOnly = false;
              search.value = "";
              branchSelect.value = "all";
              earnedToggle.setAttribute("aria-pressed", "false");
              renderKinds();
              renderBadges();
              search.focus();
            },
            "button outline",
          ),
        ),
      );
  }
  function renderKinds() {
    kindButtons.replaceChildren(
      ...[
        ["milestones", "Milestones"],
        ["topics", "Science topics"],
        ["all", "All badges"],
      ].map(([value, label]) =>
        button(
          label,
          () => {
            kind = value;
            for (const control of kindButtons.querySelectorAll("button"))
              control.setAttribute(
                "aria-pressed",
                String(control.dataset.kind === kind),
              );
            branchSelect.hidden = kind !== "topics";
            renderBadges();
          },
          "button outline",
          { "aria-pressed": kind === value, "data-kind": value },
        ),
      ),
    );
    branchSelect.hidden = kind !== "topics";
  }
  search.addEventListener("input", renderBadges);
  branchSelect.addEventListener("change", () => {
    branch = branchSelect.value;
    renderBadges();
  });
  renderKinds();
  renderBadges();

  root.append(
    pageHeading(
      "LITTLE STEPS. LOVELY DISCOVERIES.",
      "Your growth garden",
      "Collect connections, grow your title, and let your curiosity bloom.",
    ),
    h(
      "section",
      {
        class: "growth-hero paper",
        "aria-label": "Your XP and learning title",
      },
      h(
        "div",
        { class: "growth-level-summary" },
        h(
          "span",
          { class: "growth-level-label" },
          icon(growth.title.icon, 21),
          `LEVEL ${growth.level}`,
        ),
        h("h2", null, growth.title.name),
        h("p", null, growth.title.note),
        progress(growth.percent, "XP toward your next level"),
        h(
          "p",
          { class: "growth-xp-caption" },
          h(
            "strong",
            null,
            `${growth.currentXP} / ${state.rules.xpPerLevel} XP`,
          ),
          `${growth.remainingXP} XP to Level ${growth.level + 1}`,
        ),
        h(
          "div",
          { class: "growth-stats" },
          h(
            "span",
            null,
            icon("star", 18),
            h("strong", null, String(user.xp)),
            " total XP",
          ),
          h(
            "span",
            null,
            icon("trophy", 18),
            h("strong", null, `${earned}/${badges.length}`),
            " badges",
          ),
          h(
            "span",
            null,
            icon("flame", 18),
            h("strong", null, String(activeLearningStreak(user, today))),
            " day streak",
          ),
        ),
        growth.nextTitle
          ? h(
              "p",
              { class: "growth-next-title" },
              `Next cozy title: ${growth.nextTitle.name} at Level ${growth.nextTitle.level}.`,
            )
          : h(
              "p",
              { class: "growth-next-title" },
              "Professor is your highest cozy title. Your levels keep growing!",
            ),
        h(
          "details",
          { class: "growth-how" },
          h("summary", null, "How does my XP grow?"),
          h(
            "p",
            null,
            `Earn ${state.rules.correctXP} XP for a correct answer and ${state.rules.attemptXP} XP for a thoughtful try. Each level needs ${state.rules.xpPerLevel} XP. Read the explanation, keep discovering, and grow at your own pace.`,
          ),
        ),
      ),
      companion,
    ),
    learningCalendar(),
    h(
      "section",
      { class: "growth-title-section", "aria-label": "Your cozy title path" },
      h("h2", null, "From a little seed to a big idea"),
      h(
        "div",
        { class: "growth-title-path" },
        ...cozyTitles.map((title) => {
          const unlocked = growth.level >= title.level;
          return button(
            h(
              "span",
              null,
              titleBuddy(title.level),
              h("small", null, `LEVEL ${title.level}`),
              h("strong", null, title.name),
              h(
                "span",
                { class: "growth-title-state" },
                growth.title.name === title.name
                  ? "You’re here"
                  : unlocked
                    ? "Unlocked"
                    : `${Math.max(0, (title.level - 1) * state.rules.xpPerLevel - user.xp)} XP away`,
              ),
            ),
            () => {
              const { close } = modal(title.name, [
                titleBuddy(title.level),
                h("p", null, title.note),
                h(
                  "p",
                  null,
                  `Unlocked at Level ${title.level} · ${(title.level - 1) * state.rules.xpPerLevel} total XP.`,
                ),
                h(
                  "p",
                  null,
                  unlocked
                    ? "This title is part of your learning journey. Keep growing toward your next discovery."
                    : `You need ${Math.max(0, (title.level - 1) * state.rules.xpPerLevel - user.xp)} more XP. Every answer helps.`,
                ),
                button(
                  "Back to my garden",
                  () => close(),
                  "button primary full",
                ),
              ]);
            },
            `growth-title-stop ${unlocked ? "is-unlocked" : ""} ${growth.title.name === title.name ? "is-current" : ""}`,
            {
              "aria-label": `${title.name} · Level ${title.level}${growth.title.name === title.name ? " · current title" : ""}`,
            },
          );
        }),
      ),
    ),
    h(
      "section",
      {
        class: "growth-collection paper",
        "aria-label": "Your learning badge collection",
      },
      h(
        "div",
        { class: "growth-collection-heading" },
        h(
          "div",
          null,
          h("p", { class: "eyebrow" }, "SMALL WINS, YOURS TO KEEP"),
          h("h2", null, "Your badge garden"),
        ),
        h("span", { class: "growth-earned-count" }, `${earned} earned`),
      ),
      h(
        "p",
        { class: "muted" },
        "Tap a badge to see exactly how to earn it. Already earned badges stay with your progress.",
      ),
      kindButtons,
      h(
        "div",
        { class: "growth-search-row" },
        search,
        branchSelect,
        earnedToggle,
      ),
      count,
      list,
    ),
    h(
      "section",
      { class: "growth-next-actions" },
      h(
        "a",
        { href: "#/island", class: "button primary" },
        icon("island", 18),
        "Plant my next discovery",
      ),
      h(
        "a",
        { href: "#/quests", class: "button outline" },
        icon("sparkles", 18),
        "Open my daily quests",
      ),
      h(
        "a",
        { href: "#/island/activities/badges", class: "growth-text-link" },
        "Visit my activity passport",
        icon("arrow", 16),
      ),
    ),
    h(
      "p",
      { class: "growth-device-note" },
      "Practice XP, learning badges and streaks are saved for this account on this device. Class credits have their own shared classroom wallet.",
    ),
  );
  return root;
}
