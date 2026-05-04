import express from "express";
import chatRoute from "./routes/chat.js";

const app = express();
app.use(express.json());

app.use("/chat", chatRoute);

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});