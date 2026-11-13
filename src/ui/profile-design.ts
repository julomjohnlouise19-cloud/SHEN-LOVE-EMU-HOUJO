import { currentUser } from "../store";
import { cloudEnabled, profileStylesVersion } from "../store/cloud";
import {
  bannerUrl,
  loadProfileDesign,
  prepareBanner,
  saveProfileDesign,
} from "../store/profile-design";
import { photoUrl } from "../store/photos";
import { getAppearance } from "../store/preferences";
import { borderById, profileBorders } from "../data/profile-borders";
import { defaultProfileDesign } from "../core/profile-design";
import { h, button, field, modal, setButtonDisabled, toast } from "./dom";
import { icon, mascot } from "./svg";
import { paintProfileAvatar } from "./profile-art";
import { profileHero, profileIdentity } from "./profile-hero";

export async function profileDesignModal(returnFocus?: HTMLElement) {
  const account = currentUser();
  if (!account || document.querySelector("dialog.profile-design-dialog[open]"))
    return;
  const user = account;
  const initial = await loadProfileDesign(user.id);
  let draft = { ...initial };
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
    "Try a frame and a backdrop. Preview everything before you save.",
  );
  const bannerNotice = h("p", {
    class: "design-help design-banner-notice",
    role: "status",
    hidden: true,
  });
  const previewAvatar = h("span", {
    class: "design-preview-avatar",
    "aria-hidden": true,
  });
  const cover = h("div", {
    class: "design-preview-cover profile-banner-layer",
    "aria-hidden": true,
  });
  const selected = h("strong", { class: "design-selected-name" });
  const identity = profileIdentity(user, getAppearance(user.id).theme);
  const preview = profileHero(identity, previewAvatar);
  preview.classList.add("design-preview-card");
  preview.setAttribute("aria-label", "Your profile design preview");
  preview.querySelector(".profile-cover")!.append(cover);
  const reviewAvatar = h("span", {
    class: "design-review-avatar",
    "aria-hidden": true,
  });
  const reviewCover = h("div", {
    class: "design-review-cover profile-banner-layer",
    "aria-hidden": true,
  });
  const reviewProfile = profileHero(identity, reviewAvatar);
  reviewProfile.querySelector(".profile-cover")!.append(reviewCover);
  const reviewDevice = h(
    "div",
    { class: "design-review-device", "data-view": "wide" },
    reviewProfile,
  );
  const reviewTitle = h("h3", { tabindex: -1 }, "Meet your new profile");
  const reviewDetails = h("dl", { class: "design-review-details" });
  const reviewViews = h("div", {
    class: "design-review-views",
    "aria-label": "Preview size",
  });
  for (const [view, label] of [
    ["wide", "Wide view"],
    ["phone", "Phone view"],
  ])
    reviewViews.append(
      button(
        label,
        () => {
          reviewDevice.dataset.view = view;
          reviewViews
            .querySelectorAll<HTMLElement>("button")
            .forEach((node) =>
              node.setAttribute(
                "aria-pressed",
                String(node.dataset.previewView === view),
              ),
            );
        },
        "design-view-button",
        { "data-preview-view": view, "aria-pressed": view === "wide" },
      ),
    );
  const reviewPane = h(
    "section",
    {
      class: "design-review-pane",
      hidden: true,
      "aria-label": "Final profile preview",
    },
    h(
      "div",
      { class: "design-panel-heading" },
      h("span", { class: "design-step-kicker" }, "THE FINISHING TOUCH"),
      reviewTitle,
      h(
        "p",
        null,
        "Your banner, portrait and frame together. Check both sizes, then make it yours.",
      ),
    ),
    reviewViews,
    reviewDevice,
    reviewDetails,
  );
  const previewState = h(
    "span",
    { class: "design-preview-state" },
    "Saved look",
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
  const focusCover = h("div", {
    class: "design-focus-preview",
    role: "img",
    "aria-label": "Live banner crop preview",
  });
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
  const uploadZone = h(
    "div",
    { class: "design-upload-zone" },
    h(
      "span",
      { class: "design-upload-icon", "aria-hidden": true },
      icon("island", 26),
    ),
    h("strong", null, "A little window into your world"),
    h("p", null, "Drop a favorite image here, or choose one below."),
    field("Upload your banner", picker),
  );
  uploadZone.addEventListener("dragover", (event) => {
    event.preventDefault();
    if (!preparing) uploadZone.classList.add("is-dragging");
  });
  uploadZone.addEventListener("dragleave", () =>
    uploadZone.classList.remove("is-dragging"),
  );
  uploadZone.addEventListener("drop", (event) => {
    event.preventDefault();
    uploadZone.classList.remove("is-dragging");
    const file = event.dataTransfer?.files[0];
    if (file) void chooseBanner(file);
  });
  const focusPresets = h(
    "div",
    { class: "design-focus-presets", "aria-label": "Quick banner focus" },
    ...[
      [0, "Top"],
      [50, "Middle"],
      [100, "Bottom"],
    ].map(([value, label]) =>
      button(
        String(label),
        () => {
          draft.y = Number(value);
          y.value = String(value);
          yValue.textContent = `${value}%`;
          changed();
        },
        "design-filter",
        { "data-focus-y": value, "aria-pressed": draft.y === value },
      ),
    ),
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
    uploadZone,
    bannerNotice,
    h(
      "p",
      { class: "design-help" },
      "JPG, PNG or WebP · up to 5 MB. Your profile photo stays separate.",
    ),
    h(
      "div",
      { class: "design-position-controls" },
      focusCover,
      field("Horizontal image focus", x),
      xValue,
      field("Vertical image focus", y),
      yValue,
      focusPresets,
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
  picker.addEventListener("change", () => {
    if (picker.files?.[0]) void chooseBanner(picker.files[0]);
  });
  async function chooseBanner(file: File) {
    if (preparing || editorBody.disabled) return;
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
  }
  const borderPane = h(
    "section",
    { class: "design-borders-pane", "aria-label": "Border editor" },
    h(
      "div",
      { class: "design-panel-heading" },
      h("h3", null, "Find your favorite frame"),
      h(
        "p",
        null,
        "17 free frames that sit around your portrait. Your photo stays fully visible.",
      ),
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
    ["review", "Preview", "check"],
  ])
    tabs.append(
      button(
        h("span", null, icon(art, 17), label),
        () => selectTab(id),
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
    paintProfileAvatar(reviewAvatar, picture(), draft.border);
    const image =
      bannerKind === "replace"
        ? prepared?.preview
        : bannerKind === "remove"
          ? undefined
          : originalBanner;
    for (const card of [preview, reviewProfile])
      card.classList.toggle("has-custom-banner", !!image);
    for (const target of [cover, reviewCover, focusCover])
      target.replaceChildren(
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
    for (const control of [
      x,
      y,
      resetPosition,
      ...focusPresets.querySelectorAll<HTMLButtonElement>("button"),
    ])
      control.disabled = !image;
    const savedBannerPending =
      bannerKind === "keep" && !!draft.banner_path && !image;
    remove.disabled = !image && !savedBannerPending;
    share.disabled = !image && !savedBannerPending;
    bannerNotice.hidden = !savedBannerPending;
    bannerNotice.textContent = savedBannerPending
      ? "Your saved banner has not opened yet. You can keep it, choose a replacement, or remove it."
      : "";
    focusPresets
      .querySelectorAll<HTMLElement>("button")
      .forEach((node) =>
        node.setAttribute(
          "aria-pressed",
          String(Number(node.dataset.focusY) === draft.y),
        ),
      );
    const dirty =
      bannerKind !== "keep" ||
      JSON.stringify(draft) !== JSON.stringify(initial);
    previewState.textContent = dirty ? "Unsaved preview" : "Saved look";
    previewState.dataset.state = dirty ? "draft" : "saved";
    reviewDetails.replaceChildren(
      ...[
        ["Portrait frame", borderById(draft.border)?.name ?? "No border"],
        [
          "Banner",
          image
            ? "Your uploaded image"
            : savedBannerPending
              ? "Saved banner · preview unavailable"
              : "Cozy color gradient",
        ],
        [
          "Banner visibility",
          cloudEnabled && user.id !== "guest"
            ? draft.share_banner
              ? "Shared learning card"
              : "Private profile"
            : "This profile on this device",
        ],
      ].map(([label, value]) =>
        h("div", null, h("dt", null, label), h("dd", null, value)),
      ),
    );
  }
  function selectTab(id: string) {
    tab = id;
    dialog.dataset.designStep = id;
    const reviewing = tab === "review";
    workspace.hidden = reviewing;
    reviewPane.hidden = !reviewing;
    borderPane.hidden = tab !== "borders";
    bannerPane.hidden = tab !== "banner";
    reset.hidden = reviewing;
    back.hidden = !reviewing;
    save.textContent = reviewing ? "Apply my design" : "Preview & finish";
    tabs
      .querySelectorAll<HTMLElement>("[data-design-tab]")
      .forEach((node) =>
        node.setAttribute(
          "aria-pressed",
          String(node.dataset.designTab === tab),
        ),
      );
    status.textContent = reviewing
      ? "This is a preview. Apply your design when everything feels right."
      : "Your changes stay in preview until you apply them.";
    editorBody.scrollTop = 0;
    if (reviewing)
      requestAnimationFrame(() => {
        if (dialog.isConnected && tab === "review")
          reviewDevice.scrollIntoView({ block: "start" });
      });
  }
  function changed() {
    error.textContent = "";
    status.textContent =
      "Looking good. Preview & finish to see the complete profile.";
    drawPreview();
  }
  const save = button(
    "Preview & finish",
    async () => {
      if (tab !== "review") {
        selectTab("review");
        reviewTitle.focus({ preventScroll: true });
        return;
      }
      error.textContent = "";
      status.textContent = "Saving your profile design…";
      editorBody.disabled = true;
      setButtonDisabled(reset, true);
      setButtonDisabled(cancel, true);
      setButtonDisabled(back, true);
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
        setButtonDisabled(back, false);
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
  const back = button(
    "Keep editing",
    () => selectTab("banner"),
    "button outline",
    { hidden: true },
  );
  const workspace = h(
    "div",
    { class: "design-workspace" },
    h(
      "div",
      { class: "design-preview-column" },
      h(
        "div",
        { class: "design-preview-label" },
        icon("sparkles", 14),
        "LIVE PREVIEW",
        previewState,
      ),
      preview,
      h("div", { class: "design-preview-caption" }, selected),
      h(
        "p",
        { class: "design-preview-note" },
        icon("heart", 14),
        "A little personality, a lot of curiosity.",
      ),
    ),
    h("div", null, borderPane, bannerPane),
  );
  const editorBody = h(
    "fieldset",
    { class: "profile-design-body" },
    h(
      "div",
      { class: "design-studio-intro" },
      h("p", { class: "eyebrow" }, "YOUR FACE. YOUR FRAME. YOUR LITTLE WORLD."),
      h("p", null, "Make a science signature that feels like you."),
    ),
    tabs,
    workspace,
    reviewPane,
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
        h("div", null, reset, back, cancel, save),
      ),
    ],
    true,
    returnFocus,
  );
  dialog.classList.add("profile-design-dialog");
  dialog.dataset.designStep = "borders";
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
