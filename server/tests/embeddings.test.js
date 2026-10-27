import { describe, it, expect } from "vitest";
import { cosineSimilarity, calculateKeywordScore } from "../services/embeddings.js";

describe("Embeddings & Similarity Search Math", () => {
  it("returns 1 for identical normalized vectors", () => {
    const vecA = [0.6, 0.8];
    const vecB = [0.6, 0.8];
    expect(cosineSimilarity(vecA, vecB)).toBeCloseTo(1.0, 5);
  });

  it("returns 0 for orthogonal vectors", () => {
    const vecA = [1, 0];
    const vecB = [0, 1];
    expect(cosineSimilarity(vecA, vecB)).toBeCloseTo(0.0, 5);
  });

  it("returns 0 for empty or invalid vector inputs", () => {
    expect(cosineSimilarity([], [])).toBe(0);
    expect(cosineSimilarity(null, [1, 2])).toBe(0);
  });

  it("calculates keyword scores based on word overlap", () => {
    const query = "shipping refund policy";
    const textA = "Our shipping and delivery takes 24 hours locally.";
    const textB = "Returns and refunds are processed within 3 business days.";
    const textC = "Office hours are Monday to Friday.";

    expect(calculateKeywordScore(query, textA)).toBe(1);
    expect(calculateKeywordScore(query, textB)).toBe(1);
    expect(calculateKeywordScore(query, textC)).toBe(0);
  });
});
