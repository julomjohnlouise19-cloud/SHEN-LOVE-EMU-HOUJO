import type { Item, Question } from "./types";
import type { ArcadeRules } from "./arcade";
import type { ClassroomRules } from "./classroom";

export interface LabItem extends Item {
  active: boolean;
  version: number;
}
export interface LabOrder {
  id: string;
  user_id: string;
  display_name?: string;
  grade?: number;
  section?: string;
  item_id: string;
  item_name: string;
  price: number;
  code: string;
  status: "reserved" | "collected" | "cancelled";
  created_at: string;
}
export interface LabSnapshot {
  credits: number;
  items: LabItem[];
  orders: LabOrder[];
  rules: ClassroomRules;
  game: ArcadeRules;
  settings_version: number;
  overrides: { question: Question; active: boolean; version: number }[];
}
export interface LabStudent {
  user_id: string;
  display_name: string;
  grade: number;
  section: string;
  active: boolean;
  credits: number;
  is_teacher: boolean;
  attempts: number;
  created_at: string;
  photo_path?: string | null;
}
export interface ArcadeRanking {
  rank: number;
  user_id: string;
  display_name: string;
  category: string;
  score: number;
  correct: number;
  completed_at: string;
}
export interface TeacherData {
  rows: Record<string, unknown>[];
  total: number;
  timeline?: { day_key: string; quizzes: number; games: number }[];
  stats?: Record<string, number>;
  charts?: {
    deck_id: string;
    attempts: number;
    correct: number;
    total: number;
  }[];
}
