import { classCredits } from "./store/platform";
import { cloudEnabled, passwordRecoveryActive } from "./store/cloud";
import { passwordRecoveryModal, authModal } from "./ui/auth";
import { updateCloudNotices } from "./ui/cloud-status";
import "./styles/main.css";
import "./styles/refresh.css";
import "./styles/studio.css";
import "./styles/discovery.css";
import "./styles/friendly.css";
import "./styles/mobile.css";
import "./styles/accounts.css";
import "./styles/reading.css";
import { loadAppearance } from "./store/preferences";
import {
  initStore,
  subscribe,
  getState,
  currentUser,
  exportBackup,
  clearInvalidSession,
  logout,
} from "./store";
import { h, toast, button, download, modal } from "./ui/dom";
import { shell, empty, resetNavigation } from "./ui/shell";
import { dashboard } from "./ui/dashboard";
import { branchPage, islandPage, startDeck } from "./ui/learn";
import { playPage } from "./ui/play";
import { shopPage } from "./ui/shop";
import {
  reviewPage,
  notebookPage,
  spinPage,
  questsPage,
  leaderboardPage,
  labPage,
} from "./ui/extras";
import { welcomeHub } from "./ui/welcome";
import { APP_NAME, brandLink } from "./ui/branding";
import { updateConnectionNotices } from "./ui/connectivity";
import {
  connectRenderer,
  go,
  entryDestination,
  welcomeRoute,
} from "./ui/actions";
const app = document.querySelector<HTMLDivElement>("#app")!;
document.querySelector(".skip-link")?.addEventListener("click", (event) => {
  event.preventDefault();
  const main = document.querySelector<HTMLElement>("#main");
  main?.focus();
  main?.scrollIntoView({ block: "start" });
});
app.replaceChildren(
  h(
    "div",
    { class: "loading-screen" },
    brandLink("#/welcome"),
    h("span", { class: "loading-flower" }, "✳"),
    h("h1", null, "Getting your little lab ready…"),
    h("p", null, "A little wonder is on its way."),
  ),
);
let renderId = 0,
  scheduled = false,
  initialized = false;
