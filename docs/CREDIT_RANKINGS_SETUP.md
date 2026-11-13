# Activate class-credit rankings

The new student leaderboard ranks the **current class credits in each classroom wallet**, highest first. Website publication cannot install database functions. This existing project already has community version 2; its owner needs to run the short additive update below once.

1. Open [your project's SQL Editor](https://supabase.com/dashboard/project/qevqgbuyboeudxlhfiik/sql/new) and choose **New snippet**.
2. Open [credit-rankings-upgrade.sql](../supabase/credit-rankings-upgrade.sql), choose **Raw**, and copy the **entire file**. Paste it into the snippet and click **Run**.
3. Run `select public.csl_backend_status();`. Check for **`"credit_rankings": 1`** and **`"profile_styles": 1`**.
4. Refresh the website and open **Leaderboard**. If needed, use **Ctrl+Shift+R** once on a computer.

No new key, password, signup or email setting is required. The script also activates the existing optional private-banner sharing bridge, so it replaces the separate profile-styles setup step for this project. It can be run again and does not reset accounts, wallets, credit history, quizzes, stock, reservations, friendships or sharing choices. Fresh projects receive both features in `setup.sql`; the complete `upgrade.sql` includes them too.

Until activation, the website explains that class-credit rankings are being prepared and shows the student's own balance. It does not present discovery points as credits. Personal photos and banners work with the existing account setup.

## How the standings work

- Balances come from the server, not browser-submitted points. Equal balances share a rank; names provide a stable display order within a tie.
- Earning credits, reserving supplies, refunds and audited teacher adjustments can change position. **Balances do not reset each week.** Quiz achievements remain learning records, separate from this ranking.
- Classroom and accepted-friends views, optional shared-grade filters, learning cards and automatic refresh remain available. Teachers can review standings but do not compete.
- Listed classmates can see names and current credit balances. **Profile → Classroom sharing** lets students hide their listing. Existing opt-outs, blocking and bans remain enforced. Email, section, notebook and account settings stay private; photos, introductions, grades and banners retain their separate sharing choices.

The original discovery-score database function remains available for older clients; this update adds `csl_credit_leaderboard` and the `credit_rankings` capability. Only a project owner in SQL Editor or an authenticated database administrator can install it. A publishable browser key cannot do so.

## Verification

`npm run backend:test` verifies real wallet sorting, shared ties, earning/spending changes, filters, privacy, blocks/bans, opt-outs, teacher exclusion and non-destructive reruns in an isolated PostgreSQL database. `npm run e2e:cloud -- e2e/community.cloud.spec.ts` checks the interface with controlled accounts, including the honest pre-activation state. These checks do not change production balances or send real emails.
