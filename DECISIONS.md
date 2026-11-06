# Decisions

- D-001 — The uploaded source ends at §4.8; absent economy, UI recipes and phase specifications use explicit conservative defaults rather than invented source requirements.
- D-002 — No /design reference images exist. Use cream paper, peach/lime/lilac accents, ink outlines, hand-drawn inline SVG mascots and generous whitespace for the requested kawaii scrapbook style.
- D-003 — No framework or production dependencies. Vite/TypeScript, ESLint/typescript-eslint, Prettier, Vitest/fast-check and Playwright/axe are free development-only dependencies required by the brief. tsx runs shared TypeScript validation scripts without a second rule implementation.
- D-004 — Local demo data is shared on one browser/origin, with per-tab sessions. Real classroom rewards require school verification and a server; never imply client storage is secure.
- D-005 — Default economy: 3/5/7 merits per correct easy/medium/hard answer, +1 per three-answer combo, 120 daily play-merit cap; correct/attempt XP 12/3, level every 120 XP. Daily spin and quest rewards use separate one-time claims.
- D-006 — Four implementation phases stand in for absent §15. Validate the current bank in early phases and enforce all 972 questions at the content gate.
- D-007 — Self-host the Latin subsets of Google Fonts Fredoka and DM Sans (OFL licenses included) using free Fontsource packages. This removes network font failures and preserves the intended typography offline.
- D-008 — Run TypeScript scripts with `node --import tsx` because the tsx CLI’s IPC socket is unavailable inside the command sandbox; compilation and behavior are unchanged.
- D-009 — Undo is limited to the latest transaction, with a revision check, so restoring an inverse cannot overwrite someone else’s newer progress, stock or purchases.
- D-010 — The 972-card static pool is authored from 324 reviewed concept records with distinct recall, application and evidence prompts. Fixed calculation cards and explicit evidence tables strengthen Hard; the 19 seeded calculators remain separate from this minimum. A science-term allowlist lives in glossary.json.
- D-011 — Precache the production shell, local fonts and static branch chunks after initial load. Cached same-origin resources ignore Vary when matched because preview servers can vary headers between module and precache requests. No cross-origin requests or remote API data are cached.
- D-012 — True/false questions have two choices; the four-choice minimum applies to multiple-choice and diagram/data choice questions. Their answer slots still participate in deck-bias checks.
- D-013 — UI actions for real school supplies remain local demonstration records until a teacher verifies collection; no backend or outbound notification service was supplied or added.
