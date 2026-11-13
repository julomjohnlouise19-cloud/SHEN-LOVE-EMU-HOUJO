import { ABOUT_INTRO, researchers } from "../data/researchers";
import { h, button, modal } from "./dom";
import { icon, mascot } from "./svg";

export function aboutUsModal(returnFocus?: HTMLElement) {
  if (document.querySelector("dialog.about-dialog[open]")) return;
  const root = `${import.meta.env.BASE_URL}researchers/`;
  const bios: HTMLDetailsElement[] = [];
  const readAll = button(
    h("span", null, icon("notebook", 17), "Read all bios"),
    () => {
      const open = !bios.every((bio) => bio.open);
      bios.forEach((bio) => (bio.open = open));
      syncReadAll();
    },
    "about-read-all",
    { "aria-pressed": false },
  );
  function syncReadAll() {
    const open = bios.every((bio) => bio.open);
    readAll.setAttribute("aria-pressed", String(open));
    readAll.replaceChildren(
      icon("notebook", 17),
      open ? "Close all bios" : "Read all bios",
    );
  }
  const grid = h(
    "section",
    { class: "researcher-grid", "aria-label": "Our seven researchers" },
    ...researchers.map((person, index) => {
      const bio = h(
        "details",
        { class: "researcher-bio" },
        h(
          "summary",
          null,
          `Get to know ${person.firstName}`,
          icon("chevron", 16),
        ),
        h("p", null, person.bio),
      );
      bio.addEventListener("toggle", syncReadAll);
      bios.push(bio);
      return h(
        "article",
        {
          class: `researcher-card researcher-color-${index % 3}`,
          "aria-labelledby": `researcher-${person.id}`,
        },
        h(
          "div",
          { class: "researcher-card-top" },
          h(
            "span",
            { class: "researcher-number", "aria-hidden": true },
            `0${index + 1}`,
          ),
          h(
            "div",
            { class: "researcher-portrait" },
            h("img", {
              src: `${root}${person.id}.jpg`,
              alt: `Portrait of ${person.name}`,
              class: "researcher-photo",
              width: 240,
              height: 240,
              loading: "lazy",
              decoding: "async",
              style: { objectPosition: person.photoPosition },
            }),
            h("img", {
              src: `${root}moon-garden-frame.svg`,
              alt: "",
              "aria-hidden": true,
              class: "researcher-portrait-frame",
              width: 240,
              height: 240,
            }),
          ),
          h("p", { class: "researcher-role" }, "GRADE 10 · SSC RESEARCHER"),
          h("h3", { id: `researcher-${person.id}` }, person.name),
          h("p", { class: "researcher-note" }, person.note),
        ),
        h(
          "div",
          { class: "researcher-card-body" },
          bio,
          h("h4", null, icon("heart", 15), "Little things I love"),
          h(
            "ul",
            {
              class: "researcher-hobbies",
              "aria-label": `${person.firstName}'s hobbies`,
            },
            ...person.hobbies.map((hobby) => h("li", null, hobby)),
          ),
        ),
      );
    }),
  );
  const { dialog, close } = modal(
    "About us",
    [
      h(
        "section",
        {
          class: "about-introduction",
          "aria-label": "Meet the people behind the lab",
        },
        h(
          "div",
          { class: "about-intro-badges" },
          h(
            "span",
            null,
            icon("sprout", 16),
            "STUDENT MINDS. SHARED CURIOSITY.",
          ),
          h("span", null, "7 researchers · 1 team"),
        ),
        h("p", { class: "about-intro-copy" }, ABOUT_INTRO),
        h(
          "div",
          { class: "about-intro-art", "aria-hidden": true },
          mascot("flask"),
          icon("sparkles", 28),
        ),
      ),
      h(
        "div",
        { class: "about-team-toolbar" },
        h(
          "div",
          null,
          h("h3", null, "Seven minds. One shared discovery."),
          h(
            "p",
            null,
            "A familiar face, a favorite hobby, a little story to share.",
          ),
        ),
        readAll,
      ),
      grid,
      h(
        "div",
        { class: "about-signoff" },
        h(
          "p",
          null,
          icon("heart", 18),
          "Made with curiosity, care and a little team spirit.",
        ),
        button("Back to the website", () => close(), "button outline"),
      ),
    ],
    true,
    returnFocus,
  );
  dialog.classList.add("about-dialog");
}
