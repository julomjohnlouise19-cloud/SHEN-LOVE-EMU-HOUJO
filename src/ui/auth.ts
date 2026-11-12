import { AccountError } from "../core/account-errors";
import {
  emailWait,
  resendConfirmation,
  requestPasswordReset,
} from "../store/email";
import { photoUrl, removePhoto, uploadPhoto } from "../store/photos";
import { avatar as scientistAvatar } from "./avatar";
import {
  cloudEnabled,
  finishPasswordRecovery,
  dismissPasswordRecovery,
} from "../store/cloud";
import {
  currentUser,
  login,
  register,
  dispatch,
  logout,
  exportBackup,
  changePassword,
  getState,
  guestSession,
} from "../store";
import {
  button,
  field,
  h,
  input,
  modal,
  toast,
  download,
  setButtonDisabled,
  progress,
} from "./dom";
import { mascot, icon } from "./svg";
import { go, refresh, entryDestination, welcomeRoute } from "./actions";
import { themes } from "../core/appearance";
import {
  getAppearance,
  loadAppearance,
  saveAppearance,
} from "../store/preferences";
import { classCredits } from "../store/platform";
import { levelOf } from "../core/rules";
import { termsModal } from "./terms";
export function authModal(registerFirst = false, recoverFirst = false) {
  let joining = registerFirst;
  let model = {
    email: "",
    name: "",
    section: "",
    grade: "7",
    termsAccepted: false,
  };
  let timer: ReturnType<typeof setInterval> | undefined;
  let view = 0;
  const { dialog, close } = modal(
    "A little space for your curiosity",
    [],
    true,
  );
  dialog.classList.add("auth-dialog");
  const body = h("div", { class: "auth-layout" });
  dialog.append(body);
  dialog.addEventListener("close", () => {
    view++;
    clearInterval(timer);
    if (
      recoverFirst &&
      new URLSearchParams(location.search).get("flow") === "recovery"
    )
      history.replaceState(null, "", `${location.pathname}${location.hash}`);
  });
  const changeMode = (value: boolean) => {
    joining = value;
    render();
  };
  function resetPanel() {
    const currentView = ++view;
    let sending = false;
    clearInterval(timer);
    const address = input(
      "reset-email",
      "you@example.com",
      model.email,
      "email",
    );
    address.autocomplete = "email";
    const error = h("p", { class: "form-error", role: "alert" });
    const info = h(
      "p",
      { class: "auth-reset-status", role: "status" },
      recoverFirst
        ? "Open a fresh reset link from the email requested on this device. If your link expired, request one new link below."
        : "",
    );
    const send = button(
      "Send reset link",
      () => undefined,
      "button primary full",
      { type: "submit" },
    );
    const form = h(
      "form",
      {
        onSubmit: async (event: SubmitEvent) => {
          event.preventDefault();
          if (send.disabled) return;
          sending = true;
          address.disabled = true;
          setButtonDisabled(send, true);
          send.setAttribute("aria-busy", "true");
          error.textContent = "";
          info.textContent = "";
          try {
            model.email = address.value.trim();
            await requestPasswordReset(model.email);
            info.textContent =
              "If this email has an account, a reset link will arrive shortly. Check your inbox and spam folder, then open it on this device.";
          } catch (value) {
            error.textContent =
              value instanceof Error ? value.message : "Please try again.";
          } finally {
            sending = false;
            address.disabled = false;
            send.removeAttribute("aria-busy");
            await update();
          }
        },
      },
      field("Account email", address),
      error,
      info,
      send,
    );
    async function update() {
      const wait = await emailWait(address.value);
      if (!dialog.open || view !== currentView) return;
      setButtonDisabled(send, sending || wait > 0);
      send.textContent = sending
        ? "Requesting your link…"
        : wait
          ? `Request again in ${wait}s`
          : "Send reset link";
    }
    address.addEventListener("input", () => {
      void update();
    });
    body.replaceChildren(
      art(),
      h(
        "section",
        { class: "auth-fields" },
        h("p", { class: "eyebrow" }, "LET’S GET YOU BACK IN"),
        h("h3", null, "Reset your password"),
        h(
          "p",
          { class: "muted" },
          "Use the email you joined the lab with. We’ll send one private reset link.",
        ),
        form,
        button(
          "Back to sign in",
          () => changeMode(false),
          "button outline full",
        ),
      ),
    );
    void update();
    timer = setInterval(() => {
      void update();
    }, 1000);
  }
  function art() {
    return h(
      "aside",
      { class: "auth-story", "aria-label": "A place to discover" },
      h("span", { class: "auth-orbit orbit-one", "aria-hidden": true }),
      h("span", { class: "auth-orbit orbit-two", "aria-hidden": true }),
      h("p", { class: "eyebrow" }, "SMALL STEPS. BRIGHT DISCOVERIES."),
      h(
        "h3",
        null,
        joining
          ? "Your curiosity belongs here."
          : "Welcome back to your happy place.",
      ),
      h(
        "div",
        { class: "auth-friends" },
        mascot("cat"),
        mascot("flask"),
        mascot("sprout"),
      ),
      h(
        "p",
        null,
        "Follow your learning trail, collect bright science ideas, and turn a little practice into an a-ha moment.",
      ),
      h(
        "div",
        { class: "auth-benefit" },
        icon("lock", 16),
        "Your own profile. Your growing story.",
      ),
    );
  }
  async function confirmation(
    failure?: AccountError,
    accepted = false,
    signupFailed = false,
  ) {
    const currentView = ++view;
    let sending = false;
    clearInterval(timer);
    const message = h("p", { class: "form-error", role: "alert" });
    const status = h("p", { class: "auth-reset-status", role: "status" });
    const heading = h("h3", { tabindex: -1 });
    const description = h("p");
    function explain(error?: AccountError, requested = false) {
      heading.textContent = error
        ? "Email delivery needs attention"
        : requested
          ? "Check your email"
          : "Confirm your email";
      description.textContent = error
        ? signupFailed
          ? "The email step failed, so your account may not have been created. After your teacher fixes the sender, go back to signup details and try again. If you already registered, request one new link below."
          : "We couldn’t request your confirmation email. Ask your teacher to check the email sender, then request one new link below."
        : requested
          ? "If this address can register, a confirmation link will arrive in your inbox. Open it, then sign in here. Check your spam folder too."
          : "If you have already registered, request one confirmation link below. Open the link before signing in. A confirmed account can sign in straight away.";
      message.textContent = error?.message ?? "";
      status.textContent = "";
    }
    explain(failure, accepted);
    const resend = button(
      "Send one new link",
      async () => {
        sending = true;
        message.textContent = "";
        status.textContent = "";
        try {
          await resendConfirmation(model.email);
          if (!dialog.open || view !== currentView) return;
          explain(undefined, true);
          status.textContent =
            "A new confirmation was requested. Check your inbox and spam folder.";
        } catch (error) {
          if (!dialog.open || view !== currentView) return;
          if (error instanceof AccountError && error.kind === "delivery")
            explain(error);
          message.textContent =
            error instanceof Error ? error.message : "Please try later.";
        } finally {
          sending = false;
          await updateWait();
        }
      },
      "button outline full",
    );
    const panel = h(
      "div",
      { class: "auth-fields auth-confirmation" },
      h("span", { class: "auth-check", "aria-hidden": true }, "✉"),
      h("p", { class: "eyebrow" }, "YOUR NEXT STEP"),
      heading,
      description,
      h("p", { class: "auth-email" }, model.email),
      message,
      status,
      button("Back to sign in", () => changeMode(false), "button primary full"),
      resend,
      button(
        "Back to signup details",
        () => changeMode(true),
        "text-button full",
      ),
      button(
        "Explore as guest",
        async () => {
          await guestSession();
          close();
          go(entryDestination());
        },
        "text-button full",
      ),
      h(
        "p",
        { class: "fine-print" },
        "Guest practice stays on this device. Email confirmation is still required for a new account. Request one link at a time.",
      ),
    );
    body.replaceChildren(art(), panel);
    heading.focus();
    async function updateWait() {
      const wait = await emailWait(model.email);
      if (!dialog.open || view !== currentView) return;
      setButtonDisabled(resend, sending || wait > 0);
      resend.textContent = sending
        ? "Requesting your link…"
        : wait
          ? `Request again in ${wait >= 60 ? `${Math.ceil(wait / 60)}m` : `${wait}s`}`
          : "Send one new link";
    }
    await updateWait();
    timer = setInterval(() => {
      void updateWait();
    }, 1000);
  }
  function render() {
    const currentView = ++view;
    let sending = false;
    clearInterval(timer);
    const username = input(
      "username",
      cloudEnabled ? "you@example.com" : "Your scientist name",
      model.email,
      cloudEnabled ? "email" : "text",
    );
    username.autocomplete = cloudEnabled && joining ? "email" : "username";
    username.addEventListener("blur", () => {
      if (cloudEnabled) {
        username.value = username.value.trim().toLowerCase();
        model.email = username.value;
      }
    });
    username.addEventListener("input", () => {
      model.email = username.value;
    });
    const password = input(
      "password",
      joining ? "Create a password, 8+ characters" : "Your password",
      "",
      "password",
    );
    password.autocomplete = joining ? "new-password" : "current-password";
    password.maxLength = 128;
    if (joining) password.minLength = 8;
    password.setAttribute("aria-label", "Password");
    const caps = h("small", { class: "auth-keyboard-hint", role: "status" });
    password.addEventListener("keyup", (event) => {
      caps.textContent = event.getModifierState("CapsLock")
        ? "Caps Lock is on."
        : "";
    });
    const lengthHint = h("small", {
      class: "auth-length-hint",
      role: "status",
    });
    if (joining)
      password.addEventListener("input", () => {
        lengthHint.textContent =
          password.value.length < 8
            ? `${8 - password.value.length} more characters to reach the minimum.`
            : "8+ characters · ready to create your account";
        lengthHint.classList.toggle("ready", password.value.length >= 8);
      });
    const show = button(
      "Show",
      () => {
        const reveal = password.type === "password";
        password.type = reveal ? "text" : "password";
        show.textContent = reveal ? "Hide" : "Show";
        show.setAttribute(
          "aria-label",
          reveal ? "Hide password" : "Show password",
        );
        show.setAttribute("aria-pressed", String(reveal));
      },
      "password-visibility",
      { "aria-label": "Show password", "aria-pressed": false },
    );
    const name = input("name", "What should we call you?", model.name);
    const section = input("section", "e.g. Discovery", model.section);
    section.required = false;
    name.maxLength = 40;
    section.maxLength = 40;
    name.addEventListener("input", () => {
      model.name = name.value;
    });
    section.addEventListener("input", () => {
      model.section = section.value;
    });
    const grade = h(
      "select",
      { name: "grade", "aria-label": "Grade" },
      ...[7, 8, 9, 10].map((g) =>
        h(
          "option",
          { value: g, selected: String(g) === model.grade },
          `Grade ${g}`,
        ),
      ),
    );
    grade.addEventListener("change", () => {
      model.grade = grade.value;
    });
    const terms = h("input", {
      type: "checkbox",
      name: "terms",
      required: joining,
      checked: model.termsAccepted,
      "aria-label": "I agree to the Terms and Conditions and Privacy Notice",
    });
    terms.addEventListener("change", () => {
      model.termsAccepted = terms.checked;
      void updateSubmit();
    });
    const error = h("p", { class: "form-error", role: "alert" });
    const recovery = h("div", { class: "auth-recovery" });
    const emailStatus = h("p", { class: "auth-email-wait", role: "status" });
    const confirmationOptions = button(
      "Check confirmation options",
      () => confirmation(),
      "text-button full",
    );
    confirmationOptions.hidden = true;
    const submit = button(
      joining ? "Make my little lab" : "Welcome back",
      () => undefined,
      "button primary full",
      { type: "submit" },
    );
    const form = h(
      "form",
      {
        onSubmit: async (event: SubmitEvent) => {
          event.preventDefault();
          if (submit.disabled) return;
          if (joining && !terms.checked) {
            error.textContent =
              "Please read and accept the Terms & Conditions before creating your account.";
            return;
          }
          sending = true;
          submit.disabled = true;
          submit.setAttribute("aria-busy", "true");
          submit.textContent = joining
            ? "Creating your lab…"
            : "Signing you in…";
          form.setAttribute("aria-busy", "true");
          error.textContent = "";
          recovery.replaceChildren();
          model = {
            email: username.value,
            name: name.value,
            section: section.value,
            grade: grade.value,
            termsAccepted: terms.checked,
          };
          const requestedDestination = entryDestination("");
          try {
            if (joining) {
              const signedIn = await register({
                username: username.value,
                password: password.value,
                name: name.value,
                grade: Number(grade.value),
                section: section.value,
                termsAccepted: terms.checked,
              });
              if (!dialog.open || view !== currentView) return;
              if (!signedIn) {
                await confirmation(undefined, true);
                return;
              }
            } else await login(username.value, password.value);
            if (!dialog.open || view !== currentView) return;
            const signedInUser = currentUser();
            if (!signedInUser || signedInUser.id === "guest")
              throw new Error(
                "Your account could not be opened. Please sign in again.",
              );
            close();
            go(
              requestedDestination ||
                (signedInUser.role === "admin"
                  ? cloudEnabled
                    ? "/teacher"
                    : "/admin"
                  : "/"),
            );
            toast(
              joining
                ? "Welcome to your little science lab. Let’s make a discovery!"
                : "Welcome back, scientist.",
            );
            refresh();
          } catch (value) {
            if (!dialog.open || view !== currentView) return;
            if (
              cloudEnabled &&
              joining &&
              value instanceof AccountError &&
              value.kind === "delivery"
            ) {
              await confirmation(value, false, true);
              return;
            }
            const mapped =
              value instanceof Error ? value : new Error("Please try again.");
            error.textContent = mapped.message;
            if (
              cloudEnabled &&
              value instanceof AccountError &&
              ["rate", "configuration", "confirm"].includes(value.kind)
            ) {
              if (!joining)
                recovery.append(
                  button(
                    "I already have an account",
                    () => changeMode(false),
                    "text-button full",
                  ),
                );
              if (value.kind === "confirm")
                recovery.append(
                  button(
                    "Check confirmation options",
                    () => confirmation(),
                    "text-button full",
                  ),
                );
            }
          } finally {
            sending = false;
            submit.removeAttribute("aria-busy");
            form.removeAttribute("aria-busy");
            await updateSubmit();
          }
        },
      },
      joining ? field("Your name", name) : null,
      field(cloudEnabled ? "Email" : "Username", username),
      field("Password", h("span", { class: "password-field" }, password, show)),
      caps,
      joining
        ? lengthHint
        : cloudEnabled
          ? button(
              "Forgot your password?",
              resetPanel,
              "text-button auth-forgot",
            )
          : null,
      joining
        ? h(
            "div",
            { class: "form-row" },
            field("Grade", grade),
            field("Section (optional)", section),
          )
        : null,
      error,
      recovery,
      emailStatus,
      joining
        ? h(
            "div",
            { class: "terms-agreement" },
            h(
              "label",
              { class: "terms-check" },
              terms,
              h(
                "span",
                null,
                "I have read and agree to the Terms & Conditions and Privacy Notice.",
              ),
            ),
            button("Read Terms & Conditions", termsModal, "text-button"),
          )
        : null,
      submit,
      joining && cloudEnabled
        ? button(
            "I already have an account",
            () => changeMode(false),
            "text-button full",
          )
        : null,
      joining && cloudEnabled ? confirmationOptions : null,
    );
    const content: HTMLElement = h(
      "section",
      { class: "auth-fields" },
      h(
        "p",
        { class: "eyebrow" },
        joining ? "MEET YOUR INNER SCIENTIST" : "A NEW DISCOVERY AWAITS",
      ),
      h(
        "h3",
        null,
        joining ? "Make yourself at home." : "Your little lab is ready.",
      ),
      h(
        "div",
        { class: "segmented" },
        button("Sign in", () => changeMode(false), joining ? "" : "selected", {
          "aria-pressed": !joining,
        }),
        button(
          "Join the lab",
          () => changeMode(true),
          joining ? "selected" : "",
          { "aria-pressed": joining },
        ),
      ),
      form,
      h(
        "p",
        { class: "fine-print" },
        cloudEnabled
          ? "Your profile and completed discoveries are saved to your account. Teachers can review your name, grade, section and quiz answers. Notebook pages stay on this device."
          : "Your practice account and discoveries stay in this browser.",
      ),
      !joining && !cloudEnabled
        ? h(
            "div",
            { class: "dev-hint" },
            icon("flask", 16),
            h(
              "span",
              null,
              "Demo admin: ",
              h("strong", null, "admin / admin123"),
            ),
            button(
              "×",
              () => content.querySelector(".dev-hint")?.remove(),
              "text-button",
              { "aria-label": "Dismiss demo credential hint" },
            ),
          )
        : null,
    );
    body.replaceChildren(art(), content);
    async function updateSubmit() {
      const wait =
        cloudEnabled && joining ? await emailWait(username.value) : 0;
      if (!dialog.open || view !== currentView) return;
      setButtonDisabled(
        submit,
        sending || wait > 0 || (joining && !terms.checked),
      );
      submit.textContent = sending
        ? joining
          ? "Creating your lab…"
          : "Signing you in…"
        : wait
          ? `Try again in ${wait}s`
          : joining
            ? "Make my little lab"
            : "Welcome back";
      emailStatus.textContent = wait
        ? "One account email at a time. You can still sign in to an existing confirmed account or check confirmation options."
        : "";
      confirmationOptions.hidden = sending || wait === 0;
    }
    void updateSubmit();
    if (cloudEnabled && joining) {
      username.addEventListener("input", () => {
        void updateSubmit();
      });
      timer = setInterval(() => {
        void updateSubmit();
      }, 1000);
    }
  }
  if (recoverFirst) resetPanel();
  else render();
}
export function profileModal() {
  const user = currentUser();
  if (!user) {
    authModal();
    return;
  }
  const rules = getState().rules,
    level = levelOf(user, rules);
  const name = input("name", "Your scientist name", user.name),
    section = input("section", "Your section", user.section);
  name.maxLength = 40;
  section.maxLength = 40;
  section.required = false;
  const grade = h(
    "select",
    { name: "grade" },
    ...[7, 8, 9, 10].map((g) =>
      h("option", { value: g, selected: g === user.grade }, `Grade ${g}`),
    ),
  );
  let chosenAvatar = user.avatar,
    preference = getAppearance(user.id),
    dirty = false;
  const error = h("p", { class: "form-error", role: "alert" });
  const bio = h("textarea", {
    rows: 3,
    maxlength: 160,
    placeholder: "What makes you curious?",
    value: preference.bio,
  });
  const bioCount = h(
    "small",
    { class: "profile-bio-count" },
    `${bio.value.length}/160`,
  );
  bio.addEventListener("input", () => {
    dirty = true;
    bioCount.textContent = `${bio.value.length}/160`;
  });
  const hero = h(
    "section",
    { class: "scientist-card", "data-profile-theme": preference.theme },
    h("div", { class: "profile-orbit orbit-a", "aria-hidden": true }),
    h("div", { class: "profile-orbit orbit-b", "aria-hidden": true }),
    h(
      "div",
      { class: "scientist-card-avatar", "aria-hidden": true },
      scientistAvatar(user.id, user.name, user.avatar),
    ),
    h(
      "div",
      { class: "scientist-card-copy" },
      h("p", { class: "eyebrow" }, "YOUR CURIOUS CORNER"),
      h("h3", null, user.name),
      h(
        "span",
        { class: "profile-role" },
        icon(user.role === "admin" ? "settings" : "sprout", 14),
        user.role === "admin"
          ? "Class teacher"
          : user.id === "guest"
            ? "Guest explorer"
            : "Student scientist",
      ),
      h(
        "p",
        null,
        `Grade ${user.grade}${user.section ? ` · ${user.section}` : ""}`,
      ),
    ),
    h(
      "span",
      { class: "profile-hero-art", "aria-hidden": true },
      mascot("sprout"),
    ),
  );
  const statistics = h(
    "div",
    { class: "profile-statistics" },
    ...[
      [level, "Learning level"],
      [user.streak, "Day streak"],
      [
        cloudEnabled && user.id !== "guest" ? classCredits() : user.merits,
        cloudEnabled && user.id !== "guest" ? "Class credits" : "Merits",
      ],
      [
        Object.values(user.mastery).filter((m) => m.completed > 0).length,
        "Decks explored",
      ],
    ].map(([value, label]) =>
      h(
        "div",
        null,
        h(
          "strong",
          label === "Class credits" ? { "data-class-credit": true } : null,
          String(value),
        ),
        h("span", null, label),
      ),
    ),
  );
  const xp = user.xp % rules.xpPerLevel;
  const growth = h(
    "section",
    { class: "profile-growth" },
    h(
      "div",
      null,
      h("strong", null, `Level ${level} · keep your curiosity growing`),
      h("span", null, `${xp}/${rules.xpPerLevel} XP to the next level`),
    ),
    progress((xp / rules.xpPerLevel) * 100, "Learning level progress"),
    h(
      "small",
      null,
      "Practice XP, streaks and deck progress are shown for this device.",
    ),
  );
  const avatarButtons = h(
    "div",
    { class: "avatar-options" },
    ...["cat", "sprout", "flask", "planet", "atom"].map((value) =>
      button(
        mascot(value),
        () => {
          chosenAvatar = value;
          [...avatarButtons.children].forEach((node) => {
            const selected = node.getAttribute("data-avatar") === value;
            node.classList.toggle("selected", selected);
            node.setAttribute("aria-pressed", String(selected));
          });
        },
        `avatar-choice ${chosenAvatar === value ? "selected" : ""}`,
        {
          "aria-label": `Choose ${value} avatar`,
          "data-avatar": value,
          "aria-pressed": chosenAvatar === value,
        },
      ),
    ),
  );
  const palette = h(
    "div",
    { class: "theme-choices" },
    ...themes.map((theme) =>
      button(
        h(
          "span",
          null,
          h(
            "span",
            { class: "theme-swatches", "aria-hidden": true },
            ...theme.colors.map((color) =>
              h("i", { style: { background: color } }),
            ),
          ),
          h("strong", null, theme.name),
          h("small", null, theme.description),
        ),
        () => {
          dirty = true;
          preference = { ...preference, theme: theme.id };
          hero.dataset.profileTheme = theme.id;
          drawPalette();
        },
        `theme-choice ${preference.theme === theme.id ? "selected" : ""}`,
        {
          "aria-label": `Choose ${theme.name} colors`,
          "data-theme-choice": theme.id,
          "aria-pressed": preference.theme === theme.id,
        },
      ),
    ),
  );
  function drawPalette() {
    palette.querySelectorAll<HTMLButtonElement>("button").forEach((btn) => {
      const active = btn.dataset.themeChoice === preference.theme;
      btn.classList.toggle("selected", active);
      btn.setAttribute("aria-pressed", String(active));
    });
  }
  const basicSection = h(
    "section",
    { class: "profile-panel" },
    h(
      "div",
      { class: "profile-section-title" },
      icon("sprout", 20),
      h("h3", null, "Make yourself at home"),
    ),
    photoEditor(user),
    field("Name", name),
    h(
      "div",
      { class: "form-row" },
      field("Grade", grade),
      field("Section", section),
    ),
    h(
      "p",
      { class: "profile-privacy" },
      icon("lock", 14),
      user.id === "guest"
        ? "Your guest discoveries stay on this device."
        : cloudEnabled
          ? `${user.username} · Your scientist account`
          : `@${user.username} · Saved in this browser`,
    ),
    error,
    button(
      "Save my profile",
      async () => {
        error.textContent = "";
        try {
          await dispatch({
            type: "UpdateProfile",
            name: name.value,
            grade: Number(grade.value),
            section: section.value,
            avatar: chosenAvatar,
          });
          close();
          toast("Your scientist profile is saved.");
        } catch (value) {
          error.textContent =
            value instanceof Error ? value.message : "Please try again.";
        }
      },
      "button primary full",
    ),
  );
  const styleError = h("p", { class: "form-error", role: "alert" });
  const appearanceSection = h(
    "section",
    { class: "profile-panel" },
    h(
      "div",
      { class: "profile-section-title" },
      icon("sparkles", 20),
      h("h3", null, "A little more you"),
    ),
    h(
      "p",
      { class: "muted" },
      "Choose a color story for the whole lab. Your illustrations and text stay clear in every palette.",
    ),
    palette,
    field("A little about me", bio),
    bioCount,
    h("h4", null, "Your illustrated avatar"),
    avatarButtons,
    h(
      "p",
      { class: "fine-print" },
      "Save your profile to update the illustrated avatar. Your photo stays visible until you remove it.",
    ),
    styleError,
    button(
      "Save my style",
      async () => {
        styleError.textContent = "";
        try {
          await saveAppearance(user.id, {
            theme: preference.theme,
            bio: bio.value,
          });
          dirty = false;
          toast("Your colors and introduction are saved.");
        } catch (value) {
          styleError.textContent =
            value instanceof Error ? value.message : "Please try again.";
        }
      },
      "button primary full",
    ),
  );
  const accountSection = h(
    "section",
    { class: "profile-panel profile-account" },
    h(
      "div",
      { class: "profile-section-title" },
      icon("lock", 20),
      h("h3", null, "Your account, your space"),
    ),
    user.id !== "guest"
      ? button(
          cloudEnabled ? "Change my password" : "Change my demo password",
          () => {
            close();
            passwordModal();
          },
          "button outline full password-link",
        )
      : null,
    cloudEnabled && user.id !== "guest"
      ? button(
          "Open my saved records",
          () => {
            close();
            go("/records");
          },
          "button outline full",
        )
      : null,
    user.role === "admin"
      ? button(
          "Open teacher studio",
          () => {
            close();
            go(cloudEnabled ? "/teacher" : "/admin");
          },
          "button outline full",
        )
      : null,
    h(
      "div",
      { class: "profile-actions" },
      button(
        "Export my lab backup",
        () => download("cozy-science-backup.json", exportBackup()),
        "text-button",
      ),
      user.id === "guest"
        ? button(
            "Create an account",
            () => {
              close();
              authModal(true);
            },
            "text-button",
          )
        : button(
            "Log out",
            () => {
              close();
              logoutModal();
            },
            "text-button",
          ),
    ),
  );
  const jumps = h(
    "nav",
    { class: "profile-jumps", "aria-label": "Profile sections" },
    ...[
      [basicSection, "Profile details"],
      [appearanceSection, "Colors & avatar"],
      [accountSection, "Account settings"],
    ].map(([target, label]) =>
      button(
        String(label),
        () => {
          (target as HTMLElement).scrollIntoView({
            behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
              ? "auto"
              : "smooth",
            block: "start",
          });
        },
        "button outline",
      ),
    ),
  );
  const { dialog, close } = modal(
    "Your scientist profile",
    [
      hero,
      statistics,
      growth,
      jumps,
      basicSection,
      appearanceSection,
      accountSection,
    ],
    true,
  );
  dialog.classList.add("profile-dialog");
  void loadAppearance(user.id).then((value) => {
    if (!dialog.isConnected || dirty || currentUser()?.id !== user.id) return;
    preference = value;
    bio.value = value.bio;
    bioCount.textContent = `${value.bio.length}/160`;
    hero.dataset.profileTheme = value.theme;
    drawPalette();
  });
}

