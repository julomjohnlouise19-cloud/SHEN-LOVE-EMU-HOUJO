import { currentUser } from "../store";
import { cloudEnabled, profileStylesVersion } from "../store/cloud";
import {
  bannerUrl,
  loadProfileDesign,
  prepareBanner,
  saveProfileDesign,
} from "../store/profile-design";
import { photoUrl } from "../store/photos";
import { borderById, profileBorders } from "../data/profile-borders";
import { defaultProfileDesign } from "../core/profile-design";
import { h, button, field, modal, setButtonDisabled, toast } from "./dom";
import { icon, mascot } from "./svg";
import { paintProfileAvatar } from "./profile-art";

export async function profileDesignModal(returnFocus?: HTMLElement) {
  const user = currentUser();
  if (!user || document.querySelector("dialog.profile-design-dialog[open]"))
    return;
  let draft = { ...(await loadProfileDesign(user.id)) };
  if (currentUser()?.id !== user.id) return;
  let tab = "borders",
    category = "All styles",
    preparing = false;
  let bannerKind: "keep" | "replace" | "remove" = "keep";
  let prepared: { blob: Blob; preview: string } | undefined;
  let originalBanner = bannerUrl(user.id);
  const error = h("p", { class: "form-error", role: "alert" });
  const status = h(
    "p",
    { class: "design-save-status", role: "status" },
    "Preview your design, then apply it when it feels like you.",
  );
  const previewAvatar = h("span", {
    class: "design-preview-avatar",
    "aria-hidden": true,
  });
  const cover = h("div", {
    class: "design-preview-cover",
    "aria-hidden": true,
  });
  const selected = h("strong", { class: "design-selected-name" });
  const preview = h(
    "section",
    {
      class: "design-preview-card",
      "aria-label": "Your profile design preview",
    },
    cover,
    h(
      "div",
      { class: "design-preview-identity" },
      previewAvatar,
      h("h3", null, user.name),
      h("p", null, "YOUR LITTLE SCIENCE SIGNATURE"),
      selected,
    ),
  );
  const gallery = h("div", {
    class: "design-border-grid",
    "aria-label": "Profile border gallery",
  });
  const filters = h("div", {
    class: "design-filter-row",
    "aria-label": "Border styles",
  });
  const picker = h("input", {
    type: "file",
    accept: "image/jpeg,image/png,image/webp",
    "aria-label": "Upload your banner",
  });
  const x = h("input", {
    type: "range",
    min: 0,
    max: 100,
    step: 1,
    value: draft.x,
  });
  const y = h("input", {
    type: "range",
    min: 0,
    max: 100,
    step: 1,
    value: draft.y,
  });
  const xValue = h("output", null, `${draft.x}%`),
    yValue = h("output", null, `${draft.y}%`);
  const share = h("input", { type: "checkbox", checked: draft.share_banner });
  share.addEventListener("change", () => {
    draft.share_banner = share.checked;
    changed();
  });
  const resetPosition = button(
    "Center image",
    () => {
      draft.x = draft.y = 50;
      x.value = y.value = "50";
      xValue.textContent = yValue.textContent = "50%";
      changed();
    },
    "button outline",
  );
  for (const [input, axis, output] of [
    [x, "x", xValue],
    [y, "y", yValue],
  ] as const)
    input.addEventListener("input", () => {
      draft[axis] = Number(input.value);
      output.textContent = `${input.value}%`;
      changed();
    });
  const remove = button(
    "Remove banner",
    () => {
      bannerKind = "remove";
      prepared = undefined;
      draft.banner_path = null;
      draft.share_banner = false;
      share.checked = false;
      changed();
    },
    "button outline",
  );
  const bannerPane = h(
    "section",
    {
      class: "design-banner-pane",
      "aria-label": "Banner editor",
      hidden: true,
    },
    h(
      "div",
      { class: "design-panel-heading" },
      h("h3", null, "A backdrop that feels like you"),
      h(
        "p",
        null,
        "Bring your own image. Move the focus and preview it behind your portrait.",
      ),
    ),
    field("Upload your banner", picker),
    h(
      "p",
      { class: "design-help" },
      "JPG, PNG or WebP · up to 5 MB. Your profile photo stays separate.",
    ),
    h(
      "div",
      { class: "design-position-controls" },
      field("Horizontal image focus", x),
      xValue,
      field("Vertical image focus", y),
      yValue,
    ),
    h("div", { class: "design-inline-actions" }, resetPosition, remove),
    cloudEnabled && user.id !== "guest" && profileStylesVersion() >= 1
      ? h(
          "label",
          { class: "design-share-choice" },
          share,
          h("span", null, "Show my banner on my shared learning card"),
        )
      : null,
    h(
      "p",
      { class: "design-help" },
      cloudEnabled && user.id !== "guest"
        ? profileStylesVersion() >= 1
          ? "Your banner is visible to you and authorized teachers. Sharing with classmates is optional."
          : "Your banner is private to your account. Classmate sharing becomes available when your classroom enables shared designs."
        : "Your banner and border stay with this profile on this device.",
    ),
  );
  picker.addEventListener("change", async () => {
    if (!picker.files?.[0] || preparing) return;
    const file = picker.files[0];
    preparing = true;
    setButtonDisabled(save, true);
    picker.disabled = true;
    error.textContent = "";
    status.textContent = "Getting your banner ready…";
    try {
      const result = await prepareBanner(file);
      if (!dialog.isConnected || currentUser()?.id !== user.id) return;
      prepared = result;
      bannerKind = "replace";
      draft.share_banner = false;
      share.checked = false;
      draft.x = draft.y = 50;
      x.value = y.value = "50";
      xValue.textContent = yValue.textContent = "50%";
      changed();
      status.textContent =
        "Banner ready to preview. Apply your design to keep it.";
    } catch (value) {
      if (dialog.isConnected) {
        error.textContent =
          value instanceof Error
            ? value.message
            : "That image could not be prepared.";
        status.textContent =
          "Choose another image, or keep your current design.";
      }
    } finally {
      preparing = false;
      picker.disabled = false;
      picker.value = "";
      setButtonDisabled(save, false);
    }
  });
  const borderPane = h(
    "section",
    { class: "design-borders-pane", "aria-label": "Border editor" },
    h(
      "div",
      { class: "design-panel-heading" },
      h("h3", null, "Find your favorite frame"),
      h("p", null, "17 original designs, all free. Pick one to try it on."),
    ),
    filters,
    gallery,
  );
  const tabs = h("nav", {
    class: "design-tabs",
    "aria-label": "Design editor sections",
  });
  for (const [id, label, art] of [
    ["borders", "Borders", "sparkles"],
    ["banner", "My banner", "island"],
  ])
    tabs.append(
      button(
        h("span", null, icon(art, 17), label),
        () => {
          tab = id;
          borderPane.hidden = tab !== "borders";
          bannerPane.hidden = tab !== "banner";
          tabs
            .querySelectorAll<HTMLElement>("[data-design-tab]")
            .forEach((node) =>
              node.setAttribute(
                "aria-pressed",
                String(node.dataset.designTab === tab),
              ),
            );
        },
        "design-tab",
        { "data-design-tab": id, "aria-pressed": tab === id },
      ),
    );
  const categories = [
    "All styles",
    ...new Set(profileBorders.map((border) => border.category)),
  ];
  for (const value of categories)
    filters.append(
      button(
        value,
        () => {
          category = value;
          filters
            .querySelectorAll<HTMLElement>("button")
            .forEach((node) =>
              node.setAttribute(
                "aria-pressed",
                String(node.textContent === value),
              ),
            );
          drawGallery();
        },
        "design-filter",
        { "aria-pressed": value === category },
      ),
    );
  function picture() {
    const url = photoUrl(user!.id);
    return url
      ? h("img", {
          src: url,
          alt: "",
          decoding: "async",
          onError: (event: Event) =>
            (event.target as HTMLImageElement).replaceWith(
              mascot(user!.avatar),
            ),
        })
      : mascot(user!.avatar);
  }
  function drawGallery() {
    const choices = [
      { id: "", name: "No border" },
      ...profileBorders.filter(
        (border) => category === "All styles" || border.category === category,
      ),
    ];
    gallery.replaceChildren(
      ...choices.map((border) => {
        const portrait = h("span", {
          class: "design-option-avatar",
          "aria-hidden": true,
        });
        paintProfileAvatar(portrait, picture(), border.id);
        return button(
          h(
            "span",
            null,
            portrait,
            h("strong", null, border.name),
            h("small", null, "Free"),
          ),
          () => {
            draft.border = border.id;
            changed();
            gallery
              .querySelectorAll<HTMLElement>("[data-border-choice]")
              .forEach((node) =>
                node.setAttribute(
                  "aria-pressed",
                  String(node.dataset.borderChoice === draft.border),
                ),
              );
          },
          "design-border-option",
          {
            "data-border-choice": border.id,
            "aria-label": border.id
              ? `Choose ${border.name} border`
              : "Use no border",
            "aria-pressed": draft.border === border.id,
          },
        );
      }),
    );
  }
  function drawPreview() {
    paintProfileAvatar(previewAvatar, picture(), draft.border);
    const image =
      bannerKind === "replace"
        ? prepared?.preview
        : bannerKind === "remove"
          ? undefined
          : originalBanner;
    cover.replaceChildren(
      ...(image
        ? [
            h("img", {
              src: image,
              alt: "",
              style: { objectPosition: `${draft.x}% ${draft.y}%` },
            }),
          ]
        : []),
    );
    selected.textContent =
      borderById(draft.border)?.name ?? "Just you · no border";
    for (const control of [x, y, resetPosition, remove])
      control.disabled = !image;
    share.disabled = !image;
  }
  function changed() {
    error.textContent = "";
    status.textContent =
      "Looking good. Apply your design to save these changes.";
    drawPreview();
  }
  const save = button(
    "Apply my design",
    async () => {
      error.textContent = "";
      status.textContent = "Saving your profile design…";
      editorBody.disabled = true;
      setButtonDisabled(reset, true);
      setButtonDisabled(cancel, true);
      try {
        await saveProfileDesign(user.id, draft, {
          kind: bannerKind,
          blob: prepared?.blob,
          preview: prepared?.preview,
        });
        if (currentUser()?.id !== user.id || !dialog.isConnected) return;
        close();
        toast("Your profile design is saved. Looking good, scientist!");
      } catch (value) {
        error.textContent =
          value instanceof Error
            ? value.message
            : "Your design could not be saved. Please try again.";
        status.textContent =
          "Your preview is still here. Try applying it again.";
      } finally {
        editorBody.disabled = false;
        setButtonDisabled(reset, false);
        setButtonDisabled(cancel, false);
      }
    },
    "button primary",
  );
  const reset = button(
    "Reset design",
    () => {
      draft = defaultProfileDesign();
      bannerKind = "remove";
      prepared = undefined;
      share.checked = false;
      x.value = y.value = "50";
      xValue.textContent = yValue.textContent = "50%";
      changed();
      drawGallery();
    },
    "button outline",
  );
  const cancel = button("Cancel", () => close(), "button outline");
  const editorBody = h(
    "fieldset",
    { class: "profile-design-body" },
    h(
      "div",
      { class: "design-studio-intro" },
      h("p", { class: "eyebrow" }, "YOUR FACE. YOUR FRAME. YOUR LITTLE WORLD."),
      h("p", null, "Make a science signature that feels like you."),
    ),
    h(
      "div",
      { class: "design-workspace" },
      h(
        "div",
        { class: "design-preview-column" },
        preview,
        h(
          "p",
          { class: "design-preview-note" },
          icon("heart", 14),
          "A little personality, a lot of curiosity.",
        ),
      ),
      h("div", null, tabs, borderPane, bannerPane),
    ),
  );
  const { dialog, close } = modal(
    "Your profile design",
    [
      editorBody,
      h(
        "footer",
        { class: "design-studio-actions" },
        error,
        status,
        h("div", null, reset, cancel, save),
      ),
    ],
    true,
    returnFocus,
  );
  dialog.classList.add("profile-design-dialog");
  drawGallery();
  drawPreview();
  const refresh = () => {
    originalBanner = bannerUrl(user.id);
    drawPreview();
  };
  window.addEventListener("csl:profile-design", refresh);
  dialog.addEventListener(
    "close",
    () => window.removeEventListener("csl:profile-design", refresh),
    { once: true },
  );
}
