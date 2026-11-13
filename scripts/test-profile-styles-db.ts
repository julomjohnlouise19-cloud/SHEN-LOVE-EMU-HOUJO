import { readFileSync } from "node:fs";
import { profileBorders } from "../src/data/profile-borders";
export function verifyProfileStyles(sql: (input: string) => string) {
  const uid = (n: number) =>
    `70000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
  const login = (n: number) =>
    `reset role; set role authenticated; set request.jwt.claim.sub='${uid(n)}';`;
  const path = `${uid(1)}/${uid(8)}.webp`,
    older = `${uid(1)}/${uid(9)}.webp`,
    foreign = `${uid(2)}/${uid(8)}.webp`;
  const style = (patch = {}) =>
    `'${JSON.stringify({ version: 1, border: "moon-garden", banner_path: path, x: 25, y: 100, share_banner: false, ...patch })}'::jsonb`;
  const set = (patch = {}) =>
    `reset role; update auth.users set raw_user_meta_data=raw_user_meta_data||jsonb_build_object('csl_profile_style',${style(patch)}) where id='${uid(1)}';`;
  const view = `public.csl_profile_styles(array['${uid(1)}']::uuid[])->0->'design'`;
  const upgrade = readFileSync("supabase/profile-styles-upgrade.sql", "utf8");
  sql(upgrade);
  sql(`reset role;
    ${[1, 2, 3].map((n) => `insert into auth.users(id,email,raw_user_meta_data) values('${uid(n)}','profile-design-${n}@example.test','{"display_name":"Design Scientist ${n}","grade":8}');`).join("\n")}
    insert into public.csl_teachers(user_id) values('${uid(3)}');
    insert into storage.objects(bucket_id,name) values('csl-avatars','${path}'),('csl-avatars','${older}'),('csl-avatars','${foreign}');
    ${set()}
    set role anon; reset request.jwt.claim.sub;
    select public.test_assert(public.csl_backend_status()->>'profile_styles'='1','profile sharing capability');
    select public.test_denied('select public.csl_profile_styles(array[]::uuid[])');
    ${login(1)} select public.test_denied('select csl_private.profile_design(''${uid(2)}'')');
    select public.test_assert(${view}->>'border'='moon-garden','own selected border');
    select public.test_assert(${view}->>'banner_path'='${path}','owner sees private current banner');
    select public.test_assert(${view}->>'x'='25' and ${view}->>'y'='100','saved focus values');
    select public.test_rejected('select public.csl_profile_styles(null)');
    select public.test_rejected('select public.csl_profile_styles(array[]::uuid[])');
    select public.test_rejected('select public.csl_profile_styles(array_fill(''${uid(1)}''::uuid,array[51]))');
    ${login(2)} select public.test_assert(${view}->>'border'='moon-garden','listed classmates see decorative border');
    select public.test_assert(${view}->>'banner_path' is null,'private banner is redacted');
    select public.test_assert(not exists(select 1 from storage.objects where name='${path}'),'private banner storage denied to peer');
    ${login(3)} select public.test_assert(${view}->>'banner_path'='${path}','teacher sees authorized profile banner');
    select public.test_assert(exists(select 1 from storage.objects where name='${path}'),'teacher storage read');
    ${set({ share_banner: true })}
    ${login(2)} select public.test_assert(${view}->>'banner_path'='${path}','explicit shared banner field');
    select public.test_assert(exists(select 1 from storage.objects where name='${path}'),'explicit shared current banner storage');
    select public.test_assert(not exists(select 1 from storage.objects where name='${older}'),'older banners remain private');
    ${set({ share_banner: false })}
    ${login(2)} select public.test_assert(not exists(select 1 from storage.objects where name='${path}'),'revoking banner sharing prevents a new read');
    ${set({ border: "unknown", banner_path: foreign, x: "bad", y: -1, share_banner: true })}
    ${login(1)} select public.test_assert(${view}->>'border'='' and ${view}->>'banner_path' is null,'unknown border and foreign banner rejected');
    select public.test_assert(${view}->>'x'='50' and ${view}->>'y'='50','invalid focus cannot escape bounds');
    ${profileBorders.map((border) => `${set({ border: border.id })} ${login(1)} select public.test_assert(${view}->>'border'='${border.id}','catalog border ${border.id}');`).join("\n")}
    ${set({ share_banner: true })}
    ${login(1)} select public.csl_social_action('block','${uid(2)}',null,0,gen_random_uuid());
    ${login(2)} select public.test_assert(jsonb_array_length(public.csl_profile_styles(array['${uid(1)}']::uuid[]))=0,'blocked profile design is hidden');
    select public.test_assert(not exists(select 1 from storage.objects where name='${path}'),'blocking revokes a new banner read');
    reset role; update public.csl_profiles set active=false where user_id='${uid(1)}';
    ${login(2)} select public.test_assert(jsonb_array_length(public.csl_profile_styles(array['${uid(1)}']::uuid[]))=0,'banned profile hidden');
    ${login(3)} select public.test_assert(${view}->>'banner_path'='${path}','teacher retains banned-account review');
    reset role;
  `);
  const before = sql(
    `select jsonb_build_object('metadata',(select raw_user_meta_data from auth.users where id='${uid(1)}'),'credits',(select credits from public.csl_wallets where user_id='${uid(1)}'),'evidence',(select count(*) from public.csl_quiz_attempts));`,
  ).trim();
  sql(upgrade);
  sql(readFileSync("supabase/accounts-upgrade.sql", "utf8"));
  const after = sql(
    `select jsonb_build_object('metadata',(select raw_user_meta_data from auth.users where id='${uid(1)}'),'credits',(select credits from public.csl_wallets where user_id='${uid(1)}'),'evidence',(select count(*) from public.csl_quiz_attempts));`,
  ).trim();
  if (before !== after)
    throw new Error(
      "Profile design upgrades changed existing metadata, credits or learning evidence.",
    );
  sql(
    "set role anon; select public.test_assert(public.csl_backend_status()->>'profile_styles'='1','existing upgrades preserve the sharing capability'); reset role;",
  );
  console.log(
    "Profile design PostgreSQL passed: all 17 borders, private banners, explicit sharing, owner/teacher access, blocked/banned users, bounded metadata, foreign paths and non-destructive reruns.",
  );
}