export function logoutModal() {
  const user = currentUser();
  if (!user) {
    go(welcomeRoute());
    return;
  }
  const error = h("p", { class: "form-error", role: "alert" });
  const { close } = modal("Log out of your lab?", [
    h(
      "div",
      { class: "logout-mascot" },
      scientistAvatar(user.id, user.name, user.avatar),
    ),
    h(
      "p",
      null,
      user.id === "guest"
        ? "Your guest discoveries stay in this browser. You can choose guest exploration again from the welcome hub."
        : cloudEnabled
          ? `${user.name}, saved discoveries stay in your account. Pending uploads and unfinished practice stay on this device. Logging out ends your account session in this browser, including other tabs.`
          : `${user.name}, your discoveries stay saved in this browser. Sign in again whenever you’re ready.`,
    ),
    error,
    h(
      "div",
      { class: "logout-actions" },
      button("Keep exploring", () => close(), "button outline"),
      button(
        "Log out now",
        async () => {
          let warning = "";
          try {
            await logout();
          } catch (e) {
            if (currentUser()) {
              error.textContent =
                e instanceof Error ? e.message : "Please try again.";
              return;
            }
            warning =
              "You’re logged out of this tab. Browser storage couldn’t be updated.";
          }
          close();
          go(welcomeRoute("/", warning ? "storage" : "logged-out"));
          refresh();
        },
        "button primary",
      ),
    ),
  ]);
}

