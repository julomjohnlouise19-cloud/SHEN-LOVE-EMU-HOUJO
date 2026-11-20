import { describe, expect, it } from "vitest";
import {
  learningMonth,
  shiftLearningMonth,
  vocabularyCollection,
  vocabularyForDay,
} from "../src/core/learning-calendar";
import { dayKey, addDays } from "../src/core/time";
import type { User } from "../src/core/types";
import { studyGuides } from "../src/data/study-guides";
import { deckById } from "../src/data/catalog";
import { referencesFor } from "../src/data/references";
import {
  scienceVideos,
  videoCategories,
  findScienceVideos,
  originalVideoUrl,
  videoPlayerUrl,
} from "../src/data/science-videos";

const daily = (answers: number, correct: number): User["daily"][string] => ({
  answers,
  correct,
  merits: 0,
  spin: true,
  quests: [],
  challenge: false,
});
describe("Study Room collection", () => {
  it("keeps all 23 supplied videos with related notes, references and only an allowed embed destination", () => {
    expect(scienceVideos).toHaveLength(23);
    expect(new Set(scienceVideos.map((video) => video.id)).size).toBe(23);
    expect(
      videoCategories.map(
        (category) =>
          scienceVideos.filter((video) => video.category === category.id)
            .length,
      ),
    ).toEqual([7, 4, 7, 3, 2]);
    for (const video of scienceVideos) {
      expect(video.id).toMatch(/^[A-Za-z0-9_-]{11}$/);
      expect(deckById(video.deckId)).toBeTruthy();
      expect(referencesFor(video.deckId)[0].url).toMatch(/^https:\/\//);
      expect(originalVideoUrl(video.id)).toBe(
        "https://www.youtube.com/watch?v=" + video.id,
      );
      expect(new URL(videoPlayerUrl(video.id)).origin).toBe(
        "https://www.youtube-nocookie.com",
      );
    }
    expect(() => videoPlayerUrl("unlisted-id")).toThrow();
    expect(() => videoPlayerUrl("javascript:alert(1)")).toThrow();
  });
  it("combines category and case-insensitive multiword search and can restore every video", () => {
    expect(findScienceVideos(" DNA ").map((video) => video.id)).toEqual([
      "URUJD5NEXC8",
    ]);
    expect(
      findScienceVideos("gravity", "physics").map((video) => video.id),
    ).toEqual(["U78NOo-oxOY"]);
    expect(findScienceVideos("gravity", "chemistry")).toEqual([]);
    expect(findScienceVideos("wave motion").map((video) => video.id)).toEqual([
      "CVsdXKO9xlk",
      "ZihywtixUYo",
    ]);
    expect(findScienceVideos("not-a-science-topic")).toEqual([]);
    expect(findScienceVideos()).toHaveLength(23);
  });
});
describe("dated learning", () => {
  it("handles leap days, Monday-first placement and month/year boundaries", () => {
    const february = learningMonth({ daily: {} }, "2024-02", "2024-02-29");
    expect(february.days).toHaveLength(29);
    expect(february.offset).toBe(3);
    expect(shiftLearningMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftLearningMonth("2026-01", -1)).toBe("2025-12");
    expect(
      learningMonth({ daily: {} }, "2026-02", "2026-02-28").days,
    ).toHaveLength(28);
    expect(() =>
      learningMonth({ daily: {} }, "2026-13", "2026-12-31"),
    ).toThrow();
  });
  it("counts this learner's saved answers without treating spins or future entries as learning", () => {
    const user = {
      daily: {
        "2026-11-18": daily(3, 2),
        "2026-11-19": daily(9, 7),
        "2026-11-20": daily(0, 0),
        "2026-11-21": daily(99, 99),
        "2026-10-31": daily(8, 8),
      },
    };
    const before = structuredClone(user);
    const month = learningMonth(user, "2026-11", "2026-11-20");
    expect(month).toMatchObject({ activeDays: 2, goalDays: 1, answers: 12 });
    expect(month.days[18]).toMatchObject({
      answers: 9,
      correct: 7,
      goalMet: true,
    });
    expect(month.days[19]).toMatchObject({
      answers: 0,
      today: true,
      goalMet: false,
    });
    expect(month.days[20]).toMatchObject({
      answers: 0,
      correct: 0,
      future: true,
    });
    expect(learningMonth({ daily: {} }, "2026-11", "2026-11-20").answers).toBe(
      0,
    );
    expect(user).toEqual(before);
  });
  it("uses the classroom date at Manila midnight", () => {
    const day = dayKey(
      { now: () => Date.parse("2026-11-19T16:00:00Z") },
      "Asia/Manila",
    );
    expect(day).toBe("2026-11-20");
    expect(
      learningMonth({ daily: {} }, day.slice(0, 7), day).days[19].today,
    ).toBe(true);
  });
});
describe("vocabulary of the day", () => {
  const words = vocabularyCollection(studyGuides);
  it("uses original study-guide definitions and connected topics without repeating terms", () => {
    expect(words.length).toBeGreaterThan(40);
    expect(
      new Set(words.map((word) => word.term.toLocaleLowerCase())).size,
    ).toBe(words.length);
    for (const word of words) {
      expect(
        studyGuides.find((guide) => guide.deckId === word.deckId)?.terms,
      ).toContainEqual([word.term, word.meaning]);
      expect(deckById(word.deckId)).toBeTruthy();
    }
  });
  it("stays stable during one day and visits every word before repeating", () => {
    const first = vocabularyForDay(words, "2026-11-20");
    expect(vocabularyForDay(words, "2026-11-20")).toBe(first);
    expect(vocabularyForDay(words, "2026-11-21")).not.toBe(first);
    const cycle = Array.from(
      { length: words.length },
      (_, index) => vocabularyForDay(words, addDays("2026-11-20", index))!.term,
    );
    expect(new Set(cycle).size).toBe(words.length);
    expect(vocabularyForDay(words, addDays("2026-11-20", words.length))).toBe(
      first,
    );
    expect(vocabularyForDay([], "2026-11-20")).toBeUndefined();
    expect(() => vocabularyForDay(words, "2026-02-30")).toThrow();
  });
});
