# The Cozy Science Lab — build plan

## About us researcher panel

- [x] Add a compact About us button that opens an in-page panel without changing the current URL or session.
- [x] Include the user's exact introduction and the seven researchers' original PDF portraits, names, bios and hobbies.
- [x] Give the portraits original moon, stars, cloud and lotus decorations inspired by the supplied frame, with colorful readable cards.
- [x] Verify phone/desktop layout, keyboard close and focus return, loaded photos, offline reading and existing learning flows; publish the tested update.
- [x] Apply the clarified leaderboard order: highest points first, clear fair ties, distinctive leader cards and an accessible ordered ranking list; verify rank changes after refresh.

Native lint/typecheck, 71 unit/property tests, 972 reviewed questions and SQL/PDF consistency checks passed. The new About us scenarios passed all seven loaded portraits, exact introduction, individual/all-bio expansion, unchanged URL/session/balance, offline portraits and bios, desktop/mobile menu entry, keyboard return and phone WCAG AA/bounded width. The shared modal supports an explicit return-focus target for the lazy-loaded About us button; existing callers retain the original behavior. The Cells/mastery/review slice passed. All ten community scenarios passed, including a lower-scoring account moving into first place after refresh, equal 100-point accounts sharing rank one, and a lower score remaining below them. Weekly rollover, sharing choices, friendship actions and phone accessibility still passed. The repository-path/offline scenario passed with explicit portrait and frame URL checks. Portraits were visually reviewed at the original image aspect ratios; cards use blue/lilac/mint and the final card is centered on wider layouts. About us needs no SQL or new URL. No classroom data, records, account borders or reading-room content changed.