function passwordModal() {
  const current = input(
    "current-password",
    cloudEnabled ? "Your current password" : "Your current demo password",
    "",
    "password",
  );
  const next = input(
    "new-password",
    "A new password, 8+ characters",
    "",
    "password",
  );
  next.autocomplete = "new-password";
  const error = h("p", { class: "form-error", role: "alert" });
  const { close } = modal("A fresh key to your little lab", [
    h(
      "p",
      { class: "muted" },
      cloudEnabled
        ? "Update your account password. Use a unique password that you do not share with anyone."
        : "This changes your local demo password and ends other sessions for this account. Client-side security is still a demo.",
    ),
    h(
      "form",
      {
        onSubmit: async (e: SubmitEvent) => {
          e.preventDefault();
          try {
            await changePassword(current.value, next.value);
            close();
            toast(
              cloudEnabled
                ? "Your password was changed."
                : "Demo password changed. Your other sessions are signed out.",
            );
          } catch (e) {
            error.textContent =
              e instanceof Error ? e.message : "Please try again.";
          }
        },
      },
      field("Current password", current),
      field("New password", next),
      error,
      button("Save new password", () => undefined, "button primary full", {
        type: "submit",
      }),
    ),
  ]);
}

function photoEditor(user: NonNullable<ReturnType<typeof currentUser>>) {
  const picker = h("input", {
    type: "file",
    accept: "image/jpeg,image/png,image/webp",
    "aria-label": "Choose profile photo",
  });
  const error = h("p", { class: "form-error", role: "alert" });
  const remove = button(
    "Remove photo",
    async () => {
      try {
        await removePhoto(user.id);
        setButtonDisabled(remove, true);
        toast("Profile photo removed.");
      } catch (value) {
        error.textContent =
          value instanceof Error ? value.message : "Please try again.";
      }
    },
    "text-button",
    { disabled: !photoUrl(user.id) },
  );
  picker.addEventListener("change", async () => {
    const file = picker.files?.[0];
    if (!file) return;
    error.textContent = "";
    picker.disabled = true;
    try {
      await uploadPhoto(user.id, file);
      setButtonDisabled(remove, false);
      toast("Your profile photo is ready.");
    } catch (value) {
      error.textContent =
        value instanceof Error
          ? value.message
          : "This photo could not be uploaded.";
    } finally {
      picker.disabled = false;
      picker.value = "";
    }
  });
  return h(
    "section",
    { class: "profile-photo-editor", "aria-label": "Profile photo" },
    scientistAvatar(user.id, user.name, user.avatar),
    h(
      "div",
      null,
      h("strong", null, "Make it your own"),
      field("Upload a profile photo", picker),
      h(
        "p",
        { class: "fine-print" },
        "JPG, PNG or WebP · up to 5 MB. Photos are cropped to a square. Your photo is visible to you and your teachers.",
      ),
      remove,
      error,
    ),
  );
}

