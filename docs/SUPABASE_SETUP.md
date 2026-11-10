# Connect Supabase to The Cozy Science Lab

The code supports an optional Supabase backend. Cloud mode saves email accounts, profiles and completed quiz records. Students can read their own records; an owner-appointed teacher can read class records and export the displayed page as CSV. The server grades submitted answers against all 972 published cards. This is practice reporting, not supervised examination or a real reward ledger.

The default remains the existing local demo until the owner finishes the steps below. No live database, account, project settings or deployment is changed by adding these files.

## 1. Replace the exposed private key

In your Supabase project's **Settings → API Keys**, revoke the secret key that was shared in chat. Keep any replacement private. The browser and this setup do not need a secret key, service role key, database password or separate JWKS setting.

Use the installed official browser SDK, `@supabase/supabase-js`. `@supabase/server` is not needed for this static GitHub Pages app. Only the project URL and **publishable** key go into `VITE_` settings. Builds reject private credentials in public Vite variables.

## 2. Create the database

Open your project → **SQL Editor → New query**. Copy the complete contents of [supabase/setup.sql](../supabase/setup.sql), paste them and select **Run**. Use the generated `setup.sql`, which includes both the schema and the answer bank. Running only `schema.sql` leaves the bank empty and cloud readiness checks will fail.

The script creates:

- `csl_profiles`, linked to Supabase Auth, with name, grade and section.
- `csl_teachers`, an owner-controlled teacher allowlist. Signup metadata cannot assign this role.
- `csl_quiz_attempts`, immutable records with answers, server scores, timestamps and an idempotency key.
- A private canonical answer bank and narrowly scoped RPC functions.
- Row level security and restricted grants for anonymous/student/teacher access.

It does not drop existing student accounts or quiz records. Rerunning refreshes the published bank and functions. Keep the private schema out of the project's exposed API schemas; leave the public schema available for these RPCs.

To check installation in the SQL Editor:

```sql
select public.csl_backend_status();
```

Expected result: `{"version":1,"questions":972}`.

## 3. Configure email sign-in

Under **Authentication → URL Configuration**, set **Site URL** and an allowed **Redirect URL** to:

```text
https://julomjohnlouise19-cloud.github.io/SHEN-LOVE-EMU-HOUJO/
```

For local development, also allow your exact localhost URL, for example `http://localhost:5173/`. Avoid broad wildcard redirects. Enable the Email provider and keep email confirmation enabled. Configure a production email sender in Supabase when you need classroom signup volume; its built-in mail service has delivery/rate restrictions.

New users enter a name, grade, optional section, email and password on the site. If confirmation is required, the app shows **Check your email** and does not create a signed-in session until confirmation succeeds. Supabase owns password hashing, tokens and Auth rate limits; the browser does not store cloud password hashes.

## 4. Give your account teacher access

Create your own Auth account in **Authentication → Users → Add user**, using your teacher email and a password entered privately. Confirm the account there, or use the website's confirmation flow after enabling cloud mode. Your Supabase dashboard login and the website's Auth account are separate accounts, even when they use the same email.

Open [supabase/bootstrap-teacher.sql](../supabase/bootstrap-teacher.sql), replace `teacher@example.com` with your actual teacher email and run it in the SQL Editor. The Auth user must exist first. This assigns teacher access by Auth user ID; changing browser storage, signup metadata or a profile cannot grant database access.

Sign out of the website and sign in again after assigning access. **Mission control** opens the class report. **Cloud quiz records** opens the same report for teachers and personal history for students. CSV export contains the displayed page, up to 100 records. Use Previous/Next to browse other pages. **View answers** shows each submitted response.

## 5. Enable the website connection

For local development, copy `.env.example` to `.env.local`, then set:

```dotenv
VITE_BACKEND_MODE=supabase
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_PUBLIC_KEY
```

Restart Vite after editing. `.env.local` is ignored by Git. The project URL and publishable key are public identifiers; database permissions protect the data. Never put a private key in any `VITE_` variable.

For GitHub Pages, open the repository → **Settings → Secrets and variables → Actions → Variables** and add these same three **repository variables**. Then publish the reviewed code through the existing workflow. The workflow requires VITE_BACKEND_MODE=supabase and checks the live database before running its application checks and building the connected site. Missing or incorrect settings stop deployment and preserve the currently published site. Local development still defaults to the demo.

The managed Codex environment also needs the project's `YOUR_PROJECT.supabase.co` domain allowed for live verification. A saved environment draft does not apply that network change by itself; review and save the draft in environment settings. Changing or publishing the development environment does not deploy the website or create database tables.

## 6. Verify with your own account

1. Open the HTTPS website and sign in with the Auth email/password.
2. Complete an eight-card Cells quiz. The upload notice should confirm it was uploaded.
3. Open **Cloud quiz records**. Check the score and **View answers**.
4. Open the same account on another device. Its cloud records should be visible there.
5. Sign in as the teacher and check the class report and CSV. A student should see only their own records.
6. Log out. The welcome hub should replace private views in every browser tab sharing the cloud session.

These checks do not require sharing a password or a private API key with Codex.

## Offline data and limits

Completed signed-in quizzes are stored in a separate durable upload queue in the same atomic save as the final answer. Network failures keep them on the device and expose **Retry upload**. Reconnect or sign in again on that device to retry. The server checks the expected account, grades answers itself and deduplicates repeat uploads. Only that account's pending records upload. Do not clear site data with pending records.

Merits, avatar, XP, mastery, Review Box, notebook, unfinished runs, leaderboard, supplies and physical reward claims still use local demo storage. They do not sync across devices or become official school credits. Guest activity never uploads. Existing local accounts/passwords and older guest results are preserved, but are not silently imported into cloud accounts. Keep a local backup before changing modes. Local backup imports are disabled in cloud mode and cannot grant cloud teacher roles.

Cloud sessions use the Supabase SDK's browser storage. Logging out clears this browser's cached Auth credential and ends its cloud session across tabs. Previously uploaded records stay in the database; pending uploads stay on the device. Local practice data is not encrypted and remains visible to someone who controls the device. Use separate browser profiles for private accounts and always log out on shared devices. Teacher report responses are not persisted in a local report cache or offline service-worker cache.

Only collect data your school has authorized. Teachers with access can see all class quiz records in this project. The project owner manages retention and account deletion in Supabase; deleting an Auth user cascades to that user's profile, teacher entry and quiz records.

## Developer checks

```sh
npm run backend:sql -- --check
npm run backend:test
npm run e2e:cloud
```

`backend:test` requires a working local Docker daemon and `postgres:17-alpine`; it creates a network-isolated temporary PostgreSQL container and removes it after testing. It never connects to a real Supabase project. It tests the actual SQL, all published graders, RLS, role spoofing, account mismatch, immutable records, idempotent retries and rerunning setup. Browser tests use controlled API fixtures and never send emails or create real accounts.

`npm run backend:check` uses public settings from the process environment and checks the actual project's installed version/card count. It does not load `.env.local`; export the three public values or run through the deployment workflow. Node proxy use can be enabled with `NODE_USE_ENV_PROXY=1` where the environment requires it. Keep TLS verification enabled.
