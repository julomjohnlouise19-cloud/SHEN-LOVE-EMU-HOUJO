import { mkdir, readFile, writeFile } from 'node:fs/promises';
import type { Question, Difficulty } from '../src/core/types';
import { decks } from '../src/data/catalog';
import { validateQuestions, type Misconception } from '../src/core/validate';
export type Concept = [string, string, string, string, string, string];
// Each concept is authored as: easy prompt, application prompt, evidence prompt, answer, three distractors, explanation.
export interface DeckContent { id: string; concepts: Concept[]; orders: [string, string[]][]; matches: [string, Record<string, string>]; ph?: number[] }
export async function authorDeck(content: DeckContent) {
  const deck = decks.find(d => d.id === content.id)!;
  if (!deck || content.concepts.length !== 12 || content.orders.length !== 2) throw new Error(`Expected 12 reviewed concepts and two ordered processes for ${content.id}.`);
  const misconceptions: Misconception[] = [], questions: Question[] = [];
  const levels: Difficulty[] = ['easy', 'medium', 'hard'];
  for (const [li, level] of levels.entries()) for (const [i, row] of content.concepts.entries()) {
    const [e, m, hard, answer, wrong, why] = row;
    const id = `${deck.id}.${level[0]}.${String(i + 1).padStart(3, '0')}`;
    const choices = [answer, ...wrong.split('|')];
    if (choices.length !== 4) throw new Error(`${id}: exactly three distractors required`);
    const answerSlot = (i + li) % 4;
    const ordered = [...choices.slice(4 - answerSlot), ...choices.slice(0, 4 - answerSlot)];
    const options = ordered.map((choice, j) => {
      const tag = `${id}.mixup.${j}`;
      if (choice !== answer) misconceptions.push({ id: tag, branch: deck.branch, wrong: `For this question, “${choice}” seems like the answer.`, correct: why });
      return { id: `choice-${j}`, text: choice, ...(choice !== answer ? { misconception: tag } : {}) };
    });
    const q: Question = { id, deckId: deck.id, level, type: level === 'hard' && i < 3 ? 'data' : 'mcq', prompt: [e, m, hard][li], options, answer: `choice-${answerSlot}`, explanation: why, scienceFact: why, topic: deck.id, gradeBand: deck.grades[Math.min(li, deck.grades.length - 1)] as Question['gradeBand'], bloom: level === 'easy' ? 'remember' : level === 'medium' ? 'apply' : 'analyze', curriculumArea: deck.sourceNote.split(': ')[1], ph: content.ph?.includes(i) ?? false, reviewed: true };
    if (level === 'easy' && i >= 10) { q.type = 'input'; q.answer = answer; q.accept = [answer.toLowerCase(), answer.replace(/^(the|a|an) /i, '')]; delete q.options; }
    if (i === 10 && li > 0) {
      const [prompt, steps] = content.orders[li - 1]; q.type = 'order'; q.prompt = prompt; q.answer = steps.map((_, j) => `step-${j}`); q.options = steps.map((text, j) => ({ id: `step-${j}`, text }));
      q.explanation = `${steps.join(' → ')}. This sequence follows the process in order.`; q.scienceFact = why;
    }
    if (i === 11 && level === 'medium') { q.type = 'match'; q.prompt = content.matches[0]; q.answer = content.matches[1]; delete q.options; q.explanation = 'Each pair links a science idea to its correct role. Check the matched pairs to see how the ideas fit.'; }
    if (i === 11 && level === 'hard' || i === 9 && level === 'easy') q.diagram = deck.diagram;
    questions.push(q);
  }
  const errors = validateQuestions(questions, misconceptions, false);
  if (errors.length) throw new Error(`${content.id}\n${errors.join('\n')}`);
  const path = new URL(`../src/data/questions/${deck.branch}/`, import.meta.url); await mkdir(path, { recursive: true });
  await writeFile(new URL(`${deck.id.split('.')[1]}.json`, path), JSON.stringify(questions, null, 2) + '\n');
  const mp = new URL('../src/data/misconceptions.json', import.meta.url);
  let previous: Misconception[] = []; try { previous = JSON.parse(await readFile(mp, 'utf8')) as Misconception[]; } catch { /* first deck */ }
  await writeFile(mp, JSON.stringify([...previous.filter(m => !m.id.startsWith(`${deck.id}.`)), ...misconceptions], null, 2) + '\n');
  console.log(`Reviewed and validated ${deck.id}: ${questions.length} questions.`);
}
