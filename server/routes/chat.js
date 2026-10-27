import express from "express";
import { handleChat } from "../services/agent.js";
import { getSessionCost } from "../services/finops.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { ChatPayloadSchema } from "../schemas/chatSchema.js";
import { ProblemError } from "../utils/problemDetails.js";

const router = express.Router();

router.post("/", validateRequest(ChatPayloadSchema), async (req, res, next) => {
  const { message, sessionId } = req.body;

  try {
    const response = await handleChat(message, sessionId);
    const cost = getSessionCost(sessionId);
    res.json({
      reply: response,
      cost: cost.toFixed(4)
    });
  } catch (err) {
    if (err instanceof ProblemError) {
      return res.status(err.status).json(err.toJSON());
    }
    console.error("Chat routing error:", err);
    const fallbackProblem = new ProblemError({
      type: "https://supportgenius.ai/errors/chat-processing-failed",
      title: "Chat Processing Error",
      status: 500,
      detail: err.message || "Failed to process chat query.",
      instance: req.originalUrl
    });
    res.status(fallbackProblem.status).json(fallbackProblem.toJSON());
  }
});

export default router;