import { toast } from "./dom";
let renderer: () => void = () => undefined;
export function connectRenderer(fn: () => void) {
  renderer = fn;
}
export const refresh = () => renderer();
export function go(path: string) {
  if (location.hash === `#${path}`) refresh();
  else location.hash = path;
}
export function welcomeRoute(next = "/", notice = "") {
  const params = new URLSearchParams();
  if (next !== "/") params.set("next", next);
  if (notice) params.set("notice", notice);
  return `/welcome${params.size ? `?${params}` : ""}`;
}
export function entryDestination(fallback = "/") {
  const [path, query] = location.hash.slice(1).split("?");
  const next =
    path === "/welcome" ? new URLSearchParams(query).get("next") : null;
  return next &&
    next.startsWith("/") &&
    !next.startsWith("//") &&
    next.split("?")[0] !== "/welcome"
    ? next
    : fallback;
}
export function act(fn: () => Promise<unknown>) {
  return async () => {
    try {
      await fn();
    } catch (e) {
      toast(
        e instanceof Error
          ? e.message
          : "Something went wrong. Please try again.",
      );
    }
  };
}
