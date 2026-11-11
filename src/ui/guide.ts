import { currentUser } from "../store";
import { hasSeenGuide, finishGuide } from "../store/guide";
import { h, button, modal, progress } from "./dom";
import { mascot } from "./svg";
import { go } from "./actions";
function guide(done: () => void) {
  const user = currentUser()!;
  const steps =
    user.role === "admin"
      ? [
          [
            "Know your classroom",
            "Review class activity and saved quiz evidence. Filters help you focus on a grade, section or topic.",
            "/teacher",
            "Open Teacher studio",
          ],
          [
            "Make the shelf yours",
            "Set stock, price and visibility, then press Save changes. A checked box is a choice; saving applies it for the class.",
            "/teacher/shop",
            "Manage the shelf",
          ],
          [
            "Listen to your scientists",
            "Read private suggestions, mark progress and reply so the student knows what happened.",
            "/teacher/suggestions",
            "Open the suggestion inbox",
          ],
          [
            "Teach with evidence",
            "Review science cards, check their references and save reviewed edits. Earlier quiz evidence stays preserved.",
            "/teacher/content",
            "Review science cards",
          ],
        ]
      : [
          [
            "Follow your curiosity",
            "Choose a branch, a deck and a comfortable difficulty. Each discovery has eight science cards.",
            "/island",
            "Explore Science Island",
          ],
          [
            "Think, answer, understand",
            "Use a hint when you need one. Check your answer, read the explanation and open the sources to follow the science.",
            "/sources",
            "Visit the reading room",
          ],
          [
            "Keep a little progress",
            "Revisit tricky ideas in your Review Box, save a notebook thought and enjoy one free Daily spin. Practice merits and class credits have separate uses.",
            "/review",
            "Open Review Box",
          ],
          [
            "Your voice belongs here",
            "Send a suggestion or report a confusing card. Your teachers can read it and reply privately. The large Back button always names your destination.",
            "/suggestions",
            "Open the suggestion box",
          ],
        ];
  let index = 0;
  const panel = h("section", {
    class: "welcome-guide",
    "aria-label": "How to use your lab",
  });
  const finish = async () => {
    await finishGuide(user.id, user.role);
    done();
  };
  const render = () => {
    const hadFocus = panel.contains(document.activeElement);
    const step = steps[index];
    panel.replaceChildren(
      mascot(user.role === "admin" ? "flask" : "cat"),
      h(
        "div",
        { class: "guide-copy" },
        h(
          "p",
          { class: "eyebrow" },
          `${user.role === "admin" ? "YOUR TEACHER FIELD GUIDE" : "WELCOME TO YOUR LITTLE LAB"} · ${index + 1} OF ${steps.length}`,
        ),
        h("h2", { tabindex: -1 }, step[0]),
        h("p", { class: "guide-description", role: "status" }, step[1]),
        progress(((index + 1) / steps.length) * 100, "Guide progress"),
        h(
          "div",
          { class: "guide-actions" },
          button(
            "Previous step",
            () => {
              index--;
              render();
            },
            "button outline",
            { disabled: index === 0 },
          ),
          button(
            index === steps.length - 1 ? "Ready to explore" : "Next step",
            async () => {
              if (index === steps.length - 1) await finish();
              else {
                index++;
                render();
              }
            },
            "button primary",
          ),
          button(
            step[3],
            async () => {
              await finish();
              go(step[2]);
            },
            "text-button",
          ),
          button("Hide guide for now", finish, "text-button"),
        ),
      ),
    );
    if (hadFocus)
      panel.querySelector<HTMLElement>("h2")?.focus({ preventScroll: true });
  };
  render();
  return panel;
}
export function guideModal() {
  if (!currentUser()) return;
  const { dialog, close } = modal(
    "Your guide to The Cozy Science Lab",
    [],
    true,
  );
  dialog.append(guide(close));
}
export async function attachGuide(host: HTMLElement) {
  const user = currentUser();
  if (!user || user.id === "guest" || (await hasSeenGuide(user.id, user.role)))
    return;
  if (host.isConnected && currentUser()?.id === user.id)
    host.append(guide(() => host.replaceChildren()));
}
