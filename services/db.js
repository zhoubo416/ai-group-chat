// 轻量 IndexedDB KV 封装，避免 localStorage 容量限制
const DB_NAME = 'ai-group-chat';
const STORE_NAME = 'kv';
const PARTICIPANTS_STORE_NAME = 'participants';
const DB_VERSION = 3;

function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB not supported'));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
      if (!db.objectStoreNames.contains(PARTICIPANTS_STORE_NAME)) {
        db.createObjectStore(PARTICIPANTS_STORE_NAME, { keyPath: 'id', autoIncrement: true });
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

function openParticipantsDB() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB not supported'));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(PARTICIPANTS_STORE_NAME)) {
        db.createObjectStore(PARTICIPANTS_STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllParticipants() {
  const db = await openParticipantsDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PARTICIPANTS_STORE_NAME, 'readonly');
    const store = tx.objectStore(PARTICIPANTS_STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => {
      console.log('Loaded participants:', req.result);
      resolve(req.result || []);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function saveParticipant(participant) {
  const db = await openParticipantsDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PARTICIPANTS_STORE_NAME, 'readwrite');
    const store = tx.objectStore(PARTICIPANTS_STORE_NAME);
    const data = {
      name: participant.name,
      role: participant.role,
      model: participant.model,
      avatar: participant.avatar,
      createdAt: new Date().toISOString()
    };
    console.log('Saving participant:', data);
    const req = store.add(data);
    req.onsuccess = () => {
      console.log('Participant saved successfully, id:', req.result);
      resolve({ ...data, id: req.result });
    };
    req.onerror = () => {
      console.error('Failed to save participant:', req.error);
      reject(req.error);
    };
  });
}

export async function deleteParticipant(id) {
  const db = await openParticipantsDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PARTICIPANTS_STORE_NAME, 'readwrite');
    const store = tx.objectStore(PARTICIPANTS_STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}
