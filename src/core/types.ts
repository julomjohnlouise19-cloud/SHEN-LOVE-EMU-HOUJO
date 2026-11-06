export type BranchId = "life" | "chemistry" | "physics" | "earth" | "skills";
export type Difficulty = "easy" | "medium" | "hard";
export type Answer = string | string[] | Record<string, string>;
export interface Question {
  id: string;
  deckId: string;
  level: Difficulty;
  type:
    | "mcq"
    | "truefalse"
    | "input"
    | "order"
    | "match"
    | "diagram"
    | "calc"
    | "data";
  prompt: string;
  options?: { id: string; text: string; misconception?: string }[];
  answer: Answer;
  accept?: string[];
  unit?: string;
  tolerance?: number;
  explanation: string;
  scienceFact: string;
  topic: string;
  gradeBand: 7 | 8 | 9 | 10;
  bloom: "remember" | "understand" | "apply" | "analyze";
  curriculumArea: string;
  ph?: boolean;
  diagram?: string;
  generator?: string;
  reviewed: boolean;
  data?: { headers: string[]; rows: string[][] };
  allowAbsolute?: { note: string };
}
export interface Deck {
  id: string;
  branch: BranchId;
  name: string;
  description: string;
  grades: number[];
  sourceNote: string;
  diagram: string;
}
export interface Branch {
  id: BranchId;
  name: string;
  short: string;
  color: string;
  mascot: string;
  description: string;
  icon: string;
}
export interface Clock {
  now(): number;
}
export interface RNG {
  next(): number;
}
export interface Rules {
  starterMerits: number;
  comboBonus: number;
  timezone: string;
  meritEasy: number;
  meritMedium: number;
  meritHard: number;
  dailyCap: number;
  correctXP: number;
  attemptXP: number;
  xpPerLevel: number;
  comboEvery: number;
  reviewReward: number;
  dailyReward: number;
  questReward: number;
  spinMax: number;
  skillsLevel: number;
}
export interface Context {
  clock: Clock;
  rng: RNG;
  rules: Rules;
}
export interface ReviewCard {
  questionId: string;
  deckId: string;
  box: number;
  due: string;
  misconception?: string;
  lastReviewed?: string;
}
export interface User {
  id: string;
  username: string;
  name: string;
  grade: number;
  section: string;
  role: "admin" | "student";
  salt: string;
  hash: string;
  avatar: string;
  merits: number;
  xp: number;
  streak: number;
  lastDay: string;
  daily: Record<
    string,
    {
      merits: number;
      answers: number;
      correct: number;
      spin: boolean;
      quests: string[];
      challenge: boolean;
    }
  >;
  mastery: Record<
    string,
    { correct: number; attempts: number; completed: number }
  >;
  review: ReviewCard[];
  notes: {
    id: string;
    title: string;
    text: string;
    topic: string;
    created: number;
  }[];
  badges: string[];
  lastSeen: number;
  created: number;
}
export interface Item {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  icon: string;
  color: string;
  category: string;
}
export interface Purchase {
  id: string;
  userId: string;
  itemId: string;
  itemName: string;
  price: number;
  code: string;
  status: "purchased" | "redeemed" | "claimed";
  created: number;
}
export interface RunAnswer {
  questionId: string;
  value: Answer;
  correct: boolean;
  merits: number;
  xp: number;
  misconception?: string;
}
export interface Run {
  id: string;
  userId: string;
  deckId: string;
  level: Difficulty;
  ids: string[];
  answers: RunAnswer[];
  completed: boolean;
  mode: "practice" | "review" | "daily" | "boss";
  created: number;
}
export interface DomainEvent {
  id: string;
  type: string;
  actor: string;
  time: number;
  text: string;
  data?: Record<string, string | number | boolean>;
}
export interface Notification {
  id: string;
  userId: string;
  text: string;
  read: boolean;
  time: number;
}
export interface Audit {
  id: string;
  actor: string;
  time: number;
  command: string;
  text: string;
  inverse?: Partial<AppState>;
  afterRev: number;
  undone: boolean;
}
export interface Overlay {
  op: "add" | "patch" | "delete";
  question: Question;
}
export interface Session {
  token: string;
  userId: string;
  expires: number;
}
export interface AppState {
  version: number;
  rev: number;
  users: User[];
  rules: Rules;
  items: Item[];
  purchases: Purchase[];
  runs: Run[];
  events: DomainEvent[];
  audit: Audit[];
  notifications: Notification[];
  overlays: Record<string, Overlay>;
  sessions: Session[];
}
export type Command =
  | {
      type: "StartRun";
      run: Omit<Run, "answers" | "completed" | "created" | "userId">;
    }
  | { type: "SubmitAnswer"; runId: string; question: Question; value: Answer }
  | { type: "BuyItem"; itemId: string; expectedPrice?: number }
  | { type: "RedeemCode"; code: string }
  | { type: "ClaimPurchase"; purchaseId: string }
  | { type: "SpinWheel" }
  | { type: "ClaimQuest"; questId: string }
  | {
      type: "SaveNote";
      title: string;
      text: string;
      topic: string;
      id?: string;
    }
  | { type: "DeleteNote"; id: string }
  | {
      type: "UpdateProfile";
      name: string;
      grade: number;
      section: string;
      avatar: string;
    }
  | { type: "ReadNotifications" }
  | { type: "AdminGivePoints"; userId: string; amount: number; reason: string }
  | { type: "AdminRules"; rules: Rules }
  | { type: "AdminItem"; item: Item }
  | { type: "AdminQuestion"; overlay: Overlay }
  | { type: "AdminQuestions"; overlays: Overlay[] }
  | { type: "Undo"; auditId: string };
export interface CommandResult {
  patch: Partial<AppState>;
  events: DomainEvent[];
  inverse: Partial<AppState>;
}
