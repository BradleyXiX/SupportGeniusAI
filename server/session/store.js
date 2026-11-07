import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

let sharedStore = null;

export function createSessionStore(options = {}) {
  const store = new MemoryStore({
    checkPeriod: options.checkPeriod || 60000, // 60 seconds (prune every minute)
    max: options.max || 500, // 500 sessions maximum
    ttl: options.ttl || 30 * 60 * 1000, // 30 minutes inactivity TTL
    stale: false, // stale reads disabled
    ...options
  });
  return store;
}

export function getSessionStore() {
  if (!sharedStore) {
    sharedStore = createSessionStore();
  }
  return sharedStore;
}

export function cleanupSessionStore(store = sharedStore) {
  if (store) {
    if (typeof store.stopInterval === "function") {
      store.stopInterval();
    }
    if (typeof store.clear === "function") {
      store.clear();
    }
    if (store === sharedStore) {
      sharedStore = null;
    }
  }
}

