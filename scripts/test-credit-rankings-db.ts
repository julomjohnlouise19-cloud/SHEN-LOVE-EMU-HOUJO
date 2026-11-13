import { readFileSync } from "node:fs";
export function verifyCreditRankings(sql: (input: string) => string) {
  const id = (n: number) =>
    `80000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
  const login = (n: number) =>
    `reset role; set role authenticated; set request.jwt.claim.sub='${id(n)}';`;
  const result = <T>(query: string) => JSON.parse(sql(query).trim()) as T;
  const upgrade = readFileSync("supabase/credit-rankings-upgrade.sql", "utf8");
  sql(upgrade);
  sql(`reset role; update public.csl_social_profiles set listed=false;
    ${[1, 2, 3, 4].map((n) => `insert into auth.users(id,email,raw_user_meta_data) values('${id(n)}','credit-rank-${n}@example.test','{"display_name":"Credit Scientist ${n}","grade":8}');`).join("\n")}
    insert into public.csl_teachers(user_id) values('${id(4)}');
    update public.csl_wallets set credits=case user_id when '${id(1)}'::uuid then 80 when '${id(2)}'::uuid then 240 when '${id(3)}'::uuid then 240 else 9999 end where user_id in('${id(1)}','${id(2)}','${id(3)}','${id(4)}');
    set role anon; reset request.jwt.claim.sub;
    select public.test_assert(public.csl_backend_status()->>'credit_rankings'='1','credit ranking capability');
    select public.test_denied('select public.csl_credit_leaderboard()');
  `);
  type Ranking = {
    basis: string;
    rows: {
      user_id: string;
      credits: number;
      rank: number;
      grade: number | null;
      email?: string;
      section?: string;
    }[];
    you: { credits: number; rank: number } | null;
    total: number;
  };
  const read = (n = 1, scope = "school", grade = "null") =>
    result<Ranking>(
      `${login(n)} select public.csl_credit_leaderboard('${scope}',0,${grade});`,
    );
  const first = read();
  if (
    first.basis !== "class_credits" ||
    first.total !== 3 ||
    first.rows.map((r) => r.credits).join() !== "240,240,80" ||
    first.rows.map((r) => r.rank).join() !== "1,1,2" ||
    first.you?.credits !== 80
  )
    throw new Error(
      "Wallet balances, highest-first order or shared ranks are wrong.",
    );
  if (first.rows.some((r) => r.email || r.section || r.grade !== null))
    throw new Error("Credit rankings exposed private contact/class fields.");
  sql(`reset role;
    insert into public.csl_quiz_attempts(user_id,client_run_id,deck_id,level,mode,started_at,received_at,submitted_answers,responses,correct,total) values('${id(1)}',gen_random_uuid(),'life.body','medium','practice',now(),now(),'[]','[]',8,8);
  `);
  if (read().you?.rank !== 2)
    throw new Error("Quiz points incorrectly determine a credit rank.");
  sql(
    `reset role; update public.csl_wallets set credits=300 where user_id='${id(1)}';`,
  );
  if (read().you?.rank !== 1)
    throw new Error(
      "An increased wallet balance did not move the student to first.",
    );
  sql(
    `reset role; update public.csl_wallets set credits=20 where user_id='${id(1)}';`,
  );
  if (read().you?.rank !== 2)
    throw new Error("Spending did not lower the current-balance rank.");
  if (
    read(1, "friends").total !== 1 ||
    read(1, "school", "8").total !== 0 ||
    read(4).you !== null
  )
    throw new Error("Friend, private-grade or teacher filtering is wrong.");
  sql(`${login(1)} select public.csl_social_action('send','${id(2)}',null,0,gen_random_uuid());
    ${login(2)} select public.csl_social_action('accept','${id(1)}',null,1,gen_random_uuid());`);
  if (read(1, "friends").total !== 2)
    throw new Error("Accepted friends were not included.");
  sql(
    `reset role; update public.csl_social_profiles set share_grade=true where user_id='${id(2)}';`,
  );
  if (read(1, "school", "8").total !== 1)
    throw new Error("Shared-grade filter is wrong.");
  sql(
    `${login(1)} select public.csl_social_action('block','${id(2)}',null,2,gen_random_uuid());`,
  );
  if (read().rows.some((r) => r.user_id === id(2)))
    throw new Error("A blocked account appeared in credit rankings.");
  sql(
    `reset role; update public.csl_profiles set active=false where user_id='${id(3)}';`,
  );
  if (read().total !== 1)
    throw new Error("A banned account appeared in credit rankings.");
  sql(
    `reset role; update public.csl_social_profiles set listed=false where user_id='${id(1)}';`,
  );
  if (read(4).rows.some((r) => r.user_id === id(1)))
    throw new Error("An opted-out account appeared in credit rankings.");
  sql(`${login(1)} select public.test_rejected('select public.csl_credit_leaderboard(''invalid'')');
    select public.test_rejected('select public.csl_credit_leaderboard(''school'',-1)');
    select public.test_rejected('select public.csl_credit_leaderboard(''school'',0,99)'); reset role;`);
  const snapshot = () =>
    sql(
      "reset role; select jsonb_build_object('wallets',(select jsonb_agg(to_jsonb(w) order by user_id) from public.csl_wallets w),'attempts',(select count(*) from public.csl_quiz_attempts),'orders',(select count(*) from public.csl_orders));",
    ).trim();
  const before = snapshot();
  sql(upgrade);
  sql(readFileSync("supabase/community-upgrade.sql", "utf8"));
  sql(readFileSync("supabase/accounts-upgrade.sql", "utf8"));
  if (snapshot() !== before)
    throw new Error(
      "Ranking upgrades changed wallets, saved quizzes or reservations.",
    );
  sql(
    "set role anon; select public.test_assert(public.csl_backend_status()->>'credit_rankings'='1','older upgrades preserve credit capability'); reset role;",
  );
  console.log(
    "Credit rankings PostgreSQL passed: authoritative balances, spending/earnings, shared ties, private fields, opt-outs, friends, blocks/bans, teacher exclusion and non-destructive reruns.",
  );
}
