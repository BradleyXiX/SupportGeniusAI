import { describe, it, expect } from "vitest";
import {
  createUsageMetrics,
  setModel,
  trackUsage,
  getSessionCost,
  formatSessionCost,
  getSessionMetrics,
  isCostAvailable,
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
    expect(isCostAvailable(metrics)).toBe(true);
  });

  it("calculates accurate session cost for nominated gemini-3.1-flash-lite", () => {
    const metrics = createUsageMetrics();
    setModel(metrics, "gemini-3.1-flash-lite");

    // Pricing: $0.25/1M input ($0.00025/1K), $1.50/1M output ($0.0015/1K)
    trackUsage(metrics, 1000000, 1000000);

    expect(metrics.cost).toBeCloseTo(1.75, 4);
    expect(getSessionCost(metrics)).toBeCloseTo(1.75, 4);
    expect(formatSessionCost(metrics)).toBe("$1.7500");
    expect(isCostAvailable(metrics)).toBe(true);
  });

  it("tracks cumulative usage across multiple turns", () => {
    const metrics = createUsageMetrics();
    setModel(metrics, "gemini-1.5-flash");

    trackUsage(metrics, 200, 100);
    trackUsage(metrics, 300, 150);

    const snapshot = getSessionMetrics(metrics);
    expect(snapshot.promptTokens).toBe(500);
    expect(snapshot.completionTokens).toBe(250);
    expect(isCostAvailable(metrics)).toBe(true);
  });

  it("returns zero cost for simulated model while tracking tokens", () => {
    const metrics = createUsageMetrics();
    setModel(metrics, "simulated");
    trackUsage(metrics, 1000, 1000);

    expect(getSessionCost(metrics)).toBe(0);
    expect(metrics.cost).toBe(0);
    expect(metrics.costAvailable).toBe(true);
    expect(metrics.promptTokens).toBe(1000);
    expect(metrics.completionTokens).toBe(1000);
    expect(getSessionCost(null)).toBe(0);
    expect(formatSessionCost(metrics)).toBe("$0.0000");

    // Verify demo-simulated zero-cost alias
    const demoMetrics = createUsageMetrics();
    setModel(demoMetrics, "demo-simulated");
    trackUsage(demoMetrics, 500, 200);
    expect(getSessionCost(demoMetrics)).toBe(0);
    expect(demoMetrics.costAvailable).toBe(true);
    expect(formatSessionCost(demoMetrics)).toBe("$0.0000");
  });

  it("handles unknown/unpriced models safely with costAvailable: false without Qwen fallback", () => {
    const unknownMetrics = createUsageMetrics();
    setModel(unknownMetrics, "unknown-gemini-preview-model");
    trackUsage(unknownMetrics, 1000, 1000);

    // Must NOT fall back to Qwen rates ($0.0015 / $0.002)
    expect(unknownMetrics.costAvailable).toBe(false);
    expect(isCostAvailable(unknownMetrics)).toBe(false);
    expect(formatSessionCost(unknownMetrics)).toBe("Unavailable");
    // Token counters must still increment
    expect(unknownMetrics.promptTokens).toBe(1000);
    expect(unknownMetrics.completionTokens).toBe(1000);

    // Sticky unpriced behavior: once an unpriced model contributes, costAvailable remains false until reset
    setModel(unknownMetrics, "gpt-4o-mini");
    trackUsage(unknownMetrics, 500, 200);
    expect(unknownMetrics.costAvailable).toBe(false);
    expect(formatSessionCost(unknownMetrics)).toBe("Unavailable");
    expect(unknownMetrics.promptTokens).toBe(1500);
  });

  it("preserves costAvailable: true for legacy sessions lacking the field", () => {
    const legacyMetrics = {
      model: "gpt-4o-mini",
      cost: 0.05,
      promptTokens: 100,
      completionTokens: 50
    };
    expect(isCostAvailable(legacyMetrics)).toBe(true);
    expect(formatSessionCost(legacyMetrics)).toBe("$0.0500");
  });

  it("treats inherited object prototype properties (e.g. constructor) as unpriced via own-property check", () => {
    const metrics = createUsageMetrics();
    setModel(metrics, "constructor");
    trackUsage(metrics, 1000, 1000);

    expect(metrics.costAvailable).toBe(false);
    expect(isCostAvailable(metrics)).toBe(false);
    expect(formatSessionCost(metrics)).toBe("Unavailable");

    const toStringMetrics = createUsageMetrics();
    setModel(toStringMetrics, "toString");
    trackUsage(toStringMetrics, 1000, 1000);
    expect(toStringMetrics.costAvailable).toBe(false);
  });
});
