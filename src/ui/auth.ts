import { AccountError } from "../core/account-errors";
import { emailCode } from "../core/email-verification";
import {
  emailWait,
  resendConfirmation,
  requestPasswordReset,
} from "../store/email";
import { photoUrl, removePhoto, uploadPhoto } from "../store/photos";
import { avatar as scientistAvatar } from "./avatar";
import { imageInputAccept } from "../store/image-file";
import { profileHero, profileIdentity } from "./profile-hero";
import {
  cloudEnabled,
  finishPasswordRecovery,
  dismissPasswordRecovery,
  passwordRecoveryActive,
} from "../store/cloud";
import {
  currentUser,
  login,
  verifyEmailCode,
  register,
  dispatch,
  logout,
  exportBackup,
  changePassword,
  getState,
  guestSession,
  clock,
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
import { displayModeControl } from "./display-mode";
import { experienceControls } from "./experience-controls";
import { reducedMotion } from "../store/experience";
import {
  getAppearance,
  loadAppearance,
  saveAppearance,
  saveTheme,
} from "../store/preferences";
import { classCredits } from "../store/platform";
import { learningGrowth, activeLearningStreak } from "../core/growth";
import { dayKey } from "../core/time";
import { termsModal } from "./terms";
import { sectionSelect } from "./sections";
import { mountProfileBanner } from "./profile-banner";
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
  function stageTitle(title: string) {
    dialog.setAttribute("aria-label", title);
    dialog.querySelector(".modal-identity h2")!.textContent = title;
    dialog
      .querySelector(".dialog-close")
      ?.setAttribute("title", `Close ${title}`);
  }
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
    stageTitle("Account recovery");
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
        ? "We couldn’t verify this reset link. It may have expired, already been used, or opened in a different browser. Request one new link below, then open it in the same browser where you requested it."
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
              "If this email has an account, a reset link will arrive shortly. Check your inbox and spam folder, then open it in this same browser.";
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
      model.email = address.value;
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
          "Sign in instead",
          () => changeMode(false),
          "button outline full",
          { "aria-label": "Back to sign in" },
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
    stageTitle("Verify your email");
    const currentView = ++view;
    let sending = false,
      verifying = false;
    clearInterval(timer);
    const message = h("p", { class: "form-error", role: "alert" });
    const status = h("p", { class: "auth-reset-status", role: "status" });
    const heading = h("h3", { tabindex: -1 });
    const description = h("p");
    const destination = entryDestination("");
    const code = input("email-code", "Enter code", "", "text");
    code.inputMode = "numeric";
    code.autocomplete = "one-time-code";
    code.maxLength = 16;
    code.pattern = "(?:[0-9]{6}|[0-9]{8})";
    code.classList.add("email-code-input");
    const verify = button(
      "Verify code & enter",
      () => undefined,
      "button primary full",
      {
        type: "submit",
        disabled: true,
      },
    );
    code.addEventListener("input", () => {
      const value = emailCode(code.value);
      if (value) code.value = value;
      setButtonDisabled(verify, verifying || sending || !value);
    });
    function explain(error?: AccountError, requested = false) {
      heading.textContent = error
        ? "Email delivery needs attention"
        : requested
          ? "Check your email"
          : "Enter your email code";
      description.textContent = error
        ? signupFailed
          ? "The email could not be sent, so your account may not have been created. Edit your signup details and try again after your teacher fixes the sender. If you already registered, request one new code below."
          : "We couldn’t request your email code. Ask your teacher to check the email sender, then request one new code below."
        : requested
          ? "If this address can register, check your Gmail inbox or Spam for your verification code. Enter the complete code below."
          : "Enter your latest email code, or request a new one. Already verified? Sign in with your password.";
      message.textContent = error?.message ?? "";
      status.textContent = "";
    }
    explain(failure, accepted);
    const resend = button(
      "Send a new code",
      async () => {
        sending = true;
        setButtonDisabled(verify, true);
        message.textContent = "";
        status.textContent = "";
        try {
          await resendConfirmation(model.email);
          if (!dialog.open || view !== currentView) return;
          explain(undefined, true);
          status.textContent =
            "A new verification code was requested. Check your inbox and spam folder.";
          code.value = "";
          code.focus();
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
    const verificationForm = h(
      "form",
      {
        onSubmit: async (event: SubmitEvent) => {
          event.preventDefault();
          const value = emailCode(code.value);
          if (verifying || sending || !value) return;
          verifying = true;
          message.textContent = "";
          status.textContent = "Verifying your code…";
          setButtonDisabled(verify, true);
          verify.setAttribute("aria-busy", "true");
          await updateWait();
          try {
            await verifyEmailCode(model.email, value);
            if (!dialog.open || view !== currentView) return;
            const user = currentUser();
            if (!user || user.id === "guest")
              throw new Error("Please sign in to open your verified account.");
            close();
            go(destination || (user.role === "admin" ? "/teacher" : "/"));
            toast("Email verified. Welcome to your science lab!");
            refresh();
          } catch (error) {
            if (!dialog.open || view !== currentView) return;
            status.textContent = "";
            message.textContent =
              error instanceof Error
                ? error.message
                : "The code could not be verified. Try again.";
            code.focus();
          } finally {
            verifying = false;
            verify.removeAttribute("aria-busy");
            if (dialog.open && view === currentView) await updateWait();
          }
        },
      },
      h(
        "div",
        { class: "auth-email", "data-email-status": "pending" },
        h(
          "span",
          { class: "auth-inbox-state" },
          icon("lock", 14),
          "Not verified yet",
        ),
        h("strong", null, model.email),
      ),
      field("Email verification code", code),
      message,
      status,
      h("p", { class: "fine-print" }, "Use the latest code. Never share it."),
      verify,
    );
    const panel = h(
      "div",
      { class: "auth-fields auth-confirmation" },
      h("span", { class: "auth-check", "aria-hidden": true }, "✉"),
      h("p", { class: "eyebrow" }, "YOUR NEXT STEP"),
      heading,
      description,
      verificationForm,
      resend,
      h(
        "details",
        { class: "auth-mail-help" },
        h("summary", null, "No email yet?"),
        h(
          "ul",
          null,
          h(
            "li",
            null,
            "Check that this address matches the Gmail inbox you can open. Use Edit signup details to correct it.",
          ),
          h(
            "li",
            null,
            "Check Spam and search your mail for The Cozy Science Lab.",
          ),
          h(
            "li",
            null,
            "Already registered? Choose Sign in instead and use your website password.",
          ),
          h(
            "li",
            null,
            "After the countdown, request one new code. If nothing arrives, ask your teacher to check email delivery. A request is not proof that a message reached your inbox.",
          ),
        ),
      ),
      h(
        "div",
        { class: "auth-code-actions auth-secondary-actions" },
        button("Sign in instead", () => changeMode(false), "text-button", {
          "aria-label": "Back to sign in",
        }),
        button("Edit signup details", () => changeMode(true), "text-button", {
          "aria-label": "Back to signup details",
        }),
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
      h("p", { class: "fine-print" }, "Guest practice stays on this device."),
    );
    body.replaceChildren(art(), panel);
    dialog.scrollTop = 0;
    if (failure) heading.focus({ preventScroll: true });
    else code.focus({ preventScroll: true });
    async function updateWait() {
      const wait = await emailWait(model.email);
      if (!dialog.open || view !== currentView) return;
      setButtonDisabled(resend, sending || verifying || wait > 0);
      setButtonDisabled(verify, sending || verifying || !emailCode(code.value));
      resend.textContent = sending
        ? "Requesting your code…"
        : wait
          ? `Request again in ${wait >= 60 ? `${Math.ceil(wait / 60)}m` : `${wait}s`}`
          : "Send a new code";
    }
    await updateWait();
    timer = setInterval(() => {
      void updateWait();
    }, 1000);
  }
  function render() {
    stageTitle("A little space for your curiosity");
    const currentView = ++view;
    let sending = false;
    clearInterval(timer);
    const username = input(
      "username",
      cloudEnabled
        ? joining
          ? "yourname@gmail.com"
          : "Your account email"
        : "Your scientist name",
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
    const section = sectionSelect(model.section);
    name.maxLength = 40;
    name.addEventListener("input", () => {
      model.name = name.value;
    });
    section.addEventListener("change", () => {
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
      "Verify email",
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
                    "Enter email code",
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
      joining && cloudEnabled
        ? h(
            "p",
            { class: "auth-inbox-hint" },
            "Use an existing Gmail inbox you can open. We’ll send its verification code there.",
          )
        : null,
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
        ? h(
            "div",
            { class: "auth-secondary-actions" },
            button("Sign in instead", () => changeMode(false), "text-button", {
              "aria-label": "I already have an account",
            }),
            confirmationOptions,
          )
        : null,
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
        ? "One account email at a time. You can still sign in to an existing verified account or enter an email code."
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
export function profileModal(options: { onboarding?: boolean } = {}) {
  const user = currentUser();
  if (!user) {
    authModal();
    return;
  }
  const rules = getState().rules,
    learning = learningGrowth(user, rules),
    level = learning.level;
  const name = input("name", "Your scientist name", user.name),
    section = sectionSelect(user.section);
  name.maxLength = 40;
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
    bioDirty = false,
    appearanceReady = false,
    savingPalette = false;
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
    bioDirty = true;
    bioCount.textContent = `${bio.value.length}/160`;
  });
  const hero = profileHero(
    profileIdentity(user, preference.theme),
    scientistAvatar(user.id, user.name, user.avatar),
  );
  const statistics = h(
    "div",
    { class: "profile-statistics" },
    ...[
      [level, "Learning level"],
      [activeLearningStreak(user, dayKey(clock, rules.timezone)), "Day streak"],
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
  mountProfileBanner(hero, user.id);
  const designButton = button(
    h("span", null, icon("island", 17), "Edit banner"),
    async () => {
      await (await import("./profile-design")).profileDesignModal(designButton);
    },
    "button primary profile-design-launch",
    { "aria-haspopup": "dialog" },
  );
  const designShortcut = h(
    "section",
    { class: "profile-design-shortcut" },
    h(
      "div",
      null,
      h("strong", null, "Your own little backdrop"),
      h(
        "p",
        null,
        "Choose an image, find the perfect placement, and preview your profile.",
      ),
    ),
    designButton,
  );
  const xp = user.xp % rules.xpPerLevel;
  const growth = h(
    "section",
    { class: "profile-growth" },
    h(
      "div",
      null,
      h("strong", null, `Level ${level} · ${learning.title.name}`),
      h("span", null, `${xp}/${rules.xpPerLevel} XP to the next level`),
    ),
    progress((xp / rules.xpPerLevel) * 100, "Learning level progress"),
    h(
      "small",
      null,
      "Practice XP, streaks and deck progress are shown for this device.",
    ),
    button(
      "Visit my growth garden",
      () => {
        document.querySelector<HTMLDialogElement>(".profile-dialog")?.close();
        go("/growth");
      },
      "button outline growth-profile-link",
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
  const paletteStatus = h(
    "p",
    { class: "palette-status", role: "status" },
    "Loading your colors…",
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
          h(
            "span",
            {
              class: "theme-choice-state",
              hidden: preference.theme !== theme.id,
              "aria-hidden": true,
            },
            icon("check", 14),
            "Active",
          ),
          h("small", null, theme.description),
        ),
        async () => {
          if (
            !appearanceReady ||
            savingPalette ||
            currentUser()?.id !== user.id
          )
            return;
          if (preference.theme === theme.id) return;
          const previous = preference.theme;
          savingPalette = true;
          preference = { ...preference, theme: theme.id };
          hero.dataset.profileTheme = theme.id;
          document.documentElement.dataset.theme = theme.id;
          paletteStatus.textContent = `Saving ${theme.name}…`;
          styleError.textContent = "";
          setButtonDisabled(styleSave, true);
          drawPalette();
          try {
            await saveTheme(user.id, theme.id);
            if (currentUser()?.id === user.id)
              paletteStatus.textContent = `${theme.name} is on. ${cloudEnabled && user.id !== "guest" ? "Saved to your account." : "Saved on this device."}`;
          } catch (error) {
            if (currentUser()?.id === user.id) {
              preference = { ...preference, theme: previous };
              hero.dataset.profileTheme = previous;
              document.documentElement.dataset.theme = previous;
              paletteStatus.textContent =
                "Your previous colors are still on. Choose a style to try again.";
              styleError.textContent =
                error instanceof Error
                  ? error.message
                  : "Your colors could not be saved.";
            }
          } finally {
            savingPalette = false;
            drawPalette();
            setButtonDisabled(styleSave, false);
          }
        },
        `theme-choice ${preference.theme === theme.id ? "selected" : ""}`,
        {
          "aria-label": `Choose ${theme.name} colors`,
          "data-theme-choice": theme.id,
          "aria-pressed": preference.theme === theme.id,
          disabled: true,
        },
      ),
    ),
  );
  function drawPalette() {
    setButtonDisabled(styleSave, !appearanceReady || savingPalette);
    palette.querySelectorAll<HTMLButtonElement>("button").forEach((btn) => {
      const active = btn.dataset.themeChoice === preference.theme;
      btn.classList.toggle("selected", active);
      btn.setAttribute("aria-pressed", String(active));
      setButtonDisabled(btn, !appearanceReady || savingPalette);
      const state = btn.querySelector<HTMLElement>(".theme-choice-state");
      if (state) state.hidden = !active;
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
  const styleSave = button(
    "Save my style",
    async () => {
      styleError.textContent = "";
      const introduction = bio.value;
      try {
        await saveAppearance(user.id, {
          theme: preference.theme,
          bio: introduction,
        });
        if (bio.value === introduction) bioDirty = false;
        toast("Your colors and introduction are saved.");
      } catch (value) {
        styleError.textContent =
          value instanceof Error ? value.message : "Please try again.";
      }
    },
    "button primary full",
    { disabled: true },
  );
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
    displayModeControl(user.id),
    experienceControls(user.id),
    palette,
    paletteStatus,
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
    styleSave,
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
      [appearanceSection, "Appearance"],
      [accountSection, "Account settings"],
    ].map(([target, label]) =>
      button(
        String(label),
        () => {
          (target as HTMLElement).scrollIntoView({
            behavior: reducedMotion() ? "auto" : "smooth",
            block: "start",
          });
        },
        "button outline",
      ),
    ),
  );
  const coachBanner = button(
    h(
      "span",
      null,
      icon("island", 20),
      h("strong", null, "2. Find your favorite view"),
      h(
        "small",
        null,
        "Add a banner, move its focus and preview before saving.",
      ),
    ),
    async () =>
      (await import("./profile-design")).profileDesignModal(coachBanner),
    "profile-setup-step",
    {
      "aria-label": "Open banner studio from profile guide",
      "aria-haspopup": "dialog",
    },
  );
  const coach: HTMLElement | null = options.onboarding
    ? h(
        "section",
        {
          class: "profile-setup-guide",
          "aria-label": "Profile customization guide",
        },
        h(
          "div",
          { class: "profile-setup-welcome" },
          mascot("cat"),
          h(
            "div",
            null,
            h("p", { class: "eyebrow" }, "A LITTLE PROFILE MAGIC"),
            h("h3", null, "Hello, new scientist!"),
            h(
              "p",
              null,
              "Let’s make a cozy corner that feels like you. Choose a little step below, or come back when you’re ready.",
            ),
          ),
        ),
        h(
          "div",
          { class: "profile-setup-steps" },
          button(
            h(
              "span",
              null,
              icon("cat", 20),
              h("strong", null, "1. Say hello, your way"),
              h(
                "small",
                null,
                "Photos save automatically. For a new display name, press Save my profile.",
              ),
            ),
            () => {
              basicSection.scrollIntoView({ block: "start" });
              name.focus({ preventScroll: true });
            },
            "profile-setup-step",
            { "aria-label": "Show photo and name settings" },
          ),
          coachBanner,
          button(
            h(
              "span",
              null,
              icon("sparkles", 20),
              h("strong", null, "3. Pick your cozy colors"),
              h(
                "small",
                null,
                "Try Meadow, Aurora or Sunset and whole-site Dark mode. Colors save automatically.",
              ),
            ),
            () => {
              appearanceSection.scrollIntoView({ block: "start" });
              palette
                .querySelector<HTMLButtonElement>('button[aria-pressed="true"]')
                ?.focus({ preventScroll: true });
            },
            "profile-setup-step",
            { "aria-label": "Show colors and Dark mode settings" },
          ),
        ),
        button(
          "I’m ready to explore",
          () => coach?.remove(),
          "button outline profile-setup-done",
        ),
        h(
          "p",
          { class: "fine-print" },
          "No rush. Open ? → step-by-step guide → Customize my profile to see these tips again.",
        ),
      )
    : null;
  const { dialog, close } = modal(
    "Your scientist profile",
    [
      coach,
      hero,
      designShortcut,
      statistics,
      growth,
      jumps,
      basicSection,
      appearanceSection,
      h(
        "section",
        { class: "profile-panel" },
        h("h3", null, "Your classroom identity"),
        h(
          "p",
          null,
          "Your existing account name connects you with classmates and the science league. Choose which extra profile details to share.",
        ),
        button(
          "Classroom sharing",
          async () => {
            await (await import("./community")).communitySettingsModal();
          },
          "button outline",
        ),
        h(
          "a",
          {
            class: "button outline",
            href: "#/friends",
            onClick: () => close(),
          },
          "My science friends",
        ),
      ),
      accountSection,
    ],
    true,
  );
  dialog.classList.add("profile-dialog");
  const reflectAppearance = (event: Event) => {
    const value = (event as CustomEvent).detail;
    if (value.id !== user.id || currentUser()?.id !== user.id || savingPalette)
      return;
    preference = { ...preference, theme: value.theme };
    hero.dataset.profileTheme = value.theme;
    if (!bioDirty) {
      bio.value = value.bio;
      bioCount.textContent = `${value.bio.length}/160`;
    }
    drawPalette();
  };
  window.addEventListener("csl:appearance", reflectAppearance);
  dialog.addEventListener(
    "close",
    () => window.removeEventListener("csl:appearance", reflectAppearance),
    { once: true },
  );
  void loadAppearance(user.id)
    .then((value) => {
      if (!dialog.isConnected || currentUser()?.id !== user.id) return;
      appearanceReady = true;
      preference = value;
      hero.dataset.profileTheme = value.theme;
      if (!bioDirty) {
        bio.value = value.bio;
        bioCount.textContent = `${value.bio.length}/160`;
      }
      paletteStatus.textContent =
        "Choose a style. Your whole lab updates and saves automatically.";
      drawPalette();
    })
    .catch((error) => {
      if (!dialog.isConnected || currentUser()?.id !== user.id) return;
      paletteStatus.textContent =
        "Your colors could not be loaded. Close and reopen your profile to try again.";
      styleError.textContent =
        error instanceof Error ? error.message : "Please try again.";
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
    accept: imageInputAccept,
    "aria-label": "Choose profile photo",
  });
  const error = h("p", { class: "form-error", role: "alert" });
  const imageStatus = h("p", {
    class: "fine-print photo-upload-status",
    role: "status",
  });
  let imageBusy = false;
  const remove = button(
    "Remove photo",
    async () => {
      if (imageBusy) return;
      imageBusy = true;
      picker.disabled = true;
      error.textContent = "";
      imageStatus.textContent = "Removing your profile photo…";
      try {
        await removePhoto(user.id);
        if (!picker.isConnected || currentUser()?.id !== user.id) return;
        setButtonDisabled(remove, true);
        imageStatus.textContent = "Your illustrated avatar is ready.";
        toast("Profile photo removed.");
      } catch (value) {
        error.textContent =
          value instanceof Error ? value.message : "Please try again.";
        imageStatus.textContent =
          "Your photo could not be removed. Please try again.";
      } finally {
        imageBusy = false;
        picker.disabled = false;
        setButtonDisabled(remove, !photoUrl(user.id));
      }
    },
    "text-button",
    { disabled: !photoUrl(user.id) },
  );
  picker.addEventListener("change", async () => {
    const file = picker.files?.[0];
    if (!file || imageBusy) return;
    imageBusy = true;
    error.textContent = "";
    picker.disabled = true;
    setButtonDisabled(remove, true);
    imageStatus.textContent = "Preparing and saving your photo…";
    try {
      await uploadPhoto(user.id, file);
      if (!picker.isConnected || currentUser()?.id !== user.id) return;
      setButtonDisabled(remove, false);
      imageStatus.textContent =
        "Your photo is saved. You can choose another whenever you like.";
      toast("Your profile photo is ready.");
    } catch (value) {
      error.textContent =
        value instanceof Error
          ? value.message
          : "This photo could not be uploaded.";
      imageStatus.textContent =
        "Choose another image or try again. Your previous photo remains available.";
    } finally {
      imageBusy = false;
      picker.disabled = false;
      picker.value = "";
      setButtonDisabled(remove, !photoUrl(user.id));
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
        "JPG, PNG, WebP, GIF or AVIF · up to 20 MB. Compatible phone photos work too. Photos are cropped to a square and save automatically; they are visible to you and authorized teachers.",
      ),
      remove,
      imageStatus,
      error,
    ),
  );
}

export function passwordRecoveryModal() {
  if (!passwordRecoveryActive() || document.querySelector(".recovery-dialog"))
    return;
  document
    .querySelectorAll<HTMLDialogElement>(".auth-dialog[open]")
    .forEach((dialog) => dialog.close());
  const password = input(
    "recovery-password",
    "Choose a new password",
    "",
    "password",
  );
  password.autocomplete = "new-password";
  password.minLength = 8;
  password.maxLength = 128;
  password.setAttribute("aria-label", "New password");
  const repeat = input("repeat-password", "Enter it once more", "", "password");
  repeat.autocomplete = "new-password";
  repeat.minLength = 8;
  repeat.maxLength = 128;
  repeat.setAttribute("aria-label", "Repeat new password");
  const error = h("p", { class: "form-error", role: "alert" });
  const submit = button(
    "Save new password",
    () => undefined,
    "button primary full",
    { type: "submit" },
  );
  const status = h("p", { class: "recovery-password-hint", role: "status" });
  const visiblePassword = (control: HTMLInputElement, label: string) => {
    const toggle = button(
      "Show",
      () => {
        const reveal = control.type === "password";
        control.type = reveal ? "text" : "password";
        toggle.textContent = reveal ? "Hide" : "Show";
        toggle.setAttribute(
          "aria-label",
          `${reveal ? "Hide" : "Show"} ${label}`,
        );
        toggle.setAttribute("aria-pressed", String(reveal));
      },
      "password-visibility",
      { "aria-label": `Show ${label}`, "aria-pressed": false },
    );
    return h("span", { class: "password-field" }, control, toggle);
  };
  password.addEventListener("input", () => {
    status.textContent =
      password.value.length < 8
        ? `Use at least 8 characters. ${8 - password.value.length} more to go.`
        : "8+ characters · repeat your new password below.";
  });
  const content = h("div", { class: "recovery-content" });
  const { dialog } = modal("A fresh start for your account", [content]);
  content.append(
    h(
      "span",
      { class: "recovery-verified" },
      icon("check", 17),
      "Reset link verified",
    ),
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
          submit.setAttribute("aria-busy", "true");
          submit.textContent = "Saving your new password…";
          error.textContent = "";
          try {
            if (password.value !== repeat.value)
              throw new Error("The two passwords need to match.");
            await finishPasswordRecovery(password.value);
            password.value = "";
            repeat.value = "";
            content.replaceChildren(
              h(
                "section",
                { class: "recovery-success", role: "status" },
                icon("check", 30),
                h("h3", { tabindex: -1 }, "Your password is updated"),
                h(
                  "p",
                  null,
                  "Your new password is saved. Continue to the lab to open your account.",
                ),
              ),
              h(
                "a",
                {
                  href: import.meta.env.BASE_URL,
                  class: "button primary full",
                },
                "Continue to the lab",
              ),
            );
            content.querySelector<HTMLElement>("h3")?.focus();
          } catch (value) {
            error.textContent =
              value instanceof Error ? value.message : "Please try again.";
          } finally {
            submit.disabled = false;
            submit.removeAttribute("aria-busy");
            submit.textContent = "Save new password";
          }
        },
      },
      field("New password", visiblePassword(password, "new password")),
      status,
      field(
        "Repeat new password",
        visiblePassword(repeat, "repeated password"),
      ),
      error,
      submit,
    ),
  );
  dialog.classList.add("recovery-dialog");
  dialog.addEventListener("close", () => {
    dismissPasswordRecovery();
    if (new URLSearchParams(location.search).get("flow") === "recovery")
      history.replaceState(null, "", `${location.pathname}${location.hash}`);
  });
}
