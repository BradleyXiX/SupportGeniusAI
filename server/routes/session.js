import express from "express";
import { validateOrigin } from "../session/middleware.js";
import { regenerateSession, initializeSessionData, saveSession } from "../session/lifecycle.js";
import { sessionStoreUnavailableError } from "../utils/problemDetails.js";

const router = express.Router();

router.post("/", validateOrigin, async (req, res, next) => {
  try {
    if (req.session) {
      await regenerateSession(req);
    } else {
      // In case session was not initialized yet on req
      initializeSessionData(req.session);
      await saveSession(req);
    }
    res.status(204).end();
  } catch (err) {
    if (err.status && typeof err.toJSON === "function") {
      return res.status(err.status).json(err.toJSON());
    }
    const problem = sessionStoreUnavailableError(req.originalUrl || "/session");
    res.status(problem.status).json(problem.toJSON());
  }
});

export default router;

