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
});
