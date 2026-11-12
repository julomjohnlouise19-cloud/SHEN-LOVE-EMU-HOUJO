# Teacher profiles, signup agreements and supply pickup

The website adds a readable **Terms & Conditions and Privacy Notice** and an unchecked agreement on signup. New signups submit the accepted version and time with their account details. Older accounts are not marked as having accepted. These are submitted account details, not an immutable signature record.

Teachers can open **Teacher Studio → Scientists → View profile** to see the student's photo, class, access status, credits and saved-discovery count. **Ban user** requires a reason and confirmation; **Restore access** reverses it. Bans block classroom account access and leave records, credits and reservations preserved. Teacher accounts are protected; manage teaching access first. A signed-in banned user is returned to the welcome hub when the account service rejects their next classroom request, or when the periodic access check runs.

Reservations display a claim code and instructions to collect from the **Grade 10 SSC classroom**. The same reminder remains in **Notifications** until a teacher records collection or cancellation. Change the collection point under **Teacher Studio → Lab settings → Supply collection**. These are website notifications; no email or browser push is sent.

## Enable the extra profile details

Photos, class details, ban/restore and pickup reminders work with the existing classroom database. To let teachers also see account **email, introduction, profile colors, learning totals and submitted agreement details**:

1. Open your Supabase project → **SQL Editor → New query**.
2. Open [supabase/accounts-upgrade.sql](../supabase/accounts-upgrade.sql), copy the **whole file**, paste it into the query, then click **Run**.
3. Run this check:

   ```sql
   select public.csl_backend_status();
   ```

   The result should include `"accounts": 1`, `"platform": 3`, `"version": 1` and `"questions": 972`.
4. Refresh the website, then sign in as your teacher account. Open **Scientists → View profile**.

This short upgrade requires the existing Studio installation (platform 3). It adds a teacher-only profile function, validates collection locations and records access-change reasons in the existing teacher activity history. It preserves accounts, photos, quiz evidence, credits, orders and teacher changes when repeated. Students cannot call the teacher profile function. Passwords, tokens and device-only notebook content are excluded.

The project owner must run this SQL in the private dashboard. Adding or publishing the file on GitHub does not apply database changes. A new project can use the complete [setup.sql](../supabase/setup.sql), which includes these functions.
