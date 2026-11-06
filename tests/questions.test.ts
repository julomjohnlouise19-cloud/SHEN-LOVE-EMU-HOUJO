import { it, expect } from 'vitest';
import { readQuestions } from '../scripts/validate-questions';
import misconceptions from '../src/data/misconceptions.json';
import { validateQuestions } from '../src/core/validate';
import { parseBackup, validState } from '../src/store/schema';
import { initialState } from '../src/store/seed';
it('validates every authored question with the same CLI validator', async () => { const qs = await readQuestions(); expect(qs.length).toBeGreaterThanOrEqual(36); expect(validateQuestions(qs, misconceptions, qs.length >= 972)).toEqual([]); });
it('validates backups and rejects invalid roles, balances and prototype keys', () => { const state = initialState('', '', 100); expect(validState(state)).toBe(true); expect(parseBackup(JSON.stringify(state)).sessions).toEqual([]); state.users[0].merits = -1; expect(validState(state)).toBe(false); expect(() => parseBackup('{"__proto__":{}}')).toThrow('not a valid'); });
