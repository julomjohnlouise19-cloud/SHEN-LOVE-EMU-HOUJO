# Readiness record

Validated in the managed cloud checkout on 6 November 2026 (Asia/Manila), using Node 24.22.1, npm 11.9.0 and system Chromium.

- Clean, frozen installation: `npm ci --no-audit --no-fund` passed.
- `npm run lint` and `npm run typecheck` passed.
- `npm test`: 45 tests passed across the rule engine, resilience/property checks and the question validator.
- `npm run validate:questions`: 972 reviewed cards; 81 deck/level pools, each with 12 cards; 184 Philippine contexts (18.9%); 891 linked misconception repairs; 45 evidence tables; 36 fixed calculation cards; 19 generators independently recomputed for 200 seeds each.
- All eight formats are present: MCQ, true/false, input, order, match, diagram, calculation and data.
- `npm run sim:economy`: all three seeded 30-day scenarios respected the daily play/review cap, including repeated play.
- `npm run seed`: produced a schema-valid, private fresh backup without modifying browser data.
- `npm run build` passed, including type and content gates and an offline asset manifest.
- `npm run e2e`: 16 production-browser scenarios passed. Every scenario checks console errors, including secondary purchase, storage, account, mobile and offline paths.
- A subsequent focused production check passed for the keyboard skip link, desktop/mobile dashboard and WCAG AA axe checks.
- The development server was then restarted on port 5173 and independently verified through HTTP, dashboard rendering and a loaded Cells session, with zero console errors.
- Complete, tested install_script and start_skill fields were saved to the cloud environment draft. Saving does not publish them; the user must review/save and publish in environment settings.
- GitHub Pages preparation: root-path regression checks passed (45 unit/property tests and 16 production-browser scenarios). The additional repository-path browser scenario passed for `/SHEN-LOVE-EMU-HOUJO/`, including loaded fonts, favicon, Cells questions, scoped service-worker caches, offline reload and an unvisited Chemistry deck. Browser fixtures reject console errors.
- Initial upload: [GitHub Actions run 42179117736](https://github.com/julomjohnlouise19-cloud/SHEN-LOVE-EMU-HOUJO/actions/runs/42179117736), commit `b3a80ea`, passed the check/build job in 1m 36s. Publication stopped in configure-pages with “Not Found” because Pages was not enabled. The original instance also blocked GitHub API access. The user subsequently published the environment with the required domains, resolving that network restriction.

## GitHub/display repair verification

- The restored environment retained the checkout, installed dependencies, Node 24.22.1/npm 11.9.0 and Chromium. No environment configuration was changed or republished during this repair.
- Lint, typecheck, all 45 unit/property tests and the economy simulation passed. Production builds validated all 972 science cards.
- All 16 existing production-browser scenarios passed. The additional raw-source HTML fallback scenario passed with script execution disabled, including the styled panel, embedded favicon, online-lab link and phone-width layout, with zero console errors. The exact source is served without Vite transforms because managed Chromium prohibits direct file:// navigation.
- The repository-path browser scenario passed, including decoded favicon, loaded fonts, desktop/mobile layout, a Cells session, scoped caches, offline reload and an unvisited Chemistry deck. Screenshots were inspected for the dashboard and fallback.
- Pages actions were updated to verified Node 24 releases on ubuntu-24.04. The connected integration's Pages-create request returned 403 “Resource not accessible by integration”; after the owner-facing setting was changed, a read confirmed build_type=workflow and HTTPS enforcement.
- [GitHub Actions run 42183402991](https://github.com/julomjohnlouise19-cloud/SHEN-LOVE-EMU-HOUJO/actions/runs/42183402991), application commit `05d161a9c3337217fbf73fde59d04477fe713e24`, succeeded on its first attempt. Both check/build and publication jobs passed, and both annotation lists were empty. The workflow ran all 45 unit tests, 17 normal browser scenarios and the additional repository-path scenario.
- The public HTTPS site returned HTTP 200 in Chromium. Its module URL matched the verified local Pages build. Local fonts loaded, desktop/mobile layout and screenshots passed inspection, and the tested WCAG A/AA axe rules reported no violations. A complete eight-card Cells session reached results, persisted mastery and opened the Review Box. An offline reload and an unvisited Chemistry deck worked. The live check recorded zero console errors and zero failed resource responses.
- The restored development server is running on port 5173. HTTP readiness, dashboard rendering and a loaded Cells question were independently checked with zero console errors. Source HTML remains a multi-file application's entry point; the fallback provides the online destination when opened without its runtime.

## Behaviors exercised

## Welcome hub and logout — 7 November 2026 (Asia/Manila)

- Lint, typecheck and all 45 unit/property tests passed. Production builds validated all 972 cards.
- All 23 root-path browser scenarios passed, including the six new welcome/logout scenarios. The separate Pages-path scenario passed with offline logout and reload added. No application browser-console errors were observed.
- First visits create no active guest session. The separate hub offers sign in, account creation and explicit guest entry. Desktop/mobile layout, keyboard skip navigation, the hub and logout dialog passed the tested WCAG A/AA axe rules. Screenshots were inspected; an illustration positioning defect found during implementation was fixed before delivery.
- Account creation, logout cancellation, confirmation, saved notebook recovery on sign-in, reload and browser Back were exercised. Guest entry preserved a hard-difficulty seeded challenge link. Eight-hour expiry and cross-tab revocation closed open profile dialogs and removed protected views. A simulated storage-full error still cleared the tab credential and showed an honest hub notice.
- The Pages build loaded local fonts, favicon and questions at the repository prefix; cached unvisited decks still worked offline, and offline logout/reload stayed at the hub without an automatic guest session. Existing account, password, quota, multi-tab stock, learning, admin and reward scenarios stayed green.
- Deployment and the live welcome/logout interface will be checked after the tested code is uploaded. No environment configuration was changed for this feature.

## Behaviors exercised

The Cells Medium eight-card session reaches results, updates mastery and saves mistakes in the Review Box. Browser tests cover all branch listings, the Level 4 Skills Lab gate, reproducible Challenge Links, the cart experiment and calculator practice. Purchases deduct once, reject changed prices, redeem once and can be marked collected only by an admin. Both Web Locks and lease-fallback two-tab tests protect the last item. Quota errors preserve balance/stock and offer export. Invalid imports do not replace data; corrupt JSON is quarantined. A fresh production cache reloads offline and opens an unvisited Chemistry deck. Registration hashes passwords, changing a password invalidates other account sessions, and login cooldown survives reload. User markup is rendered as text. Phone pages fit 390 px width and pass the tested WCAG A/AA rules.

## Limits

This is a client-side demo on one browser/origin, not a deployed school system. No real inventory is reserved or external message sent. Production authentication, shared classrooms, authoritative rewards and real claims need a backend. The source brief stopped at §4.8; missing specifications use the documented decisions. The user published the cloud environment; the restored development capabilities above were checked in the replacement instance.
