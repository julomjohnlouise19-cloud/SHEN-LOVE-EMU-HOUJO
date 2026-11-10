# Activate the colorful Teacher Studio release

Your website uses the same project and public settings. Existing accounts, questions, quiz evidence, class credits, stock and photo uploads stay in place.

## One database step

1. In your Supabase project, open **SQL Editor → New snippet**.
2. Copy the entire [studio-upgrade.sql](../supabase/studio-upgrade.sql) file into the snippet.
3. Click **Run**. It is safe to run again; the script preserves existing records and balances.
4. Check with:

```sql
select public.csl_backend_status();
```

The result should include **platform: 3**, **version: 1** and **questions: 972**.

This is the short upgrade for the already-connected platform-2 project. A brand-new project uses the complete `setup.sql`. The deployment verifies the existing backend before publishing. Login and design improvements work on platform 2; the new archive, record-health and teaching-role controls appear when platform 3 is installed. A public browser key cannot run schema changes; this step needs your project-owner dashboard access.

## What teachers can do

- Manage scientist profiles, grades, sections, active/paused access and reasoned credit adjustments.
- Grant or remove another active account's teaching role. Teachers cannot change their own teaching access; at least one active teacher must remain. The owner bootstrap SQL remains a recovery option.
- Edit supplies/prices/stock, verify collection codes, cancel reservations with a reason and refund credits/stock atomically.
- Filter quizzes and completed arcade rounds by dates, class, science and archive state; review evidence, export matching rows and archive/restore selected records with an audit reason.
- Review seven days of class activity and record-health checks, including credit-ledger reconciliation.
- Edit science cards and tune learning/arcade settings. Original scores and answer evidence remain intact.

Archiving organizes records and removes archived arcade rounds from active rankings. Restoring returns them. It does not remove accounts, alter a score or award/refund class credits. Health checks report issues for investigation; they do not invent replacement data.

Personal styles and introductions sync to signed-in accounts. Notebook, practice XP and review progress keep their existing device scope.

## Email login

Password sign-in does not request an email. Existing confirmed accounts should use **Sign in**, with the website Auth email/password rather than the dashboard login. Confirmation, resend and password-recovery email requests share a cooldown.

If email delivery is limited, use the [SMTP guide](CLASSROOM_UPGRADE.md#2-fix-email-rate-exceeded). If CAPTCHA was enabled without a website widget, turn it off under **Authentication → Bot and Abuse Protection** or configure a supported widget before requiring it. Keep private sender credentials in your project dashboard.

The website now offers **Forgot your password?**. A reset link should open the same website on the device that requested it. The verified recovery session can set a new password; a plain recovery URL never grants account access. Expired links can request a fresh email. Test one real reset only after your email sender is configured.
