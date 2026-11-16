import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  validCalendar,
  type CalendarResult,
  type CalendarSettings,
  type DailyCalendar,
} from "../src/core/daily-calendar";

export async function verifyDailyCalendar(
  sql: (input: string) => string,
  concurrentSql: (input: string) => Promise<string>,
) {
  const id = (n: number) =>
    `90000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
  const login = (n: number) =>
    `reset role; set role authenticated; set request.jwt.claim.sub='${id(n)}';`;
  const read = <T>(query: string) => JSON.parse(sql(query).trim()) as T;
  const literal = (value: string) => "'" + value.replaceAll("'", "''") + "'";
  const rejected = (expression: string) =>
    `public.test_rejected(${literal(`select ${expression}`)})`;
  const upgrade = readFileSync("supabase/daily-rewards-upgrade.sql", "utf8");
  sql(upgrade);
  const clock = (time: string) =>
    sql(
      `reset role; create or replace function csl_private.calendar_now() returns timestamptz language sql volatile set search_path='' as $$ select '${time}'::timestamptz; $$;`,
    );
  const claim = (n: number, date: string, request = randomUUID()) =>
    `public.csl_claim_daily_calendar('${id(n)}','${date}','${request}')`;
  const view = (n = 1) => {
    const result = read<DailyCalendar>(
      `${login(n)} select public.csl_daily_calendar();`,
    );
    if (!validCalendar(result))
      throw new Error(
        `Calendar RPC did not satisfy the UI contract: ${JSON.stringify(result)}`,
      );
    return result;
  };
  const settings = () =>
    read<CalendarSettings>(
      `${login(3)} select public.csl_calendar_settings();`,
    );
  const save = (
    body: { enabled: boolean; daily: number; weekly: number; version: number },
    request = randomUUID(),
  ) =>
    `public.csl_calendar_settings(${body.enabled},${body.daily},${body.weekly},${body.version},'${request}')`;
  sql(`reset role;
    ${[1, 2, 3, 4].map((n) => `insert into auth.users(id,email,raw_user_meta_data) values('${id(n)}','calendar-${n}@example.test','{"display_name":"Calendar Scientist ${n}","grade":8}');`).join("\n")}
    insert into public.csl_teachers(user_id) values('${id(3)}');
    update public.csl_settings set rules=jsonb_set(rules,'{timezone}','"Asia/Manila"') where id;
    set role anon; reset request.jwt.claim.sub;
    select public.test_assert(public.csl_backend_status()->>'daily_calendar'='1','calendar capability');
    select public.test_denied('select public.csl_daily_calendar()');
    select public.test_denied('select public.csl_calendar_settings()'); reset role;
    ${login(1)} select public.test_denied('select * from csl_private.daily_calendar_claims');
    select public.test_denied('select csl_private.calendar_now()');
    select public.test_rejected('select public.csl_calendar_settings()'); reset role;
    ${login(3)} select ${rejected(claim(3, "2026-11-16"))}; reset role;`);
  clock("2026-11-16T15:59:00Z");
  const original = view();
  if (
    original.started_on !== null ||
    !original.eligible ||
    original.server_day !== "2026-11-16"
  )
    throw new Error(
      "The first calendar started before its first claim, or used UTC instead of the classroom day.",
    );
  const before = original.balance;
  const request = randomUUID();
  const first = read<CalendarResult>(
    `${login(1)} select ${claim(1, "2026-11-16", request)};`,
  );
  if (
    first.awarded !== 5 ||
    first.calendar.balance !== before + 5 ||
    first.calendar.started_on !== "2026-11-16" ||
    first.calendar.eligible ||
    first.receipt.day_number !== 1
  )
    throw new Error("The first calendar credit award is wrong.");
  const retry = read<CalendarResult>(
    `${login(1)} select ${claim(1, "2026-11-16", request)};`,
  );
  const another = read<CalendarResult>(
    `${login(1)} select ${claim(1, "2026-11-16")};`,
  );
  if (
    retry.awarded !== 0 ||
    another.awarded !== 0 ||
    !retry.already_claimed ||
    another.calendar.balance !== before + 5
  )
    throw new Error("A repeated daily claim awarded twice.");
  sql(
    `${login(2)} select public.test_rejected('select public.csl_claim_daily_calendar(''${id(1)}'',''2026-11-16'',gen_random_uuid())'); reset role;`,
  );
  clock("2026-11-16T16:00:00Z");
  if (
    view().server_day !== "2026-11-17" ||
    view().day_index !== 2 ||
    !view().eligible
  )
    throw new Error("The calendar did not roll over at Manila midnight.");
  const oldRetry = read<CalendarResult>(
    `${login(1)} select ${claim(1, "2026-11-16", request)};`,
  );
  if (
    oldRetry.awarded ||
    !oldRetry.calendar.eligible ||
    oldRetry.receipt.day_number !== 1
  )
    throw new Error("A receipt retry after midnight created a second award.");
  sql(`${login(1)} select ${rejected(claim(1, "2026-11-17", request))};
    select ${rejected(claim(1, "2026-11-16"))};
    select ${rejected(claim(1, "2026-11-18"))}; reset role;`);
  const races = await Promise.all(
    [1, 2].map(() =>
      concurrentSql(
        `${login(1)} begin; select ${claim(1, "2026-11-17")}; select pg_sleep(0.1); commit;`,
      ),
    ),
  );
  const awarded = races.map(
    (r) => JSON.parse(r.trim().split("\n")[0]) as CalendarResult,
  );
  if (
    awarded.reduce((sum, r) => sum + r.awarded, 0) !== 5 ||
    view().balance !== before + 10 ||
    view().claims.length !== 2
  )
    throw new Error(
      "Competing tabs did not serialize one wallet/ledger award.",
    );
  clock("2026-11-22T04:00:00Z");
  const seventh = read<CalendarResult>(
    `${login(1)} select ${claim(1, "2026-11-22")};`,
  );
  if (
    seventh.awarded !== 10 ||
    seventh.receipt.day_number !== 7 ||
    seventh.calendar.claims.length !== 3
  )
    throw new Error("Seventh-day rewards or skipped days are wrong.");
  const old = settings(),
    settingsId = randomUUID();
  const update = save(
    { enabled: false, daily: 8, weekly: 16, version: old.version },
    settingsId,
  );
  const paused = read<CalendarSettings>(`${login(3)} select ${update};`);
  if (
    paused.enabled ||
    paused.daily_credits !== 8 ||
    paused.weekly_credits !== 16 ||
    paused.version !== old.version + 1
  )
    throw new Error("Teacher calendar settings did not apply.");
  const settingsRetry = read<CalendarSettings>(`${login(3)} select ${update};`);
  if (settingsRetry.version !== paused.version)
    throw new Error("A settings retry was applied twice.");
  sql(`${login(3)} select ${rejected(save({ enabled: true, daily: 8, weekly: 16, version: old.version }))};
    select ${rejected(save({ enabled: true, daily: 21, weekly: 30, version: paused.version }))};
    select ${rejected(save({ enabled: true, daily: 8, weekly: 7, version: paused.version }))};
    select ${rejected(save({ enabled: true, daily: 8, weekly: 16, version: old.version }, settingsId))}; reset role;`);
  clock("2026-11-23T04:00:00Z");
  sql(`${login(1)} select ${rejected(claim(1, "2026-11-23"))}; reset role;`);
  if (view().eligible)
    throw new Error("A paused calendar still permits claims.");
  read<CalendarSettings>(
    `${login(3)} select ${save({ enabled: true, daily: 8, weekly: 16, version: paused.version })};`,
  );
  const existing = read<CalendarResult>(
    `${login(1)} select ${claim(1, "2026-11-23")};`,
  );
  const fresh = read<CalendarResult>(
    `${login(2)} select ${claim(2, "2026-11-23")};`,
  );
  if (
    existing.awarded !== 5 ||
    fresh.awarded !== 8 ||
    fresh.calendar.day_index !== 1
  )
    throw new Error(
      "Reward settings rewrote an existing calendar, or did not apply to a new enrollment.",
    );
  sql(
    `reset role; update public.csl_settings set rules=jsonb_set(rules,'{timezone}','"UTC"') where id;`,
  );
  if (view().timezone !== "Asia/Manila")
    throw new Error(
      "Editing the classroom timezone changed an existing calendar.",
    );
  clock("2027-01-03T04:00:00Z");
  const last = read<CalendarResult>(
    `${login(1)} select ${claim(1, "2027-01-03")};`,
  );
  if (last.receipt.day_number !== 49 || last.awarded !== 10)
    throw new Error("The seven-week final day is wrong.");
  clock("2027-01-04T04:00:00Z");
  if (view().eligible || view().day_index !== 50)
    throw new Error("A completed calendar restarted automatically.");
  sql(`${login(1)} select ${rejected(claim(1, "2027-01-04"))}; reset role;
    update public.csl_profiles set active=false where user_id='${id(4)}';
    ${login(4)} select public.test_rejected('select public.csl_daily_calendar()');
    select ${rejected(claim(4, "2027-01-04"))}; reset role;
    select public.test_assert((select count(*)=5 from public.csl_credit_ledger where user_id='${id(1)}' and kind='daily_calendar'),'one ledger entry per successful claim');
    select public.test_assert((select count(*)=2 from public.csl_teacher_activity where action='daily_calendar_settings' and actor='${id(3)}'),'settings changes are audited exactly once');`);
  const snapshot = () =>
    sql(
      "reset role; select jsonb_build_object('wallets',(select jsonb_agg(to_jsonb(w) order by user_id) from public.csl_wallets w),'claims',(select jsonb_agg(to_jsonb(c) order by id) from csl_private.daily_calendar_claims c),'settings',(select to_jsonb(c) from csl_private.daily_calendar_config c),'stock',(select jsonb_agg(to_jsonb(i) order by id) from public.csl_items i),'quizzes',(select count(*) from public.csl_quiz_attempts));",
    ).trim();
  const saved = snapshot();
  sql(upgrade);
  for (const fragment of [
    "community-upgrade.sql",
    "accounts-upgrade.sql",
    "studio-upgrade.sql",
    "credit-rankings-upgrade.sql",
  ])
    sql(readFileSync(`supabase/${fragment}`, "utf8"));
  if (snapshot() !== saved)
    throw new Error(
      "An additive rerun changed claims, settings, wallets, stock or records.",
    );
  sql(
    "set role anon; reset request.jwt.claim.sub; select public.test_assert(public.csl_backend_status()->>'daily_calendar'='1','older upgrades preserve calendar capability'); reset role;",
  );
  console.log(
    "Daily calendar PostgreSQL passed: 49 days, Manila midnight, authoritative credits, idempotent/concurrent claims, no backfill/future claims, immutable receipts, teacher pause/defaults/audit, bans/ownership, RLS and non-destructive reruns.",
  );
}