Application commit f3c200431fcc8edaf0f536f597d71478ab5e3df8 is published. [Run 43335835596](https://github.com/julomjohnlouise19-cloud/SHEN-LOVE-EMU-HOUJO/actions/runs/43335835596) passed both jobs, 71 unit/property tests, all 108 browser scenarios (45 standard, 62 cloud, one Pages), code/science/document gates and the complete isolated PostgreSQL suite. The actual readiness check now confirms community version 2 installed alongside schema 1, platform 3 and 972 questions; no further community SQL is required for this update. Public entry index-B_TPoVCM.js, shell-TFwEIw1H.js, About us module about-BMuBXsa6.js, stylesheet index-CITP-H9-.css, all seven portrait JPEGs and the decorative SVG matched the production build byte for byte. A fresh public browser passed seven decoded portraits, bio controls, desktop/320-pixel dialog accessibility, bounded layouts, unchanged URL and focus return, both community navigation routes, profile sharing, email sign-in and guest privacy gates. Zero unexpected errors, failed site assets, anonymous private-community requests or navigation cancellations occurred. One workspace-blocked status request was recorded separately; GitHub verified the real service. The stable preview on 5173 serves a separate production build copy and passed the same checks. No personal login, email, production score/friendship write, database migration or cloud-environment publication was performed.

## Easy account discovery and live weekly standings

- [x] Remove separate public-username creation and reuse existing account identity for friend lookup and cards.
- [x] Open Science friends to an attractive active-student directory, with honest recent-activity indicators and easy invitations.
- [x] Show weekly rankings immediately, including a classroom-timezone week range, reset countdown and automatic refresh.
- [x] Preserve explicit sharing opt-outs, optional photos/private fields, friendships, blocking and existing learning data across the additive upgrade.
- [x] Verify database permissions/migration, existing-login search, live directory/weekly rollover, mobile/accessibility and publication.
- [x] Verify live community activation: run 43335835596 subsequently confirmed community version 2 installed; the interface update needs no further SQL.

Local checks passed lint/typecheck, 71 unit/property tests, 972 reviewed questions, source/PDF/SQL consistency and the economy simulation. All 30 community/account/platform/guide browser scenarios passed, including the nine updated community cases, existing-login and private email lookup, duplicate account names, immediate classmate/weekly entry, two-account acceptance, crossed requests, explicit photo/visibility choices, automatic activity expiry and a simulated Monday rollover retaining all-time points. The Cells learning/mastery/review slice, local account/password change, safe user text and repository-path/offline scenario also passed. Phone WCAG AA and width checks passed; the classmate layout was tightened and rankings moved before the personal summary. The final complete isolated PostgreSQL suite passed default profile creation, server-clock presence, week metadata, privacy/RLS, friendship concurrency/limits and a version-1 upgrade preserving deliberate opt-outs. An existing legacy reload test now sets an active test window explicitly so process startup cannot consume its one-second rejection interval; product timing is unchanged. The current community-upgrade.sql and simple owner guide install capability 2 from either no community service or version 1. Existing features remain compatible before that owner-only database step. No production email, login, friend request or database migration was performed.

Application commit c7e0d638b204aeef543171c97332f6dcd2933ce0 is published. [Run 43179025888](https://github.com/julomjohnlouise19-cloud/SHEN-LOVE-EMU-HOUJO/actions/runs/43179025888) passed both jobs, 71 unit/property tests, all 104 browser scenarios (42 standard, 61 cloud, one Pages), code/science/document checks and the complete isolated PostgreSQL suite. The live readiness check verified schema 1, platform 3, 972 questions, the suggestion inbox and enhanced teacher profile details, and explicitly reported the community update still required. Shared student data remains gated until the owner applies the updated SQL; a publishable key cannot apply it and this chat has no authenticated database administrator connection. Public entry index-CfMdUr2V.js, shell-D--HNFOk.js and stylesheet index-_fZTGrUs.css matched the configured production build byte for byte. Fresh public desktop/320-pixel browser checks passed the new friends heading, both navigation links, renamed Classroom sharing profile control, email sign-in path, guest privacy gates, phone WCAG AA, bounded width and decoded school seals. There were zero anonymous private-community requests, unexpected browser errors, failed site assets or navigation cancellations. One workspace-blocked backend-status request was recorded separately; real readiness was checked by GitHub. The stable production preview on 5173 passed the same fresh-browser checks and serves a separate copy of the production build. No actual personal login, production friendship, email, database migration or cloud-environment publication was performed. The reading room and cancelled profile-border work remain unchanged.

## Student leaderboard and science friends

- [x] Add a shared, server-scored student leaderboard with weekly/all-time views, fair repeated-play handling, ranks and public learning cards.
- [x] Add unique classroom usernames, deliberate profile sharing, friend requests by username, accept/decline/cancel, removal and blocking.
- [x] Connect responsive leaderboard/friends pages and profile controls; preserve private account fields and existing photos/teacher access.
- [x] Test permissions, ranking, request concurrency, username uniqueness, mobile/accessibility and existing learning/account flows.
- [x] Publish and verify the compatible website; report the installed live community capability and any owner-only activation step precisely.
- [x] Verify owner activation: the community service was pending in run 43156891647 and subsequently confirmed installed at version 2 by run 43335835596.

Local verification passed lint/typecheck, 70 unit/property tests, all 972 reviewed questions, source/PDF/SQL consistency and economy checks. The complete isolated PostgreSQL suite passed, including new daily-best scoring/ties, shared-field and current-photo RLS, unique usernames, actor-bound requests/retries, concurrent crossed requests and last daily slots, blocking, bans and additive reruns. Browser checks passed 22 combined community/platform/account scenarios plus a focused crossed-invitation case, the Cells learning/mastery/review slice, local signup/password changes, safe user text and the repository-path/offline scenario. This covers all seven new community cases, actual two-account acceptance/removal, deliberately enabled photos and stale actions; 320-pixel ranking/card/friends accessibility passed and phone/desktop screenshots were inspected. Shared photos and page caches are scoped to the current authenticated account. The user received the tested community-upgrade.sql and a simple activation guide; applying it requires the owner's SQL Editor because this chat has no authenticated database administrator connection. Existing classrooms remain compatible before activation. No real friend request, email, private login or production database migration was performed by these tests.

Application commit 7095c9f2a24538498308a2b3c26e6e778f56e9d8 is published. [Run 43156891647](https://github.com/julomjohnlouise19-cloud/SHEN-LOVE-EMU-HOUJO/actions/runs/43156891647) passed both jobs, all 70 unit/property tests, all 102 browser scenarios (42 standard, 59 cloud, one Pages), science/content and complete isolated PostgreSQL gates. Final coverage also verifies hidden-grade filter guidance and the teacher's noncompeting view. Actual backend notices verified schema 1, platform 3, 972 questions, the suggestion inbox and enhanced scientist details, and explicitly reported the community upgrade still required. The interface is published; shared rankings/friendships remain gated until the owner runs the prepared SQL. Public entry index-L6dp6luW.js, shell-CU81c0Om.js and stylesheet index-DpIpGr4e.css matched the configured build byte for byte. Live desktop/320-pixel checks passed leaderboard/friends links and headings, profile username controls, the email sign-in path, guest privacy gates, accessibility, bounded width and decoded school seals, with zero anonymous private-community requests, unexpected errors, failed site assets or navigation cancellations. One workspace-blocked backend-status request was recorded separately. The stable production preview is running on 5173 from a separate build copy and passed the same fresh-browser checks. No personal login, production friend request, email, database migration or cloud-environment publication was performed. The reading room and cancelled profile-border work remain unchanged.

## Reading room study library

- [x] Add original structured study notes for all 27 decks, preserving existing source cards, citations and reading controls.
- [x] Add a searchable 118-element periodic table with accurate groups/periods, family explanations and accessible phone controls.
- [x] Add labelled interactive science illustrations and downloadable, self-contained PDF study handbooks.
- [x] Verify content, periodic-table data, documents, offline reading, accessibility and existing learning/account flows.
- [x] Publish and verify the complete reading room on the public website.

Local checks passed lint/typecheck, 66 unit/property tests, all 972 reviewed cards, 13 curated reference addresses, generated SQL consistency, economy simulation and PDF source/artifact integrity. The complete 42-case standard browser suite passed. All four reading-library cases passed again after the final handbook regeneration and print fix; five cloud guidance/source/suggestion/teacher-stock cases and the Pages-path case also passed. Coverage includes all 27 guides and their self-checks/citations, all 118 elements, exact-symbol search, family filters, element-dialog focus return, ten labelled models, circuit switching, 320-pixel accessibility/bounded scrolling, real PDF downloads, offline reading and cached PDF byte ranges. Printing hides the app only while a study guide is open; other pages retain normal print visibility. PDF metadata/text and phone/desktop screenshots were inspected; an actual browser print export retained the complete Cells guide and its citations. The water-cycle model distinguishes soil from surface water. Final screenshot review caught the shared outline-button hover style overriding selected backgrounds; the reading controls now preserve selected contrast, and focused periodic/model accessibility scenarios passed with explicit hovered shelf, layout and label checks. Existing source cards, citations and short topic reading are preserved. No database migration, private credential or real email request is needed for the library. The development preview is running and passed fresh-browser library/element checks with zero errors.

Application commit 9ef3a58b35607a8f685a5c9f56e589845104861c is published. [Run 43144185169](https://github.com/julomjohnlouise19-cloud/SHEN-LOVE-EMU-HOUJO/actions/runs/43144185169) passed both jobs, 66 unit/property tests, all 95 browser scenarios (42 standard, 52 cloud, one Pages), code/content, isolated PostgreSQL and PDF integrity gates. Actual readiness notices verified schema 1, platform 3, 972 questions, suggestion inbox version 1 and enhanced teacher profile details installed. Public entry index-Cq7Oaz7D.js, shell-CkNJ26Rf.js and stylesheet index-k0YFfYOv.css matched the configured build byte for byte. Live phone/desktop checks passed the original source notes and links, full Cells guide/self-check/citations, 118-element lookup and element-dialog focus return, ten illustration cards, circuit switching, all five PDF signatures/sizes/SHA-256 hashes and a real downloaded PDF. Offline reload retained the document shelf; Cells notes and the water-cycle model worked without internet; a PDF range returned the exact 32 bytes with HTTP 206 and the correct total size. Phone element accessibility, bounded layouts, decoded school logos and screenshots passed inspection. There were zero unexpected browser errors, failed site assets or navigation cancellations. Two workspace-blocked backend-status requests were recorded separately; real readiness was verified by GitHub. The existing DepEd publisher still returned HTTP 403 in GitHub's external check; the new self-hosted notes and PDFs provide independent reading without claiming that upstream restriction was removed. No real email, private account login, database migration or cloud-environment publication was performed.

## Signup section choices

- [x] Replace the signup section text field with a native dropdown containing the 20 unique supplied section names.
- [x] Verify selected sections are retained and sent correctly, and check signup on phones and in the local demo.
- [x] Publish the tested change and verify the list on the public website.

Native lint/typecheck, 63 unit tests, 972-card validation and SQL consistency passed. Updated existing browser coverage passed four cloud signup/email-recovery scenarios, the local signup/password-change case, the Cells learning slice and the Pages-path case. Selected Grejalde is preserved through the terms dialog and sent in Auth metadata; SSC survives local registration and failed-confirmation form recovery. The configured production build passed.

Application commit 6774d6f7773fa58273ff34c4401667dcc0134346 is published. [Run 43134035500](https://github.com/julomjohnlouise19-cloud/SHEN-LOVE-EMU-HOUJO/actions/runs/43134035500) passed all code, database and 91 browser scenarios and Pages publication. Published entry index-DkTaOKLm.js and shell-CnSAlnhZ.js matched the configured build byte for byte. Live phone/desktop checks verified all 20 exact names in the supplied order, unique Estiola, every option selectable, selection retention through Sign in/Join and reading terms, and 16-pixel phone controls with no horizontal overflow. Screenshots were inspected. No unexpected browser errors or failed site assets occurred; the known workspace restriction on the backend-status host was recorded separately. No actual signup email or production record was created during verification.

## Reliable password-reset links

- [x] Reproduce the email-link return that fails to open the new-password form, including a previously signed-out browser.
- [x] Restore only verified recovery sessions, keep the form usable after refresh and handle missing/expired links clearly.
- [x] Make recovery independent of classroom database availability and improve the account reset controls on phones.
- [x] Pass code, content and account/browser checks, publish and verify the public reset interface; document any owner-only email-template/redirect settings.

Reproduced the reported return failure with an actual SDK recovery-code exchange after logout: the old per-tab logout flag prevented classroom identity binding, so the new-password form never opened. The new Auth-only recovery handler revalidates a short-lived tab marker and supersedes that old logout flag only for the verified account. Native checks passed lint/typecheck, all 63 unit/property tests, 972 reviewed cards, SQL/source consistency and the economy simulation. Browser coverage passed all 52 cloud scenarios, ten standard learning/welcome scenarios and the repository-path scenario; seven focused reset checks also passed. New cases cover logout then callback/reload/save/continue, a delayed unavailable classroom backend, absent browser verification, expired codes and a normal session with only a recovery URL. The 320-pixel verified form passed WCAG AA checks and its screenshot was inspected. No real reset email, personal login or database mutation was performed. The exact owner-only email button/redirect setup and complete template are prepared in docs/PASSWORD_RESET.md and docs/emails/reset-password.html.

Application commit c1b3dee227bdfd412ad9ca609608dad3fe40b613 is published. [Run 43129575302](https://github.com/julomjohnlouise19-cloud/SHEN-LOVE-EMU-HOUJO/actions/runs/43129575302) passed the full 91 browser scenarios (38 standard, 52 cloud, one Pages), code/content and isolated PostgreSQL gates, and Pages publication. The live entry index-CxcpLM40.js and shell-Dmv7a-sd.js matched the configured production build byte for byte. Public 320-pixel checks passed the reset request, edited-email retention, unverified-link instructions, absence of password controls without proof, URL cleanup, reload and decoded school logos, with zero unexpected errors or failed site assets. An earlier request cancellation during navigation was identified as ERR_ABORTED; the logo returned HTTP 200 and decoded correctly, and the completed run had no cancellations. The known workspace project-host proxy restriction was recorded separately. Real personal email delivery and the private project's email-template/redirect settings were not exercised or changed. GitHub also verified that enhanced teacher profile details are now installed on the live project.

## Account agreements, scientist profiles and school collection

- [x] Add readable classroom terms/privacy information and an explicit, initially unchecked signup agreement; retain a versioned acceptance record.
- [x] Show profile photos and detailed scientist records in Teacher Studio, with server-checked access to biography, account email and agreement details.
- [x] Add clear ban/restore actions with confirmation and reasons; enforce existing server account-access checks and preserve student records.
- [x] Add teacher-editable collection instructions, reservation confirmations and persistent pickup reminders for the Grade 10 SSC classroom.
- [x] Verify signup, photos/privacy, bans/restoration, reservations, mobile layouts and additive database compatibility; publish and verify live capabilities.
- [x] Owner activation: accounts-upgrade.sql is installed on the live project. Run 43129575302 reported enhanced teacher profile details installed, enabling email, biography and agreement details.

Local release checks passed: lint/typecheck, 63 unit/property tests, all 972 reviewed questions, source/SQL consistency, economy checks and 86 browser scenarios (38 standard, 47 cloud, one repository-path). A focused rerun verified the latest teacher photo-removal refresh and phone terms/profile layouts. Browser fixtures made no real accounts or email requests. Isolated PostgreSQL tests verified teacher-only profile fields, omitted credentials, submitted/legacy consent, banned account reads/writes, ban/restore with reasons and idempotent audit, teacher protection, pickup validation, unchanged records/wallets/orders and repeated upgrades. The configured production build passed.

Application commit cb5308bac21f3e6c37fdb5ab4129b2147f682a26 is published. [Run 43124111510](https://github.com/julomjohnlouise19-cloud/SHEN-LOVE-EMU-HOUJO/actions/runs/43124111510) passed all gates and Pages publication. Its actual backend check confirmed schema 1, platform 3 and 972 questions; it reported enhanced teacher email/biography/agreement details awaiting accounts-upgrade.sql. Public entry index-PqSEWn6a.js and shell-B2ZBu3ku.js matched the configured build byte for byte. Live phone tests verified unchecked signup gating, readable terms without automatic acceptance, in-app science reading, eight 320-pixel routes, touch navigation/help, Daily spin persistence and landscape profile controls. Published terms and source screenshots were inspected. There were zero unexpected application errors or failed site assets. The workspace's known project-host proxy restriction was recorded separately; no real signup email, private account login, production ban or database mutation was performed. At that release the account-details activation still awaited the owner. It was subsequently verified installed by run 43129575302. The tested guide and complete script remain in docs/ACCOUNT_UPGRADE.md and supabase/accounts-upgrade.sql for other installations.

## Reliable, readable science sources

- [x] Replace the generic DepEd destination with a science-specific reference and make publisher links explicit.
- [x] Provide useful local reading for every deck, clear copy/open controls and mobile-friendly source search/empty states.
- [x] Verify sources, reading, navigation, offline behavior and existing gates.
- [x] Publish and verify the live source update.

The restored workspace retained the source repair and completed logs: lint/typecheck, 62 unit tests, all 972 reviewed questions, SQL consistency, economy checks and 80 browser scenarios passed (38 standard, 41 cloud and one repository-path). New source scenarios read all 27 decks, reload notes offline, filter/reset with accessible empty states, exercise denied-clipboard selection and verify same-tab document navigation. Source commit 39d846c09e24880816c465c152a576b1a781208f passed publication in run 43118964630. Live in-app reading and the PDF destination were verified again with the account release above. GitHub reported HTTP 403 from the DepEd PDF server, independently of the workspace's proxy restriction; do not claim that upstream restriction was removed. The local reading alternative remains functional.

## Stable mobile experience

- [x] Audit student and teacher pages, account dialogs and learning controls at 320/390-pixel portrait, tablet and short landscape sizes.
- [x] Fix phone typography, touch targets, safe areas, scrolling and long content without changing saved data or classroom rules.
- [x] Make the mobile menu dismissible, keyboard-contained and independent of background scrolling; keep guide and notifications accessible on phones.
- [x] Make teacher and saved-record tables readable and actionable on narrow screens, preserving selection, editing and accessibility.
- [x] Verify mobile account, learning, profile, shop and teacher workflows and complete existing code/content/browser gates.
- [x] Publish to GitHub Pages and verify the actual phone interface and deployed backend readiness.

Local validation passed lint/type checking, all 62 unit/property tests, 972 reviewed cards, SQL-generation consistency, economy checks and all 77 browser scenarios (35 standard, 41 cloud, one repository-path). Touch checks cover 16 student routes at 320 × 568, 390 × 844, 768 × 1024 and 844 × 390; all ten teacher sections at phone, tablet and landscape sizes; long names; profile/feedback/claim/question dialogs; form values through resizing; stock/availability save and reload; record selection/archive/restore; and a complete eight-card Cells session. Drawer focus remains contained through a background render and returns to the trigger; background scrolling stays fixed. Native dialog padding taps no longer dismiss forms. Source and stock-dialog accessibility checks passed, and phone stock/landscape profile screenshots were inspected. The initial full run caught collection text sharing an element with hidden card labels; separating the value fixed it, and the complete final rerun passed. No new dependency, SQL migration, account-data reset or environment publication is required.

Run 42967941133 passed live readiness, code/content and PostgreSQL checks but failed its standard browser step, so publication remains gated. Its check annotation contains only an exit code, and the workspace proxy denies the separate results-receiver.actions.githubusercontent.com log host. Add the standard GitHub test reporter to expose specific browser assertions through the already available check annotations; keep all scenarios and assertions in place.

Run 42968730983 stopped in the isolated PostgreSQL check before reaching browsers. The same complete database suite passed locally. Inspection of the official image's entrypoint confirmed a temporary Unix-socket-only server before its final restart; change the test probe to loopback TCP so it cannot mistake initialization for readiness. The updated complete PostgreSQL suite, lint and typecheck passed locally. Database exceptions are now annotated before being rethrown, preserving the failing exit and container cleanup. No classroom SQL or records were changed.

Run 42969490317 passed database verification and 34 standard browser scenarios. The new annotations isolated the remaining failure to the new touch test reading the previous question's heading during the next-screen transition. Wait for the actual question number and answer controls before reading its prompt; likewise wait for the requested teacher page's breadcrumb before its loading indicator. The complete focused eight-answer touch lesson and loaded teacher-layout audit both passed after these synchronization fixes. No scenario, assertion or timeout was removed or relaxed.

Run 42970483750 passed all 35 standard and 40 of 41 cloud scenarios. Its remaining existing draft-recovery test reloaded immediately after clicking an asynchronous save, before the storage transaction confirmed completion. Wait for the existing “Draft saved on this device” confirmation before testing reload recovery. That focused scenario, lint and typecheck passed with the confirmation wait; the same saved-value and eventual classroom-delivery assertions remain required.

Release e8609d3b7feedec30311d95fc6c0364f7fb00ed8 is published. [Run 42971638100](https://github.com/julomjohnlouise19-cloud/SHEN-LOVE-EMU-HOUJO/actions/runs/42971638100) passed both jobs, including all 62 unit tests, database assertions and 77 browser scenarios. Its live notices again verified schema 1, platform 3, 972 questions and suggestion inbox version 1. The public entry index-Di-doU82.js and shell-YT9aFxEW.js matched the configured production build byte for byte. Live 320-pixel touch checks passed the email form layout, drawer/help and focus return, eight page layouts, the retained Daily spin and saved reward after reload; the 844 × 390 profile used its compact return header. Phone menu and landscape profile screenshots were inspected. There were zero unexpected browser errors and failed website assets; two workspace-blocked backend status requests were recorded separately, with real readiness verified by GitHub. No personal credentials, real signup email, database migration or cloud-environment publication was used. Reload the existing website link to receive the mobile update.

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

## Colorful experience, navigation and classroom record care

- [x] Refresh the complete shared design, add three persistent accessible color themes, and redesign the profile with clear sections and useful progress.
- [x] Add consistent destination-labeled Back links and breadcrumbs, and make dialog return/close controls clear on phones.
- [x] Add clean, filterable quiz/arcade records with summaries, date ranges, sorting, feedback and exports.
- [x] Expand Teacher Studio with arcade analytics, audited bulk archive/restore, record health and server-checked teaching-role controls.
- [x] Supply and test an idempotent platform-3 upgrade preserving existing records, credits, stock and teacher edits.
- [x] Pass code/content/database/browser/mobile/accessibility checks, push to GitHub and verify the configured deployment.
- [x] Owner activation: run studio-upgrade.sql on the live project and refresh to enable advanced record/role controls. Run 42919438297 subsequently verified schema 1, platform 3 and all 972 questions.

- [x] Prioritize fast email login, nonblocking welcome, clearer error/loading states, password recovery and a verified reset form.


Application commit dbdfcebed3e2229dae50088a3b349b8300a716ce and capability-report commit a098f02cac1fc9adef342029b9d0a249f75b2251 are on main. Runs 42773209629 and 42773721321 passed both jobs. The final readiness notice explicitly verified schema 1, platform 2 and 972 questions. Login/design remain compatible; archive/record-health/delegation activate after owner-run studio-upgrade.sql. The Supabase Preview check succeeded. The public module index-W8JEQqVe.js matched the verified configured build; live login/recovery UI, phone bounds, profile theme/bio persistence, sticky return controls, Back navigation, guest arcade scoring, logout/reload and welcome accessibility passed. No real email was requested or personal account credentials used. The workspace's direct project host is still blocked by the unapplied environment draft.

## Email delivery failure and recovery

- [x] Explain confirmation/reset delivery failures without exposing mail-server errors or claiming an email was sent.
- [x] Add useful confirmation recovery, preserved signup details, visible request countdowns and atomic cross-tab email cooldowns.
- [x] Document the observed incorrect Gmail SMTP host and the correct private dashboard configuration.
- [x] Pass code/content/browser/accessibility gates, push and verify the website deployment.
- [ ] Owner configuration: replace the SMTP Host settings-page URL with smtp.gmail.com and verify the private Google App password.

Code lint/type checks, 60 unit/property tests, all 972 reviewed questions, deterministic economy checks and generated SQL consistency passed. Browser verification passed all 31 standard, 29 cloud and one repository-path scenarios, including failed signup/reset email, preserved non-password signup details, failure/accepted resend states, persistent countdowns, explicit guest practice, confirmed-account login during a cooldown and one shared request across simultaneous tabs. Mobile mail recovery passed WCAG AA checks and fit 390 px. Automated tests sent no email. No SQL or saved records were changed for this repair. A separate existing deployment notice (run 42919438297) confirmed the owner's live platform-3 upgrade.

Application commit 07f68329e791ca27b78f7addca6b4595dba6d192 is on main. [Run 42923224980](https://github.com/julomjohnlouise19-cloud/SHEN-LOVE-EMU-HOUJO/actions/runs/42923224980) passed build and Pages publication, including PostgreSQL permissions/grading and all browser checks. Its notice again verified schema 1, platform 3 and all 972 questions. The public HTML loaded index-DfT1cxxH.js; both that entry and shell-D15NvNA1.js matched the verified configured production build byte for byte. Private SMTP configuration and real email delivery were not exercised: the owner must correct the invalid Host shown in their screenshot and verify their Google App password in the private dashboard.

The requested project-scoped Supabase MCP entry was added to the installed Codex CLI. OAuth metadata discovery could not connect under the current runtime network policy; MCP/project domains remain only in the saved, unapplied environment draft. No authenticated Supabase MCP tools are available in this chat. No environment was published and no private key or SMTP password was used.

## Reliable account entry and a learning-first lab

- [x] Reproduce and repair successful sign-in that remains on the welcome hub, including old cached identities, saved destinations and teacher entry.
- [x] Remove only the Science Arcade/shooting area from active student and teacher interfaces and handle old links cleanly. Keep and improve Daily spin; retain the other learning/classroom features and the local practice leaderboard.
- [x] Make the learning dashboard more personal and interactive with a real progress trail, science discovery controls and a distinctive responsive design.
- [x] Preserve existing accounts, notebook pages, quiz evidence, balances and historical records; document the simpler owner steps.
- [x] Pass the required code/content/browser/accessibility gates, upload to GitHub and verify the public deployment.

Reproduced the reported welcome-hub symptom with a recreated account whose email matched an old cached identity: sign-in showed a success toast while no valid local session could open. The repair keeps the previous identity's notes separate, restores a previously duplicated cache without resetting it, validates session envelopes, and only reports success for an active verified account. A second regression exposed competing post-login redirects; capturing the requested destination before sign-in preserves the correct notebook/learning page. Student entry, teacher entry and notebook retention now pass dedicated tests.

The shooting arcade's pages, audio, client commands, rankings/history controls, teacher settings and unused styles were removed. Legacy links redirect to learning/class reports. The daily wheel and local practice leaderboard remain; the wheel has themed sectors, a consistent daily landing, saved reward feedback and topic/notebook actions. Rewards and one-spin-per-day limits are unchanged, including two-tab protection. The learning trail uses actual practice data and curated science facts. No SQL, server records, wallets or stock were changed.

Lint, type checks, 60 unit/property tests, all 972 reviewed questions, SQL consistency and economy checks passed. All 32 standard browser scenarios passed. Cloud checks passed 31 of 32 on the final full local run; the remaining records-reload check exceeded its five-second expectation during a slow startup, then passed unchanged on a focused rerun. The repository-path scenario passed, completing 65 unique browser scenarios. The tested dashboard themes and narrow wheel passed WCAG AA checks with no unexpected browser errors. Desktop and 320-pixel screenshots were inspected. GitHub's full checks and public asset verification remain the final publication gate.

Application commit 111e1cf3fdc11fa716ec7643c5820d88fb67985f is published. [Run 42937525420](https://github.com/julomjohnlouise19-cloud/SHEN-LOVE-EMU-HOUJO/actions/runs/42937525420) passed its complete code, database, browser and Pages gates, including the previously slow local reload scenario. It verified schema 1, platform 3 and 972 questions. Public index-Dp_gF6nr.js and shell-CnQaU5zf.js matched the configured production build byte for byte. The bundle includes the retained daily wheel and learning trail and no shooting-start client. Only the arcade/shooting interface was retired; the daily wheel and other learning/classroom features remain. The owner needs only an online hard refresh and normal website sign-in. No SQL, new keys, SMTP change or clearing of browser site data is required for this update. No real credentials or email deliveries were used in automated verification, and no environment was published.

## Clear guidance, science references and classroom suggestions

- [x] Make page returns and dialog save/return actions prominent on desktop and phones.
- [x] Add a skippable personal guide after account entry, with student/teacher steps and an always-available replay.
- [x] Link all 27 decks and answered cards to relevant educational references, distinguishing original questions and constructed practice data from quoted sources.
- [x] Implement a private, durable suggestion box with student history and a teacher inbox/status/reply workflow, including an idempotent existing-project SQL upgrade.
- [x] Fix teacher shop edits: include the category required by the server; verify stock, availability, saved state and student-shelf behavior.
- [x] Complete database, code/content, browser and accessibility gates; publish and verify the actual deployed capabilities.

Local checks passed lint/type validation, 62 unit/property tests, 972 reviewed cards, SQL generation consistency, economy checks and all 70 browser scenarios (32 standard, 37 cloud, one repository-path). The teacher regression explicitly verifies category submission, hiding with zero stock, checked-state persistence after reload, re-listing with three items and the student's reserve control. Guide completion/replay, 27-deck reference coverage, safe citation links, private student/teacher messages, saved drafts while the live inbox is unavailable and reply visibility passed. PostgreSQL tests enforce actual student ownership/actor binding, teacher authority, daily limits, idempotency, optimistic versions, audit history and upgrade preservation. No personal email or private account credential was used. The new shared inbox requires the additive suggestions-upgrade.sql on the live project; compatibility checks report its installation separately from platform 3.

Application commit 857acff0e42d0dbe3982219eb1cd1af852bc47e0 is published. [Run 42961444956](https://github.com/julomjohnlouise19-cloud/SHEN-LOVE-EMU-HOUJO/actions/runs/42961444956) passed every build/database/browser check and Pages publication. Its actual backend notices verified schema 1, platform 3, 972 questions and **suggestion inbox version 1 installed**. The previously described owner activation step is therefore complete on this project; no additional SQL or keys are needed. Public index-BISM_jRp.js and shell-Dk_8NA3j.js matched the configured production build byte for byte. Live 320-pixel checks passed reading-room/source dialog content, accessible source controls, prominent returns, guest draft access and the signed-in-only send guard; source and suggestion screenshots were inspected. The workspace proxy still blocks the direct backend-status request; that expected restriction was recorded separately from application errors and failed website assets. Real backend readiness was verified by GitHub's live check, while ownership and teacher reply behavior were exercised in PostgreSQL and controlled browser tests. No real signup email or personal login was used, and no cloud environment was published.
