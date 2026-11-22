import {
  cozyTitles,
  learningGrowth,
  learningBadges,
  activeLearningStreak,
  nextBadgeGoals,
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

// Keep a little interaction through ordinary focus/visibility rerenders.
// It is UI-only, scoped to the current learner/day and reset on a reload.
let companionGreeting:
  { owner: string; day: string; index: number } | undefined;

export function growthPage() {
  const user = currentUser()!,
    state = getState();
  const today = dayKey(clock, state.rules.timezone);
  const growth = learningGrowth(user, state.rules);
  const badges = learningBadges(user, state.runs, today);
  const earned = badges.filter((badge) => badge.earned).length;
  const greeting =
    companionGreeting?.owner === user.id && companionGreeting.day === today
      ? companionGreeting
      : { owner: user.id, day: today, index: 0 };
  companionGreeting = greeting;
  let kind = "buddies",
    branch = "all",
    earnedOnly = false;
  const root = h("div", { class: "page-enter growth-page" });
  const cheers = [
    user.daily[today]?.answers
      ? `${user.daily[today].answers} thoughtful ${user.daily[today].answers === 1 ? "answer" : "answers"} today. Look at your little garden growing!`
      : "A fresh little page for today. Pick one idea to explore together.",
    "High five, scientist! Small discoveries still count.",
    "A mix-up is a clue. Read the feedback and try again.",
    "Your titles grow with XP. Your curiosity is already yours.",
  ];
  const speech = h(
    "p",
    { class: "growth-mascot-speech", role: "status", "aria-live": "polite" },
    cheers[greeting.index],
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
        if (currentUser()?.id !== user.id) return;
        greeting.index = (greeting.index + 1) % cheers.length;
        speech.textContent = cheers[greeting.index];
        companion.classList.remove("is-cheering");
        requestAnimationFrame(() => companion.classList.add("is-cheering"));
      },
      "button outline",
    ),
  );

  async function arrangeShelf() {
    (await import("./auth")).profileModal({ showBadges: true });
  }
  function practiceFor(badge: LearningBadge) {
    if (badge.action && "route" in badge.action) go(badge.action.route);
    else if (badge.id === "week-streak") go("/island");
    else {
      const action =
        badge.action && "deckId" in badge.action
          ? badge.action
          : {
              deckId: badge.topicId ?? "life.cells",
              level: badge.topicId ? ("medium" as const) : ("easy" as const),
            };
      const locked =
        deckById(action.deckId)?.branch === "skills" &&
        growth.level < state.rules.skillsLevel;
      openDeck(
        locked ? "life.cells" : action.deckId,
        locked ? "easy" : action.level,
      );
    }
  }
  const progressUnit = (badge: LearningBadge) =>
    badge.unit ??
    (badge.id === "week-streak"
      ? "consecutive days"
      : badge.id === "ten-right" || badge.id === "perfect-easy"
        ? "correct answers"
        : "completed decks");
  const skillsLocked = (badge: LearningBadge) =>
    !!(
      badge.action &&
      "deckId" in badge.action &&
      deckById(badge.action.deckId)?.branch === "skills" &&
      growth.level < state.rules.skillsLevel
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
        `${badge.progress} / ${badge.target} ${progressUnit(badge)}`,
      ),
      skillsLocked(badge)
        ? h(
            "p",
            { class: "growth-device-note" },
            `The Skills Lab opens at Level ${state.rules.skillsLevel}. A gentle practice deck can help you get there.`,
          )
        : null,
      h(
        "div",
        { class: "growth-detail-actions" },
        badge.earned
          ? button(
              "Display on my profile",
              async () => {
                close();
                await arrangeShelf();
              },
              "button primary full",
            )
          : null,
        button(
          badge.earned
            ? "Explore another topic"
            : skillsLocked(badge)
              ? "Build my Skills Lab level"
              : badge.action
                ? badge.action.label
                : deck
                  ? `Practice ${deck.name}`
                  : badge.id === "perfect-easy"
                    ? "Try an easy Cells deck"
                    : "Find my next discovery",
          () => {
            close();
            if (!badge.earned) practiceFor(badge);
            else go("/island");
          },
          "button primary full",
        ),
        !badge.earned && !badge.topicId
          ? button(
              "Make this my little goal",
              () => {
                close();
                focusGoal(badge);
              },
              "button outline full",
            )
          : null,
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
          (kind === "topics"
            ? !!badge.topicId
            : kind === "buddies"
              ? badge.buddy !== undefined
              : !badge.topicId && badge.buddy === undefined)) &&
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
            h(
              "span",
              { class: "growth-mini-track", "aria-hidden": true },
              h("span", {
                style: `width:${(badge.progress / badge.target) * 100}%`,
              }),
            ),
            h("small", null, `${badge.progress} / ${badge.target} · Details`),
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
        ["buddies", "Cozy buddies"],
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

  const goals = nextBadgeGoals(badges);
  const goalBody = h("div", {
    class: "growth-goal-body",
    "aria-live": "polite",
  });
  const goalSelect = h(
    "select",
    { "aria-label": "Choose my next badge goal" },
    ...goals.map((badge) => h("option", { value: badge.id }, badge.name)),
  );
  function focusGoal(badge: LearningBadge) {
    if (badge.earned || badge.topicId) return;
    if (!goals.some((value) => value.id === badge.id)) {
      if (goals.length >= 4) goals.pop();
      goals.push(badge);
    }
    goalSelect.replaceChildren(
      ...goals.map((value) => h("option", { value: value.id }, value.name)),
    );
    goalSelect.value = badge.id;
    drawGoal();
    nextGoal.scrollIntoView({ block: "start" });
    goalSelect.focus({ preventScroll: true });
  }
  function drawGoal() {
    const badge = goals.find((value) => value.id === goalSelect.value);
    if (!badge) {
      goalBody.replaceChildren(
        titleBuddy(20),
        h(
          "div",
          null,
          h(
            "h2",
            null,
            badges.every((value) => value.earned)
              ? "A garden full of discoveries"
              : "Your little goals are blooming",
          ),
          h(
            "p",
            null,
            badges.every((value) => value.earned)
              ? "You’ve earned every learning badge. Keep your curiosity growing with a new challenge."
              : "All milestone and Cozy buddy goals are earned. Explore the topic badges in your collection for another discovery.",
          ),
          button(
            "Try a hard Cells challenge",
            () => openDeck("life.cells", "hard"),
            "button primary",
          ),
        ),
      );
      return;
    }
    goalBody.replaceChildren(
      badgeArtwork(badge),
      h(
        "div",
        { class: "growth-goal-copy" },
        h("h2", null, badge.name),
        h("p", null, badge.description),
        progress(
          (badge.progress / badge.target) * 100,
          "Progress toward " + badge.name,
        ),
        h(
          "p",
          { class: "growth-goal-count" },
          `${badge.progress} of ${badge.target} ${progressUnit(badge)}`,
        ),
        skillsLocked(badge)
          ? h(
              "p",
              { class: "growth-device-note" },
              `The Skills Lab opens at Level ${state.rules.skillsLevel}. Practice gently to grow your level first.`,
            )
          : null,
        h(
          "div",
          { class: "growth-goal-actions" },
          button(
            skillsLocked(badge)
              ? "Build my Skills Lab level"
              : badge.action && "route" in badge.action
                ? badge.action.label
                : badge.id === "week-streak"
                  ? "Explore today’s science"
                  : "Practice for this badge",
            () => practiceFor(badge),
            "button primary",
          ),
          button(
            "See goal details",
            () => badgeDetail(badge),
            "button outline",
          ),
        ),
      ),
    );
  }
  goalSelect.addEventListener("change", drawGoal);
  drawGoal();
  const nextGoal = h(
    "section",
    { class: "growth-next-goal", "aria-label": "My next learning goal" },
    h(
      "div",
      { class: "growth-goal-heading" },
      h("p", { class: "eyebrow" }, "YOUR NEXT LITTLE WIN"),
      goals.length
        ? h(
            "label",
            { class: "growth-goal-picker" },
            h("span", null, "Pick a little goal"),
            goalSelect,
          )
        : null,
    ),
    goalBody,
  );

  root.append(
    pageHeading(
      "LITTLE STEPS. LOVELY DISCOVERIES.",
      "Your growth garden",
      "Choose a small goal, celebrate earned badges, and see how your learning is growing.",
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
    nextGoal,
    h(
      "details",
      { class: "growth-title-section", "aria-label": "Your cozy title path" },
      h(
        "summary",
        null,
        h("span", null, "Your cozy title trail"),
        h("small", null, "See the little scientist you’re becoming"),
      ),
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
        h(
          "div",
          { class: "growth-collection-actions" },
          h("span", { class: "growth-earned-count" }, `${earned} earned`),
          button("Arrange my badge shelf", arrangeShelf, "button outline"),
        ),
      ),
      h(
        "p",
        { class: "muted" },
        "Meet eleven little study buddies. Tap one for its task or make it your next goal. Earned badges are yours to keep.",
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
