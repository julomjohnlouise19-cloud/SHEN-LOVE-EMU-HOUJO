# The Cozy Science Lab — build plan

## Scope and architecture
Build a complete local-first, mobile-friendly science learning game with Vite and strict TypeScript, no UI framework. The supplied brief ends at §4.8; references to §§5–16 and Appendix A are absent. Decisions below replace only absent specifications, not supplied requirements. No design reference images were supplied.

Functional rules live in `src/core/`; commands return patches, events and inverses. `src/store/` owns localStorage, versioning, migrations, atomic transactions, sessions and cross-tab updates. Views in `src/ui/` consume those commands. Question JSON is dynamically imported per branch and never persisted. All illustration is inline SVG. Manila calendar days govern daily rewards.

## File tree
```
src/{core,store,ui,data/questions,styles}
scripts/{validate-questions,generate-questions,simulate-economy,seed}.ts
tests/{core,questions,resilience}.test.ts
e2e/{app,resilience,purchase-safety}.spec.ts
public/{school-seal.webp,sw.js}
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
- [x] §1 P0: cozy responsive dashboard, Science Island, subject/deck sheets, grade recommendations
- [x] §1–2 P0: merits/XP/caps/combos, quests, streak, daily fact/challenge/spin, badges, leaderboard
- [x] §1–2 P0: atomic stock purchase, unique redeem code, student redemption, admin claim, notifications, audit and safe undo
- [x] §1–2 P0: admin mission control, user/section analytics, misconception heatmap, editable rules/content, online presence
- [x] §1 P0: notebook, misconception suggestions, challenge links, boss practice, interactive tiny lab
- [x] Phase 2 gate

### Phase 3 — content and science engines
- [x] §3–4.8 P0: all 27 decks, 12 questions × 3 levels each, 15% Philippine contexts, source notes and grade bands
- [x] §4.3 P0: 60+ misconceptions with tagged distractors and repair feedback
- [x] §4.4 P0: all specified seeded calculators, independently checked across 200 seeds each
- [x] §4.6 P0: shared accessible DiagramKit, mixed answer types, hard data/calculation coverage
- [x] §4.7–4.8 P0: schema/readability/duplicates/bias/coverage validator, one-deck-at-a-time validation and skeptical review
- [x] Phase 3 gate

### Phase 4 — resilience, accessibility, delivery
- [x] §1–2 P0: offline shell/data cache, responsive keyboard-friendly UI, reduced motion, accessible contrast
- [x] §2.1 P0: all required scripts work, economy simulator and safe seed command
- [x] §0 P0: functional/a11y/mobile/multi-tab browser tests, production build, docs and final clean gate
- [x] Save tested environment install/start instructions
- [x] Phase 4 gate

No P2 work is planned. Features with absent specifications use documented conservative defaults.

## Risks
Client-only security and rewards are demonstrations; a backend must enforce real inventory, roles and school claims. Large content scope needs automated structural checks plus careful science review. localStorage is quota-limited and not multi-device. Web Locks is preferred; the lease fallback needs explicit concurrency tests. Undo must never overwrite intervening transactions. Missing sections cannot be claimed implemented verbatim.

## Final verification

All application phase gates are green. See docs/VALIDATION.md for the checks, content counts, browser scenarios and limitations. The user published the environment, and the restored instance retained the checkout, Node/npm, Chromium and installed dependencies. No environment configuration was changed during the GitHub/display repair.

## GitHub connection and website publication

- [x] Verify the existing GitHub connection and remote main without overwriting remote work.
- [x] Support the GitHub Pages repository path for scripts, fonts, favicon and offline assets.
- [x] Pass root-path regression checks and a production repository-path browser test.
- [x] Add the tested GitHub Actions build/deployment workflow and publishing documentation.
- [x] Upload the completed project to the user's main branch with a normal fast-forward push.
- [x] Identify the exact publication prerequisite: enable Pages with GitHub Actions in repository settings, then run the workflow again. The original instance's network policy blocked GitHub's API; this was resolved by the user's environment publication.
- [x] Verify the live website after Pages is enabled and deployment succeeds.

The first GitHub Actions run passed its check/build job, including both browser suites, then stopped in configure-pages because no Pages site existed. See [run 42179117736](https://github.com/julomjohnlouise19-cloud/SHEN-LOVE-EMU-HOUJO/actions/runs/42179117736). The GitHub Actions Pages source is now enabled. The corrected [run 42183402991](https://github.com/julomjohnlouise19-cloud/SHEN-LOVE-EMU-HOUJO/actions/runs/42183402991) passed both jobs without annotations, and the live website was verified in Chromium.

## GitHub errors and display repair

- [x] Inspect the failed job, website response and restored environment; preserve the published environment configuration.
- [x] Add a styled, accessible HTML fallback linking to the online lab when app scripts cannot run.
- [x] Replace deprecated Pages action runtimes with verified official releases and use a stable Ubuntu runner.
- [x] Validate the restored environment, normal application, repository path and source HTML fallback.
- [x] Push the fixes without overwriting remote work and inspect the new GitHub run.
- [x] Confirm that the GitHub Actions Pages source is enabled. Site creation through the connected integration returned 403, so the owner-facing setting was required; a later API read confirmed build_type=workflow.
- [x] Verify the corrected workflow and live public website.

The live site returned HTTP 200 and its module URL matched the locally verified Pages build. Desktop/mobile screenshots and the tested WCAG AA checks passed. A full eight-card Cells session updated mastery and opened the Review Box. An offline reload and a previously unvisited Chemistry deck both worked. Zero console errors and zero failed resource responses were observed. The restored development server was also started and verified through the dashboard and a loaded Cells question.

## Welcome hub and logout

- [x] Replace automatic guest login with an explicit welcome hub for first visits and ended sessions.
- [x] Add a visible, accessible Log out control and confirmation interface; preserve saved progress.
- [x] Guard private routes, browser Back, expired/revoked sessions and open profile dialogs after logout.
- [x] Preserve incoming deck/challenge destinations through sign-in, registration and explicit guest entry.
- [x] Test desktop/mobile, account creation, guest entry, logout/cancel/reload, session expiry/revocation, offline behavior and the existing learning/reward flows.
- [x] Push tested fixes, verify GitHub deployment and check the live welcome/logout flow.

All 45 unit/property tests, 23 root browser scenarios and the repository-path browser scenario passed. [GitHub Actions run 42353452310](https://github.com/julomjohnlouise19-cloud/SHEN-LOVE-EMU-HOUJO/actions/runs/42353452310) passed both jobs without annotations. The public build matched the tested module and returned HTTP 200. Live desktop/mobile hub checks, account creation, both logout controls, cancel/confirm, reload/Back protection, saved notebook recovery, guest learning and offline logout/reload passed with zero console errors and zero failed resources. The running development server was also verified through the hub, guest dashboard and a Cells question.

## The Cozy Science Lab — school identity and experience

- [x] Apply the full name consistently to navigation, page titles, loading/error states and documentation.
- [x] Add the supplied school seal to the left of welcome, desktop/mobile application headers and dialog interfaces, with a matching favicon and offline caching.
- [x] Improve discovery with a cross-branch topic search and clear result/empty states.
- [x] Make unfinished learning easy to resume from the dashboard without resetting answers or rewards.
- [x] Improve mobile tap targets, navigation and offline feedback while preserving welcome/logout privacy.
- [ ] Pass required code/content/browser/accessibility gates, deploy and verify the live experience.
