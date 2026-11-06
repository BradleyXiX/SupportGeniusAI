import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { env } from "./config/env.js";
import chatRoute from "./routes/chat.js";
import healthRoute from "./routes/health.js";
import capabilitiesRoute from "./routes/capabilities.js";
import { initializeStore } from "./db/vectorStore.js";
import { rateLimitError, ProblemError, badRequest, payloadTooLargeError } from "./utils/problemDetails.js";

const app = express();

// Disable Express fingerprinting banner
app.disable("x-powered-by");

// Trust proxy for Docker, Render, and reverse proxies
app.set("trust proxy", 1);

// Configure Content Security Policy and Security Headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "https://cdn.jsdelivr.net",
          "https://cdnjs.cloudflare.com"
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://fonts.googleapis.com"
        ],
        fontSrc: [
          "'self'",
          "https://fonts.gstatic.com"
        ],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"]
      }
    },
    crossOriginEmbedderPolicy: false, // Allow CDN resources
    frameguard: { action: "deny" }
  })
);

// Safe CORS Origin Allowlist Configuration
const corsOptions = {
  origin: (origin, callback) => {
    // Allow local development and same-origin / server-to-server calls
    if (!origin || env.NODE_ENV !== "production") {
      return callback(null, true);
    }
    if (env.CORS_ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error(`CORS Violation: Origin '${origin}' is not permitted.`));
  },
  credentials: true,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "1mb" }));

// Serve frontend static assets
app.use(express.static("client"));

// Health and liveness probe
app.use("/health", healthRoute);

// Public capabilities descriptor
app.use("/capabilities", capabilitiesRoute);

// AI Gateway Rate Limiter (sliding window with RFC 7807 response)
const chatLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const problem = rateLimitError(
      req.originalUrl || req.url,
      `Rate limit exceeded (${env.RATE_LIMIT_MAX_REQUESTS} requests per minute). Please try again shortly.`
    );
    res.status(problem.status).json(problem.toJSON());
  }
});

// Protected AI Chat Route
app.use("/chat", chatLimiter, chatRoute);

// Universal RFC 7807 Fallback Error Handler
app.use((err, req, res, next) => {
  if (err instanceof ProblemError) {
    return res.status(err.status).json(err.toJSON());
  }

  // Map body parser errors: payload too large (413) and malformed JSON (400)
  if (err.status === 413 || err.type === "entity.too.large") {
    const problem = payloadTooLargeError(req.originalUrl || req.url, "Request payload exceeds allowed limit.");
    return res.status(413).json(problem.toJSON());
  }

  if (err.status === 400 || err.type === "entity.parse.failed" || (err instanceof SyntaxError && "body" in err)) {
    const problem = badRequest(req.originalUrl || req.url, "Malformed JSON request body.");
    return res.status(400).json(problem.toJSON());
  }

  console.error("Unhandled error intercepted:", err);
  const problem = new ProblemError({
    type: "https://supportgenius.ai/errors/unhandled-exception",
    title: "Internal Server Error",
    status: 500,
    detail: "An unhandled server exception occurred.",
    instance: req.originalUrl || req.url
  });
  res.status(500).json(problem.toJSON());
});

// Server bootstrap
const PORT = env.PORT;
if (process.env.NODE_ENV !== "test") {
  initializeStore().then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 SupportGeniusAI Server running on http://localhost:${PORT} [${env.NODE_ENV}]`);
    });
  });
}

export default app;