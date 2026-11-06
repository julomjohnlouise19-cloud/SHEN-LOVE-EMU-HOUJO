import { toast } from './dom';
let renderer: () => void = () => undefined;
export function connectRenderer(fn: () => void) { renderer = fn; }
export const refresh = () => renderer();
export function go(path: string) { if (location.hash === `#${path}`) refresh(); else location.hash = path; }
export function act(fn: () => Promise<unknown>) { return async () => { try { await fn(); } catch (e) { toast(e instanceof Error ? e.message : 'Something went wrong. Please try again.'); } }; }
