import { describe, it, expect } from "vitest";
import { parseEnv } from "../config/env.js";

describe("Environment Configuration & Schema Validation", () => {
  it("parses valid default development environment", () => {
    const raw = {
      NODE_ENV: "development",
      PORT: "3000"
    };
    const parsed = parseEnv(raw);
    expect(parsed.NODE_ENV).toBe("development");
    expect(parsed.PORT).toBe(3000);
    expect(parsed.CORS_ALLOWED_ORIGINS).toContain("http://localhost:3000");
  });

  it("coerces numeric string PORT to number", () => {
    const raw = {
      PORT: "8080"
    };
    const parsed = parseEnv(raw);
    expect(parsed.PORT).toBe(8080);
  });

  it("parses comma-separated CORS_ALLOWED_ORIGINS into an array", () => {
    const raw = {
      CORS_ALLOWED_ORIGINS: "https://app.supportgenius.ai, https://admin.supportgenius.ai"
    };
    const parsed = parseEnv(raw);
    expect(parsed.CORS_ALLOWED_ORIGINS).toEqual([
      "https://app.supportgenius.ai",
      "https://admin.supportgenius.ai"
    ]);
  });

  it("throws validation error for invalid NODE_ENV in non-production", () => {
    const raw = {
      NODE_ENV: "invalid-env"
    };
    expect(() => parseEnv(raw)).toThrow();
  });
});
