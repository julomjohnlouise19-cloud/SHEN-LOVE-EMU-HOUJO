import { currentUser } from "../store";
import { cloudEnabled } from "../store/cloud";
import { button, h, modal } from "./dom";
import { guideModal } from "./guide";
import { icon, mascot } from "./svg";

export function siteHelpModal(trigger: HTMLElement) {
  const { dialog, close } = modal(
    "A little guide to your science world",
    [],
    true,
    trigger,
  );
  dialog.classList.add("site-help-dialog");
  const features = [
    [
      "island",
      "Explore",
      "Explore Science Island",
      "Discover life science, chemistry, physics, Earth and space. Choose a topic, from Anatomy to Volcanoes, and a difficulty that fits you.",
    ],
    [
      "cards",
      "Play",
      "Play, practice, understand",
      "Try science quizzes, matching, Word Hunt, flashcards and Planet Explorer. Use hints, read answer explanations and collect activity badges. Sounds are optional.",
    ],
    [
      "notebook",
      "Remember",
      "Make learning stick",
      "Revisit tricky ideas in your Review Box, keep thoughts in My notebook and find science videos, notes, sources, handbooks and the periodic table in the Study Room.",
    ],
    [
      "heart",
      "Friends",
      "Find your science friends",
      "See active classmates and send a friend request using their existing login username. The leaderboard ranks students by their current class-credit balance, highest first.",
    ],
    [
      "gift",
      "Rewards",
      "Build a daily habit",
      cloudEnabled
        ? "Check the gift button for the seven-week daily calendar and the bell for reminders. The free Daily spin and calendar award class credits when your classroom enables them. Spend class credits in the Supply shop."
        : "Check the gift button for the daily calendar and the bell for reminders. Daily spin gives device practice merits in this local demo; shared class-credit rewards need an online classroom.",
    ],
    [
      "sparkles",
      "My profile",
      "Make yourself at home",
      "Open your scientist profile to edit your details, add a photo or banner, and choose a color palette or Dark mode for the whole website. Share an idea in the Suggestion box.",
    ],
  ];
  let selected = 0;
  const panel = h("div", {
    id: "site-help-feature",
    class: "site-help-feature-panel",
    role: "tabpanel",
    tabindex: 0,
  });
  const count = h("span", {
    class: "site-help-stop-count",
    "aria-live": "polite",
  });
  const tabs = features.map(([symbol, label], index) => {
    const tab = button(
      h("span", null, icon(symbol, 18), label),
      () => select(index),
      "site-help-tab",
      {
        id: `site-help-tab-${index}`,
        role: "tab",
        "aria-controls": panel.id,
        "aria-selected": index === selected,
        tabindex: index === selected ? 0 : -1,
      },
    );
    tab.addEventListener("keydown", (event) => {
      const next =
        event.key === "ArrowRight"
          ? (selected + 1) % features.length
          : event.key === "ArrowLeft"
            ? (selected + features.length - 1) % features.length
            : event.key === "Home"
              ? 0
              : event.key === "End"
                ? features.length - 1
                : undefined;
      if (next === undefined) return;
      event.preventDefault();
      select(next);
      tabs[next].focus({ preventScroll: true });
    });
    return tab;
  });
  function select(index: number) {
    selected = index;
    tabs.forEach((tab, position) => {
      tab.setAttribute("aria-selected", String(position === selected));
      tab.tabIndex = position === selected ? 0 : -1;
    });
    const [symbol, , title, copy] = features[selected];
    panel.setAttribute("aria-labelledby", tabs[selected].id);
    panel.replaceChildren(
      h(
        "span",
        { class: "site-help-feature-icon", "aria-hidden": true },
        icon(symbol, 25),
      ),
      h("h3", null, title),
      h("p", null, copy),
    );
    count.textContent = `Stop ${selected + 1} of ${features.length}`;
  }
  select(0);
  dialog.append(
    h(
      "section",
      { class: "site-help-intro", "aria-labelledby": "site-help-welcome" },
      h(
        "div",
        { class: "site-help-mascot", "aria-hidden": true },
        mascot("flask"),
        h("span", null, "Hi!"),
      ),
      h(
        "div",
        null,
        h("p", { class: "eyebrow" }, "YOUR LITTLE LAB. A WORLD OF WONDER."),
        h("h3", { id: "site-help-welcome" }, "Hello, Scientist!"),
        h(
          "p",
          { class: "site-help-greeting" },
          "Ready for a little a-ha moment?",
        ),
        h(
          "p",
          null,
          "The Cozy Science Lab is your space to explore, play and grow with science. Made for Grade 7–10 learners by Grade 10-SSC student researchers. Bring your questions. We’ll bring the discoveries!",
        ),
      ),
    ),
    h(
      "section",
      {
        class: "site-help-features",
        "aria-labelledby": "site-help-tour-title",
      },
      h("h3", { id: "site-help-tour-title" }, "Pick your next discovery"),
      h("p", null, "Tap a little stop below to see what’s waiting for you."),
      h(
        "div",
        {
          class: "site-help-tabs",
          role: "tablist",
          "aria-label": "Discover the website",
        },
        ...tabs,
      ),
      panel,
      h(
        "div",
        { class: "site-help-tour-controls" },
        button(
          h("span", null, icon("chevron", 16), "Previous"),
          () => select((selected + features.length - 1) % features.length),
          "button outline site-help-previous",
        ),
        count,
        button(
          h("span", null, "Next stop", icon("chevron", 16)),
          () => select((selected + 1) % features.length),
          "button outline",
        ),
      ),
    ),
    h(
      "section",
      { class: "site-help-start", "aria-labelledby": "site-help-start-title" },
      h("h3", { id: "site-help-start-title" }, "A good place to start"),
      h(
        "ol",
        null,
        ...[
          "Pick a topic on Science Island.",
          "Try an activity or answer a science card.",
          "Read the feedback and revisit ideas you want to remember.",
        ].map((copy) => h("li", null, copy)),
      ),
      h(
        "p",
        null,
        cloudEnabled
          ? "Guest practice stays on this device. Sign in with a verified account for shared class credits, friends and saved quiz discoveries. Your notebook and activity practice stay on this device. Practice merits are separate from class credits."
          : "This is a local demo: accounts and practice stay in this browser. Shared friends, rankings and class credits need an online classroom.",
      ),
    ),
    h(
      "p",
      { class: "site-help-teachers" },
      icon("sprout", 19),
      h(
        "span",
        null,
        h("strong", null, "For teachers: "),
        "Teacher studio brings class records, science cards, supplies, suggestions and classroom settings together. Use About us to meet the student researchers.",
      ),
    ),
    h(
      "div",
      { class: "site-help-actions" },
      button("Got it!", close, "button primary"),
      currentUser()
        ? button("Show me the step-by-step guide", guideModal, "button outline")
        : null,
    ),
  );
}
