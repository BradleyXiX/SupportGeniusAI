import { describe, it, expect } from "vitest";
import {
  createUsageMetrics,
  setModel,
  trackUsage,
  getSessionCost,
  formatSessionCost,
  getSessionMetrics,
  PRICING
} from "../services/finops.js";

describe("FinOps Telemetry Service with Session Context", () => {
  it("calculates accurate session cost for gpt-4o-mini", () => {
    const metrics = createUsageMetrics();
    setModel(metrics, "gpt-4o-mini");

    // 1000 prompt tokens, 500 completion tokens
    trackUsage(metrics, 1000, 500);

    const expectedCost =
      (1000 / 1000) * PRICING["gpt-4o-mini"].prompt +
      (500 / 1000) * PRICING["gpt-4o-mini"].completion;

    const cost = getSessionCost(metrics);
    expect(cost).toBeCloseTo(expectedCost, 6);
    expect(formatSessionCost(metrics)).toBe(`$${expectedCost.toFixed(4)}`);
  });

  it("tracks cumulative usage across multiple turns", () => {
    const metrics = createUsageMetrics();
    setModel(metrics, "gemini-1.5-flash");

    trackUsage(metrics, 200, 100);
    trackUsage(metrics, 300, 150);

    const snapshot = getSessionMetrics(metrics);
    expect(snapshot.promptTokens).toBe(500);
    expect(snapshot.completionTokens).toBe(250);
  });

  it("returns zero cost for simulated model while tracking tokens", () => {
    const metrics = createUsageMetrics();
    setModel(metrics, "simulated");
    trackUsage(metrics, 1000, 1000);

    expect(getSessionCost(metrics)).toBe(0);
    expect(metrics.cost).toBe(0);
    expect(metrics.promptTokens).toBe(1000);
    expect(metrics.completionTokens).toBe(1000);
    expect(getSessionCost(null)).toBe(0);

    // Verify demo-simulated zero-cost alias
    const demoMetrics = createUsageMetrics();
    setModel(demoMetrics, "demo-simulated");
    trackUsage(demoMetrics, 500, 200);
    expect(getSessionCost(demoMetrics)).toBe(0);

    // Verify unknown model falls back to non-zero rates
    const unknownMetrics = createUsageMetrics();
    setModel(unknownMetrics, "unknown-model");
    trackUsage(unknownMetrics, 1000, 1000);
    expect(getSessionCost(unknownMetrics)).toBeGreaterThan(0);
  });
});
