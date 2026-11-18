# Activate the class-credit daily wheel

The updated online wheel saves one daily reward to the student's existing classroom wallet. Applying this update preserves accounts, credits, stock, quiz records, calendar claims and old device practice history. It does not convert local practice merits into trusted credits.

1. Open your [project SQL Editor](https://supabase.com/dashboard/project/qevqgbuyboeudxlhfiik/sql/new).
2. Open [daily-wheel-upgrade.sql](../supabase/daily-wheel-upgrade.sql), use **Copy raw file**, paste the entire file into the SQL Editor and press **Run**. It needs the existing platform-3 Teacher Studio, which this classroom already has.
3. Check activation with:

   ```sql
   select public.csl_backend_status();
   ```

   The result must include `"daily_wheel": 1`.
4. Refresh the website and sign in with a verified student account. Open **Daily spin**. Spin once, confirm the class-credit wallet updates, then refresh: the same receipt remains and another reward cannot be collected that day.

Teachers control the maximum under **Teacher Studio → Lab settings → Daily class-credit spin maximum**. The free wheel awards 0 through that maximum, up to 500 credits; the server selects and saves the prize and science sector. The classroom timezone controls midnight. Guests sign in first, and teacher accounts see a student-reward preview. The seven-week calendar stays separate.

Before activation the online page clearly says the teacher is preparing shared rewards. It never awards a pretend class-credit balance. The local demo retains its explicitly local practice wheel.
