export const APP_NAME = "The Cozy Science Lab";
export const SCHOOL_LOGO_URL = `${import.meta.env.BASE_URL}school-seal.webp`;
export const SCHOOL_LOGO_ALT = "Gun-ob High School seal, Lapu-Lapu City";

export function schoolLogo() {
  const image = document.createElement("img");
  image.src = SCHOOL_LOGO_URL;
  image.alt = SCHOOL_LOGO_ALT;
  image.className = "school-logo";
  image.width = 64;
  image.height = 64;
  image.decoding = "async";
  return image;
}

export function brandLink(href = "#/", compact = false) {
  const link = document.createElement("a");
  link.href = href;
  link.className = `brand school-brand${compact ? " compact-brand" : ""}`;
  link.setAttribute(
    "aria-label",
    `${APP_NAME} ${href.includes("welcome") ? "welcome hub" : "home"}`,
  );
  const copy = document.createElement("span");
  copy.className = "brand-copy";
  const prefix = document.createElement("small");
  prefix.className = "brand-prefix";
  prefix.textContent = "The";
  const title = document.createElement("strong");
  title.className = "brand-title";
  title.textContent = "Cozy Science Lab";
  copy.append(prefix, title);
  link.append(schoolLogo(), copy);
  return link;
}
