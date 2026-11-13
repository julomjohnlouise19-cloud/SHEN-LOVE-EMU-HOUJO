import type { User } from "../core/types";
import type { ThemeId } from "../core/appearance";
import { h } from "./dom";
import { icon } from "./svg";

export function profileIdentity(
  user: Pick<User, "id" | "name" | "role" | "grade" | "section">,
  theme: ThemeId,
) {
  return {
    name: user.name,
    role:
      user.role === "admin"
        ? "Class teacher"
        : user.id === "guest"
          ? "Guest explorer"
          : "Student scientist",
    teacher: user.role === "admin",
    detail: `Grade ${user.grade}${user.section ? ` · ${user.section}` : ""}`,
    theme,
  };
}

// One composition for the saved profile, live editor and final review.
export function profileHero(
  identity: ReturnType<typeof profileIdentity>,
  portrait: HTMLElement,
) {
  return h(
    "section",
    {
      class: "scientist-card profile-composition",
      "data-profile-theme": identity.theme,
    },
    h("div", { class: "profile-cover", "aria-hidden": true }),
    h(
      "div",
      { class: "profile-identity-layout" },
      h(
        "div",
        { class: "scientist-card-avatar", "aria-hidden": true },
        portrait,
      ),
      h(
        "div",
        { class: "scientist-card-copy" },
        h("p", { class: "eyebrow" }, "YOUR CURIOUS CORNER"),
        h("h3", null, identity.name),
        h(
          "span",
          { class: "profile-role" },
          icon(identity.teacher ? "settings" : "sprout", 14),
          identity.role,
        ),
        h("p", { class: "profile-class-detail" }, identity.detail),
      ),
    ),
  );
}
