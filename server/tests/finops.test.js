import { describe, it, expect, beforeEach } from "vitest";
import {
  setModel,
  trackUsage,
  getSessionCost,
  getSessionMetrics,
  resetFinops,
  PRICING
} from "../services/finops.js";

describe("FinOps Telemetry & Bounded Memory Service", () => {
  beforeEach(() => {
    resetFinops();
  });

  it("calculates accurate session cost for gpt-4o-mini", () => {
    const sessionId = "sess_test_1";
    setModel(sessionId, "gpt-4o-mini");

    // 1000 prompt tokens, 500 completion tokens
    trackUsage(sessionId, 1000, 500);

    const expectedCost =
      (1000 / 1000) * PRICING["gpt-4o-mini"].prompt +
      (500 / 1000) * PRICING["gpt-4o-mini"].completion;

    const cost = getSessionCost(sessionId);
    expect(cost).toBeCloseTo(expectedCost, 6);
  });

  it("tracks cumulative usage across multiple turns", () => {
    const sessionId = "sess_test_2";
    setModel(sessionId, "gemini-1.5-flash");

    trackUsage(sessionId, 200, 100);
    trackUsage(sessionId, 300, 150);

    const metrics = getSessionMetrics(sessionId);
    expect(metrics.promptTokens).toBe(500);
    expect(metrics.completionTokens).toBe(250);
  });

  it("returns zero cost for simulated model or non-existent session", () => {
    const sessionId = "sess_simulated";
    setModel(sessionId, "simulated");
    trackUsage(sessionId, 1000, 1000);

    expect(getSessionCost(sessionId)).toBe(0);
    expect(getSessionCost("non_existent_id")).toBe(0);
  });
});
