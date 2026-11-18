# Show the signup code in account emails

The website verifies six-digit signup codes through the existing account service. The project owner must configure the actual email template; publishing website files does not change this setting.

1. Open [Authentication → Emails → Templates](https://supabase.com/dashboard/project/qevqgbuyboeudxlhfiik/auth/templates).
2. Choose **Confirm signup**. Set the subject to **Your Cozy Science Lab verification code**.
3. Copy the complete [email-code-template.html](email-code-template.html) into the template body and **Save**. Keep `{{ .Token }}` exactly as written: the email service replaces it with the real, expiring code. Do not put a fixed code, secret or password there.
4. In **Authentication → Sign In / Providers → Email**, keep **Confirm email** enabled. Keep the existing working email sender settings. The website stops new signup from automatically entering the lab when confirmation is disabled and explains which setting needs repair.
5. Open the [published website](https://julomjohnlouise19-cloud.github.io/SHEN-LOVE-EMU-HOUJO/), refresh it once, and use an inbox you own to create an account. Read the code in that inbox and enter it in the website. A wrong or expired code must not open the account. Existing accounts continue using their email and website password.

Gmail format checks catch malformed addresses and domain typos; they cannot prove whether a particular mailbox exists. Successful server verification proves access to the inbox. Gmail dot/plus variants share the website's email cooldown. Server limits, expiry and email delivery settings still apply; the website cannot guarantee inbox placement or bypass sending limits.

An older email containing only a confirmation link does not show a code. Save this template before testing new code emails. Existing confirmation and password-reset links continue to be handled by the website for compatibility; password reset keeps its separate recovery flow.

## If no email arrives

- Use an existing Gmail inbox you can actually open. A website account does not create a Gmail mailbox. Check the exact destination printed above the code field; use **Edit signup details** to correct a typo.
- Check Inbox and Spam, and search for **The Cozy Science Lab**. Wait for the countdown and request one new code rather than repeatedly creating the account.
- If the address is already confirmed in **Authentication → Users**, choose **Sign in instead** and use your website password. Another signup request for an existing address may not send a new email.
- If the address is unconfirmed, check **Logs → Auth**. An HTTP 200 or “User confirmation requested” means the request was accepted; it does not prove that Gmail delivered the message. The website keeps the address marked **Not verified yet** until the server accepts the code.
- For the existing Gmail SMTP sender, check the sender's **Sent** and delivery-failure messages too. The Host is `smtp.gmail.com`, the port is **465**, and the Username/Sender email must match the sender account. The private SMTP password must be that account's Google App password. Check actual sending errors or bounces before changing a working setting; never paste credentials into the website or chat.

The site cannot determine whether an arbitrary Gmail mailbox exists from its spelling, inspect a private inbox, force inbox placement or bypass provider sending limits. The owner dashboard controls the sender and template; only a successful server-verified code completes inbox verification.
