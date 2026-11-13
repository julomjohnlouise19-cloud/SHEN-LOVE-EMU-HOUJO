# Activate the student leaderboard and Science friends

Students use their **existing classroom account**. There is no new username to create. This additive update enables the automatic classmate directory, recent activity, shared student learning cards and friend invitations. It preserves existing accounts, photos, quiz records, credits, stock, reservations and friendships.

**Live classroom verified:** [Run 43335835596](https://github.com/julomjohnlouise19-cloud/SHEN-LOVE-EMU-HOUJO/actions/runs/43335835596) confirmed community version 2 is installed. The new current-credit leaderboard additionally needs the [credit-ranking activation step](CREDIT_RANKINGS_SETUP.md); the script also activates the existing optional banner-sharing bridge.

## One-time database setup

1. Open [your project's SQL Editor](https://supabase.com/dashboard/project/qevqgbuyboeudxlhfiik/sql/new) and choose **New snippet**.
2. Open [community-upgrade.sql](../supabase/community-upgrade.sql), choose **Raw**, and copy the **entire file**. Paste it into the snippet and click **Run**.
3. Run `select public.csl_backend_status();` in the editor. Check that the result includes **`"community": 2`**.
4. Refresh the website, sign in with the existing account, and open **Science friends** or **Leaderboard**. On a computer, use **Ctrl+Shift+R** once if the old interface remains.

Use the current file even if you previously ran community version 1. The same script installs version 2 from either no community service or version 1, and can be run again. Existing deliberate profile-hiding choices and optional-photo choices remain saved. Untouched accounts appear automatically by their existing account name. No new API key, email setting, password or account creation is required.

The existing classroom needs the Studio/record-care upgrade, already installed on this project. Fresh installations receive this feature through the complete generated `setup.sql`; the complete `upgrade.sql` includes it too. A publishable browser key cannot install database functions, so this step needs the project owner's SQL Editor or an authenticated database administrator connection.

## Students: open, find, connect

**Science friends** opens directly to **Classmates**, showing existing active student accounts without a search or username setup. Recently active classmates appear first. **Active recently** means a visible, signed-in website session contacted the classroom service within the last two minutes; it is an approximate activity indicator. The list refreshes automatically while open and online.

To find a specific friend, enter their existing account name or login name in **Classmate's name or sign-in**, then choose **Find classmates**. An exact sign-in email also works privately; emails never appear in cards or search responses. If names match more than one person, choose the appropriate card rather than sending an invitation to an arbitrary match. **Clear search** restores the classmate list. **Active recently** filters the list to recent activity; **All classmates** restores everyone available.

Choose **Add friend** on a card. The other student opens **Invitations** and chooses **Accept invitation** or **Decline invitation**. Crossed invitations still require acceptance. **Sent** lets students cancel a pending invitation; **My friends** shows accepted connections. Open a learning card for removal or blocking. **Blocked** lets the student unblock an account; unblocking does not restore a previous friendship.

After cancellation, removal or decline, another invitation to the same scientist has a one-day cooldown. There is a ten-invitation rolling daily limit, a 50-pending-invitation limit and a 300-friend limit. Existing requests and friendships survive the update.

## Profile sharing

Open **Science friends → Sharing choices**, or **Profile → Classroom sharing**. There is **no username field**: the existing account name is used automatically.

- **Show my account name and class credits in classmates and rankings** controls the name/learning-achievement listing and current credit balance in rankings. New and previously untouched accounts start listed. A previous deliberate opt-out is preserved, and students can hide or show their name later.
- Photo, introduction and grade each have a separate, initially unchecked sharing choice. Only explicitly enabled details appear on a learning card.
- Listed names and current credit balances appear in rankings. Email, section, notebook pages and account settings stay private. Guest visitors cannot browse the student directory or rankings. Hidden, banned and blocked accounts disappear according to the existing access rules.

Use the existing profile photo uploader to change a photo. Only the current selected, explicitly shared photo receives classroom read permission; prior uploads remain private. Photo links are short lived and peer data is not saved in the offline cache. Shared learning cards show the existing name and achievements, with optional details only as selected.

## Current class-credit rankings

After [activation](CREDIT_RANKINGS_SETUP.md), **Leaderboard** immediately loads **Classroom** with the highest current wallet balances first. Equal balances share a rank. Use **Friends only** to compare accepted friends or filter by deliberately shared grade. Select a scientist to open the existing learning card. Teachers review standings without competing; hidden, banned and blocked accounts retain their restrictions.

Earning credits, reserving supplies, refunds and audited teacher adjustments change the balance and can change position. **These balances do not reset every week.** The page refreshes automatically while visible and online. Verified quiz discovery points and discovery levels remain learning achievements; they no longer determine the student leaderboard. The old discovery-score RPC remains available to older clients, without deleting evidence or changing wallets. Before the credit update is installed, the interface explains the required activation rather than relabelling points as credits.

Teachers retain **Scientists** profile details, ban/restore and **Record care** controls. Students receive no teacher permissions. Profile records, reading tools and other classroom features remain available before this update is installed; community pages explain that classroom connections need activation.

## Verification

`npm run backend:test` creates an isolated PostgreSQL database and verifies default directory visibility, private existing-login lookup, recent-activity expiry, weekly metadata, daily-best scores/ties, private fields/photo policies, friend ownership, retries, crossed-request concurrency, request limits, blocking, bans and preservation of explicit opt-outs on an upgrade from version 1.

`npm run e2e:cloud -- e2e/community.cloud.spec.ts` tests the interface with controlled accounts, including automatic entry, matching names, two-account acceptance, current-credit order and spending changes, activity refresh, sharing choices, phone accessibility and compatibility before activation. No real account email or production friendship is used. The deployment reports the actual installed community capability; a published interface alone does not install the database update.