let renderedUserId: string | undefined;
async function render() {
  const id = ++renderId;
  const path = location.hash.slice(1).split("?")[0] || "/";
  if (
    path === "/arcade" ||
    path.startsWith("/arcade/") ||
    path === "/teacher/games"
  ) {
    go(path === "/teacher/games" ? "/teacher/reports" : "/island");
    return;
  }
  const user = currentUser();
  const identityChanged = renderedUserId !== user?.id;
  if (identityChanged) {
    document.documentElement.dataset.theme = "meadow";
    if (user)
      void loadAppearance(user.id).then((value) => {
        if (currentUser()?.id === user.id)
          document.documentElement.dataset.theme = value.theme;
      });
    resetNavigation();
    if (renderedUserId) {
      document.querySelector("#toasts")?.replaceChildren();
      document
        .querySelectorAll<HTMLDialogElement>("dialog[open]")
        .forEach((dialog) => {
          dialog.close();
          dialog.remove();
        });
    }
    renderedUserId = user?.id;
  }
  if (!user) {
    clearInvalidSession();
    if (path !== "/welcome")
      history.replaceState(
        null,
        "",
        `#${welcomeRoute(location.hash.slice(1) || "/")}`,
      );
    app.replaceChildren(welcomeHub());
    document.title = `Welcome · ${APP_NAME}`;
    if (passwordRecoveryActive()) passwordRecoveryModal();
    if (identityChanged)
      app.querySelector<HTMLElement>("#main")?.focus({ preventScroll: true });
    return;
  }
  if (path === "/welcome") {
    go(
      entryDestination(
        user.role === "admin" ? (cloudEnabled ? "/teacher" : "/admin") : "/",
      ),
    );
    return;
  }
  if (path === "/leaderboard" && cloudEnabled && user.id !== "guest") {
    go("/island");
    return;
  }
  let page: HTMLElement;
  try {
    if (path === "/") page = dashboard();
    else if (path === "/island") page = islandPage();
    else if (path.startsWith("/branch/")) page = branchPage(path.split("/")[2]);
    else if (path.startsWith("/play/"))
      page = await playPage(path.split("/")[2]);
    else if (path === "/sources")
      page = await (await import("./ui/sources")).sourcesPage();
    else if (path === "/suggestions" || path === "/teacher/suggestions")
      page = await (
        await import("./ui/suggestions")
      ).suggestionsPage(path.startsWith("/teacher"));
    else if (path === "/review") page = await reviewPage();
    else if (path === "/notebook") page = await notebookPage();
    else if (path === "/shop")
      page =
        cloudEnabled && user.id !== "guest"
          ? await (await import("./ui/class-shop")).classShopPage()
          : shopPage();
    else if (path === "/spin") page = spinPage();
    else if (path === "/quests") page = questsPage();
    else if (path === "/leaderboard") page = leaderboardPage();
    else if (path === "/experiment") page = labPage();
    else if (path === "/records" && cloudEnabled)
      page = await (await import("./ui/records")).recordsPage();
    else if (path === "/teacher" || path.startsWith("/teacher/"))
      page = cloudEnabled
        ? (await import("./ui/teacher")).teacherPage(
            path.split("/")[2] || "overview",
          )
        : await (await import("./ui/admin")).adminPage();
    else if (path === "/admin" || path === "/undo")
      page = cloudEnabled
        ? (await import("./ui/teacher")).teacherPage()
        : await (await import("./ui/admin")).adminPage();
    else if (path.startsWith("/challenge/")) {
      const params = new URLSearchParams(location.hash.split("?")[1]),
        deck = path.split("/")[2],
        level = params.get("level") ?? "medium",
        seed = Number(params.get("seed"));
      if (
        !["easy", "medium", "hard"].includes(level) ||
        !Number.isSafeInteger(seed)
      )
        throw new Error("That challenge link is not valid.");
      page = empty(
        "cat",
        "A little challenge from a friend.",
        `${deck} · ${level}. Same science, same shuffle. Your usual daily cap applies.`,
        button(
          "Accept this little challenge",
          async () => {
            try {
              await startDeck(
                deck,
                level as "easy" | "medium" | "hard",
                "practice",
                seed,
              );
            } catch (e) {
              toast(e instanceof Error ? e.message : "Please try again.");
            }
          },
          "button primary",
        ),
      );
    } else
      page = empty(
        "cat",
        "A little detour.",
        "That page isn’t on our science island. Let’s find your next discovery.",
        button("Back to my lab", () => go("/"), "button primary"),
      );
  } catch (e) {
    page = empty(
      "cat",
      "Let’s try that discovery again.",
      e instanceof Error
        ? e.message
        : "A saved card could not be loaded. Your progress is safe.",
      button("Back to my lab", () => go("/"), "button primary"),
    );
  }
  if (id !== renderId) return;
  if (currentUser()?.id !== user.id) {
    schedule();
    return;
  }
  app.replaceChildren(shell(page, path));
  if (passwordRecoveryActive()) passwordRecoveryModal();
  if (identityChanged)
    app.querySelector<HTMLElement>("#main")?.focus({ preventScroll: true });
  document.title = `${path === "/" ? "My little lab" : path.startsWith("/play") ? "A little discovery" : path === "/admin" ? "SSC mission control" : path.split("/").pop()?.replaceAll("-", " ")} · ${APP_NAME}`;
}
function schedule() {
  if (!initialized || scheduled) return;
  scheduled = true;
  setTimeout(() => {
    scheduled = false;
    void render();
  }, 0);
}
connectRenderer(schedule);
window.addEventListener("hashchange", () => {
  resetNavigation();
  window.scrollTo({ top: 0 });
  schedule();
});
window.addEventListener("pageshow", schedule);
window.addEventListener("csl:password-recovery", schedule);
window.addEventListener("focus", schedule);
document.addEventListener("visibilitychange", schedule);
window.addEventListener("csl:quota", () =>
  toast(
    "Your little lab is out of storage. Export a backup before clearing old browser data.",
    {
      text: "Export backup",
      run: () => download("cozy-science-backup.json", exportBackup()),
    },
  ),
);
window.addEventListener("csl:recovery", (e) =>
  toast(String((e as CustomEvent).detail), {
    text: "Export backup",
    run: () => download("cozy-science-backup.json", exportBackup()),
  }),
);
window.addEventListener("csl:cloud-status", updateCloudNotices);
window.addEventListener("csl:appearance", (event) => {
  const value = (event as CustomEvent).detail;
  if (value.id === currentUser()?.id)
    document.documentElement.dataset.theme = value.theme;
});
window.addEventListener("csl:teacher-refresh-needed", () =>
  toast(
    "Your edit was saved. Refresh the view if classroom totals need updating.",
  ),
);
let closingBlockedAccount = false;
window.addEventListener("csl:account-blocked", (event) => {
  if (closingBlockedAccount || !currentUser() || currentUser()?.id === "guest")
    return;
  closingBlockedAccount = true;
  void logout()
    .catch(() => undefined)
    .then(() => {
      go("/welcome");
      toast(
        String(
          (event as CustomEvent).detail ||
            "Your classroom access is banned. Contact your teacher.",
        ),
      );
    })
    .finally(() => {
      closingBlockedAccount = false;
    });
});
window.addEventListener("csl:platform", () => {
  document
    .querySelectorAll<HTMLElement>("[data-class-credit]")
    .forEach((node) => {
      node.textContent = classCredits().toLocaleString();
    });
});
window.addEventListener("offline", () => {
  updateConnectionNotices();
  toast("You’re offline. Keep exploring your saved science decks.");
});
window.addEventListener("online", () => {
  updateConnectionNotices();
  toast("Back online. A whole island of science is ready.");
});
try {
  await initStore();
  initialized = true;
  subscribe(schedule);
  await render();
  if (
    new URLSearchParams(location.search).get("flow") === "recovery" &&
    !passwordRecoveryActive()
  )
    authModal(false, true);
  setInterval(() => {
    if (renderedUserId !== currentUser()?.id) schedule();
  }, 1000);
  if (import.meta.env.PROD && "serviceWorker" in navigator)
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, {
        scope: import.meta.env.BASE_URL,
      })
      .catch(() =>
        toast(
          "Offline caching isn’t available in this browser. You can still use the lab online.",
        ),
      );
  // A route-independent reminder makes an interrupted eight-card session easy to resume.
  const run = getState().runs.find(
    (r) => r.userId === currentUser()?.id && !r.completed,
  );
  if (run && !location.hash.includes("/play/"))
    toast("Your last little discovery is saved.", {
      text: "Keep exploring",
      run: () => go(`/play/${run.id}`),
    });
} catch (e) {
  app.replaceChildren(
    h(
      "div",
      { class: "loading-screen" },
      brandLink("#/welcome"),
      h("h1", null, "Your lab needs a little space."),
      h(
        "p",
        null,
        e instanceof Error ? e.message : "Browser storage could not be opened.",
      ),
      button(
        "Storage help",
        () =>
          modal("Make a little room for science", [
            h(
              "p",
              null,
              "This local demo needs browser storage and Web Crypto. Allow site data and use an up-to-date browser on localhost or HTTPS. Reload after changing your browser settings.",
            ),
          ]),
        "button primary",
      ),
    ),
  );
}
