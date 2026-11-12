import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
export async function verifyCommunity(
  sql: (input: string) => string,
  concurrent: (input: string) => Promise<string>,
) {
  const uid = (n: number) =>
    `60000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
  const login = (n: number) =>
    `reset role; set role authenticated; set request.jwt.claim.sub='${uid(n)}';`;
  const text = (v: string) => `'${v.replaceAll("'", "''")}'`;
  const data = <T>(query: string): T => JSON.parse(sql(query).trim());
  const save = (_n: number, version = 1, extra = "") =>
    `public.csl_save_social_profile(null,true,false,false,false,${version})${extra}`;
  const action = (
    kind: string,
    target: number,
    version = 0,
    request = randomUUID(),
  ) =>
    `public.csl_social_action(${text(kind)},'${uid(target)}',null,${version},'${request}')`;
  sql(readFileSync("supabase/community-upgrade.sql", "utf8"));
  sql(`reset role; update public.csl_social_profiles set listed=false,version=version+1;
    ${Array.from({ length: 6 }, (_, i) => `insert into auth.users(id,email,raw_user_meta_data) values('${uid(i + 1)}','community${i + 1}@example.test','{"display_name":"Community Scientist ${i + 1}","grade":8}');`).join("\n")}
    set role anon; select public.test_assert(public.csl_backend_status()->>'community'='2','community capability');
    select public.test_denied('select public.csl_social_home()');
    select public.test_denied('select public.csl_classmate_directory()');
    select public.test_denied('select public.csl_touch_social_activity()');
    ${login(1)} select public.test_denied('select * from public.csl_social_profiles');
    select public.test_denied('select * from csl_private.friendships');
    select public.test_denied('update public.csl_quiz_attempts set correct=8');
    select public.test_assert(public.csl_social_home()->'settings'->>'listed'='true','existing account is ready without a new username');
    select public.test_assert(public.csl_social_home()->'settings'->>'username'='','no new public username is created');
    select public.test_assert((public.csl_leaderboard()->>'total')::int=6,'rankings include active account names immediately');
    select public.test_assert((public.csl_classmate_directory()->>'total')::int=5,'classmates appear without searching or setup');
    select ${save(1)};
    ${login(2)} select public.csl_social_home();
    select ${save(2)};
    ${login(3)} select public.csl_social_home(); select ${save(3)};
    ${login(4)} select public.csl_social_home(); select ${save(4)};
    ${login(5)} select public.csl_social_home(); select ${save(5)};
    ${login(6)} select public.csl_social_home(); select ${save(6)};
    reset role;
    update public.csl_profiles set photo_path='${uid(1)}/shared.webp' where user_id='${uid(1)}';
    insert into storage.objects(bucket_id,name) values('csl-avatars','${uid(1)}/shared.webp'),('csl-avatars','${uid(1)}/older.webp');
    ${login(2)} select public.test_assert((select count(*)=0 from storage.objects where name like '${uid(1)}/%'),'photos remain private before opt-in');
    reset role; update public.csl_social_profiles set share_photo=true,share_grade=true where user_id='${uid(1)}';
    ${login(2)} select public.test_assert((select count(*)=1 from storage.objects where name like '${uid(1)}/%'),'sharing exposes only the current selected photo');
    select public.test_assert(public.csl_scientist_card('${uid(1)}')->>'photo_path'='${uid(1)}/shared.webp','shared photo field is deliberate');
    select public.test_assert(not (public.csl_scientist_card('${uid(1)}') ?| array['email','section','active','salt','hash','notebook','credits','access_token']),'student learning card excludes private account fields');
    reset role;`);
  const day = `(date_trunc('day',now() at time zone 'Asia/Manila') at time zone 'Asia/Manila')`;
  const insertQuiz = (
    n: number,
    correct: number,
    deck = "life.cells",
    level = "medium",
    time = day,
  ) =>
    `insert into public.csl_quiz_attempts(user_id,client_run_id,deck_id,level,mode,started_at,received_at,submitted_answers,responses,correct,total) values('${uid(n)}',gen_random_uuid(),${text(deck)},${text(level)},'practice',${time},${time},'[]','[]',${correct},8)`;
  sql(`reset role; ${insertQuiz(1, 4)}; ${insertQuiz(1, 8)}; ${insertQuiz(1, 6)};
    ${insertQuiz(1, 3, "life.cells", "hard")}; ${insertQuiz(2, 8)}; ${insertQuiz(2, 3, "chemistry.atoms")};
    ${insertQuiz(3, 8, "life.cells", "medium", `${day}-interval '8 days'`)}; ${insertQuiz(3, 1)};
    ${insertQuiz(1, 8, "earth.plates")};
    insert into public.csl_record_labels(quiz_id,archived,reason) select id,true,'Community exclusion test' from public.csl_quiz_attempts where user_id='${uid(1)}' and deck_id='earth.plates';`);
  type Rank = {
    rows: {
      user_id: string;
      points: number;
      rank: number;
      grade: number | null;
    }[];
    you: { points: number; rank: number; level: number };
  };
  const weekly = data<Rank>(
    `${login(1)} select public.csl_leaderboard('week','school');`,
  );
  if (
    weekly.you.points !== 110 ||
    weekly.you.rank !== 1 ||
    weekly.you.level !== 2
  )
    throw new Error(
      "Daily best, archive exclusion or discovery-level calculation failed.",
    );
  const second = weekly.rows.find((r) => r.user_id === uid(2));
  if (second?.points !== 110 || second.rank !== 1 || second.grade !== null)
    throw new Error(
      "Equal scores must share a rank and unshared grades must remain hidden.",
    );
  const all = data<Rank>(
    `${login(3)} select public.csl_leaderboard('all','school');`,
  );
  if (all.you.points !== 90)
    throw new Error("All-time rankings must include earlier weeks.");
  sql(`${login(1)} select public.test_assert(public.csl_find_scientist('COMMUNITY2@EXAMPLE.TEST')->>'user_id'='${uid(2)}','existing sign-in works privately');
    select public.test_assert(public.csl_find_scientist('community2')->>'user_id'='${uid(2)}','existing login name works without a new username');
    select public.test_assert(public.csl_find_scientist('Community Scientist 2')->>'user_id'='${uid(2)}','existing account name works');
    select public.test_assert(not (public.csl_classmate_directory('community2@example.test')->'rows'->0 ?| array['email','section','last_active_at']),'lookup results exclude login email and exact activity times');
    select public.csl_touch_social_activity();
    ${login(2)} select public.test_assert(public.csl_classmate_directory('',true)->>'active_count'='1','recent activity is authenticated and server timed');
    select public.test_assert(public.csl_scientist_card('${uid(1)}')->>'active_recently'='true','recent activity indicator is present');
    select public.test_denied('update csl_private.social_presence set last_active_at=now()');
    reset role; update csl_private.social_presence set last_active_at=now()-interval '3 minutes';
    ${login(2)} select public.test_assert(public.csl_classmate_directory('',true)->>'total'='0','inactive sessions stop showing as recently active');
    select public.test_assert((extract(isodow from (public.csl_leaderboard()->>'week_start')::date))=1,'weeks start on Monday');
    select public.test_assert((public.csl_leaderboard()->>'refresh_at')::timestamptz>now(),'next weekly refresh is in the future');
    ${login(1)}
    select public.test_assert(public.csl_find_scientist('missing_scientist') is null,'missing username stays empty');
    select public.test_rejected('select public.csl_leaderboard(''wrong'',''school'')');
    select public.test_rejected('select public.csl_leaderboard(''all'',''school'',-1)');
    select public.test_rejected('select public.csl_save_social_profile(''scientist_1'',true,false,false,false,1)');`);
  const request = randomUUID();
  sql(`${login(1)} select ${action("send", 2, 0, request)}; select ${action("send", 2, 0, request)};
    select public.test_rejected(${text(`select ${action("send", 3, 0, request)}`)});
    select public.test_rejected(${text(`select ${action("accept", 2, 1)}`)});
    ${login(2)} select public.test_assert(${action("send", 1)}->>'state'='incoming','crossed requests do not automatically accept');
    ${login(3)} select public.test_rejected(${text(`select ${action("accept", 1, 1)}`)});
    ${login(2)} select ${action("accept", 1, 1)};
    select public.test_assert(public.csl_social_home()->>'friends'='1','recipient accepts friendship');
    select public.test_assert((public.csl_leaderboard('week','friends')->>'total')::int=2,'friends-only ranking contains self and accepted friends');
    reset role; select public.test_assert((select count(*)=1 from csl_private.friendships where user_low='${uid(1)}' and user_high='${uid(2)}'),'one relationship per unordered pair');`);
  await Promise.all([
    concurrent(`${login(1)} select ${action("send", 3)};`),
    concurrent(`${login(3)} select ${action("send", 1)};`),
  ]);
  sql(`reset role; select public.test_assert((select count(*)=1 from csl_private.friendships where user_low='${uid(1)}' and user_high='${uid(3)}'),'concurrent crossed invitations keep one pending relationship');
    ${login(2)} select ${action("block", 1, 2)};
    select public.test_assert(public.csl_find_scientist('community1@example.test') is null,'blocked profiles disappear from existing-login search');
    select public.test_assert((select count(*)=0 from storage.objects where name like '${uid(1)}/%'),'blocking removes new photo access');
    ${login(1)} select public.test_assert(public.csl_scientist_card('${uid(2)}') is null,'block hides profiles in both directions');
    select public.test_assert(not exists(select 1 from jsonb_array_elements(public.csl_leaderboard('all','school')->'rows') r where r->>'user_id'='${uid(2)}'),'block hides rankings in both directions');
    select public.test_rejected(${text(`select ${action("unblock", 2, 3)}`)});
    ${login(2)} select ${action("unblock", 1, 3)};
    select public.test_assert(public.csl_social_home()->>'friends'='0','unblocking does not restore a friendship');
    select public.test_rejected(${text(`select ${action("send", 1)}`)});
    reset role;`);
  // Serialize a sender's last daily slot across two different recipients.
  sql(`reset role; insert into csl_private.social_actions(user_id,request_id,action,payload,result)
    select '${uid(4)}',gen_random_uuid(),'send','{}','{}' from generate_series(1,9);`);
  const limited = await Promise.allSettled([
    concurrent(`${login(4)} select ${action("send", 5)};`),
    concurrent(`${login(4)} select ${action("send", 6)};`),
  ]);
  if (limited.filter((r) => r.status === "fulfilled").length !== 1)
    throw new Error(
      "Concurrent invitations exceeded the last daily request slot.",
    );
  sql(`reset role; update public.csl_profiles set active=false where user_id='${uid(1)}';
    ${login(1)} select public.test_denied('select public.csl_social_home()'); select public.test_denied('select public.csl_leaderboard()');
    ${login(3)} select public.test_assert(public.csl_find_scientist('community1@example.test') is null,'banned students are not discoverable');
    reset role; update public.csl_profiles set active=true where user_id='${uid(1)}';
    update public.csl_social_profiles set listed=false where user_id='${uid(1)}';
    ${login(3)} select public.test_assert(public.csl_find_scientist('community1@example.test') is null,'opting out removes account discovery');
    select public.test_assert((select count(*)=0 from storage.objects where name like '${uid(1)}/%'),'opting out removes new shared-photo access'); reset role;`);
  const hash = () =>
    sql(
      "reset role; select md5((select jsonb_agg(to_jsonb(f) order by user_low,user_high) from csl_private.friendships f)::text);",
    ).trim();
  const before = hash();
  sql(`reset role;
    insert into auth.users(id,email,raw_user_meta_data) values('${uid(7)}','legacy7@example.test','{"display_name":"Unconfigured legacy profile"}'),('${uid(8)}','legacy8@example.test','{"display_name":"Deliberately hidden profile"}');
    update public.csl_social_profiles set listed=false,version=1 where user_id='${uid(7)}';
    update public.csl_social_profiles set listed=false,version=2 where user_id='${uid(8)}';
    alter table public.csl_social_profiles add constraint legacy_username_required check(not listed or username is not null) not valid;`);
  sql(readFileSync("supabase/community-upgrade.sql", "utf8"));
  if (hash() !== before)
    throw new Error("Community upgrade rerun changed friendships.");
  sql(`reset role; select public.test_assert((select listed and username is null from public.csl_social_profiles where user_id='${uid(7)}'),'unconfigured v1 profile uses its existing account');
    select public.test_assert((select not listed from public.csl_social_profiles where user_id='${uid(8)}'),'deliberate v1 opt-out stays private');
    select public.test_assert((select not listed from public.csl_social_profiles where user_id='${uid(1)}'),'existing sharing choices survive reruns');`);
  console.log(
    "Community PostgreSQL passed: immediate account rankings/directory, private login lookup, weekly metadata, server-timed activity, photo RLS, request ownership/retries/concurrency/limits, blocking, bans and v1 privacy-preserving upgrades.",
  );
}
