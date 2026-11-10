import { AccountError } from "../core/account-errors";
import { emailWait, resendConfirmation } from "../store/email";
import { photoUrl, removePhoto, uploadPhoto } from "../store/photos";
import { avatar as scientistAvatar } from "./avatar";
import { cloudEnabled } from "../store/cloud";
import {
  currentUser,
  login,
  register,
  dispatch,
  logout,
  exportBackup,
  changePassword,
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
} from "./dom";
import { mascot, icon } from "./svg";
import { act, go, refresh, entryDestination, welcomeRoute } from "./actions";
export function authModal(registerFirst = false) {
  let joining = registerFirst;
  let model = { email: "", name: "", section: "", grade: "7" };
  let timer: ReturnType<typeof setInterval> | undefined;
  const { dialog, close } = modal(
    "A little space for your curiosity",
    [],
    true,
  );
  dialog.classList.add("auth-dialog");
  const body = h("div", { class: "auth-layout" });
  dialog.append(body);
  dialog.addEventListener("close", () => clearInterval(timer));
  const changeMode = (value: boolean) => {
    joining = value;
    render();
  };
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
        "Explore a science island, take your best shot in the arcade, and turn a little practice into an a-ha moment.",
      ),
      h(
        "div",
        { class: "auth-benefit" },
        icon("lock", 16),
        "Your own profile. Your growing story.",
      ),
    );
  }
  async function confirmation() {
    clearInterval(timer);
    const message = h("p", { class: "form-error", role: "alert" });
    const resend = button(
      "Send one new link",
      async () => {
        message.textContent = "";
        try {
          await resendConfirmation(model.email);
          message.textContent =
            "A new confirmation was requested. Check your inbox and spam folder.";
        } catch (error) {
          message.textContent =
            error instanceof Error ? error.message : "Please try later.";
        }
        await updateWait();
      },
      "button outline full",
    );
    const panel = h(
      "div",
      { class: "auth-fields auth-confirmation" },
      h("span", { class: "auth-check", "aria-hidden": true }, "✉"),
      h("p", { class: "eyebrow" }, "ONE LAST LITTLE STEP"),
      h("h3", null, "Check your email"),
      h(
        "p",
        null,
        "If this address can register, a confirmation link will arrive in your inbox. Open it, then sign in here. Check your spam folder too.",
      ),
      h("p", { class: "auth-email" }, model.email),
      message,
      button("Back to sign in", () => changeMode(false), "button primary full"),
      resend,
      h(
        "p",
        { class: "fine-print" },
        "Request one link at a time. Existing accounts can sign in without requesting another account email.",
      ),
    );
    body.replaceChildren(art(), panel);
    async function updateWait() {
      if (!dialog.isConnected) return;
      const wait = await emailWait(model.email);
      setButtonDisabled(resend, wait > 0);
      resend.textContent = wait
        ? `Request again in ${wait >= 60 ? `${Math.ceil(wait / 60)}m` : `${wait}s`}`
        : "Send one new link";
    }
    await updateWait();
    timer = setInterval(() => {
      void updateWait();
    }, 1000);
  }
  function render() {
    clearInterval(timer);
    const username = input(
      "username",
      cloudEnabled ? "you@example.com" : "Your scientist name",
      model.email,
      cloudEnabled ? "email" : "text",
    );
    username.autocomplete = cloudEnabled ? "email" : "username";
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
    const error = h("p", { class: "form-error", role: "alert" });
    const recovery = h("div", { class: "auth-recovery" });
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
          submit.disabled = true;
          submit.setAttribute("aria-busy", "true");
          error.textContent = "";
          recovery.replaceChildren();
          model = {
            email: username.value,
            name: name.value,
            section: section.value,
            grade: grade.value,
          };
          try {
            if (joining) {
              const signedIn = await register({
                username: username.value,
                password: password.value,
                name: name.value,
                grade: Number(grade.value),
                section: section.value,
              });
              if (!signedIn) {
                await confirmation();
                return;
              }
            } else await login(username.value, password.value);
            close();
            go(
              entryDestination(
                currentUser()?.role === "admin" ? "/admin" : "/",
              ),
            );
            toast(
              joining
                ? "Welcome to your little science lab. Let’s make a discovery!"
                : "Welcome back, scientist.",
            );
            refresh();
          } catch (value) {
            const mapped =
              value instanceof Error ? value : new Error("Please try again.");
            error.textContent = mapped.message;
            if (
              cloudEnabled &&
              value instanceof AccountError &&
              ["rate", "configuration", "confirm"].includes(value.kind)
            ) {
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
                    confirmation,
                    "text-button full",
                  ),
                );
            }
          } finally {
            submit.disabled = false;
            submit.removeAttribute("aria-busy");
          }
        },
      },
      joining ? field("Your name", name) : null,
      field(cloudEnabled ? "Email" : "Username", username),
      field("Password", h("span", { class: "password-field" }, password, show)),
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
      submit,
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
  }
  render();
}
export function profileModal() {
  const user = currentUser();
  if (!user) {
    authModal();
    return;
  }
  const name = input("name", "", user.name),
    section = input("section", "Your section", user.section);
  section.required = false;
  const grade = h(
    "select",
    { name: "grade" },
    ...[7, 8, 9, 10].map((g) =>
      h("option", { value: g, selected: g === user.grade }, `Grade ${g}`),
    ),
  );
  let avatar = user.avatar;
  const avatars = h(
    "div",
    { class: "avatar-options" },
    ...["cat", "sprout", "flask", "planet", "atom"].map((a) =>
      button(
        mascot(a),
        () => {
          avatar = a;
          [...avatars.children].forEach((n) =>
            n.classList.toggle("selected", n.getAttribute("data-avatar") === a),
          );
        },
        `avatar-choice ${a === avatar ? "selected" : ""}`,
        { "aria-label": `Choose ${a} avatar`, "data-avatar": a },
      ),
    ),
  );
  const { close } = modal("Your scientist profile", [
    h(
      "p",
      { class: "muted" },
      user.id === "guest"
        ? "You’re exploring as a guest. Join the lab to keep a separate scientist profile."
        : cloudEnabled
          ? `${user.username} · Your scientist account`
          : `@${user.username} · Saved in this browser`,
    ),
    photoEditor(user),
    avatars,
    field("Name", name),
    h(
      "div",
      { class: "form-row" },
      field("Grade", grade),
      field("Section", section),
    ),
    button(
      "Save my profile",
      act(async () => {
        await dispatch({
          type: "UpdateProfile",
          name: name.value,
          grade: Number(grade.value),
          section: section.value,
          avatar,
        });
        close();
        toast("Looking good, scientist!");
      }),
      "button primary full",
    ),
    user.id !== "guest"
      ? button(
          cloudEnabled ? "Change my password" : "Change my demo password",
          () => {
            close();
            passwordModal();
          },
          "text-button full password-link",
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
  ]);
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
          ? `${user.name}, saved discoveries stay in your account. Pending uploads and game progress stay on this device. Logging out ends your account session in this browser, including other tabs.`
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
