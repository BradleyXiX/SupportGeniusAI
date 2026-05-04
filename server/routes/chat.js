import express from "express";
import { handleChat } from "../services/agent.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const { message } = req.body;

  try {
    const response = await handleChat(message);
    res.json({ reply: response });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error processing request");
  }
});

export default router;