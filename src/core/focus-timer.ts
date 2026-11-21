export interface FocusTimer {
  phase: "study" | "break";
  remainingMs: number;
  startedAt: number | null;
  studyDone: boolean;
}

export function createFocusTimer(minutes = 25): FocusTimer {
  return {
    phase: "study",
    remainingMs: ([5, 15, 25, 50].includes(minutes) ? minutes : 25) * 60000,
    startedAt: null,
    studyDone: false,
  };
}
export function focusRemaining(timer: FocusTimer, now: number) {
  return Math.max(
    0,
    timer.remainingMs -
      (timer.startedAt === null ? 0 : Math.max(0, now - timer.startedAt)),
  );
}
export function updateFocusTimer(timer: FocusTimer, now: number): FocusTimer {
  if (focusRemaining(timer, now) > 0 || timer.startedAt === null) return timer;
  return {
    ...timer,
    remainingMs: 0,
    startedAt: null,
    studyDone: timer.studyDone || timer.phase === "study",
  };
}
export function toggleFocusTimer(timer: FocusTimer, now: number): FocusTimer {
  const current = updateFocusTimer(timer, now);
  if (!current.remainingMs) return current;
  return {
    ...current,
    remainingMs: focusRemaining(current, now),
    startedAt: current.startedAt === null ? now : null,
  };
}
export function finishFocusStudy(timer: FocusTimer): FocusTimer {
  return { ...timer, remainingMs: 0, startedAt: null, studyDone: true };
}
export function startFocusBreak(
  timer: FocusTimer,
  now: number,
  minutes = 5,
): FocusTimer {
  return timer.studyDone
    ? {
        phase: "break",
        remainingMs: (minutes === 10 ? 10 : 5) * 60000,
        startedAt: now,
        studyDone: true,
      }
    : timer;
}
