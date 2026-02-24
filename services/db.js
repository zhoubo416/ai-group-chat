// 轻量 IndexedDB KV 封装，避免 localStorage 容量限制
const DB_NAME = 'ai-group-chat';
const STORE_NAME = 'kv';
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB not supported'));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore(mode, fn) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    let settled = false;
    const done = (val, err) => {
      if (settled) return;
      settled = true;
      err ? reject(err) : resolve(val);
    };
    fn(store, done);
    tx.oncomplete = () => done(undefined, null);
    tx.onerror = () => done(null, tx.error);
    tx.onabort = () => done(null, tx.error || new Error('Transaction aborted'));
  });
}

export async function idbGet(key) {
  return withStore('readonly', (store, done) => {
    const req = store.get(key);
    req.onsuccess = () => done(req.result, null);
    req.onerror = () => done(null, req.error);
  });
}

export async function idbSet(key, value) {
  return withStore('readwrite', (store, done) => {
    const req = store.put(value, key);
    req.onsuccess = () => done(true, null);
    req.onerror = () => done(null, req.error);
  });
}

export async function idbDelete(key) {
  return withStore('readwrite', (store, done) => {
    const req = store.delete(key);
    req.onsuccess = () => done(true, null);
    req.onerror = () => done(null, req.error);
  });
}
