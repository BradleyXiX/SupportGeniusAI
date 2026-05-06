import express from "express";
import cors from "cors";
import chatRoute from "./routes/chat.js";
import { initializeStore } from "./db/vectorStore.js";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/chat", chatRoute);

// Initialize vector store then start server
initializeStore().then(() => {
  app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
  });
});