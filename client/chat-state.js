// ==========================================================================
// SupportGeniusAI Pure Chat State Machine
// Governed by Task 2 / A2 Interfaces
// ==========================================================================

/**
 * Initializes a new chat session state.
 * @param {string} sessionId
 * @returns {{ sessionId: string, generation: number, pending: { requestId: string, generation: number } | null }}
 */
export function createChatState(sessionId) {
  return {
    sessionId,
    generation: 0,
    pending: null
  };
}

/**
 * Begins a request. If a request is already pending, returns the state unchanged (idempotency guard).
 * @param {object} state
 * @param {string} requestId
 * @returns {object}
 */
export function beginRequest(state, requestId) {
  if (state.pending !== null) {
    return state;
  }
  return {
    ...state,
    pending: {
      requestId,
      generation: state.generation
    }
  };
}

/**
 * Resets the session, creating a new session ID and incrementing generation.
 * Any in-flight requests from prior generations are automatically invalidated.
 * @param {object} state
 * @param {string} newSessionId
 * @returns {object}
 */
export function resetSession(state, newSessionId) {
  return {
    sessionId: newSessionId,
    generation: state.generation + 1,
    pending: null
  };
}

/**
 * Determines whether a given incoming response belongs to the current pending request.
 * @param {object} state
 * @param {{ requestId: string, generation: number }} replyContext
 * @returns {boolean}
 */
export function acceptsReply(state, { requestId, generation }) {
  if (!state.pending) {
    return false;
  }
  return (
    state.generation === generation &&
    state.pending.generation === generation &&
    state.pending.requestId === requestId
  );
}

/**
 * Completes a pending request if replyContext matches the pending request.
 * @param {object} state
 * @param {{ requestId: string, generation: number }} replyContext
 * @returns {object}
 */
export function completeRequest(state, { requestId, generation }) {
  if (acceptsReply(state, { requestId, generation })) {
    return {
      ...state,
      pending: null
    };
  }
  return state;
}

