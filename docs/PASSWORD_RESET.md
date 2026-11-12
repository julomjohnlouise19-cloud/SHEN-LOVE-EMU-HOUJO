# Password reset: from email to the new-password form

The website now recognizes a verified password-reset session even after a previous logout. A reset link opens **A fresh start for your account**, where you can enter and repeat your new password. A verified reset remains available after refreshing the same tab for a short recovery window. Classroom data being temporarily unavailable does not prevent saving a new password.

After saving, **Your password is updated** confirms success. **Continue to the lab** opens your account using the verified account session. Existing learning records stay preserved. A URL containing `flow=recovery` alone cannot unlock password controls.

## For students

1. On the website, open **Sign in → Forgot your password?**
2. Enter your account email and request **one** reset link. Wait for any displayed countdown before requesting another.
3. Open the newest reset email in the **same browser** where you requested it. A different tab in that browser is fine. An email app may open a different browser; choose the original browser if that happens.
4. Enter the same new password in both fields, then select **Save new password → Continue to the lab**.

If a link has expired, was already used, or cannot be verified in that browser, the website provides instructions to request a fresh link. No password changes occur from that failed link. Check Inbox and Spam before sending repeated requests.

## If the email button opens only the homepage

The owner should open the project's **Authentication → Emails → Reset password** template. Its button must use the verification URL:

```html
<a href="{{ .ConfirmationURL }}">Reset my password</a>
```

Do not replace it with `{{ .SiteURL }}` or a plain homepage address: those links contain no verification and cannot open the new-password form. A complete minimal template is available in [emails/reset-password.html](emails/reset-password.html).

In **Authentication → URL Configuration**, use this **Site URL**:

```text
https://julomjohnlouise19-cloud.github.io/SHEN-LOVE-EMU-HOUJO/
```

Add these exact **Redirect URLs**:

```text
https://julomjohnlouise19-cloud.github.io/SHEN-LOVE-EMU-HOUJO/
https://julomjohnlouise19-cloud.github.io/SHEN-LOVE-EMU-HOUJO/?flow=recovery
```

Save the settings and request one new reset email. Old messages do not change when a template or redirect setting is edited. These are private dashboard settings; no SQL upgrade, secret key in website code, or disabling email confirmation is needed. SMTP delivery and spam placement remain separate from this redirect repair.
