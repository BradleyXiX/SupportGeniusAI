import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import chatRoute from "./routes/chat.js";
import { initializeStore } from "./db/vectorStore.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Serve frontend static files
app.use(express.static("client"));

// Rate limiting for the AI Gateway (10 requests per minute)
const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: { reply: "You have exceeded the rate limit of 10 requests per minute. Please try again later." }
});

app.use("/chat", chatLimiter, chatRoute);

// Initialize vector store then start server
const PORT = process.env.PORT || 3000;
initializeStore().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});