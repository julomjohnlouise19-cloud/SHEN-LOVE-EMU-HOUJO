import { guestSession } from "../store";
import { button, h } from "./dom";
import { authModal } from "./auth";
import { entryDestination, go } from "./actions";
import { heroIllustration, icon, mascot } from "./svg";

export function welcomeHub() {
  const notice = new URLSearchParams(location.hash.split("?")[1]).get("notice");
  return h(
    "div",
    { class: "welcome-hub" },
    h(
      "header",
      { class: "welcome-header" },
      h(
        "a",
        {
          class: "brand",
          href: "#/welcome",
          "aria-label": "Cozy Science Lab welcome hub",
        },
        h("span", { class: "brand-icon" }, icon("flask", 31)),
        h(
          "span",
          null,
          "cozy science",
          h("strong", null, "lab", h("span", { class: "brand-star" }, "✳")),
        ),
      ),
      h("span", { class: "welcome-tagline" }, "A HAPPY PLACE TO GET CURIOUS"),
    ),
    h(
      "main",
      { id: "main", class: "welcome-main", tabIndex: -1 },
      notice === "logged-out" || notice === "storage"
        ? h(
            "p",
            { class: "welcome-notice", role: "status" },
            icon("check", 18),
            notice === "storage"
              ? "You’re logged out of this tab. Browser storage couldn’t be updated."
              : "You’re logged out. Your discoveries are saved in this browser.",
          )
        : null,
      h(
        "section",
        { class: "welcome-hero", "aria-labelledby": "welcome-title" },
        h(
          "div",
          { class: "welcome-copy" },
          h("p", { class: "eyebrow" }, "WELCOME TO YOUR SCIENCE ADVENTURE"),
          h("h1", { id: "welcome-title" }, "A little curiosity starts here."),
          h(
            "p",
            { class: "welcome-description" },
            "Big questions. Small discoveries. A cozy place to explore science, grow your knowledge, and find your next a-ha moment.",
          ),
          h(
            "div",
            { class: "welcome-actions" },
            button("Sign in", () => authModal(), "button primary"),
            button("Create account", () => authModal(true), "button outline"),
          ),
          button(
            h("span", null, "Explore as guest", icon("arrow", 17)),
            async () => {
              await guestSession();
              go(entryDestination());
            },
            "text-button welcome-guest",
          ),
          h(
            "p",
            { class: "welcome-storage" },
            icon("lock", 14),
            "Profiles and progress stay in this browser.",
          ),
        ),
        h("div", { class: "welcome-art" }, heroIllustration()),
      ),
      h(
        "section",
        { class: "welcome-features", "aria-label": "What you can discover" },
        ...[
          [
            "sprout",
            "Follow your curiosity",
            "Explore life, chemistry, physics, Earth and space.",
          ],
          [
            "flask",
            "Learn a little, every day",
            "Try science cards, experiments and tiny challenges.",
          ],
          [
            "cat",
            "Grow at your own pace",
            "Save discoveries, revisit tricky ideas and celebrate progress.",
          ],
        ].map(([art, title, text]) =>
          h(
            "article",
            null,
            mascot(art),
            h("h2", null, title),
            h("p", null, text),
          ),
        ),
      ),
    ),
    h(
      "footer",
      { class: "welcome-footer" },
      icon("heart", 14),
      "Made for curious minds. Science only. Wonder always.",
    ),
  );
}
