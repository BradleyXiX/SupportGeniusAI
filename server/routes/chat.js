import express from "express";
import { handleChat } from "../services/agent.js";
import { getSessionCost } from "../services/finops.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const { message, sessionId } = req.body;

  try {
    const response = await handleChat(message, sessionId);
    const cost = getSessionCost(sessionId);
    res.json({ reply: response, cost: cost.toFixed(4) });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error processing request");
  }
});

export default router;