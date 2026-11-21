import {
  scienceVideos,
  videoCategories,
  findScienceVideos,
  originalVideoUrl,
  videoPlayerUrl,
  videoThumbnailUrl,
  type ScienceVideo,
} from "../data/science-videos";
import { deckById } from "../data/catalog";
import { referencesFor } from "../data/references";
import { h, button, input, field, modal } from "./dom";
import { icon } from "./svg";
import { studyGuideModal } from "./study-library";

function videoCover(video: ScienceVideo, categoryIcon: string) {
  const caption = h(
    "span",
    { class: "video-poster-caption" },
    navigator.onLine ? "Loading video cover…" : "Connect to load cover",
  );
  const cover = h(
    "button",
    {
      class: "study-video-poster",
      type: "button",
      "aria-label": "Play " + video.title + " video",
      "data-thumbnail-state": navigator.onLine ? "loading" : "unavailable",
      onClick: (event: MouseEvent) =>
        watchVideo(video, event.currentTarget as HTMLElement),
    },
    h(
      "span",
      { class: "video-cover-fallback", "aria-hidden": true },
      icon(categoryIcon, 38),
      caption,
    ),
    h(
      "span",
      { class: "video-play-mark", "aria-hidden": true },
      h("i", { class: "video-play-triangle" }),
    ),
  );
  if (navigator.onLine) {
    const unavailable = () => {
      image.remove();
      cover.dataset.thumbnailState = "unavailable";
      caption.textContent = "Preview unavailable · tap to watch";
    };
    const image = h("img", {
      class: "study-video-thumbnail",
      src: videoThumbnailUrl(video.id),
      alt: "",
      width: 320,
      height: 180,
      loading: "lazy",
      decoding: "async",
      referrerpolicy: "no-referrer",
      onLoad: () => {
        // YouTube may return a small generic placeholder for an unavailable cover.
        if (image.naturalWidth <= 120) unavailable();
        else cover.dataset.thumbnailState = "ready";
      },
      onError: unavailable,
    });
    cover.prepend(image);
  }
  return cover;
}

