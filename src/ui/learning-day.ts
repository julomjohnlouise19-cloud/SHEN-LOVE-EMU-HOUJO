import { currentUser, getState, clock } from "../store";
import { dayKey } from "../core/time";

const mounted = new Set<{
  node: HTMLElement;
  owner: string;
  day: string;
  refresh: () => void;
}>();
export const learningToday = () => dayKey(clock, getState().rules.timezone);
export function watchLearningDay(node: HTMLElement, refresh: () => void) {
  const owner = currentUser()?.id;
  if (!owner) return;
  requestAnimationFrame(() => {
    if (node.isConnected && currentUser()?.id === owner)
      mounted.add({ node, owner, day: learningToday(), refresh });
  });
}
function refreshDays() {
  const today = learningToday();
  for (const item of mounted)
    if (!item.node.isConnected || item.owner !== currentUser()?.id)
      mounted.delete(item);
    else if (item.day !== today) {
      item.day = today;
      item.refresh();
    }
}
window.addEventListener("csl:daily-tick", refreshDays);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) refreshDays();
});
