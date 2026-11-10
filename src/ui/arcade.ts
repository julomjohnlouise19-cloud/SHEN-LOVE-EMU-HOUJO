import { currentUser } from "../store";
import { cloudEnabled } from "../store/cloud";
import {
  arcadePreferences,
  arcadeRankings,
  beginArcade,
  currentArcade,
  performArcade,
  saveArcadePreferences,
} from "../store/arcade";
import {
  arcadeLevel,
  arcadeMultiplier,
  type ArcadeAction,
  type ArcadeCategory,
} from "../core/arcade";
import type { ArcadeView } from "../store/platform";
import { button, h, modal, toast } from "./dom";
import { icon, mascot } from "./svg";
import { empty, pageHeading } from "./shell";
import { ArcadeAudio } from "./arcade-audio";
import { go } from "./actions";

const categories = [
  {
    id: "life" as const,
    name: "Biology",
    icon: "sprout",
    color: "green",
    text: "Tiny cells, living systems and the wild world.",
  },
  {
    id: "chemistry" as const,
    name: "Chemistry",
    icon: "flask",
    color: "yellow",
    text: "Atoms, reactions and a little matter magic.",
  },
  {
    id: "physics" as const,
    name: "Physics",
    icon: "atom",
    color: "peach",
    text: "Forces, energy and the motion all around us.",
  },
  {
    id: "earth" as const,
    name: "Earth & space",
    icon: "planet",
    color: "blue",
    text: "Our changing planet and the universe beyond.",
  },
];
let mounted:
  { userId: string; node: HTMLElement; destroy: () => void } | undefined;