function youtubeLink(video: ScienceVideo, label = "Open on YouTube") {
  return h(
    "a",
    {
      href: originalVideoUrl(video.id),
      target: "_blank",
      rel: "noopener noreferrer",
      class: "button outline",
      "aria-label": label + " · " + video.title,
    },
    label,
    label === "Original video" ? null : icon("arrow", 15),
  );
}
function watchVideo(video: ScienceVideo, trigger: HTMLElement) {
  const category = videoCategories.find(
    (value) => value.id === video.category,
  )!;
  const player = h("div", { class: "study-video-player" });
  function loadPlayer() {
    if (!navigator.onLine) {
      player.replaceChildren(
        h(
          "div",
          { class: "video-connection" },
          icon("notebook", 36),
          h("h3", null, "Keep a little curiosity offline"),
          h(
            "p",
            null,
            "The notes are here to read. Connect to the internet to watch this video.",
          ),
          button("Try loading the video", loadPlayer, "button primary"),
        ),
      );
      return;
    }
    player.replaceChildren(
      h("iframe", {
        src: videoPlayerUrl(video.id),
        title: video.title + " · YouTube video",
        width: 960,
        height: 540,
        loading: "eager",
        referrerpolicy: "strict-origin-when-cross-origin",
        allow: "encrypted-media; picture-in-picture; fullscreen",
        allowfullscreen: true,
      }),
    );
  }
  function pauseForNotes() {
    player.replaceChildren(
      h(
        "div",
        { class: "video-connection" },
        icon(category.icon, 38),
        h("h3", null, "A little pause for your notes"),
        button("Load the video again", loadPlayer, "button primary"),
      ),
    );
    studyGuideModal(video.deckId);
  }
  const reference = referencesFor(video.deckId)[0];
  const { dialog, close } = modal(
    video.title,
    [
      h(
        "p",
        { class: "study-video-label" },
        icon(category.icon, 16),
        category.name,
      ),
      player,
      h(
        "p",
        { class: "video-fallback" },
        "Player unavailable? ",
        youtubeLink(video),
      ),
      h(
        "section",
        { class: "video-learning-note" },
        h("p", { class: "eyebrow" }, "WATCH. WONDER. CONNECT."),
        h("h3", null, "An idea to look for"),
        h("p", null, video.focus),
        h(
          "p",
          null,
          "After watching, explain one idea in your own words and check it against the study notes.",
        ),
        button(
          "Read " + deckById(video.deckId)!.name + " study notes",
          pauseForNotes,
          "button primary",
        ),
        h("h3", null, "A supporting source"),
        h(
          "a",
          {
            href: reference.url,
            target: "_blank",
            rel: "noopener noreferrer",
            class: "study-source-link",
          },
          reference.publisher + " · " + reference.title,
        ),
        h(
          "p",
          { class: "video-source-note" },
          "This publication supports the related notes. The YouTube video belongs to its creator; it is a separate resource.",
        ),
      ),
    ],
    true,
    trigger,
  );
  dialog.classList.add("study-video-dialog");
  loadPlayer();
  const offline = () => loadPlayer();
  window.addEventListener("offline", offline);
  window.addEventListener("hashchange", close);
  dialog.addEventListener("cancel", () => player.replaceChildren());
  dialog.addEventListener(
    "close",
    () => {
      player.replaceChildren();
      window.removeEventListener("offline", offline);
      window.removeEventListener("hashchange", close);
      requestAnimationFrame(() => {
        if (trigger.isConnected && !document.querySelector("dialog[open]"))
          trigger.focus({ preventScroll: true });
      });
    },
    { once: true },
  );
}
export function videosShelf() {
  const root = h("section", {
    class: "study-videos",
    "aria-label": "Science video collection",
  });
  const search = input(
    "video-search",
    "Try DNA, gravity or space",
    "",
    "search",
  );
  search.required = false;
  const category = h(
    "select",
    null,
    h("option", { value: "" }, "Every science corner"),
    ...videoCategories.map((value) =>
      h("option", { value: value.id }, value.name),
    ),
  );
  const list = h("div", { class: "study-video-grid" });
  const count = h("p", {
    class: "study-video-count",
    role: "status",
    tabindex: -1,
  });
  let pageIndex = 0;
  const pageSize = 6;
  const clear = button(
    "Clear video filters",
    () => {
      search.value = "";
      category.value = "";
      pageIndex = 0;
      render();
      search.focus();
    },
    "button outline",
  );
  const chips = h("div", {
    class: "video-category-chips",
    role: "group",
    "aria-label": "Video categories",
  });
  function movePage(amount: number) {
    pageIndex += amount;
    render();
    count.focus({ preventScroll: true });
    count.scrollIntoView({ behavior: "auto", block: "start" });
  }
  const previous = button(
    "Previous videos",
    () => movePage(-1),
    "button outline",
  );
  const next = button("Next videos", () => movePage(1), "button outline");
  const pageCount = h("span", { class: "video-page-count" });
  const pagination = h(
    "nav",
    { class: "video-pagination", "aria-label": "Video pages" },
    previous,
    pageCount,
    next,
  );
  function render() {
    const shown = findScienceVideos(search.value, category.value);
    const pages = Math.ceil(shown.length / pageSize);
    pageIndex = Math.max(0, Math.min(pageIndex, pages - 1));
    previous.disabled = pageIndex === 0;
    next.disabled = pageIndex >= pages - 1;
    pagination.hidden = pages <= 1;
    pageCount.textContent = "Page " + (pageIndex + 1) + " of " + pages;
    count.textContent =
      shown.length +
      " of " +
      scienceVideos.length +
      " videos" +
      (shown.length
        ? " · Showing " +
          (pageIndex * pageSize + 1) +
          "–" +
          Math.min(shown.length, (pageIndex + 1) * pageSize)
        : "");
    clear.disabled = !search.value && !category.value;
    chips
      .querySelectorAll<HTMLElement>("[data-video-category]")
      .forEach((node) =>
        node.setAttribute(
          "aria-pressed",
          String(node.dataset.videoCategory === category.value),
        ),
      );
    list.replaceChildren(
      ...shown
        .slice(pageIndex * pageSize, (pageIndex + 1) * pageSize)
        .map((video) => {
          const kind = videoCategories.find(
            (value) => value.id === video.category,
          )!;
          const watch = button(
            "Watch here",
            () => watchVideo(video, watch),
            "button primary",
            {
              "aria-label": "Watch " + video.title,
              "data-watch-video": video.id,
            },
          );
          return h(
            "article",
            {
              class: "study-video-card video-" + video.category,
              "data-science-video": video.id,
            },
            videoCover(video, kind.icon),
            h(
              "div",
              { class: "study-video-copy" },
              h(
                "p",
                { class: "study-video-label" },
                icon(kind.icon, 15),
                kind.name,
              ),
              h("h3", null, video.title),
              h("p", null, video.focus),
              h(
                "div",
                { class: "study-video-actions" },
                watch,
                youtubeLink(video, "Original video"),
              ),
              button(
                "Related study notes",
                () => studyGuideModal(video.deckId),
                "text-button",
                { "aria-label": "Study notes for " + video.title },
              ),
            ),
          );
        }),
    );
    if (!shown.length)
      list.append(
        h(
          "div",
          { class: "reading-empty" },
          icon("sprout", 34),
          h("h3", null, "A different search might bloom"),
          h(
            "p",
            null,
            "Try a shorter topic or clear the filters to bring every video back.",
          ),
        ),
      );
  }
  chips.append(
    ...[
      { id: "", name: "All videos", icon: "sparkles" },
      ...videoCategories,
    ].map((value) =>
      button(
        h("span", null, icon(value.icon, 16), value.name),
        () => {
          category.value = value.id;
          pageIndex = 0;
          render();
        },
        "button outline",
        { "data-video-category": value.id, "aria-pressed": value.id === "" },
      ),
    ),
  );
  const filter = () => {
    pageIndex = 0;
    render();
  };
  search.addEventListener("input", filter);
  search.addEventListener("search", filter);
  category.addEventListener("change", filter);
  root.append(
    h(
      "div",
      { class: "study-video-intro" },
      h(
        "div",
        null,
        h("p", { class: "eyebrow" }, "YOUR CURIOUS LITTLE CINEMA"),
        h("h2", { tabindex: -1 }, "Press play on a new idea"),
        h(
          "p",
          null,
          "Pick a science corner, watch a video, then connect what you noticed with the notes and sources.",
        ),
      ),
      h(
        "span",
        { class: "video-collection-stamp" },
        icon("star", 23),
        "23 videos",
        h("small", null, "5 science corners"),
      ),
    ),
    chips,
    h(
      "div",
      { class: "video-search-tools" },
      field("Search science videos", search),
      field("Filter videos by category", category),
      clear,
    ),
    count,
    list,
    pagination,
    h(
      "details",
      { class: "video-collection-about" },
      h("summary", null, "About this video collection"),
      h(
        "p",
        null,
        "The links and topic labels came from the researchers’ video list. The creator’s own title and channel appear on YouTube. Learning prompts are written for the lab; they are not video transcripts.",
      ),
      h(
        "p",
        null,
        "Covers load from YouTube for the exact linked videos. Only a video you choose loads a player. Videos need internet and may include YouTube advertising or recommendations. If embedding is unavailable, use Original video or Open on YouTube.",
      ),
      h(
        "p",
        null,
        "Search looks through these 23 links. Cached notes, sources and handbooks remain available offline; YouTube videos are not downloaded.",
      ),
    ),
  );
  render();
  return root;
}
