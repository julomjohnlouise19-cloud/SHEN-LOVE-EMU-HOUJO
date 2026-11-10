export const themes = [
  {
    id: "meadow",
    name: "Meadow",
    description: "Mint leaves, warm paper and a sunny afternoon.",
    colors: ["#d5eee0", "#f7d77c", "#efc5b7"],
  },
  {
    id: "aurora",
    name: "Aurora",
    description: "Lavender skies, blue discoveries and a little sparkle.",
    colors: ["#dcd3f7", "#bddfea", "#ebc7dc"],
  },
  {
    id: "sunset",
    name: "Sunset",
    description: "Peach clouds, rosy details and golden-hour energy.",
    colors: ["#f3c6b6", "#efc5d5", "#f4dda0"],
  },
] as const;
export type ThemeId = (typeof themes)[number]["id"];
export interface Appearance {
  theme: ThemeId;
  bio: string;
}
export const defaultAppearance: Appearance = { theme: "meadow", bio: "" };
export function isAppearance(v: unknown): v is Appearance {
  const value = v as Appearance | null;
  return (
    !!value &&
    themes.some((t) => t.id === value.theme) &&
    typeof value.bio === "string" &&
    value.bio.length <= 160
  );
}
