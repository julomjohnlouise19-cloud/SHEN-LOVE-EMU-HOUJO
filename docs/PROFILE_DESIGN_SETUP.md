# Profile borders and uploaded banners

Students open **Profile → Borders & banner**. Choose a border, try a banner, then choose **Preview & finish**. Check the complete profile in **Wide view** and **Phone view**, then choose **Apply my design**. **Keep editing** returns to the controls with the draft intact. The editor has 17 distinct designs from the supplied PDF (one source image repeats), category filters and a no-border choice. All borders are free and sit outside the full circular portrait.

**Personal designs work with the existing account setup.** No new username, password or key is needed. The banner uploader is separate from the profile-photo uploader. Existing photos, introduction, colors, progress, credits and account roles are preserved. Guest designs stay on the same device.

**Published and verified:** [Run 43347979432](https://github.com/julomjohnlouise19-cloud/SHEN-LOVE-EMU-HOUJO/actions/runs/43347979432) passed all checks and published personal editing. Its real backend-readiness check reports the sharing update below is still required for classmates' and teachers' design views.

## Let classmates and teachers see saved designs

The website can save a student's own border and banner before this optional database update is installed. Displaying them in **Science friends**, **Leaderboard** learning cards and **Teacher Studio → Scientists** needs the small sharing bridge below. The existing classroom already has its required community version 2.

1. Open [your project's SQL Editor](https://supabase.com/dashboard/project/qevqgbuyboeudxlhfiik/sql/new) and choose **New snippet**.
2. Open [profile-styles-upgrade.sql](../supabase/profile-styles-upgrade.sql), choose **Raw**, copy the **entire file**, paste it into the snippet and click **Run**.
3. Run `select public.csl_backend_status();` and check for **`"profile_styles": 1`**.
4. Refresh the website. Open **Profile → Borders & banner**, apply a design, then check the learning card or teacher's scientist view.

Run only this short script for an existing community-v2 classroom. It adds authorized reads and a storage policy; it does not reset accounts or records. The script can be run again. Fresh projects receive it through `setup.sql`, and the complete `upgrade.sql` includes it. A publishable browser key cannot install this update; the project owner must use SQL Editor or an authenticated database administrator connection.

## Banner choices and privacy

- Upload a JPG, PNG or WebP up to **5 MB** and **24 megapixels**. The website resizes and converts it into a WebP no larger than 256 KiB before upload.
- Choose an image or drop one into the upload area. Use **Horizontal image focus**, **Vertical image focus** and the **Top / Middle / Bottom** shortcuts to position it. The crop preview updates immediately; the full final preview uses the same cover and identity layout as the saved profile. **Center image**, **Remove banner** and **Reset design** are available. **Cancel** leaves the saved design alone.
- The cover is separate from the readable name and account details. Decorative background shapes cannot become blank white overlays. If a saved banner cannot open, the editor explains that and still allows replacement or removal.
- Banners start private. After the sharing bridge is installed, authorized teachers can review them. Students may deliberately enable **Show my banner on my shared learning card**. Replacing a banner turns this choice off again.
- Classmates see borders only on profiles they are already allowed to see. Banner sharing is separate from the existing photo-sharing choice. Hidden, blocked and banned profiles retain the existing restrictions; teachers retain authorized account review.
- The bucket stays private. Only the current, explicitly shared banner receives classmate read permission. Old uploaded banners are not made public. Signed image links expire and are kept in memory, outside backups and offline caches.
- Cosmetic metadata cannot grant teaching access, credits or rank. Uploads and saves are bound to the verified starting account, including if the user switches accounts while a request is in flight.

## Verification

`npm run backend:test` verifies all 17 border IDs, owner/teacher reads, private and deliberately shared banners, blocking/bans, bounded metadata, foreign paths and additive reruns in an isolated PostgreSQL database.

`npm run e2e -- e2e/profile-design.spec.ts` checks the device/guest editor, reload/offline persistence, invalid files and phone accessibility. `npm run e2e:cloud -- e2e/profile-design.cloud.spec.ts` checks account saves, upload failures/cleanup, retries, account switching and authorized views with controlled test accounts. These tests do not send real emails or change production records.
