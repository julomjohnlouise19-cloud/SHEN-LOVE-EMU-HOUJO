import { TERMS_VERSION } from "../core/agreement";
import { h, modal } from "./dom";
export function termsModal() {
  const sections = [
    [
      "Learning together",
      "The Cozy Science Lab is for science learning and classroom activities. Use accurate school-approved account details, keep your password private, and use the lab respectfully. Follow your teacher’s instructions for classroom work and real experiments.",
    ],
    [
      "Your account and privacy",
      "Your account stores your name, email, grade and section. You may add a profile photo and introduction. Authorized teachers can view these profile details, completed quiz records, class credits, reservations and suggestions to support learning and manage the classroom. Do not put passwords or sensitive personal information in photos, notes or suggestions.",
    ],
    [
      "Classroom sharing and friends",
      "When your account is listed, signed-in classmates can find your existing account name, learning achievements and current class-credit balance in Science friends and rankings. Your sign-in email is never displayed to classmates. Photo, introduction and grade sharing are optional, and you can hide your name from the directory and rankings. Recent-activity badges reflect a visible session within the last two minutes. You can accept or decline requests, remove friends or block a scientist.",
    ],
    [
      "What stays on your device",
      "Notebook pages, unfinished practice, practice XP, quests and Daily spin progress stay on this device. Completed discoveries, profile information, class credits and supply reservations use your classroom account. Signing out preserves your saved work; shared devices should always be signed out after use.",
    ],
    [
      "Supplies and collection",
      "Class credits are classroom rewards, not money. Reserving a supply creates a claim code; it does not record physical collection. Read the pickup instructions and show the code to the teacher when collecting. Teachers manage stock, verify collection and handle cancellations or refunds of class credits.",
    ],
    [
      "Account access and questions",
      "Teachers may ban a student’s classroom access for misuse and can restore it after review. Saved records are retained. Contact your teacher or the site administrator about account access, corrections, privacy questions or a reservation. Signing up does not give permission to use another person’s account.",
    ],
    [
      "Science content and sources",
      "The lab’s practice questions and topic notes are original learning materials. Supporting books, curriculum documents and science-agency resources remain credited to their publishers. Ask your teacher if a question or explanation seems unclear.",
    ],
  ];
  modal(
    "Terms & Conditions and Privacy Notice",
    [
      h("p", { class: "eyebrow" }, `CLASSROOM USE · VERSION ${TERMS_VERSION}`),
      h(
        "p",
        null,
        "Please read these classroom terms before creating an account. Opening this notice does not accept it; use the agreement checkbox on the signup form.",
      ),
      ...sections.map(([title, text]) =>
        h(
          "section",
          { class: "terms-section" },
          h("h3", null, title),
          h("p", null, text),
        ),
      ),
    ],
    true,
  );
}
