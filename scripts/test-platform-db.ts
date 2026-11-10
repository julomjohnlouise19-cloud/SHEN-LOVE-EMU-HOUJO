import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

export async function verifyPlatform(
  sql: (input: string) => string,
  concurrentSql: (input: string) => Promise<string>,
) {
  const user = (i: number) => `00000000-0000-4000-8000-00000000000${i}`;
  const login = (i: number) =>
    `set role authenticated; set request.jwt.claim.sub='${user(i)}';`;
  const literal = (value: unknown) =>
    `'${JSON.stringify(value).replaceAll("'", "''")}'::jsonb`;
  const text = (value: string) => `'${value.replaceAll("'", "''")}'`;
  const data = <T>(statement: string): T =>
    JSON.parse(sql(statement).trim()) as T;
  const command = (action: string, body: unknown, id = randomUUID()) =>
    `public.csl_teacher_command('${id}',${text(action)},${literal(body)})`;
  sql(`create function public.test_rejected(statement text) returns void language plpgsql as $$ begin begin execute statement; exception when raise_exception or insufficient_privilege or check_violation then return; end; raise exception 'Expected rejection: %',statement; end $$;
    select public.test_assert((public.csl_backend_status()->>'platform')::int=2,'platform upgrade is installed');
    ${login(1)}
    select public.test_assert((public.csl_my_lab('${user(1)}')->>'credits')::int>24,'server quiz credits were awarded');
    select public.test_denied('select public.csl_teacher_data(''students'')');
    select public.test_denied('select public.csl_teacher_command(gen_random_uuid(),''credits'',''{}'')');
    select public.test_denied('update public.csl_wallets set credits=999');
    select public.test_denied('update public.csl_items set stock=999');
    select public.test_denied('select * from public.csl_arcade_sessions');
    insert into storage.objects(bucket_id,name) values('csl-avatars','${user(1)}/${user(4)}.webp');
    select public.csl_set_photo('${user(1)}','${user(1)}/${user(4)}.webp');
    select public.test_assert(public.csl_my_profile()->>'photo_path'='${user(1)}/${user(4)}.webp','own profile photo');
    select public.test_denied('insert into storage.objects(bucket_id,name) values(''csl-avatars'',''${user(2)}/${user(4)}.webp'')');
    select public.test_denied('select public.csl_set_photo(''${user(2)}'',null)');
    reset role; ${login(2)}
    select public.test_assert((select count(*)=0 from storage.objects),'profile photos are private to other students');
    reset role; ${login(3)}
    select public.test_assert((select count(*)=1 from storage.objects),'teachers may read profile photos');
    select public.test_assert((public.csl_teacher_data('students')->>'total')::int=3,'teacher student directory');
    select public.test_assert((public.csl_teacher_data('reports')->>'total')::int=2,'teacher existing quiz records');
    select public.csl_teacher_data('overview');
    select public.csl_teacher_data('shop');
    select public.csl_teacher_data('claims');
    select public.csl_teacher_data('settings');
    select public.csl_teacher_data('activity');
    reset role;`);
  const students = data<{
    rows: { user_id: string; expected_updated: string }[];
  }>(`${login(3)} select public.csl_teacher_data('students');`);
  const profile = students.rows.find((p) => p.user_id === user(2))!;
  sql(`${login(3)} select ${command("student", { user_id: user(2), display_name: "Updated Student", grade: 10, section: "Discovery", active: false, expected_updated: profile.expected_updated })}; reset role;
    ${login(2)} select public.test_denied('select public.csl_my_lab(''${user(2)}'')'); reset role;`);
  const updated = data<{
    rows: { user_id: string; expected_updated: string }[];
  }>(`${login(3)} select public.csl_teacher_data('students');`).rows.find(
    (p) => p.user_id === user(2),
  )!;
  sql(`${login(3)} select ${command("student", { user_id: user(2), display_name: "Updated Student", grade: 10, section: "Discovery", active: true, expected_updated: updated.expected_updated })}; reset role;
    update public.csl_wallets set credits=200;
  `);
  const creditId = randomUUID(),
    creditBody = {
      user_id: user(1),
      delta: 10,
      reason: "Teacher adjustment test",
    };
  sql(`${login(3)} select ${command("credits", creditBody, creditId)}; select ${command("credits", creditBody, creditId)};
    select public.test_rejected(${text(`select ${command("credits", { ...creditBody, delta: 20 }, creditId)}`)});
    reset role;
    select public.test_assert((select credits=210 from public.csl_wallets where user_id='${user(1)}'),'credit retry is idempotent');
  `);
  const item = {
    id: "test-supply",
    name: "Test notebook",
    description: "A notebook for an isolated test.",
    price: 10,
    stock: 1,
    icon: "notebook",
    color: "green",
    category: "School essentials",
    active: true,
    version: 0,
  };
  sql(`${login(3)} select ${command("item", item)}; reset role;`);
  const reserveId = randomUUID();
  const reserve = `public.csl_reserve_item('${user(1)}','${reserveId}','test-supply',10,1)`;
  const order = data<{ id: string; code: string }>(
    `${login(1)} select ${reserve};`,
  );
  sql(`${login(1)} select ${reserve}; reset role;
    select public.test_assert((select stock=0 from public.csl_items where id='test-supply'),'last stock reserved once');
    select public.test_assert((select credits=200 from public.csl_wallets where user_id='${user(1)}'),'reservation retry spends once');
    ${login(2)} select public.test_rejected('select public.csl_reserve_item(''${user(2)}'',gen_random_uuid(),''test-supply'',10,1)'); reset role;
    ${login(3)} select public.test_rejected(${text(`select ${command("item", { ...item, version: 1, stock: 99 })}`)});
    select public.test_rejected(${text(`select ${command("claim", { id: order.id, status: "collected", code: "wrong" })}`)});
    select ${command("claim", { id: order.id, status: "collected", code: order.code })}; reset role;
    select public.test_assert((select status='collected' from public.csl_orders where id='${order.id}'),'teacher verifies collection code');
    ${login(3)} select ${command("item", { ...item, version: 2, stock: 1 })}; reset role;
  `);
  const second = data<{ id: string }>(
    `${login(2)} select public.csl_reserve_item('${user(2)}',gen_random_uuid(),'test-supply',10,3);`,
  );
  const cancelId = randomUUID(),
    cancel = command(
      "claim",
      {
        id: second.id,
        status: "cancelled",
        reason: "Isolated cancellation test",
      },
      cancelId,
    );
  sql(`${login(3)} select ${cancel}; select ${cancel}; reset role;
    select public.test_assert((select stock=1 from public.csl_items where id='test-supply'),'cancellation restores stock once');
    select public.test_assert((select credits=200 from public.csl_wallets where user_id='${user(2)}'),'cancellation refunds credits once');
    ${login(3)} select public.test_rejected(${text(`select ${command("claim", { id: second.id, status: "cancelled", reason: "Second attempt" })}`)}); reset role;`);
  type Game = {
    state: {
      id: string;
      index: number;
      score: number;
      coins: number;
      correct: number;
      darts: number;
      deadline: number;
      reloadUntil: number;
      completed: boolean;
    };
    question: { id: string; answer?: string };
    serverNow: number;
  };
  let game = data<Game>(
    `${login(1)} select public.csl_arcade_start('${user(1)}','life',gen_random_uuid());`,
  );
  if (game.question.answer !== undefined)
    throw new Error("The game exposed its answer before a shot.");
  const gameId = game.state.id;
  const shoot = (id: string, qid: string, option: string, type = "shoot") =>
    `public.csl_arcade_action('${user(1)}','${gameId}','${id}',${text(qid)},${text(type)},${text(option)})`;
  const correct = (index: number) =>
    data<string>(
      `reset role; select questions->${index}->'answer' from public.csl_arcade_sessions where id='${gameId}';`,
    );
  const firstId = randomUUID(),
    firstQuestion = game.question.id,
    firstOption = correct(0);
  game = data<Game>(
    `${login(1)} select ${shoot(firstId, firstQuestion, firstOption)};`,
  );
  sql(`${login(1)} select public.test_assert((${shoot(firstId, firstQuestion, firstOption)}->'state'->>'score')::int=100,'shot retry scores once');
    select public.test_rejected(${text(`select ${shoot(randomUUID(), game.question.id, correct(1))}`)}); reset role;`);
  for (let index = 1; index < 9; index++) {
    sql(
      `reset role; update public.csl_arcade_sessions set state=jsonb_set(state,'{reloadUntil}',to_jsonb(csl_private.now_ms()-1)) where id='${gameId}';`,
    );
    if (index === 3) {
      const timeId = randomUUID(),
        before = game.state.deadline;
      game = data<Game>(
        `${login(1)} select ${shoot(timeId, game.question.id, "", "time")};`,
      );
      if (game.state.deadline !== before + 5000)
        throw new Error("Extra time did not add exactly five seconds.");
      game = data<Game>(
        `${login(1)} select ${shoot(timeId, game.question.id, "", "time")};`,
      );
      sql(
        `${login(1)} select public.test_rejected(${text(`select ${shoot(randomUUID(), game.question.id, "", "time")}`)});`,
      );
      game = data<Game>(
        `${login(1)} select ${shoot(randomUUID(), game.question.id, "", "dart")};`,
      );
      if (game.state.darts !== 3)
        throw new Error("The extra dart was not awarded.");
    }
    game = data<Game>(
      `${login(1)} select ${shoot(randomUUID(), game.question.id, correct(index))};`,
    );
  }
  if (
    !game.state.completed ||
    game.state.score !== 2000 ||
    game.state.correct !== 9 ||
    game.state.coins !== 22
  )
    throw new Error("The server game score/combo/coin calculation diverged.");
  sql(`reset role; ${login(1)}
    select public.test_assert((public.csl_arcade_rankings('life')->0->>'score')::int=2000,'completed server game reaches class rankings');
    select public.test_assert((select jsonb_array_length(public.csl_arcade_rankings('life')))=1,'one best score per scientist');
    reset role;
    select public.test_assert((select count(*)=1 from public.csl_credit_ledger where kind='arcade' and reference='${gameId}'),'arcade credits are awarded once');
  `);
  let timed = data<Game>(
    `${login(1)} select public.csl_arcade_start('${user(1)}','physics',gen_random_uuid());`,
  );
  sql(
    `reset role; update public.csl_arcade_sessions set state=jsonb_set(state,'{deadline}',to_jsonb(csl_private.now_ms()-1)) where id='${timed.state.id}';`,
  );
  timed = data<Game>(
    `${login(1)} select public.csl_arcade_action('${user(1)}','${timed.state.id}',gen_random_uuid(),${text(timed.question.id)},'timeout','');`,
  );
  if (
    timed.state.index !== 1 ||
    timed.state.score !== 0 ||
    timed.state.coins !== 0
  )
    throw new Error(
      "Timeout did not count as a wrong card without negative balances.",
    );
  const content = data<{
    rows: {
      question: {
        id: string;
        prompt: string;
        answer: unknown;
        deckId: string;
        level: string;
      };
      active: boolean;
      version: number;
    }[];
  }>(
    `${login(3)} select public.csl_teacher_data('content','{"deck":"life.cells"}');`,
  );
  const card = content.rows[0],
    changed = {
      ...card.question,
      prompt: `Science challenge: ${card.question.prompt}`,
    };
  sql(
    `${login(3)} select ${command("question", { question: changed, active: true, version: card.version })}; reset role;`,
  );
  const pendingId = randomUUID(),
    answer = { question_id: card.question.id, value: card.question.answer };
  const pendingCall = (version?: number) =>
    `public.csl_record_quiz('${pendingId}',${text(card.question.deckId)},${text(card.question.level)},'practice',now(),${literal([{ ...answer, ...(version === undefined ? {} : { question_version: version }) }])},'${user(1)}')`;
  const historical = data<{ id: string; correct: number }>(
    `${login(1)} select ${pendingCall()};`,
  );
  if (historical.correct !== 1)
    throw new Error(
      "A queued original question was not graded against its original version.",
    );
  sql(`${login(1)} select ${pendingCall(0)}; reset role;
    select public.test_assert((select responses->0->>'prompt'=${text(card.question.prompt)} from public.csl_quiz_attempts where id='${historical.id}'),'queued record retains original question wording');
    ${login(1)} select public.csl_record_quiz(gen_random_uuid(),${text(changed.deckId)},${text(changed.level)},'practice',now(),${literal([{ ...answer, question_version: card.version + 1 }])},'${user(1)}'); reset role;`);
  sql(readFileSync("supabase/upgrade.sql", "utf8"));
  sql(`select public.test_assert((select question->>'prompt'=${text(changed.prompt)} from csl_private.questions where id=${text(card.question.id)}),'rerun preserves teacher content edits');
    select public.test_assert((select stock=1 from public.csl_items where id='test-supply'),'rerun preserves edited stock');
    select public.test_assert((select count(*)=1 from public.csl_credit_ledger where kind='arcade' and reference='${gameId}'),'rerun preserves ledger without duplicate awards');
    ${login(3)} select public.csl_teacher_data('overview'); select public.csl_teacher_data('activity'); reset role;
    set role anon; select public.test_denied('select public.csl_arcade_rankings()'); select public.test_denied('select public.csl_teacher_data(''overview'')'); reset role;`);
  console.log(
    "Platform PostgreSQL passed: teacher permissions/edits/audit, profile photo ownership, server credits, last stock, reservation retries/refunds, arcade answers/timers/reload/combo/power-ups/rankings, and upgrade preservation.",
  );
  const race = {
    id: "race-supply",
    name: "Concurrent class supply",
    description: "An isolated stock concurrency test.",
    price: 5,
    stock: 1,
    icon: "notebook",
    color: "green",
    category: "School essentials",
    active: true,
    version: 0,
  };
  sql(
    `${login(3)} select ${command("item", race)}; reset role;update public.csl_wallets set credits=100 where user_id in ('${user(1)}','${user(2)}');`,
  );
  const attempts = await Promise.allSettled(
    [1, 2].map((i) =>
      concurrentSql(
        `begin;${login(i)}select public.csl_reserve_item('${user(i)}',gen_random_uuid(),'race-supply',5,1);select pg_sleep(0.25);commit;`,
      ),
    ),
  );
  if (attempts.filter((result) => result.status === "fulfilled").length !== 1)
    throw new Error("Concurrent buyers did not reserve exactly one last item.");
  const rejected = attempts.find(
    (result) => result.status === "rejected",
  ) as PromiseRejectedResult;
  if (!/out of stock|changed/i.test(String(rejected.reason)))
    throw rejected.reason;
  sql(`select public.test_assert((select count(*)=1 from public.csl_orders where item_id='race-supply'),'one concurrent reservation');
    select public.test_assert((select stock=0 from public.csl_items where id='race-supply'),'last item cannot be oversold');
    select public.test_assert((select sum(credits)=195 from public.csl_wallets where user_id in ('${user(1)}','${user(2)}')),'only successful concurrent buyer is charged');`);
}
