import crypto from "crypto";
import { createUsageMetrics } from "../services/finops.js";
import {
  sessionBusyError,
  sessionStoreUnavailableError,
  sessionRequiredError
} from "../utils/problemDetails.js";

// Active single-flight lock registries scoped by store
// WeakMap mapping store instance -> Map<sessionId, token>
const storeLockRegistries = new WeakMap();
const defaultLocks = new Map();

export function getLockRegistry(store) {
  if (!store || (typeof store !== "object" && typeof store !== "function")) {
    return defaultLocks;
  }
  let registry = storeLockRegistries.get(store);
  if (!registry) {
    registry = new Map();
    storeLockRegistries.set(store, registry);
  }
  return registry;
}

export class SessionLockLease {
  constructor(sessionId, token, registry) {
    this.sessionId = sessionId;
    this.token = token;
    this._registry = registry;
    this._released = false;
  }

  release() {
    if (this._released) return;
    this._released = true;
    if (this._registry && this._registry.get(this.sessionId) === this.token) {
      this._registry.delete(this.sessionId);
    }
  }
}

export function initializeSessionData(session) {
  session.initialized = true;
  session.revision = 1;
  session.history = [];
  session.metrics = createUsageMetrics();
}

/**
 * Attempts to acquire single-flight session lock.
 * Returns a SessionLockLease on success, or null on contention / limit.
 * Bounded to 500 active locks per registry to match session store limit.
 */
export function tryAcquireSessionLock(sessionId, store = null) {
  if (!sessionId) return null;
  const registry = getLockRegistry(store);
  if (registry.has(sessionId)) {
    return null;
  }
  if (registry.size >= 500) {
    return null;
  }
  const token = crypto.randomUUID();
  registry.set(sessionId, token);
  return new SessionLockLease(sessionId, token, registry);
}

/**
 * Releases session lock ONLY IF the provided lease or token matches
 * the lock currently held in the store's registry.
 */
export function releaseSessionLock(leaseOrId, tokenOrStore = null, store = null) {
  if (!leaseOrId) return;

  // Case 1: SessionLockLease object
  if (typeof leaseOrId === "object" && typeof leaseOrId.release === "function") {
    leaseOrId.release();
    return;
  }

  // Case 2: (sessionId, leaseOrToken, store)
  if (typeof leaseOrId === "string") {
    const sessionId = leaseOrId;
    if (tokenOrStore && typeof tokenOrStore === "object" && typeof tokenOrStore.release === "function") {
      tokenOrStore.release();
      return;
    }
    const token = typeof tokenOrStore === "string" ? tokenOrStore : null;
    const targetStore = store || null;
    if (!token) {
      // Cannot release without ownership token
      return;
    }
    const registry = getLockRegistry(targetStore);
    if (registry.get(sessionId) === token) {
      registry.delete(sessionId);
    }
  }
}

export function clearSessionLocks(store = null) {
  const registry = getLockRegistry(store);
  if (registry) {
    registry.clear();
  }
}

export function clearAllSessionLocks() {
  defaultLocks.clear();
}

export function getStoreEntry(store, sessionId) {
  return new Promise((resolve, reject) => {
    if (!store || !sessionId) return resolve(null);
    store.get(sessionId, (err, sess) => {
      if (err) return reject(err);
      resolve(sess || null);
    });
  });
}

export function suppressAutoSaveAndCookie(req, res) {
  try {
    res.removeHeader("Set-Cookie");
  } catch {}
  if (req) {
    req.session = null;
    req.sessionID = null;
  }
}

export function reloadSession(req) {
  return new Promise((resolve, reject) => {
    if (!req.session) {
      return reject(sessionRequiredError(req.originalUrl || "/chat"));
    }
    req.session.reload((err) => {
      if (err) {
        return reject(err);
      }
      if (!req.session.initialized) {
        return reject(sessionRequiredError(req.originalUrl || "/chat"));
      }
      resolve(req.session);
    });
  });
}

export function saveSession(req) {
  return new Promise((resolve, reject) => {
    if (!req.session) {
      return reject(sessionStoreUnavailableError(req.originalUrl || "/session"));
    }
    req.session.save((err) => {
      if (err) {
        return reject(sessionStoreUnavailableError(req.originalUrl || "/session"));
      }
      resolve();
    });
  });
}

export function regenerateSession(req) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) {
        return reject(sessionStoreUnavailableError(req.originalUrl || "/session"));
      }
      initializeSessionData(req.session);
      req.session.save((saveErr) => {
        if (saveErr) {
          return reject(sessionStoreUnavailableError(req.originalUrl || "/session"));
        }
        resolve();
      });
    });
  });
}
