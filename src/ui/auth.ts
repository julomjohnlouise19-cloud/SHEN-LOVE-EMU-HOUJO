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
import { button, field, h, input, modal, toast, download } from "./dom";
import { mascot, icon } from "./svg";
import { act, go, refresh, entryDestination, welcomeRoute } from "./actions";
export function authModal(registerFirst = false) {
  let joining = registerFirst;
  const { dialog, close } = modal("A little space for your curiosity", []);
  const body = h("div");
  dialog.append(body);
  function render() {
    const username = input(
        "username",
        cloudEnabled ? "you@example.com" : "Your scientist name",
        "",
        cloudEnabled ? "email" : "text",
      ),
      password = input("password", "At least 8 characters", "", "password");
    username.autocomplete = "username";
    password.autocomplete = joining ? "new-password" : "current-password";
    const name = input("name", "What should we call you?"),
      section = input("section", "e.g. SSC – Curiosity");
    section.required = false;
    const grade = h(
      "select",
      { name: "grade", "aria-label": "Grade" },
      ...[7, 8, 9, 10].map((g) => h("option", { value: g }, `Grade ${g}`)),
    );
    const error = h("p", { class: "form-error", role: "alert" });
    const submit = button(
      joining ? "Make my little lab" : "Welcome back",
      () => undefined,
      "button primary full",
      { type: "submit" },
    );
    const form = h(
      "form",
      {
        onSubmit: async (e: SubmitEvent) => {
          e.preventDefault();
          submit.disabled = true;
          error.textContent = "";
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
                body.replaceChildren(
                  h("h3", null, "Check your email"),
                  h(
                    "p",
                    null,
                    "If this address can register, Supabase will send a confirmation link. Open it to confirm your account, then return here and sign in. Check your spam folder too.",
                  ),
                  button(
                    "Back to sign in",
                    () => {
                      joining = false;
                      render();
                    },
                    "button primary",
                  ),
                );
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
                ? `Welcome to your little science lab! ${currentUser()?.merits} starter merits are yours.`
                : "Welcome back, scientist.",
            );
            refresh();
          } catch (e) {
            error.textContent =
              e instanceof Error ? e.message : "Please try again.";
          } finally {
            submit.disabled = false;
          }
        },
      },
      joining ? field("Your name", name) : null,
      field(cloudEnabled ? "Email" : "Username", username),
      field("Password", password),
      joining
        ? h(
            "div",
            { class: "form-row" },
            field("Grade", grade),
            field("Section (optional)", section),
          )
        : null,
      error,
      submit,
    );
    body.replaceChildren(
      h("div", { class: "auth-mascot" }, mascot("apple"), mascot("cat")),
      h(
        "p",
        { class: "muted center" },
        joining
          ? "Save your discoveries, grow your knowledge, and collect little rewards."
          : "Your next a-ha moment is waiting.",
      ),
      h(
        "div",
        { class: "segmented" },
        button(
          "Sign in",
          () => {
            joining = false;
            render();
          },
          joining ? "" : "selected",
        ),
        button(
          "Join the lab",
          () => {
            joining = true;
            render();
          },
          joining ? "selected" : "",
        ),
      ),
      form,
      h(
        "p",
        { class: "fine-print" },
        cloudEnabled
          ? "Email sign-in and quiz records use Supabase. Your teacher can view your quiz answers, name, grade and section. Merits, supplies, notebook and unfinished practice stay on this device."
          : "Local demo account. Data stays in this browser; this is not production security.",
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
            button("×", eDismiss, "text-button", {
              "aria-label": "Dismiss demo credential hint",
            }),
          )
        : h("span"),
    );
    function eDismiss() {
      body.querySelector(".dev-hint")?.remove();
    }
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
          ? `${user.username} · Cloud profile; avatar and game progress stay on this device`
          : `@${user.username} · Saved in this browser`,
    ),
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
    h("div", { class: "logout-mascot" }, mascot(user.avatar)),
    h(
      "p",
      null,
      user.id === "guest"
        ? "Your guest discoveries stay in this browser. You can choose guest exploration again from the welcome hub."
        : cloudEnabled
          ? `${user.name}, uploaded quiz records stay in your cloud account. Pending uploads and game progress stay on this device. Logging out ends your cloud session in this browser, including other tabs.`
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
        ? "Update your Supabase account password. Use a unique password that you do not share with anyone."
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
