# Activate the new classroom features

Your existing accounts, teacher access and quiz records stay in place. This update adds Science Arcade, private profile photos, shared class credits, real stock reservations and Teacher Studio.

## 1. Run the database upgrade

1. Open your project in Supabase → **SQL Editor → New snippet**.
2. Open [upgrade.sql](../supabase/upgrade.sql). Copy its **entire contents** into the snippet.
3. Click **Run** and wait for **Success**.
4. In another snippet, run:

```sql
select public.csl_backend_status();
```

The result must include **version: 1**, **questions: 972**, and **platform: 2**. The website deployment checks this before publishing the new features.

Run `upgrade.sql` for the existing project. A brand-new project uses `setup.sql`, which also includes the original schema. Re-running the upgrade preserves teacher edits, stock, accounts, saved quizzes, class wallets and game results. The private photo bucket and its ownership rules are created by the upgrade.

## 2. Fix “email rate exceeded”

This error is an email delivery limit. Database storage and email sending have separate settings. The website adds a request cooldown and clearer recovery, but the owner must configure the email sender for normal classroom signups.

**For an account that already exists:** use **Sign in**, not **Join the lab**. A confirmed account can sign in without sending another email. Your Supabase dashboard account and your website Auth account are separate.

**For an immediate class account:** the project owner can use **Authentication → Users → Add user → Create user**, enter an email and a private initial password, and enable **Auto Confirm User**. This does not need a signup email. The student should change the initial password from their profile after signing in. Do not put passwords in chat or GitHub.

**For normal self-service signup:** connect your own SMTP sender:

1. In Supabase, open **Authentication → Emails → SMTP settings** (the label may also be **Email / Custom SMTP**).
2. Enable **Custom SMTP**.
3. Enter the SMTP credentials from your email provider privately in that dashboard.
4. Set the sender name to **The Cozy Science Lab**, use a verified sender email, and save.
5. Under **Authentication → Rate Limits**, set the email rate within your email provider’s allowance. Keep a minimum resend interval such as 60 seconds and keep email confirmation enabled.
6. Request one confirmation email from the website and check the inbox and spam folder. Avoid repeated requests while a cooldown is shown.

### A small-class Gmail setup

If you have a personal Gmail account with two-step verification, Google may offer an **App password** at <https://myaccount.google.com/apppasswords>. Create one for the classroom sender and enter it only in the SMTP settings:

| Setting | Value |
|---|---|
| SMTP host | `smtp.gmail.com` |
| Port | `465` |
| Username | Your full Gmail address |
| Password | Your Google **App password** |
| Sender email | That same Gmail address |
| Sender name | `The Cozy Science Lab` |

Google enforces sending limits and may restrict App passwords for some accounts. For a larger school or if App passwords are unavailable, use a verified SMTP provider and its own host/port/credentials. Verify the sender/domain with that provider first. SMTP passwords and provider secret keys must never go into frontend build variables, SQL files or the public repository.

## 3. Use the new website

After the database upgrade and successful deployment:

- **Science Arcade:** choose a science category, play nine targets, use round coins for boosts and compare best completed scores. Signed-in rounds are timed and scored by the service; guest scores stay on the device.
- **Profile photo:** open the profile button, choose a JPG/PNG/WebP photo under 5 MB, and use Remove photo to return to an illustrated avatar. Photos are stored privately for the owner and teachers.
- **Teacher studio:** teachers manage profiles/access, adjust credits with reasons, edit stock and prices, verify or cancel reservations, review answers/notes, edit science cards and tune learning/arcade settings. Activity history records changes.
- **Supply shelf:** signed-in students reserve from shared stock using class credits. Teachers verify the claim code before collection. Cancelling restores stock and credits together.

Arcade round coins buy power-ups within that round. Class credits have a separate server ledger and daily learning limit. Old browser demo balances are preserved locally and are not imported as trusted class credits. Original quiz scores remain immutable; teacher notes add context. Earlier question versions remain available for quizzes already in progress or waiting to upload.

Notebook pages, practice XP, review/spin/quest progress and guest activity remain on the device. Teacher role assignment and Auth email/password administration stay with the project owner.
