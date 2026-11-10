import { branches, decks } from "../data/catalog";
import { getState } from "../store";
import { h } from "./dom";
import { icon } from "./svg";
const titles: Record<string, string> = {
  "/": "My lab",
  "/island": "Science Island",
  "/arcade": "Science Arcade",
  "/review": "Review Box",
  "/notebook": "My notebook",
  "/shop": "Supply shop",
  "/spin": "Daily spin",
  "/quests": "Quests",
  "/leaderboard": "Leaderboard",
  "/records": "Saved records",
  "/experiment": "Science lab",
  "/teacher": "Teacher studio",
  "/admin": "Teacher studio",
  "/teacher/students": "Scientists",
  "/teacher/reports": "Class reports",
  "/teacher/games": "Arcade reports",
  "/teacher/health": "Record care",
  "/teacher/shop": "Stock & pricing",
  "/teacher/claims": "Claims desk",
  "/teacher/content": "Science cards",
  "/teacher/settings": "Lab settings",
  "/teacher/activity": "Activity history",
};
export function pageNavigation(route: string) {
  let label = titles[route] ?? "Discovery",
    parent = "/",
    parentLabel = "my lab";
  const crumbs: [string, string][] = [["/", "My lab"]];
  if (route.startsWith("/branch/")) {
    label =
      branches.find((b) => b.id === route.split("/")[2])?.name ??
      "Science branch";
    parent = "/island";
    parentLabel = "Science Island";
    crumbs.push([parent, parentLabel]);
  } else if (route.startsWith("/play/")) {
    const run = getState().runs.find((r) => r.id === route.split("/")[2]);
    const deck = decks.find((d) => d.id === run?.deckId);
    parent = deck ? `/branch/${deck.branch}` : "/island";
    parentLabel = deck
      ? (branches.find((b) => b.id === deck.branch)?.name ?? "science branch")
      : "Science Island";
    label = deck?.name ?? "Learning session";
    crumbs.push(["/island", "Science Island"], [parent, parentLabel]);
  } else if (route.startsWith("/teacher/")) {
    parent = "/teacher";
    parentLabel = "Teacher Studio";
    crumbs.push([parent, parentLabel]);
  }
  const nav = h("nav", {
    class: "page-navigation",
    "aria-label": "Page location",
  });
  if (route !== "/")
    nav.append(
      h(
        "a",
        {
          href: `#${parent}`,
          class: "return-link",
          "aria-label": `Back to ${parentLabel}`,
        },
        h(
          "span",
          { class: "return-arrow", "aria-hidden": true },
          icon("arrow", 16),
        ),
        `Back to ${parentLabel}`,
      ),
    );
  nav.append(
    h(
      "ol",
      { class: "breadcrumbs" },
      ...crumbs
        .filter(([path]) => path !== route)
        .map(([path, text]) =>
          h(
            "li",
            null,
            h("a", { href: `#${path}`, "aria-label": `Go to ${text}` }, text),
            h("span", { "aria-hidden": true }, "/"),
          ),
        ),
      h("li", { "aria-current": "page" }, label),
    ),
  );
  return nav;
}
