// Nitro server-side polyfill: guard libs that assume browser localStorage
export default () => {
  if (typeof globalThis.localStorage !== 'undefined') return;

  const store = new Map<string, string>();

  const localStorageShim = {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      const keys = Array.from(store.keys());
      return keys[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
  };

  // @ts-expect-error - attach shim to globalThis
  globalThis.localStorage = localStorageShim;
};
