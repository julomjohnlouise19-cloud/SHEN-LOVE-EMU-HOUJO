# Cozy Science Lab — build plan

## Scope and architecture
Build a complete local-first, mobile-friendly science learning game with Vite and strict TypeScript, no UI framework. The supplied brief ends at §4.8; references to §§5–16 and Appendix A are absent. Decisions below replace only absent specifications, not supplied requirements. No design reference images were supplied.

Functional rules live in `src/core/`; commands return patches, events and inverses. `src/store/` owns localStorage, versioning, migrations, atomic transactions, sessions and cross-tab updates. Views in `src/ui/` consume those commands. Question JSON is dynamically imported per branch and never persisted. All illustration is inline SVG. Manila calendar days govern daily rewards.

## File tree
```
src/{core,store,ui,data/questions,styles}
scripts/{validate-questions,generate-questions,simulate-economy,seed}.ts
tests/{core,questions,storage}.test.ts
e2e/app.spec.ts
public/{favicon.svg,sw.js}
PLAN.md AGENTS.md DECISIONS.md README.md
```

## Data model
Versioned AppState: users (password hash/salt, grade, section, avatar, balance, XP, streak, per-day counters, mastery, Leitner review cards, notes, badges), sessions, inventory, purchases and redemption/claim status, audit events, notifications, editable rules, question overlays and revision. A run records eight question IDs, answers, score, misconceptions and reward. CommandContext injects clock, seeded RNG and rules. Question schema follows §4.1, with explicit accessibility text and data for diagrams/tables where needed.

## Build order and gates
Each phase: lint, typecheck, unit tests, phase Playwright smoke, question validation, no browser console errors; then commit. Gates run on the current dataset (coverage completeness required in Phase 3).

### Phase 1 — foundation and vertical slice
- [x] §0 P0: plan, enduring instructions, decisions, scripts and phase commits
- [x] §2.1–2.4 P0: strict TS/Vite, pure commands, clock/RNG, atomic persistence, cross-tab sync, migrations, quarantine, quota handling
- [x] §2.5–2.6 P0: PBKDF2 auth, role guards, limiter, CSP, safe DOM, validated imports, backup/export
- [x] §4 P0: Cells Medium eight-card run → feedback → results → mastery → Review Box
- [x] Phase 1 gate

### Phase 2 — complete product shell and loops
- [ ] §1 P0: cozy responsive dashboard, Science Island, subject/deck sheets, grade recommendations
- [ ] §1–2 P0: merits/XP/caps/combos, quests, streak, daily fact/challenge/spin, badges, leaderboard
- [ ] §1–2 P0: atomic stock purchase, unique redeem code, student redemption, admin claim, notifications, audit and safe undo
- [ ] §1–2 P0: admin mission control, user/section analytics, misconception heatmap, editable rules/content, online presence
- [ ] §1 P0: notebook, misconception suggestions, challenge links, boss practice, interactive tiny lab
- [ ] Phase 2 gate

### Phase 3 — content and science engines
- [ ] §3–4.8 P0: all 27 decks, 12 questions × 3 levels each, 15% Philippine contexts, source notes and grade bands
- [ ] §4.3 P0: 60+ misconceptions with tagged distractors and repair feedback
- [ ] §4.4 P0: all specified seeded calculators, independently checked across 200 seeds each
- [ ] §4.6 P0: shared accessible DiagramKit, mixed answer types, hard data/calculation coverage
- [ ] §4.7–4.8 P0: schema/readability/duplicates/bias/coverage validator, one-deck-at-a-time validation and skeptical review
- [ ] Phase 3 gate

### Phase 4 — resilience, accessibility, delivery
- [ ] §1–2 P0: offline shell/data cache, responsive keyboard-friendly UI, reduced motion, accessible contrast
- [ ] §2.1 P0: all required scripts work, economy simulator and safe seed command
- [ ] §0 P0: functional/a11y/mobile/multi-tab browser tests, production build, docs and final clean gate
- [ ] Save tested environment install/start instructions
- [ ] Phase 4 gate

No P2 work is planned. Features with absent specifications use documented conservative defaults.

## Risks
Client-only security and rewards are demonstrations; a backend must enforce real inventory, roles and school claims. Large content scope needs automated structural checks plus careful science review. localStorage is quota-limited and not multi-device. Web Locks is preferred; the lease fallback needs explicit concurrency tests. Undo must never overwrite intervening transactions. Missing sections cannot be claimed implemented verbatim.
