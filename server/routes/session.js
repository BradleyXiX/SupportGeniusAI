import express from "express";
import {
  regenerateSession,
  initializeSessionData,
  saveSession,
  tryAcquireSessionLock,
  releaseSessionLock,
  reloadSession,
  suppressAutoSaveAndCookie,
  getStoreEntry
} from "../session/lifecycle.js";
import { sessionBusyError, sessionStoreUnavailableError } from "../utils/problemDetails.js";

const router = express.Router();

router.post("/", async (req, res, next) => {
  let existingLockId = null;

  try {
    // If an existing initialized session is present, acquire lock to prevent race with in-flight chat or rotation
    if (req.session && req.session.initialized) {
      existingLockId = req.session.id;
      if (!tryAcquireSessionLock(existingLockId)) {
        const problem = sessionBusyError(req.originalUrl || "/session");
        return res.status(409).json(problem.toJSON());
      }

      // Check if session still exists in store
      try {
        await reloadSession(req);
      } catch (reloadErr) {
        // If expired or evicted from store, release lock and proceed to create new session
        releaseSessionLock(existingLockId);
        existingLockId = null;
      }
    }

    try {
      if (req.session) {
        await regenerateSession(req);
      } else {
        initializeSessionData(req.session);
        await saveSession(req);
      }
      res.status(204).end();
    } catch (saveErr) {
      suppressAutoSaveAndCookie(req, res);
      const problem = sessionStoreUnavailableError(req.originalUrl || "/session");
      return res.status(503).json(problem.toJSON());
    }
  } catch (err) {
    suppressAutoSaveAndCookie(req, res);
    const problem = sessionStoreUnavailableError(req.originalUrl || "/session");
    res.status(503).json(problem.toJSON());
  } finally {
    if (existingLockId) {
      releaseSessionLock(existingLockId);
    }
  }
});

export default router;
