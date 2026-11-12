import type { Rules } from "./types";
export type ClassroomRules = Rules & { pickupLocation?: string };
export const DEFAULT_PICKUP_LOCATION = "Grade 10 SSC classroom";
export function pickupLocation(rules?: { pickupLocation?: unknown }) {
  const value = rules?.pickupLocation;
  return typeof value === "string" &&
    value.trim().length >= 2 &&
    value.trim().length <= 160
    ? value.trim()
    : DEFAULT_PICKUP_LOCATION;
}
export function pickupReminder(item: string, location: string) {
  return `Your reservation for ${item} is saved. Please claim your item from the teacher. Collection point: ${location}. Bring your claim code for verification.`;
}
