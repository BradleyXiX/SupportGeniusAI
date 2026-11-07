import express from "express";
import crypto from "crypto";
import * as agentService from "../services/agent.js";
import { getSessionCost } from "../services/finops.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { ChatPayloadSchema } from "../schemas/chatSchema.js";
import {
  ProblemError,
  providerTimeoutError,
  providerUnavailableError,
  sessionBusyError,
  sessionRequiredError
} from "../utils/problemDetails.js";
import { UpstreamError } from "../utils/upstream.js";
import { validateOrigin, requireSession } from "../session/middleware.js";
import {
  tryAcquireSessionLock,
  releaseSessionLock,
  reloadSession,
  saveSession
} from "../session/lifecycle.js";
import { env } from "../config/env.js";

const router = express.Router();

router.post("/", validateOrigin, requireSession, validateRequest(ChatPayloadSchema), async (req, res, next) => {
  const { message } = req.body;
  const correlationId = crypto.randomUUID();
  const sessionId = req.session.id;

  // Enforce single-flight concurrency: immediate 409 SESSION_BUSY
  if (!tryAcquireSessionLock(sessionId)) {
    const problem = sessionBusyError(req.originalUrl || "/chat");
    return res.status(problem.status).json(problem.toJSON());
  }

  // Route-level 30-second total budget for retrieval + generation
  const routeController = new AbortController();
  const routeTimer = setTimeout(() => {
    routeController.abort();
  }, 30000);

  try {
    // Reload after lock acquisition to ensure fresh state from store
    try {
      await reloadSession(req);
    } catch (reloadErr) {
      if (reloadErr instanceof ProblemError) {
        return res.status(reloadErr.status).json(reloadErr.toJSON());
      }
      const problem = sessionRequiredError(req.originalUrl || "/chat");
      return res.status(problem.status).json(problem.toJSON());
    }

    const workingHistory = [...(req.session.history || [])];
    const workingMetrics = { ...(req.session.metrics || {}) };
    const mode = process.env.APP_MODE || env.APP_MODE || "support";

    const response = await agentService.handleChat(message, {
      history: workingHistory,
      metrics: workingMetrics,
      mode,
      signal: routeController.signal
    });

    // Commit to session payload
    req.session.history = response.history;
    req.session.metrics = response.metrics;
    req.session.revision = (req.session.revision || 1) + 1;
    req.session.touch();

    await saveSession(req);

    const costNum = getSessionCost(req.session.metrics);
    res.json({
      reply: response.reply,
      cost: Number(costNum).toFixed(4)
    });
  } catch (err) {
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
    releaseSessionLock(sessionId);
  }
});

export default router;
