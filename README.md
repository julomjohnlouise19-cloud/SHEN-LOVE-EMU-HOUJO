# The Cozy Science Lab

A local-first science learning game for Philippine Grade 7–10 students. Vite + strict TypeScript, no UI framework. The optional Supabase backend uses the official browser SDK. Learning illustrations are inline SVG; the supplied Gun-ob High School seal is shared across the website as a transparent image. Google Fonts are self-hosted with OFL licenses.

## Open the website on GitHub Pages

Play at **https://julomjohnlouise19-cloud.github.io/SHEN-LOVE-EMU-HOUJO/**. The GitHub repository stores the source code; GitHub Pages serves the built website. School branding, topic search, saved-session resume, welcome/logout and desktop/mobile layouts were verified on the live site; see [the latest successful workflow run](https://github.com/julomjohnlouise19-cloud/SHEN-LOVE-EMU-HOUJO/actions/runs/42971638100).

One-time repository setup (already enabled for this repository):

1. Open [Settings → Pages](https://github.com/julomjohnlouise19-cloud/SHEN-LOVE-EMU-HOUJO/settings/pages).
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. Open [Deploy The Cozy Science Lab](https://github.com/julomjohnlouise19-cloud/SHEN-LOVE-EMU-HOUJO/actions/workflows/pages.yml). If an earlier run failed before Pages was enabled, choose **Run workflow** on `main`.
4. Wait for both the build and publish jobs to finish successfully, then open the website address above. Future pushes to `main` automatically test and publish updates.

Open the HTTPS website to play. Double-clicking a downloaded `index.html` uses `file://`, where the app's module, styles and question banks cannot load as a complete Vite application. The HTML includes a styled startup panel with a direct online-lab link, so missing scripts or disabled JavaScript do not leave an empty page. To run on your computer, download or clone the whole project and follow **Start** below.

Creating the Pages site is an account-owner setup step. The connected integration can push code but returned **403 “Resource not accessible by integration”** when asked to create the Pages site. In that case, use the settings link above; publishing the cloud development environment alone does not enable website hosting.

The workflow tests both the normal URL and the repository path before publishing. `VITE_BASE_PATH=/SHEN-LOVE-EMU-HOUJO/ npm run build` builds the Pages version, including matching offline cache paths. A different repository name needs its corresponding path. GitHub hosting alone does not synchronize accounts or progress. Optional Supabase cloud mode is described below.

The mobile menu, readable account forms, compact dialogs and labelled teacher/record cards are live, alongside the guide, science references, prominent returns, teacher shop save repair and private suggestion inbox. [Run 42971638100](https://github.com/julomjohnlouise19-cloud/SHEN-LOVE-EMU-HOUJO/actions/runs/42971638100) passed 62 unit tests, all code/content/database checks, 77 browser scenarios and Pages publication. Its live readiness notices verified **schema 1, platform 3, all 972 questions and suggestion inbox version 1**. No further SQL setup is needed. Daily spin, quizzes, profiles, photos, notebooks, wallets, stock and teacher tools remain; the shooting arcade stays retired. Reload the website on your phone, or use **Ctrl+Shift+R** on a computer, and sign in normally. Email sender configuration and quotas remain owner settings; real email delivery and personal account credentials were not exercised during this update.

## Friendly guide, reading sources and suggestions

Accounts receive a skippable guide with student or teacher steps after login. It never blocks a deep-linked lesson and can be reopened from **How it works / Studio guide**. The guide remembers its completion for that account, role and browser. Large sticky **Back to …** controls name the return destination; dialog return and teacher Save/error controls remain visible.

Every deck and answered card offers **Sources & further reading**. The **Science reading room** links curriculum context and relevant OpenStax, NASA, USGS, DOST–PAGASA, DOST–PHIVOLCS and BIPM resources. Questions are lab-authored practice, not quotations from those publishers. Constructed calculation/table data and teacher revisions are identified. External references require connectivity; saved citation notes stay available offline. The official OpenStax Biology 2e collection was checked through its publisher repository; external reference pages were not all fetched in this restricted environment.

**Suggestion box** lets a signed-in student send an idea, question or problem, optionally tied to a deck/card. Teachers use **Suggestion inbox** to review, change progress and reply privately. Authors can see their own history and replies; other students cannot. The inbox has a five-message daily limit, retry protection, paging and audited teacher replies. Drafts stay on the device and are never labelled delivered. The local demo inbox is shared only with its demo teacher on that browser.

**This project's inbox is already activated**, as verified by the deployment's live capability check. For other existing cloud projects: Supabase → SQL Editor → New snippet → paste the complete [suggestions-upgrade.sql](supabase/suggestions-upgrade.sql) → **Run** → refresh Suggestion box. The script adds its own tables/RPCs without resetting accounts, quizzes, wallets or stock. Until activated, the new UI preserves drafts and explains that classroom delivery is unavailable. New `setup.sql` includes the inbox. No secret key belongs in the website.

Teacher shop saves now include the category required by the database, so stock and visibility choices can actually apply. Changes require **Save changes**; checking a box alone is a pending choice. A saved server edit stays successful if refreshing secondary totals fails, and the interface explains when a refresh is needed. Existing reservations, roles, stock concurrency protections and the retained daily wheel remain intact.

## Sign-in, learning and the daily wheel

On phones, the header stays available while scrolling and the menu provides its own **Close menu**, **How it works / Studio guide** and **Notifications** controls. The drawer keeps background scrolling and keyboard focus contained; closing it returns to the menu button. Teacher and saved-record tables become labelled cards on narrow screens, retaining selection and edit/review actions. Forms use 16-pixel text and larger touch targets, account fields appear before the decorative welcome panel, and short landscape dialogs have compact return controls. Screen resizing keeps entered form values. Browser zoom remains enabled and spacing respects device safe areas. This frontend update does not require SQL or change saved records, balances, stock rules or the daily wheel.

The arcade/shooting game is retired from the website. The daily spinning wheel, local practice leaderboard, quizzes, profiles, notebook, rewards, shop and Teacher Studio remain. Old arcade links lead to science learning or class reports; historical database records and credit evidence are preserved. No SQL update is needed for this interface change.

Successful sign-in opens **My lab** for a student or the separate **Teacher studio** for a teacher, while keeping a requested learning destination. A recreated account that reuses an old cached email gets its own verified identity; previous private notes remain with the previous account. A continuing verified identity keeps its own notes and progress. The cache repairs itself without clearing site data.

The dashboard offers a personal **learning trail**, a daily eight-answer goal, relevant review and notebook shortcuts, a fresh-topic recommendation and browsable science facts. These practice counters are clearly scoped to the device. The retained **Daily spin** follows the selected color theme, explains availability and the next classroom calendar day, saves one reward, restores it after refresh and opens related science or the notebook. The reward amounts and one-spin-per-day rule are unchanged; class shop credits remain separate from local practice merits.

After publication, open the website, press **Ctrl+Shift+R** once, sign in with your **website password**, and choose a science topic or **Daily spin**. Keep notebook data: do not clear site storage to install this update. No Gmail, API-key or database setting needs to be changed for the post-login UI fix.

## Connect a Supabase backend

Follow [the complete Supabase setup guide](docs/SUPABASE_SETUP.md). Run the generated [setup.sql](supabase/setup.sql) in your project, configure Auth URLs, appoint the teacher with [bootstrap-teacher.sql](supabase/bootstrap-teacher.sql), then supply the public project URL and publishable key as GitHub repository variables. Local development uses the settings in [.env.example](.env.example). No private key is needed in the app.

For **Error sending confirmation email**, follow the [email delivery repair guide](docs/CLASSROOM_UPGRADE.md#a-small-class-gmail-setup). Gmail's SMTP Host is `smtp.gmail.com`, not the Google App passwords page URL; the App password belongs only in the private SMTP Password field. The website distinguishes rejected email requests from accepted ones, preserves non-password signup details within the open dialog, and shares a persistent request cooldown across tabs, signup, confirmation and password reset. A failed first signup may need to be created again after the sender is repaired; confirmation retries are available for existing accounts. Confirmed-account password login does not request an email, and guest practice remains an explicit choice.

Cloud mode adds real email authentication, profiles/photos, quiz records, server grading, retryable uploads, class credits and transactional stock reservations. Teachers have a separate workspace for analytics, editable profiles/access/credits, supplies, verified claims/refunds, questions, learning/game settings and audited changes. Original quiz scores are preserved; teacher notes add feedback. It preserves local demo data. Notebook, XP, review/quest/spin progress and unfinished practice remain on the device. Local development defaults to the demo. The Pages workflow verifies version 1, platform 2 or newer and 972 questions. New record-care and teaching-role controls activate on platform 3; login and the refreshed design remain compatible with platform 2.

## Color, profiles and Teacher Studio

Choose Meadow, Aurora or Sunset in **Profile → Colors & avatar**, write a short introduction and use **Save my style**. Color choices apply across the lab; platform-3 accounts synchronize them across devices. Platform-2 and local demo users save styles on the device. Profile details, photo controls, learning progress, account actions and backup export have clear sections.

Pages have destination-labeled Back links and breadcrumbs. Dialogs offer **Close and return** plus a visible Close control. Learning answers stay saved when returning to a branch. Reduced motion and keyboard navigation remain supported.

Email password login avoids a redundant Auth lookup. Anonymous welcome/guest entry does not wait for a database preflight. Sign-in has a busy state, password visibility, Caps Lock feedback and a **Forgot your password?** flow with a persisted mail-request cooldown. Password reset requires the verified recovery session; a URL alone cannot change a password. Request and open the reset email on the same device. Password login itself does not send an email. Delivery quotas/CAPTCHA settings still belong to the project owner; see the setup guides.

The platform-3 [Studio upgrade guide](docs/STUDIO_UPGRADE.md) covers the short [studio-upgrade.sql](supabase/studio-upgrade.sql), class activity charts, filtered quiz history, archive/restore, evidence/ledger health and delegated teaching roles. Teachers may grant/revoke another active account's teaching access with an audited reason. Own-role changes and removal of the last active teacher are protected. Owner SQL remains the recovery path. Original answer evidence, scores, wallets and stock are preserved. Archived quiz evidence stays preserved and can be restored without changing credits.

Suggested future additions: teacher-assigned quizzes with due dates, weekly progress digests and moderated class announcements. These are recommendations, not enabled controls in this release.

## Start

Use the existing checkout at `/workspace/SHEN-LOVE-EMU-HOUJO`. Cloud tasks are already isolated; do not create a worktree unless explicitly requested.

Requires Node.js 22.12+ (tested on Node 24), npm, and a current browser with Web Crypto. Use localhost or HTTPS.

```sh
npm ci
npm run dev
```

Production: `npm run build`, then `npm run preview`. Vite prints the local port. The development server binds to all interfaces; it is not a production deployment.

## Play

- First visits and ended sessions open the separate welcome hub. Choose **Sign in**, **Create account** or **Explore as guest**; no guest account is signed in automatically. New profiles get 24 starter merits by default.
- **Log out** is visible in the lab header and registered-user profile. The confirmation offers **Keep exploring** or **Log out now**. Logout returns to the welcome hub and preserves saved profiles, notes and progress. Refresh and browser Back do not reopen an ended session; guest exploration must be chosen again.
- Existing valid sessions continue normally. Expired or revoked sessions return to the welcome hub and close private dialogs. Incoming deck/challenge links keep their destination through entry. Local demo sessions remain per tab; cloud logout ends the shared Supabase browser session across tabs.
- Find topics across all 27 decks using **Search all science decks** on Science Island. Search by subject, deck name or science idea; Skills Lab level requirements still apply. **Clear search** or Escape resets the results.
- **Continue learning** on the dashboard resumes your unfinished session with the same answers and rewards. An offline banner explains when you are using saved content; going offline does not erase an active topic search.
- The school seal appears on the left of welcome/application headers and dialog titles, including on phones. The favicon uses the same seal, and the image is included in the offline cache.
- Pick a Science Island branch, deck and difficulty. A session draws eight cards from a 12-card pool. Grades recommend, never lock. Skills Lab opens at Level 4.
- Use hints, learn from explanations, collect merits/XP, and grow mastery. Wrong answers enter a six-box spaced Review Box.
- Daily spin, two quests, a seeded Daily Challenge, facts, streaks, badges and a local XP leaderboard encourage steady learning.
- **Profile photo:** upload a JPG/PNG/WebP under 5 MB. The browser crops/normalizes it to a small WebP, removing metadata. Account photos use a private storage bucket with ownership/teacher access; Remove photo restores the illustration. Signed image URLs are never exported in backups.
- Keep notes or suggested misconception repairs, try the force-and-mass experiment, and share seeded Challenge Links.
- Signed-in students reserve supplies using class credits from the shared shelf. A teacher verifies the claim code before collection; cancellation refunds credits and stock once. Guest/local demo users keep the earlier merit shop.

**Local demo: no real order is sent, no physical stock is reserved, and no notification leaves this browser.** Real school rewards need school approval and verification.

## Local demo security and admin

Default local demo admin: **`admin` / `admin123`**. These credentials are disabled in cloud mode; cloud teachers use Supabase email accounts and owner-assigned roles. Open your profile to sign in; Mission Control appears for admins. The hint is dismissible. Change the default before sharing a demo, and never reuse a real password.

**Local demo mode uses client-side security.** Local passwords use PBKDF2-SHA-256, 150,000 iterations and random per-user salt. People who control browser storage can alter local roles, inventory and balances; do not use real student personal data or valuable rewards in the demo. Cloud accounts use Supabase Auth, database-enforced roles, server quiz grading, transactional wallets/stock, idempotent requests and teacher audit records. Existing local merits are never imported as trusted class credits. School staff still authorize rewards and verify physical collection.

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
- Question banks load per branch and are never copied into localStorage. Local demo accounts stay on one browser/origin. Cloud quiz records, photos, class credits and reservations are shared across devices. Historical arcade evidence is preserved in the database after its interface is retired. Presence means active here within two minutes.
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
npm run backend:sql -- --check
npm run backend:test
npm run e2e:cloud
```

Playwright uses `/usr/bin/chromium` here; set `CHROMIUM_PATH` elsewhere. The normal production browser suite uses port 4173; the Pages-path suite uses 4174; the cloud suite uses 4175 with mocked APIs. Both can coexist with development on 5173, but run these suites sequentially because each rebuilds `dist`. Browser checks cover learning/review, accessibility/mobile, accounts, rewards, supply redemption, admin collection and two-tab last-stock safety. Welcome/logout checks cover first entry, account creation, cancel/confirm, saved notes, Back/reload, deep links, expiry, cross-tab revocation and failed storage writes. A JavaScript-disabled check serves the exact source HTML without Vite transforms and verifies its styled online link; managed Chromium blocks direct `file://` navigation. The Pages check covers desktop/mobile layout, fonts, a loaded Cells session, offline access to an unvisited deck, and offline logout/reload under the repository path. Unit/property tests independently check every calculator over 200 seeds. `PLAN.md` records phase gates. Live processes must restart in a restored cloud task; retained files alone do not start the server. For a fresh-browser readiness check, verify the welcome heading first, choose Explore as guest, then verify the dashboard and a loaded Cells question.
