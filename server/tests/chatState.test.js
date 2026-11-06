import { describe, it, expect } from "vitest";
import {
  createChatState,
  beginRequest,
  resetSession,
  acceptsReply,
  completeRequest
} from "../../client/chat-state.js";

describe("Pure Chat State Machine (client/chat-state.js)", () => {
  it("initializes chat state with sessionId, generation 0, and pending null", () => {
    const state = createChatState("sess_123");
    expect(state).toEqual({
      sessionId: "sess_123",
      generation: 0,
      pending: null
    });
  });

  it("begins a request, setting pending with requestId and current generation", () => {
    const state = createChatState("sess_123");
    const next = beginRequest(state, "req_1");
    expect(next.pending).toEqual({
      requestId: "req_1",
      generation: 0
    });
    expect(next.sessionId).toBe("sess_123");
    expect(next.generation).toBe(0);
  });

  it("duplicate beginRequest while pending returns the unchanged state (idempotency guard)", () => {
    const state = createChatState("sess_123");
    const next1 = beginRequest(state, "req_1");
    const next2 = beginRequest(next1, "req_2");

    expect(next2).toBe(next1);
    expect(next2.pending.requestId).toBe("req_1");
  });

  it("accepts reply when requestId and generation match active pending request", () => {
    const state = createChatState("sess_123");
    const pendingState = beginRequest(state, "req_1");

    expect(acceptsReply(pendingState, { requestId: "req_1", generation: 0 })).toBe(true);
  });

  it("rejects reply if requestId does not match pending request", () => {
    const state = createChatState("sess_123");
    const pendingState = beginRequest(state, "req_1");

    expect(acceptsReply(pendingState, { requestId: "req_other", generation: 0 })).toBe(false);
  });

  it("rejects reply if generation does not match pending generation", () => {
    const state = createChatState("sess_123");
    const pendingState = beginRequest(state, "req_1");

    expect(acceptsReply(pendingState, { requestId: "req_1", generation: 1 })).toBe(false);
  });

  it("acceptsReply is false after resetSession (old in-flight requests are rejected)", () => {
    const state = createChatState("sess_123");
    const pendingState = beginRequest(state, "req_1");

    // User resets session while req_1 is still pending
    const resetState = resetSession(pendingState, "sess_456");

    expect(resetState.sessionId).toBe("sess_456");
    expect(resetState.generation).toBe(1);
    expect(resetState.pending).toBeNull();

    // In-flight reply from req_1 arrives late
    expect(acceptsReply(resetState, { requestId: "req_1", generation: 0 })).toBe(false);
  });

  it("completeRequest clears pending state if matching", () => {
    const state = createChatState("sess_123");
    const pendingState = beginRequest(state, "req_1");
    const finishedState = completeRequest(pendingState, { requestId: "req_1", generation: 0 });

    expect(finishedState.pending).toBeNull();
    expect(finishedState.generation).toBe(0);
    expect(acceptsReply(finishedState, { requestId: "req_1", generation: 0 })).toBe(false);
  });
});

