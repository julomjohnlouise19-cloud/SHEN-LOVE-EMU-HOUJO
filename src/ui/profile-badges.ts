import { badgeShowcaseLimit, emptyBadgeShowcase } from "../core/badge-showcase";
import { learningBadges } from "../core/growth";
import { dayKey } from "../core/time";
import { currentUser, getState, clock } from "../store";
import {
  loadBadgeShowcase,
  saveBadgeShowcase,
  watchBadgeShowcase,
} from "../store/badge-showcase";
import { badgeArtwork } from "./badge-art";
import { button, h, setButtonDisabled } from "./dom";
import { icon } from "./svg";

export function profileBadgeShowcase(id: string, openGarden: () => void) {
  let saved = emptyBadgeShowcase(),
    draft: string[] = [],
    ready = false,
    saving = false,
    stale = false;
  const display = h("section", {
    class: "profile-badge-display",
    "aria-label": "My displayed badges",
  });
  const slots = h("div", {
    class: "badge-pin-row",
    "aria-label": "Badge shelf preview",
  });
  const gallery = h("div", {
    class: "profile-badge-gallery",
    role: "group",
    "aria-label": "Choose earned badges",
  });
  const status = h(
    "p",
    { class: "badge-showcase-status", role: "status" },
    "Opening your badge shelf…",
  );
  const error = h("p", { class: "form-error", role: "alert" });
  const available = () => {
    const user = currentUser();
    return user?.id === id
      ? learningBadges(
          user,
          getState().runs,
          dayKey(clock, getState().rules.timezone),
        ).filter((badge) => badge.earned)
      : [];
  };
  const dirty = () => JSON.stringify(draft) !== JSON.stringify(saved.badges);
  const reset = button(
    "Undo changes",
    () => {
      draft = [...saved.badges];
      stale = false;
      error.textContent = "";
      render();
    },
    "button outline",
  );
  const clear = button(
    "Clear selection",
    () => {
      draft = [];
      render();
    },
    "button outline",
  );
  const save = button(
    "Save my badges",
    async () => {
      error.textContent = "";
      saving = true;
      render();
      try {
        const next = await saveBadgeShowcase(id, saved.revision, [...draft]);
        if (currentUser()?.id !== id || !editor.isConnected) return;
        saved = next;
        draft = [...next.badges];
        stale = false;
      } catch (value) {
        error.textContent =
          value instanceof Error
            ? value.message
            : "Your shelf could not be saved. Try again.";
        const latest = await loadBadgeShowcase(id).catch(() => undefined);
        if (latest && latest.revision !== saved.revision) {
          saved = latest;
          stale = true;
        }
      } finally {
        saving = false;
        if (currentUser()?.id === id && editor.isConnected) render();
      }
    },
    "button primary",
  );
  const editor = h(
    "section",
    { class: "profile-badge-editor", "aria-label": "Customize my badge shelf" },
    h(
      "div",
      { class: "badge-showcase-heading" },
      icon("star", 20),
      h("h4", { tabindex: -1 }, "Your little badge shelf"),
    ),
    h(
      "p",
      null,
      "Pick up to three earned badges. Your favorite science buddies deserve a little spotlight.",
    ),
    slots,
    status,
    gallery,
    error,
    h("div", { class: "badge-showcase-actions" }, save, reset, clear),
    h(
      "p",
      { class: "badge-showcase-note" },
      "Your learning badges and shelf are saved for this account on this device.",
    ),
  );
  function render() {
    const badges = available();
    const visible = saved.badges.flatMap((value) =>
      badges.filter((badge) => badge.id === value),
    );
    display.replaceChildren(
      h(
        "div",
        { class: "badge-showcase-heading" },
        icon("star", 18),
        h("h3", null, "My little badge shelf"),
      ),
      ...(visible.length
        ? [
            h(
              "div",
              { class: "badge-display-row" },
              ...visible.map((badge) =>
                h(
                  "div",
                  {
                    class: "badge-display-pin",
                    "data-displayed-badge": badge.id,
                  },
                  badgeArtwork(badge, "mini"),
                  h("strong", null, badge.name),
                ),
              ),
            ),
          ]
        : [
            h(
              "p",
              { class: "badge-showcase-note" },
              ready
                ? "A little space for your proudest discoveries. Choose your badges in Appearance below."
                : "Opening your badge shelf…",
            ),
          ]),
    );
    slots.replaceChildren(
      ...Array.from({ length: badgeShowcaseLimit }, (_, index) => {
        const badge = badges.find((value) => value.id === draft[index]);
        return badge
          ? h(
              "div",
              { class: "badge-pin filled", "data-preview-badge": badge.id },
              badgeArtwork(badge, "mini"),
              h("strong", null, badge.name),
              button(
                h("span", null, icon("close", 14), "Remove"),
                () => {
                  draft = draft.filter((value) => value !== badge.id);
                  render();
                },
                "button outline badge-pin-remove",
                { "aria-label": "Remove " + badge.name, disabled: saving },
              ),
            )
          : h(
              "div",
              {
                class: "badge-pin empty",
                "aria-label": "Empty badge spot " + (index + 1),
              },
              icon("star", 28),
              h("span", null, "A little spot"),
              h("small", null, "for a proud moment"),
            );
      }),
    );
    gallery.replaceChildren(
      ...badges.map((badge) => {
        const selected = draft.includes(badge.id);
        return button(
          h(
            "span",
            { class: "badge-choice-content" },
            badgeArtwork(badge, "mini"),
            h("strong", null, badge.name),
            h(
              "small",
              null,
              selected ? "Pinned to your shelf" : "Earned · tap to pin",
            ),
          ),
          () => {
            draft = selected
              ? draft.filter((value) => value !== badge.id)
              : [...draft, badge.id];
            render();
            gallery
              .querySelector<HTMLButtonElement>(
                `[data-showcase-badge="${badge.id}"]`,
              )
              ?.focus({ preventScroll: true });
          },
          "profile-badge-choice",
          {
            "aria-label": "Display " + badge.name,
            "aria-pressed": selected,
            "data-showcase-badge": badge.id,
            title: badge.description,
            disabled:
              !ready ||
              saving ||
              (!selected && draft.length >= badgeShowcaseLimit),
          },
        );
      }),
    );
    if (ready && !badges.length)
      gallery.append(
        h(
          "div",
          { class: "badge-showcase-empty" },
          icon("sprout", 30),
          h("strong", null, "Your first badge is waiting to bloom"),
          h(
            "p",
            null,
            "Finish a science deck, then come back to pin your new buddy.",
          ),
          button("Explore my growth garden", openGarden, "button outline"),
        ),
      );
    status.textContent = !ready
      ? "Opening your badge shelf…"
      : saving
        ? "Saving your little shelf…"
        : stale
          ? "Your shelf changed in another tab. Undo changes to load the saved badges."
          : `${draft.length} of ${badgeShowcaseLimit} selected · ${dirty() ? "Unsaved changes" : "Shelf saved"}`;
    setButtonDisabled(save, !ready || saving || stale || !dirty());
    setButtonDisabled(reset, !ready || saving || (!dirty() && !stale));
    setButtonDisabled(clear, !ready || saving || !draft.length);
  }
  const unwatch = watchBadgeShowcase(id, (next) => {
    if (saving) return;
    if (dirty()) {
      saved = next;
      stale = true;
    } else {
      saved = next;
      draft = [...next.badges];
    }
    render();
  });
  void loadBadgeShowcase(id)
    .then((value) => {
      if (currentUser()?.id !== id || !editor.isConnected) return;
      if (value.revision >= saved.revision) saved = value;
      draft = [...saved.badges];
      ready = true;
      render();
    })
    .catch((value) => {
      if (editor.isConnected)
        error.textContent =
          value instanceof Error
            ? value.message
            : "Reopen your profile to load your badges.";
    });
  render();
  return { display, editor, destroy: unwatch };
}
