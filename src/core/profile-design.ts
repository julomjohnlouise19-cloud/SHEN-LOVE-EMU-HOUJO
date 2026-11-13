import { borderById } from "../data/profile-borders";

export interface ProfileDesign {
  version: 1;
  border: string;
  banner_path: string | null;
  x: number;
  y: number;
  share_banner: boolean;
}
export const defaultProfileDesign = (): ProfileDesign => ({
  version: 1,
  border: "",
  banner_path: null,
  x: 50,
  y: 50,
  share_banner: false,
});
export function ownedBanner(path: unknown, id: string): path is string {
  return (
    typeof path === "string" &&
    path.startsWith(`${id}/`) &&
    /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.webp$/.test(path)
  );
}
const position = (value: unknown) =>
  typeof value === "number" &&
  Number.isInteger(value) &&
  value >= 0 &&
  value <= 100;
export function readProfileDesign(input: unknown, id: string): ProfileDesign {
  const v = input as Partial<ProfileDesign> | null;
  if (!v || v.version !== 1) return defaultProfileDesign();
  return {
    version: 1,
    border:
      typeof v.border === "string" && borderById(v.border) ? v.border : "",
    banner_path: ownedBanner(v.banner_path, id) ? v.banner_path : null,
    x: position(v.x) ? v.x! : 50,
    y: position(v.y) ? v.y! : 50,
    share_banner: v.share_banner === true,
  };
}
export function validateProfileDesign(v: ProfileDesign, id: string) {
  if (
    v.version !== 1 ||
    (v.border !== "" && !borderById(v.border)) ||
    (v.banner_path !== null && !ownedBanner(v.banner_path, id)) ||
    !position(v.x) ||
    !position(v.y) ||
    typeof v.share_banner !== "boolean"
  )
    throw new Error("Choose a border and a banner position between 0 and 100.");
}
export const isBannerData = (v: unknown): v is string =>
  typeof v === "string" &&
  v.length < 400000 &&
  /^data:image\/webp;base64,[A-Za-z0-9+/=]+$/.test(v);
