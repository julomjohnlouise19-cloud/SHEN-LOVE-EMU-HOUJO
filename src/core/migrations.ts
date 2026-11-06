import { object } from "./schema";
import { defaultRules } from "./rules";
const migrations = [
  {
    from: 1,
    to: 2,
    apply: (s: Record<string, unknown>) => ({
      ...s,
      sessions: [],
      overlays: s.overlays ?? {},
      notifications: s.notifications ?? [],
      audit: s.audit ?? [],
      events: s.events ?? [],
    }),
  },
  {
    from: 2,
    to: 3,
    apply: (s: Record<string, unknown>) => ({
      ...s,
      rules: { ...defaultRules, ...(object(s.rules) ? s.rules : {}) },
    }),
  },
];
export function migrateState(input: unknown): unknown {
  if (!object(input)) return input;
  let state = input;
  for (const migration of migrations)
    if (state.version === migration.from)
      state = { ...migration.apply(state), version: migration.to };
  return state;
}
