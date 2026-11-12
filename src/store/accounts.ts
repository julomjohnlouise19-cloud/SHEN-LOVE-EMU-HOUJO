import { currentUser } from ".";
import { accountsVersion } from "./cloud";
import { platformRequest } from "./platform";
export interface ScientistProfile {
  user_id: string;
  display_name: string;
  grade: number;
  section: string;
  active: boolean;
  is_teacher: boolean;
  photo_path: string | null;
  created_at: string;
  credits: number;
  attempts: number;
  email?: string;
  bio?: string;
  theme?: string;
  correct?: number;
  answers?: number;
  pending_reservations?: number;
  terms_accepted?: boolean;
  terms_version?: string;
  terms_accepted_at?: string;
  expected_updated?: string;
}
export async function fullScientistProfile(id: string) {
  if (currentUser()?.role !== "admin")
    throw new Error("Teacher access is required to view scientist profiles.");
  if (accountsVersion() < 1) return undefined;
  return platformRequest<ScientistProfile>("csl_scientist_profile", {
    p_user_id: id,
  });
}
