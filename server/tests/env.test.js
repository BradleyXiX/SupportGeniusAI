import { describe, it, expect } from "vitest";
import { parseEnv } from "../config/env.js";

describe("Environment Configuration & Schema Validation", () => {
  const validSecret = "test-session-secret-at-least-32-chars-long";
  const validOrigin = "http://localhost:3000";

  it("parses valid default development environment", () => {
    const raw = {
      NODE_ENV: "development",
      PORT: "3000",
      SESSION_SECRET: validSecret,
      PUBLIC_ORIGIN: validOrigin
    };
    const parsed = parseEnv(raw);
    expect(parsed.NODE_ENV).toBe("development");
    expect(parsed.APP_MODE).toBe("support");
    expect(parsed.LLM_PROVIDER).toBe("auto");
    expect(parsed.RETRIEVAL_MODE).toBe("vector");
    expect(parsed.PORT).toBe(3000);
    expect(parsed.SESSION_SECRET).toBe(validSecret);
    expect(parsed.PUBLIC_ORIGIN).toBe(validOrigin);
    expect(parsed.CORS_ALLOWED_ORIGINS).toContain("http://localhost:3000");
  });

  it("parses explicit demo APP_MODE", () => {
    const raw = {
      APP_MODE: "demo",
      SESSION_SECRET: validSecret,
      PUBLIC_ORIGIN: validOrigin
    };
    const parsed = parseEnv(raw);
    expect(parsed.APP_MODE).toBe("demo");
  });

  it("throws validation error for invalid APP_MODE", () => {
    const raw = {
      APP_MODE: "invalid_mode",
      SESSION_SECRET: validSecret,
      PUBLIC_ORIGIN: validOrigin
    };
    expect(() => parseEnv(raw)).toThrow();
  });

  it("coerces numeric string PORT to number", () => {
    const raw = {
      PORT: "8080",
      SESSION_SECRET: validSecret,
      PUBLIC_ORIGIN: validOrigin
    };
    const parsed = parseEnv(raw);
    expect(parsed.PORT).toBe(8080);
  });

  it("parses comma-separated CORS_ALLOWED_ORIGINS into an array", () => {
    const raw = {
      CORS_ALLOWED_ORIGINS: "https://app.supportgenius.ai, https://admin.supportgenius.ai",
      SESSION_SECRET: validSecret,
      PUBLIC_ORIGIN: validOrigin
    };
    const parsed = parseEnv(raw);
    expect(parsed.CORS_ALLOWED_ORIGINS).toEqual([
      "https://app.supportgenius.ai",
      "https://admin.supportgenius.ai"
    ]);
  });

  it("throws validation error for invalid NODE_ENV in non-production", () => {
    const raw = {
      NODE_ENV: "invalid-env",
      SESSION_SECRET: validSecret,
      PUBLIC_ORIGIN: validOrigin
    };
    expect(() => parseEnv(raw)).toThrow();
  });

  it("throws validation error when SESSION_SECRET is missing or shorter than 32 chars", () => {
    expect(() => parseEnv({ PUBLIC_ORIGIN: validOrigin })).toThrow();
    expect(() => parseEnv({ SESSION_SECRET: "short-secret", PUBLIC_ORIGIN: validOrigin })).toThrow();
  });

  it("throws validation error when PUBLIC_ORIGIN is missing or invalid URL", () => {
    expect(() => parseEnv({ SESSION_SECRET: validSecret })).toThrow();
    expect(() => parseEnv({ SESSION_SECRET: validSecret, PUBLIC_ORIGIN: "not-a-url" })).toThrow();
  });

  it("enforces HTTPS for PUBLIC_ORIGIN when NODE_ENV is production", () => {
    expect(() =>
      parseEnv({
        NODE_ENV: "production",
        SESSION_SECRET: validSecret,
        PUBLIC_ORIGIN: "http://example.com"
      })
    ).toThrow();

    const parsed = parseEnv({
      NODE_ENV: "production",
      SESSION_SECRET: validSecret,
      PUBLIC_ORIGIN: "https://app.supportgenius.ai"
    });
    expect(parsed.PUBLIC_ORIGIN).toBe("https://app.supportgenius.ai");
  });

  describe("Task D1: LLM_PROVIDER & GEMINI_MODEL Configuration", () => {
    it("parses valid LLM_PROVIDER options", () => {
      for (const provider of ["auto", "openai", "gemini", "ollama"]) {
        const raw = {
          SESSION_SECRET: validSecret,
          PUBLIC_ORIGIN: validOrigin,
          LLM_PROVIDER: provider,
          OPENAI_API_KEY: "test-openai-key",
          GEMINI_API_KEY: "test-gemini-key",
          GEMINI_MODEL: "gemini-3.1-flash-lite"
        };
        const parsed = parseEnv(raw);
        expect(parsed.LLM_PROVIDER).toBe(provider);
      }
    });

    it("throws on invalid LLM_PROVIDER option", () => {
      const raw = {
        SESSION_SECRET: validSecret,
        PUBLIC_ORIGIN: validOrigin,
        LLM_PROVIDER: "openrouter"
      };
      expect(() => parseEnv(raw)).toThrow();
    });

    it("parses RETRIEVAL_MODE options defaulting to vector", () => {
      const defaultParsed = parseEnv({
        SESSION_SECRET: validSecret,
        PUBLIC_ORIGIN: validOrigin
      });
      expect(defaultParsed.RETRIEVAL_MODE).toBe("vector");

      const keywordParsed = parseEnv({
        SESSION_SECRET: validSecret,
        PUBLIC_ORIGIN: validOrigin,
        RETRIEVAL_MODE: "keyword"
      });
      expect(keywordParsed.RETRIEVAL_MODE).toBe("keyword");
    });

    it("enforces trimmed bare model ID for GEMINI_MODEL without slashes, URLs, or query strings", () => {
      const validBare = parseEnv({
        SESSION_SECRET: validSecret,
        PUBLIC_ORIGIN: validOrigin,
        GEMINI_MODEL: "  gemini-3.1-flash-lite  "
      });
      expect(validBare.GEMINI_MODEL).toBe("gemini-3.1-flash-lite");

      // Reject path/query/URL characters
      for (const invalidModel of [
        "models/gemini-3.1-flash-lite",
        "https://generativelanguage.googleapis.com/v1beta/models/gemini",
        "gemini-3.1-flash-lite?key=secret",
        "gemini:3.1",
        "gemini flash lite"
      ]) {
        expect(() =>
          parseEnv({
            SESSION_SECRET: validSecret,
            PUBLIC_ORIGIN: validOrigin,
            GEMINI_MODEL: invalidModel
          })
        ).toThrow();
      }
    });

    it("fails startup in support mode when LLM_PROVIDER is gemini and credentials/model are missing", () => {
      // Missing GEMINI_API_KEY
      expect(() =>
        parseEnv({
          APP_MODE: "support",
          LLM_PROVIDER: "gemini",
          GEMINI_MODEL: "gemini-3.1-flash-lite",
          SESSION_SECRET: validSecret,
          PUBLIC_ORIGIN: validOrigin
        })
      ).toThrow();

      // Missing GEMINI_MODEL
      expect(() =>
        parseEnv({
          APP_MODE: "support",
          LLM_PROVIDER: "gemini",
          GEMINI_API_KEY: "test-gemini-key",
          SESSION_SECRET: validSecret,
          PUBLIC_ORIGIN: validOrigin
        })
      ).toThrow();
    });

    it("fails startup in support mode when LLM_PROVIDER is openai and OPENAI_API_KEY is missing", () => {
      expect(() =>
        parseEnv({
          APP_MODE: "support",
          LLM_PROVIDER: "openai",
          SESSION_SECRET: validSecret,
          PUBLIC_ORIGIN: validOrigin
        })
      ).toThrow();
    });

    it("allows demo mode without provider keys or GEMINI_MODEL even if LLM_PROVIDER is gemini", () => {
      const parsed = parseEnv({
        APP_MODE: "demo",
        LLM_PROVIDER: "gemini",
        SESSION_SECRET: validSecret,
        PUBLIC_ORIGIN: validOrigin
      });
      expect(parsed.APP_MODE).toBe("demo");
      expect(parsed.LLM_PROVIDER).toBe("gemini");
    });
  });
});
