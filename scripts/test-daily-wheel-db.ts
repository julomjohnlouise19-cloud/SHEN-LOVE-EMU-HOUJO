import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  validClassWheel,
  validWheelResult,
  type ClassWheel,
  type WheelResult,
} from "../src/core/daily-wheel";

export async function verifyDailyWheel(
  sql: (value: string) => string,
  concurrentSql: (value: string) => Promise<string>,
) {
  const id = (n: number) =>
    "a0000000-0000-4000-8000-" + String(n).padStart(12, "0");
  const login = (n: number) =>
    `reset role; set role authenticated; set request.jwt.claim.sub='${id(n)}';`;
  const read = <T>(value: string) => JSON.parse(sql(value).trim()) as T;
  const upgrade = readFileSync("supabase/daily-wheel-upgrade.sql", "utf8");
  const denied = (call: string) =>
    `public.test_rejected('${("select " + call).replaceAll("'", "''")}')`;
  const claim = (n: number, date = "2026-11-18", request = randomUUID()) =>
    `public.csl_spin_daily_wheel('${id(n)}','${date}','${request}')`;
  const clock = (time: string) =>
    sql(
      `reset role;create or replace function csl_private.wheel_now() returns timestamptz language sql volatile set search_path='' as $$select '${time}'::timestamptz;$$;`,
    );
  const entropy = (value: number) =>
    sql(
      `reset role;create or replace function csl_private.wheel_entropy() returns bigint language sql volatile set search_path='' as $$select ${value}::bigint;$$;`,
    );
  const view = (n = 1) => {
    const result = read<ClassWheel>(
      login(n) + "select public.csl_daily_wheel();",
    );
    if (!validClassWheel(result))
      throw new Error("Daily wheel view violates the client contract.");
    return result;
  };
  sql(upgrade);
  sql(`reset role;
    ${[1, 2, 3, 4].map((n) => `insert into auth.users(id,email,raw_user_meta_data) values('${id(n)}','wheel-${n}@example.test','{"display_name":"Wheel Scientist ${n}","grade":8}');`).join("\n")}
    insert into public.csl_teachers(user_id) values('${id(3)}');
    update public.csl_settings set rules=jsonb_set(jsonb_set(rules,'{timezone}','"Asia/Manila"'),'{spinMax}','12') where id;
    set role anon; reset request.jwt.claim.sub;
    select public.test_assert(public.csl_backend_status()->>'daily_wheel'='1','wheel capability');
    select public.test_denied('select public.csl_daily_wheel()');
    select public.test_denied('select * from csl_private.daily_wheel_claims');
    ${login(1)} select public.test_denied('select * from csl_private.daily_wheel_claims');
    select public.test_denied('select csl_private.wheel_entropy()');
    select ${denied(`public.csl_spin_daily_wheel('${id(2)}','2026-11-18','${randomUUID()}')`)};
    ${login(3)} select ${denied(claim(3))};reset role;`);
  clock("2026-11-18T15:59:00Z");
  entropy(77);
  const original = view();
  if (!original.eligible || original.server_day !== "2026-11-18")
    throw new Error("The wheel did not use its classroom day.");
  const request = randomUUID();
  const result = read<WheelResult>(
    login(1) + "select " + claim(1, "2026-11-18", request) + ";",
  );
  if (
    !validWheelResult(result) ||
    result.awarded !== 12 ||
    result.receipt.slot !== 5 ||
    result.wheel.balance !== original.balance + 12
  )
    throw new Error("The server did not award its saved class-credit outcome.");
  const replay = read<WheelResult>(
    login(1) + "select " + claim(1, "2026-11-18", request) + ";",
  );
  const repeat = read<WheelResult>(login(1) + "select " + claim(1) + ";");
  if (
    !validWheelResult(replay) ||
    !replay.already_claimed ||
    replay.awarded !== 0 ||
    JSON.stringify(replay.receipt) !== JSON.stringify(result.receipt) ||
    repeat.awarded !== 0 ||
    !repeat.already_claimed
  )
    throw new Error("Repeated spins awarded duplicate class credits.");
  sql(`${login(1)}select ${denied(claim(1, "2026-11-19", request))};select ${denied(claim(1, "2026-11-17"))};reset role;
    select public.test_assert((select count(*)=1 from public.csl_credit_ledger where user_id='${id(1)}' and kind='daily_wheel'),'one durable ledger row');`);
  const before = view(2).balance;
  const pair = await Promise.all([
    concurrentSql(login(2) + "select " + claim(2) + ";"),
    concurrentSql(login(2) + "select " + claim(2) + ";"),
  ]);
  const results = pair.map((value) => JSON.parse(value.trim()) as WheelResult);
  if (
    !results.every(validWheelResult) ||
    results.filter((v) => !v.already_claimed).length !== 1 ||
    view(2).balance !== before + 12 ||
    results[0].receipt.slot !== results[1].receipt.slot
  )
    throw new Error("Concurrent daily wheel claims were not serialized.");
  sql(`reset role; update public.csl_wallets set credits=10000000 where user_id='${id(4)}';${login(4)} select ${denied(claim(4))};reset role;
    select public.test_assert(not exists(select 1 from csl_private.daily_wheel_claims where user_id='${id(4)}'),'wallet overflow rolls back the spin');
    update public.csl_profiles set active=false where user_id='${id(4)}';${login(4)} select ${denied("public.csl_daily_wheel()")}; select ${denied(claim(4))};reset role;`);
  clock("2026-11-18T16:00:01Z");
  entropy(0);
  if (!view().eligible || view().server_day !== "2026-11-19")
    throw new Error("The next classroom day did not open a new spin.");
  const oldRetry = read<WheelResult>(
    login(1) + "select " + claim(1, "2026-11-18", request) + ";",
  );
  if (
    !validWheelResult(oldRetry) ||
    !oldRetry.wheel.eligible ||
    oldRetry.awarded !== 0
  )
    throw new Error("A midnight retry consumed the next day's reward.");
  const zero = read<WheelResult>(
    login(1) + "select " + claim(1, "2026-11-19") + ";",
  );
  if (
    !validWheelResult(zero) ||
    zero.receipt.credits !== 0 ||
    zero.receipt.slot !== 0 ||
    zero.wheel.eligible
  )
    throw new Error(
      "A zero-credit discovery did not save a durable daily receipt.",
    );
  const savedBalance = zero.wheel.balance;
  sql(`reset role; update public.csl_profiles set active=true where user_id='${id(4)}';
    update public.csl_wallets set credits=200 where user_id='${id(4)}';
    create sequence csl_private.wheel_clock_test;
    create or replace function csl_private.wheel_now() returns timestamptz language sql volatile set search_path='' as $$
      select case when nextval('csl_private.wheel_clock_test')=1 then '2026-11-18T15:59:59.999Z'::timestamptz else '2026-11-18T16:00:00.001Z'::timestamptz end;
    $$;`);
  entropy(77);
  const boundary = read<WheelResult>(
    login(4) + "select " + claim(4, "2026-11-18") + ";",
  );
  if (
    !validWheelResult(boundary) ||
    boundary.wheel.server_day !== "2026-11-18" ||
    view(4).server_day !== "2026-11-19"
  )
    throw new Error(
      "A midnight boundary produced an inconsistent reward receipt.",
    );
  sql(upgrade);
  clock("2026-11-18T16:01:00Z");
  if (view().balance !== savedBalance || view().receipt?.credits !== 0)
    throw new Error("Reapplying the wheel upgrade changed existing rewards.");
  sql("reset role;");
  console.log(
    "Daily wheel PostgreSQL passed: trusted wallet/ledger awards, role/RLS isolation, retries, races, caps, zero awards, Manila midnight and additive reruns.",
  );
}
