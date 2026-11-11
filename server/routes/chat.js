import express from "express";
import crypto from "crypto";
import * as agentService from "../services/agent.js";
import { getSessionCost, createUsageMetrics, isCostAvailable } from "../services/finops.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { ChatPayloadSchema } from "../schemas/chatSchema.js";
import {
  ProblemError,
  providerTimeoutError,
  providerUnavailableError,
  sessionBusyError,
  sessionRequiredError,
  sessionStoreUnavailableError
} from "../utils/problemDetails.js";
import { UpstreamError } from "../utils/upstream.js";
import {
  tryAcquireSessionLock,
  releaseSessionLock,
  reloadSession,
  saveSession,
  getStoreEntry,
  suppressAutoSaveAndCookie
} from "../session/lifecycle.js";
import { env } from "../config/env.js";

const router = express.Router();

router.post("/", validateRequest(ChatPayloadSchema), async (req, res, next) => {
  const { message } = req.body;
  const correlationId = crypto.randomUUID();

  if (!req.session || !req.session.initialized) {
    suppressAutoSaveAndCookie(req, res);
    const problem = sessionRequiredError(
      req.originalUrl || "/chat",
      "Session required or expired. Please initialize a session."
    );
    return res.status(401).json(problem.toJSON());
  }

  const sessionId = req.session.id;

  // Enforce single-flight concurrency: immediate 409 SESSION_BUSY
  const lockLease = tryAcquireSessionLock(sessionId, req.sessionStore);
  if (!lockLease) {
    suppressAutoSaveAndCookie(req, res);
    const problem = sessionBusyError(req.originalUrl || "/chat");
    return res.status(problem.status).json(problem.toJSON());
  }

  // Route-level 30-second total budget for retrieval + generation
  const routeController = new AbortController();
  const routeTimer = setTimeout(() => {
    routeController.abort();
  }, 30000);

  try {
    // Initial verification that session exists in store under acquired ownership
    const initialEntry = await getStoreEntry(req.sessionStore, sessionId);
    if (!initialEntry || !initialEntry.initialized) {
      suppressAutoSaveAndCookie(req, res);
      const problem = sessionRequiredError(req.originalUrl || "/chat");
      return res.status(401).json(problem.toJSON());
    }

    // Hydrate working context from the SAME fresh store snapshot under acquired ownership.
    // Keep expected revision, working history, and working metrics detached from req.session during retrieval/generation.
    const expectedRevision = initialEntry.revision || 1;
    const workingHistory = Array.isArray(initialEntry.history)
      ? [...initialEntry.history]
      : [];
    const workingMetrics = initialEntry.metrics
      ? JSON.parse(JSON.stringify(initialEntry.metrics))
      : createUsageMetrics();

    const mode = process.env.APP_MODE || env.APP_MODE || "support";

    const response = await agentService.handleChat(message, {
      history: workingHistory,
      metrics: workingMetrics,
      mode,
      signal: routeController.signal
    });

    // Verify session still exists and has not been evicted, destroyed, or rotated during processing
    const currentInStore = await getStoreEntry(req.sessionStore, sessionId);
    if (!currentInStore || !currentInStore.initialized || currentInStore.revision !== expectedRevision) {
      suppressAutoSaveAndCookie(req, res);
      const problem = sessionRequiredError(
        req.originalUrl || "/chat",
        "Session was expired, evicted, or rotated during request processing."
      );
      return res.status(401).json(problem.toJSON());
    }

    // Commit to session payload ONLY after the live-store/revision check, immediately before explicit persistence
    req.session.history = response.history;
    req.session.metrics = response.metrics;
    req.session.revision = expectedRevision + 1;
    req.session.touch();

    try {
      await saveSession(req);
    } catch (saveErr) {
      suppressAutoSaveAndCookie(req, res);
      const problem = sessionStoreUnavailableError(req.originalUrl || "/chat");
      return res.status(503).json(problem.toJSON());
    }

    const costAvailable = isCostAvailable(req.session.metrics);
    const costNum = getSessionCost(req.session.metrics);
    res.json({
      reply: response.reply,
      cost: costAvailable ? Number(costNum).toFixed(4) : null,
      costAvailable
    });
  } catch (err) {
    // Prevent response-end automatic persistence and Set-Cookie on EVERY unsuccessful route exit
    suppressAutoSaveAndCookie(req, res);

    if (err instanceof UpstreamError) {
      console.error(
        `[UPSTREAM_ERROR] id=${correlationId} kind=${err.kind} provider=${err.providerLabel} duration=${err.durationMs}ms status=${err.status ?? "N/A"}`
      );
      if (err.kind === "timeout") {
        const problem = providerTimeoutError(
          req.originalUrl || "/chat",
          "Upstream AI provider timed out.",
          correlationId
        );
        return res.status(problem.status).json(problem.toJSON());
      }
      const problem = providerUnavailableError(
        req.originalUrl || "/chat",
        "Upstream AI provider is temporarily unavailable.",
        correlationId
      );
      return res.status(problem.status).json(problem.toJSON());
    }

    if (err instanceof ProblemError) {
      return res.status(err.status).json(err.toJSON());
    }

    const safeErrorType = "UNEXPECTED";
    console.error(`[UNHANDLED_CHAT_ERROR] id=${correlationId} errorType=${safeErrorType}`);
    const fallbackProblem = new ProblemError({
      type: "https://supportgenius.ai/errors/chat-processing-failed",
      title: "Chat Processing Error",
      status: 500,
      detail: "An unexpected error occurred while processing the chat request.",
      instance: req.originalUrl,
      correlationId
    });
    res.status(fallbackProblem.status).json(fallbackProblem.toJSON());
  } finally {
    clearTimeout(routeTimer);
    if (lockLease) {
      releaseSessionLock(lockLease, req.sessionStore);
    }
  }
});

export default router;
