import { expect, it } from "vitest";
import { validateSuggestion, validateReply } from "../src/core/suggestions";
import { decks } from "../src/data/catalog";
import { referencesFor } from "../src/data/references";
it("validates useful bounded messages and requires a reply to resolve an idea", () => {
  const valid = {
    category: "idea",
    title: "More examples",
    message: "Please add more practical examples.",
    deck: "",
    question: "",
  };
  expect(() => validateSuggestion(valid)).not.toThrow();
  for (const value of [
    { ...valid, title: "x" },
    { ...valid, message: "short" },
    { ...valid, message: "x".repeat(1501) },
    { ...valid, category: "role-change" },
  ])
    expect(() => validateSuggestion(value)).toThrow();
  expect(() => validateReply("done", "")).toThrow();
  expect(() => validateReply("done", "We added examples.")).not.toThrow();
  expect(() => validateReply("unknown", "A reply")).toThrow();
});
it("gives every deck curriculum context and a distinct supporting reference", () => {
  for (const deck of decks) {
    const refs = referencesFor(deck.id);
    expect(refs).toHaveLength(2);
    for (const ref of refs) {
      expect(new URL(ref.url).protocol).toBe("https:");
      expect(ref.title.length).toBeGreaterThan(5);
      expect(ref.focus.length).toBeGreaterThan(15);
    }
    expect(refs[0].url).not.toBe(refs[1].url);
  }
});
