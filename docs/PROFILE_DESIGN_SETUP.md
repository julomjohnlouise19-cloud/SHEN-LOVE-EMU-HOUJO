# Profile photos and banners

Open **Profile → Edit banner** to choose a backdrop, position it, then choose **Preview & finish**. Check the complete profile in **Wide view** and **Phone view**, then choose **Apply my banner**. **Keep editing** preserves the draft. The border-selection interface has been removed at the user's request. Existing saved decorations are preserved; banner controls do not change them.

Personal photos and banners work with the existing account setup. No new SQL, key or username is needed for personal uploads. The two uploaders remain separate. Guest banners stay on the same device.

## Upload and preview

- Both inputs accept supported raster images up to **20 MiB** and **64 megapixels**. JPG, PNG, WebP, GIF, BMP and AVIF are recognized from their contents, even if a phone supplies no file-type label. HEIC works only where the browser can decode it; otherwise export it as JPG or PNG first. Animated inputs become a still image.
- The browser crops profile photos to a square and normalizes uploads to private WebP files no larger than **256 KiB**. It uses a fallback decoder when the primary browser API is unavailable. Corrupt, unsupported and oversized files receive clear guidance; a failed preparation leaves the saved image alone.
- **Profile photo** saves automatically. Upload status explains preparation, saving and removal. The same file can be retried after an error.
- For a banner, choose a file or drop it into the upload area. Move the horizontal/vertical focus sliders or use **Top / Middle / Bottom**. **Center image** resets placement. **Remove banner** and **Reset banner** affect only the backdrop; **Cancel** leaves the saved profile unchanged.
- A new selection replaces an unfinished preview. Resetting, removing or closing cancels pending preparation so a late image cannot reappear. Preparing a draft does not upload or save it; **Apply my banner** does.
- The preview and saved profile share the same readable cover/identity layout. An unavailable saved banner can still be replaced or removed. Phone save and return controls remain visible.

## Optional classmate and teacher banner views

The live classroom already has community version 2. Follow [the one-step credit-ranking setup](CREDIT_RANKINGS_SETUP.md) to activate both the credit leaderboard and the existing banner-sharing bridge. If only banner sharing is wanted, run the entire [profile-styles-upgrade.sql](../supabase/profile-styles-upgrade.sql) in a new SQL Editor snippet and verify `"profile_styles": 1` through `select public.csl_backend_status();`.

Banners start private. Authorized teachers can review them after the bridge is installed. Students may deliberately enable **Show my banner on my shared learning card**; replacing a banner turns that choice off again. Photo sharing remains a separate choice. Hidden, blocked and banned profiles keep the existing restrictions. Only the current explicitly shared file is eligible for classmate access; old uploads are not made public.

The bucket stays private. Signed links expire, stay in memory and are excluded from backups and offline caches. Uploads and metadata writes stay bound to the verified starting account, including during an account switch. Cosmetic changes cannot grant roles, credits or rank. If saving is interrupted with an uncertain server response, reopen the profile to check whether the save completed before retrying.

## Verification

`npm run e2e -- e2e/profile-design.spec.ts` checks guest/device persistence, previews, phone accessibility and return controls. `npm run e2e:cloud -- e2e/image-inputs.cloud.spec.ts e2e/profile-design.cloud.spec.ts` checks both uploaders, missing labels, fallback decoding, invalid-file recovery, camera-sized files, cancellation, retries, cleanup, account changes and authorized views. `npm run backend:test` verifies private storage, approved legacy decoration metadata, banner consent, blocks/bans and additive reruns. Controlled checks do not send real emails or modify production accounts.
