import type { RNG } from './types';
export function seededRng(seed: number): RNG {
  let x = seed >>> 0;
  return { next() { x += 0x6d2b79f5; let n = x; n = Math.imul(n ^ n >>> 15, n | 1); n ^= n + Math.imul(n ^ n >>> 7, n | 61); return ((n ^ n >>> 14) >>> 0) / 4294967296; } };
}
export function shuffle<T>(values: T[], rng: RNG): T[] {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(rng.next() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; }
  return result;
}
export function hashSeed(value: string): number { return [...value].reduce((n, c) => Math.imul(n ^ c.charCodeAt(0), 16777619), 2166136261) >>> 0; }
