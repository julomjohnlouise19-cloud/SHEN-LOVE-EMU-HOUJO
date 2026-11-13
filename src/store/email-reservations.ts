// IndexedDB read/write transactions serialize reservations across tab renderers.
// localStorage remains a compatibility mirror for existing saved cooldowns.
let opening: Promise<IDBDatabase | undefined> | undefined;
const storeName = "deadlines";
const valid = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;

function database() {
  if (opening) return opening;
  opening = new Promise<IDBDatabase | undefined>((resolve) => {
    if (typeof indexedDB === "undefined") return resolve(undefined);
    let ended = false;
    const finish = (db?: IDBDatabase) => {
      if (ended) return db?.close();
      ended = true;
      clearTimeout(timer);
      resolve(db);
    };
    const timer = setTimeout(() => finish(), 3000);
    try {
      const request = indexedDB.open("csl-email-reservations", 1);
      request.onupgradeneeded = () =>
        request.result.createObjectStore(storeName);
      request.onerror = request.onblocked = () => finish();
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          opening = undefined;
        };
        finish(db);
      };
    } catch {
      finish();
    }
  });
  return opening;
}

export async function emailDeadline(
  key: string,
  legacy: unknown,
  update?: (until: number) => number,
) {
  const db = await database();
  if (!db) return undefined;
  return new Promise<number>((resolve, reject) => {
    let tx: IDBTransaction;
    try {
      tx = db.transaction(storeName, update ? "readwrite" : "readonly");
    } catch {
      reject(
        new Error(
          "Your browser could not check email requests. Reload before trying again.",
        ),
      );
      return;
    }
    let result = 0;
    let failure: unknown;
    const timer = setTimeout(() => {
      failure = new Error(
        "Your browser took too long to check email requests. Reload before trying again.",
      );
      tx.abort();
    }, 5000);
    tx.oncomplete = () => {
      clearTimeout(timer);
      resolve(result);
    };
    tx.onabort = tx.onerror = () => {
      clearTimeout(timer);
      reject(
        failure ??
          new Error(
            "Your browser could not reserve an email request. Reload before trying again.",
          ),
      );
    };
    const store = tx.objectStore(storeName);
    const read = store.get(key);
    read.onsuccess = () => {
      try {
        const previous = Math.max(valid(legacy), valid(read.result));
        result = update ? update(previous) : previous;
        if (update) store.put(result, key);
      } catch (error) {
        failure = error;
        tx.abort();
      }
    };
  });
}