export function disposeArcade() {
  mounted?.destroy();
  mounted = undefined;
}
export function arcadePage() {
  const user = currentUser()!;
  if (mounted?.userId === user.id) return mounted.node;
  disposeArcade();
  const node = h("div", { class: "arcade-page page-enter" });
  const controller = new AbortController(),
    audio = new ArcadeAudio();
  let timer: ReturnType<typeof setInterval> | undefined;
  let sound = true,
    calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let view: ArcadeView | null = null,
    busy = false,
    aimed = "",
    offset = 0;
  let celebrateNext = false;
  let retry: { action: ArcadeAction; id: string } | undefined;
  let tick: () => void = () => undefined;
  const alive = () =>
    !controller.signal.aborted && currentUser()?.id === user.id;
  mounted = {
    userId: user.id,
    node,
    destroy: () => {
      controller.abort();
      clearInterval(timer);
      audio.close();
    },
  };
  const updatePrefs = () =>
    void saveArcadePreferences(sound, calm).catch(() => undefined);
  const soundButton = () =>
    button(
      sound ? "Sound on" : "Sound off",
      async () => {
        sound = !sound;
        try {
          await audio.enable(sound);
        } catch {
          sound = false;
          toast("Sound is unavailable in this browser.");
        }
        updatePrefs();
        render();
      },
      "button outline",
      { "aria-pressed": sound },
    );
  function render() {
    if (!alive()) return;
    clearInterval(timer);
    aimed = "";
    if (!view) {
      void lobby();
      return;
    }
    if (view.state.completed) {
      results();
      return;
    }
    const current = view,
      s = current.state,
      q = current.question!;
    const level = arcadeLevel(s.index);
    const timerText = h("strong", { "data-arcade-timer": true }),
      timeBar = h("span");
    const reloadText = h("span", { class: "arcade-reload", role: "status" });
    const status = h(
      "div",
      { class: `arcade-feedback ${s.feedback?.kind ?? ""}`, role: "status" },
      s.feedback
        ? h("strong", null, s.feedback.text)
        : h("strong", null, "Take your best shot. Stay curious."),
      s.feedback?.answer
        ? h(
            "p",
            null,
            `Previous answer: ${s.feedback.answer}. ${s.feedback.explanation || ""}`,
          )
        : null,
    );
    const problem = h("p", { class: "form-error", role: "alert" });
    const shoot = button(
      "Shoot",
      () => {
        if (aimed) void act({ type: "shoot", option: aimed });
      },
      "button primary arcade-fire",
      { "aria-label": "Shoot aimed target" },
    );
    const time = button(
      `+5 seconds · ${s.rules.timeCost} coins`,
      () => act({ type: "time" }),
      "button outline",
      {
        disabled: s.timeUsed || s.coins < s.rules.timeCost,
        "aria-label": "Buy five extra seconds",
      },
    );
    const dart = button(
      `+1 dart · ${s.rules.dartCost} coins`,
      () => act({ type: "dart" }),
      "button outline",
      {
        disabled: s.dartUsed || s.coins < s.rules.dartCost,
        "aria-label": "Buy an extra dart",
      },
    );
    const crosshair = h("span", {
      class: "arcade-crosshair",
      "aria-hidden": true,
    });
    const targets = h("div", {
      class: `arcade-targets ${calm ? "calm-targets" : ""}`,
      "data-level": level + 1,
      style: { "--target-speed": `${s.rules.motion[level]}s` },
    });
    function aim(id: string) {
      aimed = id;
      targets
        .querySelectorAll<HTMLElement>(".arcade-target")
        .forEach((target) =>
          target.classList.toggle("aimed", target.dataset.option === id),
        );
      tick();
    }
    const targetButtons = (q.options ?? []).map((option, index) => {
      const target = button(
        h(
          "span",
          null,
          h("span", { class: "target-ring", "aria-hidden": true }, "◎"),
          h(
            "span",
            { class: "target-letter" },
            String.fromCharCode(65 + index),
          ),
          h("strong", null, option.text),
        ),
        () => act({ type: "shoot", option: option.id }),
        `arcade-target target-${index} ${s.wrong.includes(option.id) ? "target-wrong" : ""}`,
        {
          "data-option": option.id,
          "aria-label": `Shoot ${option.text}`,
          style: {
            "--target-phase": `${-((Date.now() - s.created) / 1000 + index * 0.8)}s`,
          },
        },
      );
      target.addEventListener("pointerenter", () => aim(option.id));
      target.addEventListener("focus", () => aim(option.id));
      return target;
    });
    targets.append(...targetButtons, crosshair);
    targets.addEventListener("pointermove", (event) => {
      const bounds = targets.getBoundingClientRect();
      crosshair.style.left = `${event.clientX - bounds.left}px`;
      crosshair.style.top = `${event.clientY - bounds.top}px`;
    });
    targets.addEventListener("click", (event) => {
      if (!(event.target as Element).closest("button"))
        void act({ type: "shoot", option: "__miss__" });
    });
    const calmToggle = h("input", {
      type: "checkbox",
      checked: calm,
      "aria-label": "Calm targets",
    });
    calmToggle.addEventListener("change", () => {
      calm = calmToggle.checked;
      targets.classList.toggle("calm-targets", calm);
      updatePrefs();
    });
    node.replaceChildren(
      h(
        "div",
        { class: "arcade-topline" },
        button(
          "← Arcade lobby",
          () => {
            view = null;
            render();
          },
          "text-button",
        ),
        h(
          "span",
          { class: "pill" },
          `${categories.find((c) => c.id === s.category)?.name} · Level ${level + 1}`,
        ),
        soundButton(),
      ),
      h(
        "div",
        { class: "arcade-hud", "aria-label": "Arcade statistics" },
        ...[
          ["SCORE", s.score.toLocaleString()],
          ["COMBO", `×${arcadeMultiplier(s.combo)}`],
          ["ROUND COINS", s.coins],
          ["DARTS", s.darts],
        ].map(([label, value]) =>
          h("div", null, h("small", null, label), h("strong", null, value)),
        ),
      ),
      h(
        "div",
        { class: "arcade-question" },
        h(
          "div",
          { class: "arcade-question-meta" },
          h("span", { class: "eyebrow" }, `DISCOVERY ${s.index + 1} / 9`),
          h(
            "span",
            { class: "arcade-clock", role: "timer", "aria-live": "off" },
            icon("clock", 18),
            timerText,
            " seconds",
          ),
        ),
        h("h1", null, q.prompt),
        h("div", { class: "arcade-time-track", "aria-hidden": true }, timeBar),
      ),
      h(
        "p",
        { class: "arcade-instructions", id: "arcade-instructions" },
        "Aim with your pointer. Click or tap a moving target to shoot. Keyboard: Tab to a target, then Enter.",
      ),
      targets,
      h(
        "div",
        { class: "arcade-controls" },
        shoot,
        reloadText,
        h("label", { class: "arcade-calm" }, calmToggle, "Calm targets"),
      ),
      h(
        "div",
        { class: "arcade-powerups", "aria-label": "Power-ups" },
        h("span", null, "A little boost"),
        time,
        dart,
      ),
      status,
      problem,
    );
    tick = () => {
      if (!alive() || view !== current) return;
      const now = Date.now() + offset,
        left = Math.max(0, s.deadline - now),
        reload = Math.max(0, s.reloadUntil - now);
      timerText.textContent = String(
        Math.min(
          s.rules.seconds[level] + (s.timeUsed ? 5 : 0),
          Math.ceil(left / 1000),
        ),
      );
      timeBar.style.width = `${Math.min(100, (left / (s.rules.seconds[level] * 1000 + (s.timeUsed ? 5000 : 0))) * 100)}%`;
      node.classList.toggle("arcade-urgent", left < 5000);
      reloadText.textContent = busy
        ? "Checking your shot…"
        : reload > 0
          ? `Reloading · ${(reload / 1000).toFixed(1)}s`
          : "Ready to shoot";
      shoot.disabled =
        busy || reload > 0 || !aimed || s.wrong.includes(aimed) || !!retry;
      targetButtons.forEach((button) => {
        button.disabled =
          busy ||
          reload > 0 ||
          s.wrong.includes(button.dataset.option!) ||
          !!retry;
      });
      time.disabled =
        busy || s.timeUsed || s.coins < s.rules.timeCost || !!retry;
      dart.disabled =
        busy || s.dartUsed || s.coins < s.rules.dartCost || !!retry;
      if (left === 0 && !busy && !retry) void act({ type: "timeout" });
    };
    tick();
    timer = setInterval(() => tick(), 100);
    if (retry)
      problem.append(
        h(
          "span",
          null,
          "Your connection was interrupted. Your round is saved. ",
        ),
        button(
          "Retry last action",
          () => act(retry!.action, retry!.id),
          "text-button",
        ),
      );
  }
  async function act(action: ArcadeAction, id: string = crypto.randomUUID()) {
    if (!view || view.state.completed || busy || !alive()) return;
    busy = true;
    tick();
    const old = view;
    if (action.type === "shoot") audio.play("shot");
    try {
      const next = await performArcade(old, action, id);
      if (!alive()) return;
      retry = undefined;
      if (next.state.revision >= old.state.revision) {
        view = next;
        offset = next.serverNow - Date.now();
      }
      if (next.state.correct > old.state.correct) {
        audio.play(next.state.combo >= 3 ? "jackpot" : "correct");
        if (!calm && !matchMedia("(prefers-reduced-motion: reduce)").matches)
          celebrateNext = true;
      } else if (
        next.state.index > old.state.index ||
        next.state.darts < old.state.darts
      )
        audio.play("wrong");
    } catch (error) {
      if (!alive()) return;
      toast(error instanceof Error ? error.message : "Please try again.");
      if (cloudEnabled && user.id !== "guest") retry = { action, id };
    } finally {
      busy = false;
      if (alive()) {
        render();
        if (celebrateNext) {
          celebrateNext = false;
          celebrate();
        }
      }
    }
  }
  async function lobby() {
    if (!alive()) return;
    node.replaceChildren(
      pageHeading(
        "THE DISCOVERY FAIR",
        "Science Arcade",
        "Nine discoveries. Four moving targets. One curious mind.",
      ),
      h(
        "section",
        { class: "arcade-hero" },
        h(
          "div",
          null,
          h("span", { class: "pill" }, "AIM · LEARN · LEVEL UP"),
          h("h2", null, "Take a shot at your next a-ha."),
          h(
            "p",
            null,
            "Choose your science, build a combo and use your round coins for a little boost. Three levels bring faster targets and shorter timers.",
          ),
        ),
      ),
      h(
        "div",
        { class: "arcade-category-grid" },
        ...categories.map((category) =>
          button(
            h(
              "span",
              { class: "arcade-category-inner" },
              h(
                "span",
                { class: `arcade-category-icon ${category.color}` },
                icon(category.icon, 30),
              ),
              h("strong", null, category.name),
              h("span", null, category.text),
              h("small", null, "PLAY 9 DISCOVERIES →"),
            ),
            () => start(category.id),
            `arcade-category ${category.color}`,
          ),
        ),
      ),
      h(
        "div",
        { class: "arcade-lobby-actions" },
        button("How to play", help, "button outline"),
        button("Arcade leaderboard", () => showRankings(), "button outline"),
        soundButton(),
      ),
      h(
        "p",
        { class: "fine-print" },
        cloudEnabled && user.id !== "guest"
          ? "Your name and best completed score appear in the class leaderboard. Round coins buy power-ups; class credit awards follow your teacher’s daily limit."
          : "Guest scores stay on this device. Round coins are for power-ups during the current round.",
      ),
    );
    try {
      const saved = await currentArcade();
      if (saved && alive() && !view)
        node.append(
          h(
            "section",
            { class: "arcade-resume paper" },
            h(
              "div",
              null,
              h("strong", null, "Your round is waiting."),
              h(
                "p",
                null,
                `Discovery ${saved.state.index + 1}/9 · ${saved.state.score} points`,
              ),
            ),
            button(
              "Resume my round",
              () => {
                view = saved;
                offset = saved.serverNow - Date.now();
                render();
              },
              "button primary",
            ),
          ),
        );
    } catch (error) {
      if (alive())
        node.append(
          h(
            "p",
            { class: "notice" },
            error instanceof Error
              ? error.message
              : "Your saved round could not be loaded.",
          ),
        );
    }
  }
  async function start(category: ArcadeCategory) {
    if (busy) return;
    busy = true;
    try {
      await audio.enable(sound);
      const next = await beginArcade(category, crypto.randomUUID());
      if (alive()) {
        view = next;
        offset = next.serverNow - Date.now();
        render();
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : "Please try again.");
    } finally {
      busy = false;
      tick();
    }
  }
  function results() {
    const s = view!.state;
    node.replaceChildren(
      h(
        "section",
        { class: "arcade-results paper" },
        h(
          "span",
          { class: "arcade-results-art" },
          mascot(s.correct >= 7 ? "cat" : "sprout"),
        ),
        h("p", { class: "eyebrow" }, "YOUR ROUND IS SAVED"),
        h(
          "h1",
          null,
          s.correct >= 7
            ? "A brilliant little bullseye!"
            : "Every shot is a little discovery.",
        ),
        h("strong", { class: "arcade-final-score" }, s.score.toLocaleString()),
        h("p", null, `${s.correct}/9 correct · ${s.coins} round coins left`),
        h(
          "p",
          { class: "muted" },
          cloudEnabled && user.id !== "guest"
            ? "Your best score is saved to the class leaderboard. Class credit awards respect your daily limit."
            : "Your best score is saved on this device.",
        ),
        h(
          "div",
          { class: "records-actions" },
          button(
            "Play another round",
            () => {
              view = null;
              render();
            },
            "button primary",
          ),
          button(
            "View arcade leaderboard",
            () => showRankings(s.category),
            "button outline",
          ),
          button("Back to my lab", () => go("/"), "button outline"),
        ),
      ),
    );
  }
  function celebrate() {
    const burst = h(
      "div",
      { class: "arcade-confetti", "aria-hidden": true },
      ...Array.from({ length: 18 }, (_, i) =>
        h("i", {
          style: {
            "--i": i,
            "--tone": ["#f0aa79", "#aac987", "#c3abe2", "#eed780"][i % 4],
          },
        }),
      ),
    );
    node.append(burst);
    setTimeout(() => burst.remove(), 1100);
  }
  async function showRankings(category: ArcadeCategory | "all" = "all") {
    const { dialog } = modal("Arcade leaderboard", [], true),
      body = h("div");
    dialog.append(body);
    async function load(value: ArcadeCategory | "all") {
      body.replaceChildren(
        h("p", { role: "status" }, "Finding our brightest shots…"),
      );
      try {
        const rows = await arcadeRankings(value);
        if (!alive() || !dialog.isConnected) return;
        body.replaceChildren(
          h(
            "div",
            { class: "filter-tabs" },
            ...[
              { id: "all" as const, name: "All sciences" },
              ...categories,
            ].map((c) =>
              button(
                c.name,
                () => load(c.id),
                `filter-tab ${value === c.id ? "selected" : ""}`,
                { "aria-pressed": value === c.id },
              ),
            ),
          ),
          h(
            "p",
            { class: "fine-print" },
            cloudEnabled && user.id !== "guest"
              ? "Best completed round per scientist. Rankings are shared with signed-in classmates."
              : "Best rounds on this device.",
          ),
          rows.length
            ? h(
                "div",
                { class: "table-wrap" },
                h(
                  "table",
                  null,
                  h("caption", null, "Best science arcade rounds"),
                  h(
                    "thead",
                    null,
                    h(
                      "tr",
                      null,
                      ...[
                        "Rank",
                        "Scientist",
                        "Science",
                        "Score",
                        "Discoveries",
                      ].map((text) => h("th", { scope: "col" }, text)),
                    ),
                  ),
                  h(
                    "tbody",
                    null,
                    ...rows.map((r) =>
                      h(
                        "tr",
                        null,
                        h("td", null, r.rank),
                        h("td", null, r.display_name),
                        h(
                          "td",
                          null,
                          categories.find((c) => c.id === r.category)?.name ??
                            r.category,
                        ),
                        h("td", null, r.score),
                        h("td", null, `${r.correct}/9`),
                      ),
                    ),
                  ),
                ),
              )
            : empty(
                "cat",
                "Your first score is waiting",
                "Finish a round to put your best discovery on the board.",
              ),
        );
      } catch (error) {
        body.replaceChildren(
          h(
            "p",
            { class: "notice" },
            error instanceof Error
              ? error.message
              : "The leaderboard is unavailable.",
          ),
        );
      }
    }
    await load(category);
  }
  function help() {
    modal("A little aim. A lot of science.", [
      h(
        "ol",
        { class: "arcade-help" },
        ...[
          "Choose Biology, Chemistry, Physics or Earth & space. Each round has nine four-choice discoveries.",
          "Aim with your pointer and click, tap a target, or use Tab and Enter. A missed shot uses a dart too.",
          "You have two darts per card. Every shot reloads for one second. A wrong shot loses points and one round coin; balances never go below zero.",
          "Three correct shots in a row unlock ×2; six unlock ×3. Wrong shots and timeouts reset the combo.",
          "Levels 1, 2 and 3 use progressively faster targets and shorter timers. Your teacher can tune the challenge.",
          "Spend round coins on five extra seconds or one extra dart, once each per card. New rounds begin with a fresh coin purse.",
          "Use Calm targets for reduced motion and Sound off for quiet play. Your round timer continues when you leave the tab.",
        ].map((text) => h("li", null, text)),
      ),
    ]);
  }
  node.replaceChildren(
    h("p", { role: "status" }, "Opening the discovery fair…"),
  );
  void arcadePreferences()
    .then((prefs) => {
      if (!alive()) return;
      sound = prefs.sound;
      calm = calm || prefs.calm;
      render();
    })
    .catch(() => render());
  return node;
}
