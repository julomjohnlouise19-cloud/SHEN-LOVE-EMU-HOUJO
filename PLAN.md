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
- [x] Pass required code/content/browser/accessibility gates, deploy and verify the live experience.

All 45 unit/property tests, 27 root browser scenarios and the Pages-path scenario passed. [Run 42543853391](https://github.com/julomjohnlouise19-cloud/SHEN-LOVE-EMU-HOUJO/actions/runs/42543853391) passed build and deployment with no annotations. The public site returned HTTP 200 and matched the tested module. The new name, school logo/favicon, 320/390 px and desktop layouts, menu Escape/home behavior, topic search/level gate, unchanged answers/rewards on resume, offline logo/banner and logout privacy passed live checks with zero browser errors and failed resources. The restored development server was verified through the branded hub, guest dashboard and a loaded Cells question.

## Supabase backend connection

- [x] Add guarded public client configuration and the official browser SDK; never bundle a private key.
- [x] Provide a complete SQL setup with Auth-linked profiles, teacher-only access, immutable quiz records, server grading and idempotent submissions.
- [x] Add optional cloud email authentication, durable quiz upload/retry, student records and teacher reports/CSV.
- [x] Preserve the local demo and existing data; clearly distinguish cloud quiz records from local-only practice/rewards.
- [x] Test SQL/RLS in PostgreSQL, cloud flows with controlled API fixtures, existing app/browser gates and production configuration.
- [x] Document the exact owner actions needed to apply the real database setup and confirm project access.
- [x] Publish the cloud-enabled website after owner setup and authorization; verify the successful deployment and public interface. The environment draft remains unapplied.

All 51 unit/property tests, 27 existing browser scenarios, seven cloud scenarios and the Pages-path scenario passed. The final guest-entry change was rechecked against email-confirmation and missing-database scenarios. Real PostgreSQL tests covered all 972 canonical graders and alternatives, Auth profile creation, metadata role spoofing, row level security, account mismatches, immutable quiz records, retries, pagination and setup reruns. Code/content/economy checks and both local/cloud builds passed. Healthy browser flows had no unexpected console or application errors; negative API fixtures intentionally exercised HTTP failures. The development preview was restored and verified through the welcome hub, guest dashboard and a Cells question.

At preparation time, the actual Supabase project had not been verified: its domain addition remained in the unapplied environment draft, and publishable keys cannot create tables or assign teacher access. The owner workflow is in docs/SUPABASE_SETUP.md, including the generated setup.sql and owner-only teacher bootstrap. No private credential was used. Local development still defaults to the demo; production now selects Supabase directly.


Publication was authorized on 10 November 2026. The initial production checks identified an invalid backend-mode repository value, so the workflow now selects Supabase directly and requires only the public project URL and publishable key. Readiness errors produce actionable GitHub check annotations. [Run 42733010959](https://github.com/julomjohnlouise19-cloud/SHEN-LOVE-EMU-HOUJO/actions/runs/42733010959), source commit 7f7b13e2a33cbca7b00f7e5f98ce5b5de04537ca, passed both jobs with zero annotations. Its real Supabase readiness check verified schema version 1 and all 972 questions; code/content/economy, PostgreSQL permissions/grading, 51 unit tests and all 35 browser scenarios passed before upload.

The public website returned HTTP 200 with the configured Supabase origin in its CSP and entry module index-C6SAQG2Y.js. A live browser verified the cloud Email field, absence of demo admin credentials, 320 px layout, guest Cells lesson and logout, with zero application errors and zero failed site assets. The workspace still blocks direct Supabase requests until its saved domain rule is applied; the real backend was verified by the deployment check, and production sign-in/teacher access with personal credentials was not exercised. No password, private key or real signup email was used in testing. A GitHub log-host domain was also added to the environment draft; applying it remains an environment-owner review action and is separate from the completed website publication.

## Science arcade, teacher studio and experience refresh

- [x] Implement a complete nine-question target game: four science categories, three levels, timer, aiming/shooting, one-second reload, score/combo, round coins, power-ups, sounds, effects and saved rankings.
- [x] Add private profile photo upload/removal with safe image normalization and ownership rules.
- [x] Build a separate teacher studio for analytics, student profiles/credits, inventory/prices, collection/cancellation, learning content/settings and audited edits.
- [x] Add an idempotent database upgrade with server-owned game sessions, credits, stock reservations, photo storage and teacher permissions; preserve existing accounts/quiz records.
- [x] Refresh shared UI and authentication, respect reduced motion, and remove provider/implementation terminology from website flows.
- [x] Handle email delivery limits with persistent cooldowns, useful recovery and a concrete owner SMTP guide.
- [x] Validate core rules, PostgreSQL/RLS/concurrency, new and existing browser flows, mobile/accessibility and the Pages path.
- [x] Upload tested changes to GitHub, verify the real platform-2 readiness gate and publish when the owner's database upgrade is installed.

Application commit ec3c49448286af6d71147604e6f53e6bc839f61f was pushed to main. [Run 42757833757](https://github.com/julomjohnlouise19-cloud/SHEN-LOVE-EMU-HOUJO/actions/runs/42757833757) passed the actual platform-2 readiness gate, all code/database/browser checks and Pages publication. Both jobs had zero annotations; the repository's Supabase Preview check also succeeded. The public module index-Bq0dZZ97.js matched the verified production build. Live account layout, a complete guest arcade score/ranking, phone game, decoded school seal, logout/reload and welcome accessibility passed with no application errors or failed assets. Direct account requests remain blocked by the workspace's unapplied network draft, so personal sign-in and real email delivery were not exercised. SMTP settings/quotas remain project-owner configuration; the site handles limits without repeated email requests. The updated development preview is running on port 5173 and passed a fresh-browser readiness check.