export function passwordRecoveryModal() {
  if (document.querySelector(".recovery-dialog")) return;
  const password = input(
    "recovery-password",
    "Choose a new password",
    "",
    "password",
  );
  password.autocomplete = "new-password";
  password.minLength = 8;
  password.maxLength = 128;
  const repeat = input("repeat-password", "Enter it once more", "", "password");
  repeat.autocomplete = "new-password";
  repeat.minLength = 8;
  repeat.maxLength = 128;
  const error = h("p", { class: "form-error", role: "alert" });
  const submit = button(
    "Save new password",
    () => undefined,
    "button primary full",
    { type: "submit" },
  );
  const { dialog, close } = modal("A fresh start for your account", [
    h(
      "p",
      { class: "muted" },
      "Your reset link is verified. Choose a new, unique password for your scientist account.",
    ),
    h(
      "form",
      {
        onSubmit: async (event: SubmitEvent) => {
          event.preventDefault();
          if (submit.disabled) return;
          submit.disabled = true;
          error.textContent = "";
          try {
            if (password.value !== repeat.value)
              throw new Error("The two passwords need to match.");
            await finishPasswordRecovery(password.value);
            close();
            toast("Your password is updated. Welcome back to the lab.");
          } catch (value) {
            error.textContent =
              value instanceof Error ? value.message : "Please try again.";
          } finally {
            submit.disabled = false;
          }
        },
      },
      field("New password", password),
      field("Repeat new password", repeat),
      error,
      submit,
    ),
  ]);
  dialog.classList.add("recovery-dialog");
  dialog.addEventListener("close", () => {
    dismissPasswordRecovery();
    if (new URLSearchParams(location.search).get("flow") === "recovery")
      history.replaceState(null, "", `${location.pathname}${location.hash}`);
  });
}
