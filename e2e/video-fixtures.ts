import type { BrowserContext, Page } from "@playwright/test";

// Explicit external-media fixtures: no live YouTube code or copied thumbnails.
export async function fixtureVideoMedia(target: BrowserContext | Page) {
  await target.route("https://i.ytimg.com/vi/**/mqdefault.jpg", (route) => {
    const id = new URL(route.request().url()).pathname.split("/")[2];
    if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return route.abort();
    return route.fulfill({
      contentType: "image/svg+xml",
      body: `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="320" height="180" fill="#354953"/><circle cx="250" cy="45" r="70" fill="#456879"/><text x="18" y="130" fill="white" font-size="16">Thumbnail fixture: ${id}</text></svg>`,
    });
  });
  await target.route("https://www.youtube-nocookie.com/embed/**", (route) => {
    const id = new URL(route.request().url()).pathname.split("/")[2];
    if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return route.abort();
    return route.fulfill({
      contentType: "text/html",
      body: "<!doctype html><html lang='en'><meta charset='utf-8'><title>External video fixture</title><body><h1>External video fixture</h1><p>Site integration fixture. Live YouTube playback is not tested.</p></body></html>",
    });
  });
}
