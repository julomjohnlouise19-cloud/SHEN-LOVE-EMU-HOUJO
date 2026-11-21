import { describe, expect, it } from "vitest";
import {
  createFocusTimer,
  focusRemaining,
  toggleFocusTimer,
  updateFocusTimer,
  finishFocusStudy,
  startFocusBreak,
} from "../src/core/focus-timer";

describe("temporary study focus timer", () => {
  it("supports fifty-minute focus and ten-minute breaks without auto-advancing", () => {
    const study = toggleFocusTimer(createFocusTimer(50), 10);
    expect(focusRemaining(study, 60010)).toBe(2940000);
    const completed = updateFocusTimer(study, 3000010);
    expect(completed.phase).toBe("study");
    const rest = startFocusBreak(completed, 3000010, 10);
    expect(focusRemaining(rest, 3060010)).toBe(540000);
  });
  it("counts elapsed time even when background ticks were skipped, without starting a break", () => {
    const timer = toggleFocusTimer(createFocusTimer(25), 1000);
    expect(focusRemaining(timer, 61000)).toBe(1440000);
    expect(updateFocusTimer(timer, 1600000)).toEqual({
      phase: "study",
      remainingMs: 0,
      startedAt: null,
      studyDone: true,
    });
    expect(timer.studyDone).toBe(false);
  });
  it("pauses without consuming break time and resumes only the remaining study time", () => {
    const started = toggleFocusTimer(createFocusTimer(5), 0);
    const paused = toggleFocusTimer(started, 60000);
    expect(focusRemaining(paused, 900000)).toBe(240000);
    const resumed = toggleFocusTimer(paused, 900000);
    expect(focusRemaining(resumed, 960000)).toBe(180000);
    expect(startFocusBreak(resumed, 960000)).toBe(resumed);
  });
  it("allows early finish and an explicit five-minute break, then keeps the quiz available", () => {
    const study = finishFocusStudy(createFocusTimer(15));
    const rest = startFocusBreak(study, 500);
    expect(rest.phase).toBe("break");
    expect(focusRemaining(rest, 60500)).toBe(240000);
    const done = updateFocusTimer(rest, 300500);
    expect(done.studyDone).toBe(true);
    expect(done.remainingMs).toBe(0);
    expect(toggleFocusTimer(done, 400000)).toBe(done);
    expect(createFocusTimer(-1).remainingMs).toBe(1500000);
  });
});
