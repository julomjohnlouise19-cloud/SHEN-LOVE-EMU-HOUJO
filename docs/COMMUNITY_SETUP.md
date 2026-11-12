# Activate the student leaderboard and Science friends

The website uses your existing classroom accounts. Run one additive database update to enable shared rankings, public usernames and friendship requests. Existing accounts, private photos, scores, credits, stock and reservations are preserved.

1. Open [your project's SQL Editor](https://supabase.com/dashboard/project/qevqgbuyboeudxlhfiik/sql/new).
2. Create a **New snippet**. Copy the **entire** [community-upgrade.sql](../supabase/community-upgrade.sql), paste it into the editor and click **Run**.
3. Run `select public.csl_backend_status();` in a snippet. The result should include **`"community": 1`**. This update requires the existing Studio/record-care upgrade, already installed on this classroom project.
4. Refresh the website, sign in normally, and open **Leaderboard** or **Science friends**. A computer can use **Ctrl+Shift+R** once.

No new API key, password, email setting or account creation is required. The script can be run again without resetting friendships or sharing choices. Fresh installations receive the feature through the complete generated `setup.sql`; the complete `upgrade.sql` includes it too.

## Students: choose a classroom username

Open **Science friends → Choose my username**, or **Profile → Classroom profile & username**.

- Choose 3–20 characters, starting with a letter; use letters, numbers or underscores. Usernames are unique and case insensitive. A classroom username is separate from the email used to sign in.
- Check **Join the student leaderboard and username search** when you want to participate. Sharing starts off for existing and new accounts.
- Your display name, username and learning achievements become visible to signed-in classmates. Photo, introduction and grade sharing each have their own initially unchecked choice. Email, section, notebook pages, credits and account settings are excluded from shared learning cards.
- Save. You can change your username or leave sharing later. Hidden/banned accounts disappear from rankings and username lookup; existing friendships are retained while sharing is off.

If you share a photo, upload it using the existing profile photo control. Only the current selected photo receives the extra classroom read permission. Prior uploads remain private. Signed photo links are short lived and peer data is not saved into the offline cache.

## Rankings

The **Science league** offers **This week / All time**, **Classroom / Friends only**, a grade filter for deliberately shared grades, your own standing, leading scientists and paged rankings. Select a scientist to open their shared learning card.

Each correct answer earns **10 discovery points** in the **best completed quiz for each deck, difficulty and classroom day**. Replaying the same quiz can improve that day's best result; repeated results do not stack points. Weeks start Monday in the classroom timezone, normally Asia/Manila. Equal points share a rank. Teacher accounts, banned accounts and archived evidence are excluded. Friends-only rankings include you and accepted friends; blocked pairs are hidden from each other.

Discovery level comes from the same best saved results: 12 XP per correct answer, 3 per other answer, and 120 XP per level. This shared achievement level is separate from device-only practice XP. Classroom credits and supply purchases never determine ranking. All scoring uses verified server records; the browser cannot submit a rank or points balance.

## Find and add friends

1. Ask a classmate for their classroom username.
2. In **Science friends**, enter the complete username (an optional `@` is accepted) and choose **Find scientist**.
3. Check their learning card and choose **Add friend**.
4. The recipient opens **Invitations** and chooses **Accept invitation** or **Decline invitation**. Two crossed invitations do not automatically create a friendship.

**Sent** contains your pending invitations and their cancellation controls. **My friends** lists accepted connections. Refresh or revisit the page to load current requests. Students can remove a friend, block a scientist or manage their own blocks. Unblocking does not restore a previous friendship. After cancellation, removal or decline, another invitation to the same scientist has a one-day cooldown. There is a ten-invitation rolling daily limit, a 50-pending-invitation limit and a 300-friend limit.

Teachers retain the existing **Scientists** profile, ban/restore and **Record care** controls. Community visibility follows the same active-account checks; the new feature does not give students teacher access. Teachers can view the class leaderboard and continue reviewing full authorized profiles in Teacher Studio.

## Verification and rollout

`npm run backend:test` creates an isolated PostgreSQL database and verifies ranking ties and daily bests, username collisions, private fields, photo row policies, friend ownership, request retries, crossed-request concurrency, request limits, blocking, bans and upgrade reruns. `npm run e2e:cloud -- e2e/community.cloud.spec.ts` exercises the student UI with controlled accounts and no real emails.

The deployment reports the actual installed community capability. Before activation, the compatible website keeps existing features available and explains that shared connections need the classroom update. Applying SQL needs the project owner's SQL Editor or an authenticated database administrator connection; a publishable browser key cannot install tables or functions.
