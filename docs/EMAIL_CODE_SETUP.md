# Show the signup code in account emails

The website verifies six-digit signup codes through the existing account service. The project owner must configure the actual email template; publishing website files does not change this setting.

1. Open [Authentication → Emails → Templates](https://supabase.com/dashboard/project/qevqgbuyboeudxlhfiik/auth/templates).
2. Choose **Confirm signup**. Set the subject to **Your Cozy Science Lab verification code**.
3. Copy the complete [email-code-template.html](email-code-template.html) into the template body and **Save**. Keep `{{ .Token }}` exactly as written: the email service replaces it with the real, expiring code. Do not put a fixed code, secret or password there.
4. In **Authentication → Sign In / Providers → Email**, keep **Confirm email** enabled. Keep the existing working email sender settings. The website stops new signup from automatically entering the lab when confirmation is disabled and explains which setting needs repair.
5. Open the [published website](https://julomjohnlouise19-cloud.github.io/SHEN-LOVE-EMU-HOUJO/), refresh it once, and use an inbox you own to create an account. Read the code in that inbox and enter it in the website. A wrong or expired code must not open the account. Existing accounts continue using their email and website password.

Gmail format checks catch malformed addresses and domain typos; they cannot prove whether a particular mailbox exists. Successful server verification proves access to the inbox. Gmail dot/plus variants share the website's email cooldown. Server limits, expiry and email delivery settings still apply; the website cannot guarantee inbox placement or bypass sending limits.

An older email containing only a confirmation link does not show a code. Save this template before testing new code emails. Existing confirmation and password-reset links continue to be handled by the website for compatibility; password reset keeps its separate recovery flow.
