import type {
  AppState,
  Command,
  CommandResult,
  Context,
  DomainEvent,
  User,
} from "./types";
import { addDays, dayKey } from "./time";
import {
  isCorrect,
  levelOf,
  questDefinitions,
  reward,
  validRules,
} from "./rules";
import { isQuestion } from "./schema";

export class RuleError extends Error {}
const requireThat: (condition: unknown, text: string) => asserts condition = (
  condition,
  text,
) => {
  if (!condition) throw new RuleError(text);
};
export function execute(
  state: AppState,
  actorId: string,
  command: Command,
  ctx: Context,
): CommandResult {
  const original = state.users.find((u) => u.id === actorId);
  requireThat(original, "Please sign in to continue.");
  const user = structuredClone(original);
  const now = ctx.clock.now(),
    today = dayKey(ctx.clock, ctx.rules.timezone);
  const isAdmin = user.role === "admin";
  if (
    command.type.startsWith("Admin") ||
    ["ClaimPurchase", "Undo"].includes(command.type)
  )
    requireThat(isAdmin, "Only an admin can do that.");
  const events: DomainEvent[] = [];
  const patch: Partial<AppState> = {};
  const event = (type: string, text: string, data?: DomainEvent["data"]) =>
    events.push({
      id: `${state.rev + 1}-${events.length}`,
      type,
      actor: actorId,
      time: now,
      text,
      data,
    });
  const saveUser = (value: User = user) => {
    patch.users = (patch.users ?? state.users).map((u) =>
      u.id === value.id ? value : u,
    );
  };
  const daily = user.daily[today] ?? {
    merits: 0,
    answers: 0,
    correct: 0,
    spin: false,
    quests: [],
    challenge: false,
  };
  user.daily[today] = daily;
  user.lastSeen = now;
  switch (command.type) {
    case "StartRun": {
      requireThat(
        command.run.ids.length > 0 &&
          command.run.ids.length <= 8 &&
          new Set(command.run.ids).size === command.run.ids.length,
        "Choose between one and eight different questions.",
      );
      requireThat(
        !state.runs.some((r) => r.id === command.run.id),
        "This session already exists.",
      );
      requireThat(
        !command.run.deckId.startsWith("skills.") ||
          levelOf(user, ctx.rules) >= ctx.rules.skillsLevel,
        `The Skills Lab opens at Level ${ctx.rules.skillsLevel}.`,
      );
      if (command.run.mode === "daily")
        requireThat(
          !daily.challenge,
          "You already completed today’s daily challenge.",
        );
      patch.runs = [
        ...state.runs
          .filter((r) => r.userId !== actorId || r.completed)
          .slice(-199),
        {
          ...command.run,
          userId: actorId,
          created: now,
          answers: [],
          completed: false,
        },
      ];
      event(
        "RunStarted",
        `${user.name} started a ${command.run.level} science session.`,
        { deckId: command.run.deckId },
      );
      saveUser();
      break;
    }
    case "SubmitAnswer": {
      const run = structuredClone(
        state.runs.find((r) => r.id === command.runId),
      );
      requireThat(
        run && run.userId === actorId && !run.completed,
        "This session is finished. Start a fresh deck.",
      );
      requireThat(
        run.ids[run.answers.length] === command.question.id &&
          command.question.deckId === run.deckId,
        "That card has already been answered.",
      );
      const q = command.question,
        correct = isCorrect(q, command.value);
      const combo = correct
        ? [...run.answers].reverse().findIndex((a) => !a.correct)
        : 0;
      const streak = correct
        ? (combo === -1 ? run.answers.length : combo) + 1
        : 0;
      const earned = reward(correct, run.level, streak, daily.merits, ctx);
      let merits = earned.merits;
      if (run.mode === "review") {
        const card = user.review.find((c) => c.questionId === q.id);
        requireThat(
          card && card.due <= today && card.lastReviewed !== today,
          "This review card is not due yet.",
        );
        merits = correct
          ? Math.min(
              ctx.rules.reviewReward,
              Math.max(0, ctx.rules.dailyCap - daily.merits),
            )
          : 0;
        card.box = correct ? Math.min(5, card.box + 1) : 0;
        card.due = addDays(today, correct ? [1, 2, 4, 7, 14, 30][card.box] : 1);
        card.lastReviewed = today;
      }
      const misconception =
        !correct && typeof command.value === "string"
          ? q.options?.find((o) => o.id === command.value)?.misconception
          : undefined;
      run.answers.push({
        questionId: q.id,
        value: command.value,
        correct,
        merits,
        xp: earned.xp,
        misconception,
      });
      run.completed = run.answers.length === run.ids.length;
      user.merits += merits;
      user.xp += earned.xp;
      daily.merits += merits;
      daily.answers++;
      if (correct) daily.correct++;
      const mastery = user.mastery[q.deckId] ?? {
        correct: 0,
        attempts: 0,
        completed: 0,
      };
      mastery.attempts++;
      if (correct) mastery.correct++;
      if (run.completed) mastery.completed++;
      user.mastery[q.deckId] = mastery;
      if (!correct && !user.review.some((c) => c.questionId === q.id))
        user.review.push({
          questionId: q.id,
          deckId: q.deckId,
          box: 0,
          due: today,
          misconception,
        });
      if (user.lastDay !== today) {
        user.streak = user.lastDay === addDays(today, -1) ? user.streak + 1 : 1;
        user.lastDay = today;
      }
      if (run.completed && run.mode === "daily" && !daily.challenge) {
        daily.challenge = true;
        user.merits += ctx.rules.dailyReward;
        event(
          "DailyChallengeCompleted",
          `Daily challenge complete! +${ctx.rules.dailyReward} merits.`,
        );
      }
      if (levelOf(user, ctx.rules) > levelOf(original, ctx.rules))
        event(
          "LevelUp",
          `${user.name} reached Level ${levelOf(user, ctx.rules)}!`,
        );
      const badges = [
        ["first-deck", run.completed],
        [
          "ten-right",
          Object.values(user.mastery).reduce((n, m) => n + m.correct, 0) >= 10,
        ],
        ["perfect-deck", run.completed && run.answers.every((a) => a.correct)],
        ["week-streak", user.streak >= 7],
      ] as const;
      for (const [badge, unlocked] of badges)
        if (unlocked && !user.badges.includes(badge)) {
          user.badges.push(badge);
          event("BadgeEarned", `A new badge: ${badge.replaceAll("-", " ")}.`);
        }
      event(
        "AnswerSubmitted",
        correct
          ? "A little discovery! Correct answer."
          : "A useful mix-up added to your Review Box.",
        {
          questionId: q.id,
          deckId: q.deckId,
          correct,
          merits,
          misconception: misconception ?? "",
        },
      );
      if (run.completed)
        event("RunCompleted", `${user.name} finished a science deck.`, {
          correct: run.answers.filter((a) => a.correct).length,
        });
      patch.runs = state.runs.map((r) => (r.id === run.id ? run : r));
      saveUser();
      break;
    }
    case "BuyItem": {
      const item = state.items.find((i) => i.id === command.itemId);
      requireThat(
        item && item.stock > 0,
        "That supply just sold out. Try another little reward.",
      );
      requireThat(
        command.expectedPrice === undefined ||
          command.expectedPrice === item.price,
        "The price changed while you were looking. Close this card and check the updated price before exchanging merits.",
      );
      requireThat(
        user.merits >= item.price,
        `You need ${item.price - user.merits} more merits. A little science will get you there!`,
      );
      let code = "";
      for (let attempt = 0; attempt < 30; attempt++) {
        code = `CSL-${Math.floor(ctx.rng.next() * 36 ** 6)
          .toString(36)
          .padStart(6, "0")
          .toUpperCase()}`;
        if (!state.purchases.some((p) => p.code === code)) break;
        code = "";
      }
      requireThat(code, "Could not make a unique code. Please try again.");
      user.merits -= item.price;
      patch.items = state.items.map((i) =>
        i.id === item.id ? { ...i, stock: i.stock - 1 } : i,
      );
      patch.purchases = [
        ...state.purchases,
        {
          id: `purchase-${state.rev + 1}`,
          userId: actorId,
          itemId: item.id,
          itemName: item.name,
          price: item.price,
          code,
          status: "purchased",
          created: now,
        },
      ];
      event(
        "ItemPurchased",
        `${user.name} exchanged ${item.price} merits for ${item.name}.`,
        { purchaseId: `purchase-${state.rev + 1}` },
      );
      saveUser();
      break;
    }
    case "RedeemCode": {
      const purchase = state.purchases.find(
        (p) => p.code === command.code.trim().toUpperCase(),
      );
      requireThat(
        purchase && (purchase.userId === actorId || isAdmin),
        "We couldn’t find that code in your purchases.",
      );
      requireThat(
        purchase.status === "purchased",
        "That code has already been redeemed.",
      );
      patch.purchases = state.purchases.map((p) =>
        p.id === purchase.id ? { ...p, status: "redeemed" } : p,
      );
      event(
        "CodeRedeemed",
        `${user.name} redeemed a code for ${purchase.itemName}.`,
        { purchaseId: purchase.id, userId: purchase.userId },
      );
      break;
    }
    case "ClaimPurchase": {
      const purchase = state.purchases.find((p) => p.id === command.purchaseId);
      requireThat(
        purchase?.status === "redeemed",
        "Only redeemed supplies can be marked claimed.",
      );
      patch.purchases = state.purchases.map((p) =>
        p.id === purchase.id ? { ...p, status: "claimed" } : p,
      );
      event(
        "ItemClaimed",
        `${purchase.itemName} was collected at the Grade 10 SSC room.`,
        { purchaseId: purchase.id, userId: purchase.userId },
      );
      break;
    }
    case "SpinWheel": {
      requireThat(
        !daily.spin,
        "Your next spin is tomorrow. Keep that curiosity growing!",
      );
      const prize = Math.floor(ctx.rng.next() * (ctx.rules.spinMax + 1));
      daily.spin = true;
      user.merits += prize;
      saveUser();
      event("WheelSpun", `Your daily discovery: +${prize} merits!`, { prize });
      break;
    }
    case "ClaimQuest": {
      const quest = questDefinitions.find((q) => q.id === command.questId);
      requireThat(
        quest && daily[quest.key] >= quest.target,
        "This little quest needs a bit more discovery.",
      );
      requireThat(
        !daily.quests.includes(quest.id),
        "You already collected this reward.",
      );
      daily.quests.push(quest.id);
      user.merits += ctx.rules.questReward;
      saveUser();
      event(
        "QuestProgressed",
        `Quest complete: ${quest.name}. +${ctx.rules.questReward} merits.`,
      );
      break;
    }
    case "SaveNote": {
      requireThat(
        command.title.trim().length > 0 &&
          command.title.length <= 100 &&
          command.text.trim().length > 0 &&
          command.text.length <= 4000,
        "Add a title (up to 100 characters) and a note (up to 4,000).",
      );
      if (command.id)
        requireThat(
          user.notes.some((n) => n.id === command.id),
          "That note no longer exists.",
        );
      const note = {
        id: command.id ?? `note-${state.rev + 1}`,
        title: command.title.trim(),
        text: command.text.trim(),
        topic: command.topic.slice(0, 100),
        created: now,
      };
      user.notes = [...user.notes.filter((n) => n.id !== note.id), note];
      saveUser();
      event("NoteSaved", "A little discovery saved to your notebook.");
      break;
    }
    case "DeleteNote":
      user.notes = user.notes.filter((n) => n.id !== command.id);
      saveUser();
      event("NoteDeleted", "Notebook page removed.");
      break;
    case "UpdateProfile": {
      requireThat(
        command.name.trim().length >= 2 &&
          command.name.trim().length <= 40 &&
          [7, 8, 9, 10].includes(command.grade) &&
          command.section.length <= 40 &&
          ["cat", "sprout", "flask", "planet", "atom"].includes(command.avatar),
        "Check your name, grade, section and avatar.",
      );
      Object.assign(user, {
        name: command.name.trim(),
        grade: command.grade,
        section: command.section.trim(),
        avatar: command.avatar,
      });
      saveUser();
      event("ProfileUpdated", "Your scientist profile is updated.");
      break;
    }
    case "ReadNotifications":
      patch.notifications = state.notifications.map((n) =>
        n.userId === actorId ? { ...n, read: true } : n,
      );
      break;
    case "AdminGivePoints": {
      const target = structuredClone(
        state.users.find((u) => u.id === command.userId),
      );
      requireThat(
        target &&
          Number.isSafeInteger(command.amount) &&
          Math.abs(command.amount) <= 10000 &&
          target.merits + command.amount >= 0 &&
          command.reason.trim().length >= 3 &&
          command.reason.length <= 300,
        "Use a valid user, whole merit amount and a reason. Balance cannot go below zero.",
      );
      target.merits += command.amount;
      saveUser(target);
      event(
        "AdminMeritsAdjusted",
        `${target.name}: ${command.amount >= 0 ? "+" : ""}${command.amount} merits. ${command.reason}`,
        { userId: target.id },
      );
      break;
    }
    case "AdminRules":
      requireThat(
        validRules(command.rules),
        "Check the rule values and timezone.",
      );
      patch.rules = { ...command.rules };
      event("RulesUpdated", "The lab economy rules were updated.");
      break;
    case "AdminItem": {
      const i = command.item;
      requireThat(
        state.items.some((item) => item.id === i.id) &&
          i.name.trim() &&
          i.name.length <= 60 &&
          Number.isSafeInteger(i.price) &&
          i.price >= 0 &&
          i.price <= 10000 &&
          Number.isSafeInteger(i.stock) &&
          i.stock >= 0 &&
          i.stock <= 10000,
        "Check the supply name, price and stock.",
      );
      patch.items = state.items.map((item) =>
        item.id === i.id ? { ...i } : item,
      );
      event(
        "InventoryUpdated",
        `${i.name}: price ${i.price}, stock ${i.stock}.`,
      );
      break;
    }
    case "AdminQuestion":
      requireThat(
        isQuestion(command.overlay.question) &&
          command.overlay.question.reviewed,
        "Save a valid, reviewed question.",
      );
      patch.overlays = {
        ...state.overlays,
        [command.overlay.question.id]: command.overlay,
      };
      event(
        "QuestionEdited",
        `Question overlay ${command.overlay.op}: ${command.overlay.question.id}.`,
      );
      break;
    case "AdminQuestions": {
      requireThat(
        command.overlays.length > 0 &&
          command.overlays.length <= 500 &&
          new Set(command.overlays.map((o) => o.question.id)).size ===
            command.overlays.length &&
          command.overlays.every(
            (o) =>
              ["add", "patch", "delete"].includes(o.op) &&
              isQuestion(o.question) &&
              o.question.reviewed,
          ),
        "Import 1–500 different, valid reviewed questions.",
      );
      patch.overlays = {
        ...state.overlays,
        ...Object.fromEntries(command.overlays.map((o) => [o.question.id, o])),
      };
      event(
        "QuestionsImported",
        `${command.overlays.length} reviewed question overlays imported atomically.`,
      );
      break;
    }
    case "Undo": {
      const entry = state.audit.find((a) => a.id === command.auditId);
      requireThat(
        entry?.inverse && !entry.undone && entry.afterRev === state.rev,
        "Only the latest change can be undone, so newer work stays safe.",
      );
      Object.assign(patch, entry.inverse);
      patch.audit = state.audit.map((a) =>
        a.id === entry.id ? { ...a, undone: true } : a,
      );
      event("ChangeUndone", `Undid ${entry.command}.`, {
        undoneRev: entry.afterRev,
      });
      break;
    }
  }
  const inverse: Partial<AppState> = {};
  for (const key of Object.keys(patch) as (keyof AppState)[])
    Object.assign(inverse, { [key]: structuredClone(state[key]) });
  return { patch, events, inverse };
}
export function applyResult(
  state: AppState,
  actor: string,
  command: Command,
  result: CommandResult,
  ctx: Context,
): AppState {
  const rev = state.rev + 1,
    time = ctx.clock.now();
  const notifications = [
    ...(result.patch.notifications ?? state.notifications),
  ];
  for (const e of result.events) {
    if (
      ["ItemPurchased", "CodeRedeemed", "ItemClaimed", "Registration"].includes(
        e.type,
      )
    ) {
      for (const u of state.users.filter(
        (u) =>
          u.role === "admin" ||
          u.id === actor ||
          u.id === String(e.data?.userId),
      ))
        notifications.push({
          id: `${e.id}-${u.id}`,
          userId: u.id,
          text: e.text,
          read: false,
          time,
        });
    } else if (["LevelUp", "BadgeEarned"].includes(e.type))
      notifications.push({
        id: e.id,
        userId: actor,
        text: e.text,
        read: false,
        time,
      });
  }
  return {
    ...state,
    ...result.patch,
    rev,
    notifications: notifications.slice(-500),
    events: [...state.events, ...result.events].slice(-2000),
    audit: [
      ...(result.patch.audit ?? state.audit).map((entry) => ({
        ...entry,
        inverse: undefined,
      })),
      {
        id: `audit-${rev}`,
        actor,
        time,
        command: command.type,
        text: result.events.map((e) => e.text).join(" "),
        inverse: command.type === "Undo" ? undefined : result.inverse,
        afterRev: rev,
        undone: false,
      },
    ].slice(-100),
  };
}
