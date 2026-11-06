export interface Tx { get<T>(key: string): T | undefined; set<T>(key: string, value: T): void }
export interface DataStore {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T): Promise<void>;
  subscribe(key: string, fn: (v: unknown) => void): () => void;
  transaction<T>(keys: string[], fn: (tx: Tx) => T): Promise<T>;
}
const pause = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
export class LocalStorageAdapter implements DataStore {
  private channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('csl') : undefined;
  private listeners = new Map<string, Set<(v: unknown) => void>>();
  private queue: Promise<unknown> = Promise.resolve();
  constructor() {
    window.addEventListener('storage', e => { if (e.key?.startsWith('csl:')) this.emit(e.key); });
    if (this.channel) this.channel.onmessage = e => { if (typeof e.data === 'string') this.emit(e.data); };
  }
  private emit(key: string) { for (const fn of this.listeners.get(key) ?? []) fn(this.read(key)); }
  private read<T>(key: string): T | undefined {
    const value = localStorage.getItem(key); if (value === null) return undefined;
    try { return JSON.parse(value) as T; } catch {
      const quarantine = `csl:corrupt:${Date.now()}`;
      try { localStorage.setItem(quarantine, value); localStorage.removeItem(key); } catch { /* preserve original if storage is full */ }
      window.dispatchEvent(new CustomEvent('csl:recovery', { detail: 'Some saved data was unreadable. A recovery copy was kept; safe defaults will load.' })); return undefined;
    }
  }
  async get<T>(key: string): Promise<T | undefined> { return this.read<T>(key); }
  async set<T>(key: string, value: T): Promise<void> { await this.transaction([key], tx => tx.set(key, value)); }
  subscribe(key: string, fn: (v: unknown) => void) {
    const set = this.listeners.get(key) ?? new Set(); set.add(fn); this.listeners.set(key, set);
    return () => { set.delete(fn); };
  }
  async transaction<T>(keys: string[], fn: (tx: Tx) => T): Promise<T> {
    const operation = async () => {
      const run = () => {
        const writes = new Map<string, unknown>();
        const tx: Tx = { get: <V>(key: string) => { if (!keys.includes(key)) throw new Error('Undeclared transaction key'); return (writes.has(key) ? writes.get(key) : this.read(key)) as V | undefined; }, set: (key, value) => { if (!keys.includes(key)) throw new Error('Undeclared transaction key'); writes.set(key, value); } };
        const result = fn(tx);
        // Application state is deliberately one envelope/key: setItem is atomic even on quota failure.
        if (writes.size > 1) throw new Error('Use one atomic state envelope per transaction.');
        try { for (const [key, value] of writes) localStorage.setItem(key, JSON.stringify(value)); }
        catch (e) { if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22)) window.dispatchEvent(new CustomEvent('csl:quota')); throw e; }
        for (const key of writes.keys()) { this.emit(key); this.channel?.postMessage(key); }
        return result;
      };
      if (navigator.locks) return navigator.locks.request('csl:tx', run);
      // Short synchronous critical section, with a settling interval to resolve simultaneous lease contenders.
      const owner = crypto.randomUUID(), key = 'csl:lease', deadline = Date.now() + 8000;
      while (Date.now() < deadline) {
        const lease = this.read<{ owner: string; until: number }>(key);
        if (!lease || lease.until < Date.now()) {
          localStorage.setItem(key, JSON.stringify({ owner, until: Date.now() + 3000 }));
          await pause(35 + crypto.getRandomValues(new Uint8Array(1))[0] % 25);
          if (this.read<{ owner: string }>(key)?.owner === owner) {
            try { return run(); } finally { if (this.read<{ owner: string }>(key)?.owner === owner) localStorage.removeItem(key); }
          }
        }
        await pause(50);
      }
      throw new Error('Another tab is saving. Please try again in a moment.');
    };
    const next = this.queue.then(operation, operation); this.queue = next.catch(() => undefined); return next;
  }
}
