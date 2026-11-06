# Cozy Science Lab

A local-first science learning game for Philippine Grade 7–10 students. Vite + strict TypeScript, no UI framework or production JavaScript dependencies. All illustration is inline SVG. Google Fonts are self-hosted with OFL licenses.

## Open the website on GitHub Pages

Play at **https://julomjohnlouise19-cloud.github.io/SHEN-LOVE-EMU-HOUJO/**. The GitHub repository stores the source code; GitHub Pages serves the built website. The corrected deployment and live desktop/mobile display were verified; see [the successful workflow run](https://github.com/julomjohnlouise19-cloud/SHEN-LOVE-EMU-HOUJO/actions/runs/42183402991).

One-time repository setup (already enabled for this repository):

1. Open [Settings → Pages](https://github.com/julomjohnlouise19-cloud/SHEN-LOVE-EMU-HOUJO/settings/pages).
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. Open [Deploy Cozy Science Lab](https://github.com/julomjohnlouise19-cloud/SHEN-LOVE-EMU-HOUJO/actions/workflows/pages.yml). If an earlier run failed before Pages was enabled, choose **Run workflow** on `main`.
4. Wait for both the build and publish jobs to finish successfully, then open the website address above. Future pushes to `main` automatically test and publish updates.

Open the HTTPS website to play. Double-clicking a downloaded `index.html` uses `file://`, where the app's module, styles and question banks cannot load as a complete Vite application. The HTML includes a styled startup panel with a direct online-lab link, so missing scripts or disabled JavaScript do not leave an empty page. To run on your computer, download or clone the whole project and follow **Start** below.

Creating the Pages site is an account-owner setup step. The connected integration can push code but returned **403 “Resource not accessible by integration”** when asked to create the Pages site. In that case, use the settings link above; publishing the cloud development environment alone does not enable website hosting.

The workflow tests both the normal URL and the repository path before publishing. `VITE_BASE_PATH=/SHEN-LOVE-EMU-HOUJO/ npm run build` builds the Pages version, including matching offline cache paths. A different repository name needs its corresponding path. Profile data remains local to each browser; GitHub hosting does not synchronize accounts or progress.

## Start

Use the existing checkout at `/workspace/SHEN-LOVE-EMU-HOUJO`. Cloud tasks are already isolated; do not create a worktree unless explicitly requested.

Requires Node.js 22.12+ (tested on Node 24), npm, and a current browser with Web Crypto. Use localhost or HTTPS.

```sh
npm ci
npm run dev
```

Production: `npm run build`, then `npm run preview`. Vite prints the local port. The development server binds to all interfaces; it is not a production deployment.

## Play

- Explore as a guest immediately, or join to create a separate local profile. New profiles get 24 starter merits by default.
- Pick a Science Island branch, deck and difficulty. A session draws eight cards from a 12-card pool. Grades recommend, never lock. Skills Lab opens at Level 4.
- Use hints, learn from explanations, collect merits/XP, and grow mastery. Wrong answers enter a six-box spaced Review Box.
- Daily spin, two quests, a seeded Daily Challenge, facts, streaks, badges and a local XP leaderboard encourage steady learning.
- Keep notes or suggested misconception repairs, try the force-and-mass experiment, and share seeded Challenge Links.
- Exchange merits for supplies, redeem the code, then ask a teacher to verify collection at the Grade 10 SSC room.

**Local demo: no real order is sent, no physical stock is reserved, and no notification leaves this browser.** Real school rewards need school approval and verification.

## Demo security and admin

Default admin: **`admin` / `admin123`**. Open your profile to sign in; Mission Control appears for admins. The hint is dismissible. Change the default before sharing a demo, and never reuse a real password.

**This is client-side demo security. Production needs a real backend, server-side password hashing and server-enforced roles.** Passwords use PBKDF2-SHA-256, 150,000 iterations, random per-user salt. People who control browser storage can alter local roles, inventory and balances. Production also needs authoritative time, transactions, secure sessions and server audit records. CSP and safe DOM rendering do not make client storage trustworthy. Do not use real student personal data or valuable rewards in this demo.

Sessions last eight hours and are per tab. Five failed login attempts trigger a persisted 30-second cooldown. Routes and commands check roles. Admin tools cover balances/presence, section accuracy, misconceptions, stock/prices, claims, all economy rules, question overlays, JSON/CSV imports, notifications, audit and latest-change undo. Undo rejects changes after any newer transaction to protect newer work.

## Science and authoring

**972 static questions**: 27 decks × 3 levels × 12 cards, including 36 fixed hard calculations and 45 evidence tables. At least 15% carry Philippine-context flags. Supported answers: choice, text, order, matching, diagram, calculation and data/evidence. The seeded calculator library is separate from the static minimum.

Each deck sheet states its Philippine K–12 curriculum area. No official competency codes are invented. This is not an official DepEd publication. The supplied brief ends at §4.8; referenced §§5–16, Appendix A and design images were absent. `DECISIONS.md` documents adopted defaults.

Edit one deck in `scripts/content-*.ts`, skeptically review every variant and distractor, then run:

```sh
npm run gen:questions -- --deck=life.cells
npm run validate:questions
```

Authoring validates each deck before writing. `reviewed: true` records an author review, not a guarantee of teacher approval. Teachers should review suitability for their class. Admin edits are overlays over immutable static banks. JSON imports require full schema-v2 objects. CSV uses schema field names; structured cells (`options`, `answer`, `accept`, `data`) contain JSON.

Validation checks schema, topics, grades, review status, choice uniqueness, misconception tags, Jaccard duplicates, explanation/sentence length, approximate Flesch–Kincaid grade ≤9 excluding a science-term allowlist, banned phrases, answer-slot/length bias, coverage and Philippine context. Readability remains a heuristic.

## Economy

One editable rules object controls rewards. Defaults: 3/5/7 merits per correct easy/medium/hard answer, modest three-answer combos, **120 daily play/review merits total**, 12/3 XP per correct/attempt, 120 XP per level. Correct due reviews earn up to 2 under the same cap. Daily spin: 0–12 once; two quests: 8 each once; Daily Challenge: 10 once. Daily keys use **Asia/Manila** by default.

`npm run sim:economy` simulates seeded 30-day gentle, steady and repeated-play scenarios and fails on cap violations. Repeated play cannot bypass the play merit cap. This is a model, not proof of backend exploit resistance or real school costs.

## Storage, offline and recovery

- `store/` owns localStorage. One versioned state envelope gives atomic writes even on quota failure. Web Locks serialize tabs, with a settling lease fallback. BroadcastChannel/storage events synchronize them.
- Question banks load per branch and are never copied into localStorage. Accounts are shared only on one browser/origin, not across devices. Presence means active here within two minutes.
- **Production builds** precache the shell, local fonts and all static science banks in the background. Wait for the first load to finish before going offline; after that, even unvisited decks work without a connection. Development deliberately does not register the worker.
- Export a private backup from your profile. Admin → Audit & backup validates restores before replacement, then signs everyone out. Exports omit sessions and undo payloads.
- Invalid JSON is quarantined at `csl:corrupt:<timestamp>`. Safe defaults load. Quota failures offer export and do not deduct balance or stock.
- `npm run seed` writes a validated fresh demo backup to `/tmp/cozy-science-seed.json`. It does not clear browser data; an admin may explicitly restore it to reset a demo.

## Checks

```sh
npm run lint
npm run typecheck
npm test
npm run validate:questions
npm run sim:economy
npm run seed
npm run build
npm run e2e
npm run e2e:pages
```

Playwright uses `/usr/bin/chromium` here; set `CHROMIUM_PATH` elsewhere. The normal production browser suite uses port 4173; the Pages-path suite uses 4174. Both can coexist with development on 5173, but run the two suites sequentially because each rebuilds `dist`. Browser checks cover learning/review, accessibility/mobile, accounts, rewards, supply redemption, admin collection and two-tab last-stock safety. A JavaScript-disabled check serves the exact source HTML without Vite transforms and verifies its styled online link; managed Chromium blocks direct `file://` navigation. The Pages check covers desktop/mobile layout, fonts, a loaded Cells session and offline access to an unvisited deck under the repository path. Unit/property tests independently check every calculator over 200 seeds. `PLAN.md` records phase gates. Live processes must restart in a restored cloud task; retained files alone do not start the server.
