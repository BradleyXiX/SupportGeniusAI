import session from "express-session";
import { env } from "../config/env.js";
import { getSessionStore } from "./store.js";
import { forbiddenError, sessionRequiredError } from "../utils/problemDetails.js";

export function validateOrigin(req, res, next) {
  const origin = req.headers.origin;
  if (!origin) {
    const problem = forbiddenError(req.originalUrl || req.url, "Missing Origin header.");
    return res.status(403).json(problem.toJSON());
  }

  let expectedOrigin;
  try {
    expectedOrigin = new URL(env.PUBLIC_ORIGIN).origin;
  } catch {
    expectedOrigin = env.PUBLIC_ORIGIN;
  }

  if (origin !== expectedOrigin) {
    const problem = forbiddenError(req.originalUrl || req.url, "Cross-origin request rejected.");
    return res.status(403).json(problem.toJSON());
  }

  next();
}

export function createSessionMiddleware(store, options = {}) {
  const isProduction = options.isProduction !== undefined
    ? options.isProduction
    : (process.env.NODE_ENV || env.NODE_ENV) === "production";
  const cookieName = isProduction ? "__Host-supportgenius_session" : "supportgenius_session";

  return session({
    name: cookieName,
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: store || getSessionStore(),
    cookie: {
      httpOnly: true,
      sameSite: "strict",
      path: "/",
      domain: undefined,
      secure: isProduction,
      maxAge: 30 * 60 * 1000 // 30 minutes
    }
  });
}

export function requireSession(req, res, next) {
  if (!req.session || !req.session.initialized) {
    const problem = sessionRequiredError(
      req.originalUrl || "/chat",
      "Session required or expired. Please initialize a session."
    );
    return res.status(401).json(problem.toJSON());
  }
  next();
}

