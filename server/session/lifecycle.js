import { createUsageMetrics } from "../services/finops.js";
import { sessionBusyError, sessionStoreUnavailableError, sessionRequiredError } from "../utils/problemDetails.js";

// Active single-flight lock registry keyed by cookie-owned session ID
const activeLocks = new Set();

export function initializeSessionData(session) {
  session.initialized = true;
  session.revision = 1;
  session.history = [];
  session.metrics = createUsageMetrics();
}

export function tryAcquireSessionLock(sessionId) {
  if (!sessionId) return false;
  if (activeLocks.has(sessionId)) {
    return false;
  }
  activeLocks.add(sessionId);
  return true;
}

export function releaseSessionLock(sessionId) {
  if (sessionId) {
    activeLocks.delete(sessionId);
  }
}

export function clearAllSessionLocks() {
  activeLocks.clear();
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

