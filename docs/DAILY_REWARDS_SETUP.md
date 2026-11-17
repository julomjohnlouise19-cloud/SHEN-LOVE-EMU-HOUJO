# Turn on the seven-week class-credit calendar

This classroom is already activated: [run 44059192765](https://github.com/julomjohnlouise19-cloud/SHEN-LOVE-EMU-HOUJO/actions/runs/44059192765) verified `daily_calendar: 1`, `credit_rankings: 1` and `profile_styles: 1`. You do not need to repeat the setup here. Students open the header's **Daily rewards** gift button; teachers manage defaults in **Teacher Studio → Lab settings**.

For another existing classroom, the following one-time update preserves accounts, quiz records, shop stock, balances and reservations. It also safely re-applies the compatible class-credit leaderboard and authorized banner-sharing updates.

1. Open your project in the [database dashboard](https://supabase.com/dashboard/project/qevqgbuyboeudxlhfiik/sql/new).
2. Open a **new SQL Editor snippet**.
3. Open [daily-rewards-upgrade.sql](../supabase/daily-rewards-upgrade.sql), choose **Raw**, and copy the **entire file** into the snippet.
4. Press **Run**. Do not paste it into your website, browser console or account password fields.
5. In another SQL snippet, run:

   ```sql
   select public.csl_backend_status();
   ```

   The result should include `daily_calendar: 1`, `credit_rankings: 1` and `profile_styles: 1`.
6. Refresh the website. Students press the **Daily rewards gift button in the header beside notifications**; it opens a popup on the current page. Teachers open **Teacher Studio → Lab settings → Seven-week daily rewards**.

No private key or password belongs in the website or GitHub. The update must be run by the project owner; adding website files alone cannot install database functions.

## How rewards work

- The first successful claim starts that student's **49 dated days**.
- Default rewards are **5 class credits** on ordinary days and **10** on every seventh day. The bonus is the day's total, not an extra 10.
- Claims use the server's classroom date, initially **Asia/Manila**. Students cannot claim future or missed dates, and the calendar does not restart after day 49.
- Each day is credited once. Refreshes, retries and competing tabs return the saved receipt instead of awarding twice. Credits go into the same account wallet used by the shop and credit leaderboard.
- Teachers can pause claims and change the reward defaults for **new calendars**. Existing calendars keep their starting reward amounts and timezone. **Pausing does not extend calendar dates.** Teacher changes require confirmation and are audited.
- Guest practice, discovery badges and the daily wheel remain practice features. The wheel reminder disappears after that account spins for its current classroom day.

This additive update passed the isolated PostgreSQL suite, including all 49 days, midnight boundaries, concurrent claims, ownership, bans, retries and repeat installation. Activation on this classroom is verified above; tests alone do not install the update on another project. If the editor reports an error, keep the complete error text and the line number; do not erase classroom tables or disable their access policies.
