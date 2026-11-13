import { currentUser } from "../store";
import { cloudEnabled, profileStylesVersion } from "../store/cloud";
import {
  bannerUrl,
  loadProfileDesign,
  prepareBanner,
  saveProfileDesign,
} from "../store/profile-design";
import { imageInputAccept } from "../store/image-file";
import { photoUrl } from "../store/photos";
import { getAppearance } from "../store/preferences";
import { h, button, field, modal, setButtonDisabled, toast } from "./dom";
import { icon, mascot } from "./svg";
import { paintProfileAvatar } from "./profile-art";
import { profileHero, profileIdentity } from "./profile-hero";

export async function profileDesignModal(returnFocus?: HTMLElement) {
  const account = currentUser();
  if (!account || document.querySelector("dialog.profile-design-dialog[open]"))
    return;
  const user = account,
    initial = await loadProfileDesign(user.id);
  if (currentUser()?.id !== user.id) return;
  let draft = { ...initial },
    kind: "keep" | "replace" | "remove" = "keep";
  let prepared: { blob: Blob; preview: string } | undefined;
  let originalBanner = bannerUrl(user.id),
    reviewing = false,
    saving = false,
    preparing = false;
  let preparation = 0,
    controller: AbortController | undefined;
  const error = h("p", { class: "form-error", role: "alert" });
  const status = h(
    "p",
    { class: "design-save-status", role: "status" },
    "Choose a backdrop, check the full preview, then save your banner.",
  );
  const picker = h("input", {
    type: "file",
    accept: imageInputAccept,
    "aria-label": "Upload your banner",
  });
  const identity = profileIdentity(user, getAppearance(user.id).theme);
  const previewAvatar = h("span", {
    class: "design-preview-avatar",
    "aria-hidden": true,
  });
  const preview = profileHero(identity, previewAvatar);
  preview.classList.add("design-preview-card");
  preview.setAttribute("aria-label", "Your profile banner preview");
  const cover = h("div", {
    class: "design-preview-cover profile-banner-layer",
    "aria-hidden": true,
  });
  preview.querySelector(".profile-cover")!.append(cover);
  const reviewAvatar = h("span", {
    class: "design-review-avatar",
    "aria-hidden": true,
  });
  const reviewProfile = profileHero(identity, reviewAvatar);
  const reviewCover = h("div", {
    class: "design-review-cover profile-banner-layer",
    "aria-hidden": true,
  });
  reviewProfile.querySelector(".profile-cover")!.append(reviewCover);
  const reviewDevice = h(
    "div",
    { class: "design-review-device", "data-view": "wide" },
    reviewProfile,
  );
  const reviewTitle = h(
    "h3",
    { tabindex: -1 },
    "Your banner, beautifully in place",
  );
  const reviewDetails = h("dl", { class: "design-review-details" });
  const views = h("div", {
    class: "design-review-views",
    "aria-label": "Preview size",
  });
  for (const [view, label] of [
    ["wide", "Wide view"],
    ["phone", "Phone view"],
  ])
    views.append(
      button(
        label,
        () => {
          reviewDevice.dataset.view = view;
          views
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
        "Check your cover and profile together in both sizes before saving.",
      ),
    ),
    views,
    reviewDevice,
    reviewDetails,
  );
  const state = h("span", { class: "design-preview-state" }, "Saved banner");
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
  const notice = h("p", {
    class: "design-help design-banner-notice",
    role: "status",
    hidden: true,
  });
  const focusCover = h("div", {
    class: "design-focus-preview",
    role: "img",
    "aria-label": "Live banner crop preview",
  });
  function focus(px: number, py: number) {
    draft.x = px;
    draft.y = py;
    x.value = String(px);
    y.value = String(py);
    xValue.textContent = `${px}%`;
    yValue.textContent = `${py}%`;
    changed();
  }
  const center = button("Center image", () => focus(50, 50), "button outline");
  const remove = button("Remove banner", () => resetBanner(), "button outline");
  const presets = h(
    "div",
    { class: "design-focus-presets", "aria-label": "Quick banner focus" },
    ...[
      [0, "Top"],
      [50, "Middle"],
      [100, "Bottom"],
    ].map(([value, label]) =>
      button(
        String(label),
        () => focus(draft.x, Number(value)),
        "design-filter",
        { "data-focus-y": value, "aria-pressed": draft.y === value },
      ),
    ),
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
    h(
      "p",
      null,
      "Drop an image here, or choose one below. You can choose another while it opens.",
    ),
    field("Upload your banner", picker),
  );
  uploadZone.addEventListener("dragover", (event) => {
    event.preventDefault();
    if (!saving) uploadZone.classList.add("is-dragging");
  });
  uploadZone.addEventListener("dragleave", () =>
    uploadZone.classList.remove("is-dragging"),
  );
  uploadZone.addEventListener("drop", (event) => {
    event.preventDefault();
    uploadZone.classList.remove("is-dragging");
    const file = event.dataTransfer?.files[0];
    if (file && !saving) void chooseBanner(file);
  });
  picker.addEventListener("change", () => {
    if (picker.files?.[0]) void chooseBanner(picker.files[0]);
  });
  share.addEventListener("change", () => {
    draft.share_banner = share.checked;
    changed();
  });
  for (const control of [x, y])
    control.addEventListener("input", () =>
      focus(Number(x.value), Number(y.value)),
    );
  const bannerPane = h(
    "section",
    { class: "design-banner-pane", "aria-label": "Banner editor" },
    h(
      "div",
      { class: "design-panel-heading" },
      h("h3", null, "Make room for your favorite view"),
      h(
        "p",
        null,
        "Choose your image and move the focus. Your portrait stays separate.",
      ),
    ),
    uploadZone,
    notice,
    h(
      "p",
      { class: "design-help" },
      "JPG, PNG, WebP, GIF or AVIF · up to 20 MB. Compatible phone photos work too; unsupported HEIC files need a JPG copy.",
    ),
    h(
      "div",
      { class: "design-position-controls" },
      focusCover,
      field("Horizontal image focus", x),
      xValue,
      field("Vertical image focus", y),
      yValue,
      presets,
    ),
    h("div", { class: "design-inline-actions" }, center, remove),
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
          : "Your banner stays private to your account until classroom sharing is enabled."
        : "Your banner stays with this profile on this device.",
    ),
  );
  const tabs = h("nav", {
    class: "design-tabs",
    "aria-label": "Banner editor sections",
  });
  for (const [id, label, art] of [
    ["banner", "My banner", "island"],
    ["review", "Preview", "check"],
  ])
    tabs.append(
      button(
        h("span", null, icon(art, 17), label),
        () => selectStep(id === "review"),
        "design-tab",
        { "data-design-tab": id, "aria-pressed": id === "banner" },
      ),
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
        state,
      ),
      preview,
      h(
        "p",
        { class: "design-preview-note" },
        icon("heart", 14),
        "A backdrop that feels like you.",
      ),
    ),
    bannerPane,
  );
  const save = button(
    "Preview & finish",
    async () => {
      if (preparing || saving) return;
      if (!reviewing) {
        selectStep(true);
        reviewTitle.focus({ preventScroll: true });
        return;
      }
      error.textContent = "";
      status.textContent = "Saving your banner…";
      saving = true;
      editorBody.disabled = true;
      for (const control of [reset, back, cancel])
        setButtonDisabled(control, true);
      try {
        await saveProfileDesign(user.id, draft, {
          kind,
          blob: prepared?.blob,
          preview: prepared?.preview,
        });
        if (currentUser()?.id !== user.id || !dialog.isConnected) return;
        close();
        toast("Your banner is saved. Looking good, scientist!");
      } catch (value) {
        error.textContent =
          value instanceof Error
            ? value.message
            : "Your banner could not be saved. Please try again.";
        status.textContent =
          "Your preview is still here. You can try applying it again.";
      } finally {
        saving = false;
        editorBody.disabled = false;
        for (const control of [reset, back, cancel])
          setButtonDisabled(control, false);
      }
    },
    "button primary",
  );
  const reset = button("Reset banner", resetBanner, "button outline");
  const back = button(
    "Keep editing",
    () => selectStep(false),
    "button outline",
    { hidden: true },
  );
  const cancel = button("Cancel", () => close(), "button outline");
  const editorBody = h(
    "fieldset",
    { class: "profile-design-body" },
    h(
      "div",
      { class: "design-studio-intro" },
      h("p", { class: "eyebrow" }, "YOUR OWN LITTLE BACKDROP"),
      h("p", null, "Bring a little of your world into the lab."),
    ),
    tabs,
    workspace,
    reviewPane,
  );
  const { dialog, close } = modal(
    "Your profile banner",
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
  dialog.dataset.designStep = "banner";
  function picture() {
    const url = photoUrl(user.id);
    return url
      ? h("img", {
          src: url,
          alt: "",
          decoding: "async",
          onError: (event: Event) =>
            (event.target as HTMLImageElement).replaceWith(mascot(user.avatar)),
        })
      : mascot(user.avatar);
  }
  function draw() {
    for (const portrait of [previewAvatar, reviewAvatar])
      paintProfileAvatar(portrait, picture(), draft.border);
    const image =
      kind === "replace"
        ? prepared?.preview
        : kind === "remove"
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
    const pending = kind === "keep" && !!draft.banner_path && !image;
    for (const control of [
      x,
      y,
      center,
      ...presets.querySelectorAll<HTMLButtonElement>("button"),
    ])
      control.disabled = !image;
    remove.disabled = !image && !pending && !preparing;
    share.disabled = !image && !pending;
    notice.hidden = !pending;
    notice.textContent = pending
      ? "Your saved banner has not opened yet. You can keep it, choose a replacement, or remove it."
      : "";
    presets
      .querySelectorAll<HTMLElement>("button")
      .forEach((node) =>
        node.setAttribute(
          "aria-pressed",
          String(Number(node.dataset.focusY) === draft.y),
        ),
      );
    const dirty =
      kind !== "keep" ||
      draft.x !== initial.x ||
      draft.y !== initial.y ||
      draft.share_banner !== initial.share_banner;
    state.textContent = preparing
      ? "Opening image…"
      : dirty
        ? "Unsaved preview"
        : "Saved banner";
    state.dataset.state = dirty || preparing ? "draft" : "saved";
    reviewDetails.replaceChildren(
      ...[
        [
          "Banner",
          image
            ? "Your uploaded image"
            : pending
              ? "Saved banner · preview unavailable"
              : "Cozy color gradient",
        ],
        [
          "Visibility",
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
  function changed() {
    error.textContent = "";
    status.textContent =
      "Preview & finish to check your complete profile before saving.";
    draw();
  }
  function cancelPreparation() {
    preparation++;
    controller?.abort();
    controller = undefined;
    preparing = false;
    setButtonDisabled(save, saving);
  }
  function resetBanner() {
    cancelPreparation();
    prepared = undefined;
    kind = "remove";
    draft = { ...draft, banner_path: null, x: 50, y: 50, share_banner: false };
    share.checked = false;
    picker.value = "";
    focus(50, 50);
  }
  async function chooseBanner(file: File) {
    if (saving) return;
    cancelPreparation();
    const attempt = preparation;
    controller = new AbortController();
    preparing = true;
    setButtonDisabled(save, true);
    error.textContent = "";
    status.textContent =
      "Opening and preparing your image… You can choose another file or reset the banner.";
    draw();
    try {
      const result = await prepareBanner(file, controller.signal);
      if (
        attempt !== preparation ||
        !dialog.isConnected ||
        currentUser()?.id !== user.id
      )
        return;
      prepared = result;
      kind = "replace";
      draft.share_banner = false;
      share.checked = false;
      focus(50, 50);
      status.textContent =
        "Banner ready to preview. Preview & finish when you like the placement.";
    } catch (value) {
      if (attempt !== preparation || !dialog.isConnected) return;
      error.textContent =
        value instanceof Error
          ? value.message
          : "This image could not be prepared.";
      status.textContent =
        "Choose another image or keep your current banner. Your saved banner has not changed.";
    } finally {
      if (attempt === preparation) {
        preparing = false;
        controller = undefined;
        picker.value = "";
        setButtonDisabled(save, saving);
        draw();
      }
    }
  }
  function selectStep(review: boolean) {
    reviewing = review;
    dialog.dataset.designStep = review ? "review" : "banner";
    workspace.hidden = review;
    reviewPane.hidden = !review;
    reset.hidden = review;
    back.hidden = !review;
    save.textContent = review ? "Apply my banner" : "Preview & finish";
    tabs
      .querySelectorAll<HTMLElement>("[data-design-tab]")
      .forEach((node) =>
        node.setAttribute(
          "aria-pressed",
          String((node.dataset.designTab === "review") === review),
        ),
      );
    status.textContent = review
      ? "Check both sizes, then apply your banner. Your saved portrait stays the same."
      : "Your changes stay in preview until you apply them.";
    editorBody.scrollTop = 0;
    if (review)
      requestAnimationFrame(() => {
        if (dialog.isConnected && reviewing)
          reviewDevice.scrollIntoView({ block: "start" });
      });
  }
  const refresh = () => {
    originalBanner = bannerUrl(user.id);
    draw();
  };
  window.addEventListener("csl:profile-design", refresh);
  window.addEventListener("csl:photo", refresh);
  dialog.addEventListener(
    "close",
    () => {
      cancelPreparation();
      window.removeEventListener("csl:profile-design", refresh);
      window.removeEventListener("csl:photo", refresh);
    },
    { once: true },
  );
  draw();
}
