import express from "express";
import { getVectorStoreStats } from "../db/vectorStore.js";
import { env } from "../config/env.js";

const router = express.Router();

router.get("/", (req, res) => {
  const mem = process.memoryUsage();
  res.json({
    status: "healthy",
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
    vectorStore: getVectorStoreStats(),
    memory: {
      rssMb: +(mem.rss / 1024 / 1024).toFixed(2),
      heapUsedMb: +(mem.heapUsed / 1024 / 1024).toFixed(2)
    }
  });
});

export default router;
