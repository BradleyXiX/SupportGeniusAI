// ==========================================================================
// SupportGeniusAI Console Controller (Signal Desk)
// Pure ES Module • Strict CSP Compliant • Safe Rendering & Session State
// Governed by Task 2 / A2 & B5 Specifications (Corrected Architecture)
// ==========================================================================

import {
  createChatState,
  beginRequest,
  resetSession as resetChatState,
  acceptsReply,
  completeRequest
} from "./chat-state.js";
import { mountOrb } from "./orb.js";

const REQUEST_TIMEOUT_MS = 45000;
const SESSION_OP_TIMEOUT_MS = 15000;
const DEFAULT_RETRY_AFTER_SECONDS = 60;

function generateId(prefix = "id_") {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return prefix + crypto.randomUUID().replace(/-/g, "").substring(0, 24);
  }
  return prefix + Math.random().toString(36).substring(2, 11) + "_" + Date.now().toString(36);
}

/**
 * Validates the full server capabilities contract.
 * Requires:
 * - object with mode === 'support' || mode === 'demo'
 * - actionsEnabled === false
 * - sessionRequired === true
 * @param {any} cap
 * @returns {boolean}
 */
export function isValidCapabilities(cap) {
  if (!cap || typeof cap !== "object") return false;
  if (cap.mode !== "support" && cap.mode !== "demo") return false;
  if (cap.actionsEnabled !== false) return false;
  if (cap.sessionRequired !== true) return false;
  return true;
}

export function initConsole() {
  const chatMessages = document.getElementById("chat-messages");
  const inputField = document.getElementById("input");
  const sessionCostEl = document.getElementById("session-cost");
  const sendBtn = document.getElementById("send-btn");
  const resetBtn = document.getElementById("reset-btn");
  const resetBtnText = document.getElementById("reset-btn-text") || resetBtn?.querySelector("span");
  const chatForm = document.getElementById("chat-form");
  const statusBeacon = document.querySelector(".status-beacon");
  const statusText = document.getElementById("connection-status-text");
  const modeBadge = document.getElementById("mode-badge") || document.querySelector(".disclosure-badge");
  const modeText = document.getElementById("mode-text");
  const suggestionChips = document.querySelectorAll("[data-suggestion], .suggestion-chip");

  if (!chatMessages || !inputField) return;

  // Single coherent session status state machine:
  // "uninitialized" | "initializing" | "ready" | "chatPending" | "resetting" | "needsRecovery"
  let sessionStatus = "uninitialized";
  let isSessionOpInProgress = false;
  let activeOpId = 0;
  let chatState = createChatState();
  let hasHistory = false;
  let activeAbortController = null;
  let capabilities = null;
  const activeRateLimitTimers = new Set();

  // Mount console status orb
  const consoleOrbCanvas = document.getElementById("console-orb");
  const consoleOrb = consoleOrbCanvas ? mountOrb(consoleOrbCanvas, { state: "idle" }) : null;
  window.__consoleOrbState = "idle";

  function clearActiveRateLimitTimers() {
    activeRateLimitTimers.forEach((timer) => clearInterval(timer));
    activeRateLimitTimers.clear();
  }

  function updateModeDisclosure(mode) {
    if (mode === "demo") {
      if (modeBadge) modeBadge.textContent = "Demo";
      if (modeText) {
        modeText.textContent = "SupportGeniusAI demonstration • Demonstration — simulated answers, no automated actions";
      }
    } else if (mode === "support") {
      if (modeBadge) modeBadge.textContent = "Support";
      if (modeText) {
        modeText.textContent = "Document support — automated actions unavailable";
      }
    } else {
      if (modeBadge) modeBadge.textContent = "Unavailable";
      if (modeText) {
        modeText.textContent = "Configuration unavailable — automated actions unavailable";
      }
    }
  }

  /**
   * Helper deriving control readiness from sessionStatus.
   * Disabled buttons alone are NOT the submission guard; handlers also gate on sessionStatus.
   */
  function updateControlState() {
    const isReady = (sessionStatus === "ready");
    const isPending = (sessionStatus === "chatPending");
    const isResetting = (sessionStatus === "resetting");
    const isInit = (sessionStatus === "initializing" || sessionStatus === "uninitialized");
    const isRecovery = (sessionStatus === "needsRecovery");

    // Input Field
    inputField.disabled = !isReady;
    if (isInit) {
      inputField.placeholder = "Preparing conversation...";
    } else if (isResetting) {
      inputField.placeholder = "Starting new conversation...";
    } else if (isReady) {
      inputField.placeholder = "Ask a question or enter your query...";
    } else if (isRecovery) {
      inputField.placeholder = "Initialization failed. Please retry.";
    }

    // Send Button
    if (sendBtn) {
      sendBtn.disabled = !isReady;
    }

    // Reset Button: disabled during chatPending, resetting, or initializing.
    // Allowed when ready or needsRecovery (allows user to restart/recover).
    if (resetBtn) {
      resetBtn.disabled = isPending || isResetting || isInit;
      if (resetBtnText) {
        resetBtnText.textContent = isResetting ? "Starting conversation..." : "New conversation";
      }
    }

    // Suggestion Chips
    suggestionChips.forEach((chip) => {
      if (isReady) {
        chip.removeAttribute("disabled");
        chip.setAttribute("aria-disabled", "false");
        chip.classList.remove("chip-disabled");
      } else {
        chip.setAttribute("disabled", "true");
        chip.setAttribute("aria-disabled", "true");
        chip.classList.add("chip-disabled");
      }
    });

    // Rate Limit 429 Retry buttons
    const retry429Btns = document.querySelectorAll(".btn-retry-429");
    retry429Btns.forEach((btn) => {
      const isCountdownComplete = (btn.dataset.countdownComplete === "true");
      const isCurrentGeneration = (btn.dataset.generation === String(chatState.generation));
      const shouldBeEnabled = isReady && isCountdownComplete && isCurrentGeneration;

      btn.disabled = !shouldBeEnabled;
      btn.setAttribute("aria-disabled", String(!shouldBeEnabled));
    });

    // Retry initialization buttons
    const retryInitBtns = document.querySelectorAll(".btn-retry-init");
    retryInitBtns.forEach((btn) => {
      btn.disabled = isInit || isResetting || isPending;
    });
  }

  function showInitError(messageText) {
    removeInitError();
    const banner = document.createElement("div");
    banner.id = "init-error-banner";
    banner.className = "message ai-message error-message init-error-banner";

    const avatar = document.createElement("div");
    avatar.className = "avatar-mini";
    avatar.setAttribute("aria-hidden", "true");
    avatar.textContent = "SG";
    banner.appendChild(avatar);

    const bubble = document.createElement("div");
    bubble.className = "bubble";

    const msgP = document.createElement("p");
    msgP.textContent = `⚠️ Initialization Error: ${messageText}`;
    bubble.appendChild(msgP);

    const retryBtn = document.createElement("button");
    retryBtn.type = "button";
    retryBtn.className = "btn-retry-init";
    retryBtn.textContent = "Retry initialization";
    retryBtn.addEventListener("click", () => {
      if (sessionStatus === "chatPending" || sessionStatus === "resetting" || sessionStatus === "initializing" || isSessionOpInProgress) {
        return;
      }
      retryBtn.disabled = true;
      bootstrapSession();
    });
    bubble.appendChild(retryBtn);

    banner.appendChild(bubble);
    chatMessages.appendChild(banner);
    scrollTranscriptToBottom();
  }

  function removeInitError() {
    const banner = document.getElementById("init-error-banner");
    if (banner) banner.remove();
  }

  /**
   * Applies the one consistent successful rotation transition.
   * Invoked ONLY after a confirmed HTTP 204 from POST /session.
   * Clears old transcript, resets cost, stops old notices/timers, advances local generation,
   * renders mode welcome, and marks sessionStatus = 'ready'.
   * @param {string} mode
   */
  function applySuccessfulRotation(mode) {
    if (!isValidCapabilities(capabilities)) {
      capabilities = null;
      sessionStatus = "needsRecovery";
      updateModeDisclosure("unavailable");
      updateControlState();
      showInitError("Valid server capabilities required.");
      return;
    }

    isSessionOpInProgress = false;
    chatState = resetChatState(chatState);
    hasHistory = false;
    clearActiveRateLimitTimers();

    if (sessionCostEl) {
      sessionCostEl.textContent = "$0.0000";
    }

    removeLoading();
    removeInitError();

    const welcomeText = mode === "support"
      ? "Welcome to the <strong>SupportGenius Signal Desk</strong>. How can I assist you with our documented policies or services today?"
      : "Welcome to the <strong>SupportGenius Signal Desk</strong> demonstration. How can I assist you with our documented policies or services today?";

    chatMessages.innerHTML = `
      <div class="message ai-message">
        <div class="avatar-mini" aria-hidden="true">SG</div>
        <div class="bubble">
          <p>${welcomeText}</p>
        </div>
      </div>
    `;

    inputField.value = "";
    sessionStatus = "ready";
    consoleOrb?.setState("idle");
    window.__consoleOrbState = "idle";
    updateControlState();
    inputField.focus();
  }

  /**
   * Bootstraps or recovers conversation session with 15000ms deadline.
   */
  async function bootstrapSession() {
    if (sessionStatus === "chatPending" || isSessionOpInProgress) {
      return;
    }

    const opId = ++activeOpId;
    isSessionOpInProgress = true;
    sessionStatus = "initializing";
    updateControlState();

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, SESSION_OP_TIMEOUT_MS);

    try {
      // 1. Fetch server capabilities with deadline
      const capRes = await fetch("/capabilities", {
        signal: abortController.signal,
        credentials: "same-origin"
      });
      if (!capRes.ok) {
        throw new Error("Failed to load server capabilities");
      }
      let capData;
      try {
        capData = await capRes.json();
      } catch {
        throw new Error("Invalid capabilities response format");
      }

      if (!isValidCapabilities(capData)) {
        capabilities = null;
        throw new Error("Invalid or unsupported server capabilities");
      }

      if (opId !== activeOpId) return;

      capabilities = capData;
      updateModeDisclosure(capData.mode);

      // 2. Initialize anonymous server session with deadline
      const sessRes = await fetch("/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortController.signal,
        credentials: "same-origin"
      });
      if (sessRes.status !== 204) {
        throw new Error(`Failed to initialize session (status: ${sessRes.status})`);
      }

      if (opId !== activeOpId) return;

      // Apply consistent successful rotation
      applySuccessfulRotation(capData.mode);
    } catch (err) {
      capabilities = null;
      if (opId !== activeOpId) return;

      sessionStatus = "needsRecovery";
      updateModeDisclosure("unavailable");
      updateControlState();

      const isTimeout = abortController.signal.aborted;
      showInitError(isTimeout ? "Session initialization timed out. Please retry." : (err.message || "Failed to initialize conversation session."));
    } finally {
      clearTimeout(timeoutId);
      isSessionOpInProgress = false;
    }
  }

  /**
   * Rotates server session via POST /session with 15000ms deadline.
   */
  async function handleReset() {
    if (sessionStatus === "chatPending" || isSessionOpInProgress) {
      return;
    }

    // Close capability bypass: if capabilities are missing/invalid or session is in recovery,
    // New conversation MUST route through full validated bootstrap, never direct rotation!
    if (!isValidCapabilities(capabilities) || sessionStatus === "needsRecovery") {
      capabilities = null;
      return bootstrapSession();
    }

    if (hasHistory) {
      const confirmed = confirm("Start a new conversation? Current conversation history will be cleared.");
      if (!confirmed) return;
    }

    if (activeAbortController) {
      activeAbortController.abort();
      activeAbortController = null;
    }

    const opId = ++activeOpId;
    isSessionOpInProgress = true;
    sessionStatus = "resetting";
    updateControlState();

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, SESSION_OP_TIMEOUT_MS);

    try {
      const res = await fetch("/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortController.signal,
        credentials: "same-origin"
      });

      if (res.status === 204) {
        if (opId !== activeOpId) return;
        applySuccessfulRotation(capabilities.mode);
      } else {
        throw new Error(`Server failed to rotate session (status: ${res.status})`);
      }
    } catch (err) {
      capabilities = null;
      if (opId !== activeOpId) return;

      sessionStatus = "needsRecovery";
      updateControlState();

      appendMessage(
        "Failed to reset session. Previous messages remain displayed, but the server session could not be confirmed.",
        false,
        true
      );
      showInitError(
        abortController.signal.aborted
          ? "Session reset timed out. Please retry initialization."
          : "Server session could not be confirmed. Please retry initialization."
      );
    } finally {
      clearTimeout(timeoutId);
      isSessionOpInProgress = false;
    }
  }

  async function checkServerHealth() {
    const knowledgeStatusText = document.getElementById("knowledge-status-text");
    try {
      const res = await fetch("/health");
      if (res.ok) {
        if (statusText) statusText.textContent = "Server reachable";
        let data = null;
        try {
          data = await res.json();
        } catch {
          // Missing or malformed JSON
        }
        if (data && data.vectorStore && typeof data.vectorStore.isInitialized === "boolean") {
          if (data.vectorStore.isInitialized) {
            if (statusBeacon) statusBeacon.style.backgroundColor = "var(--accent-emerald, #85D6BD)";
            if (knowledgeStatusText) knowledgeStatusText.textContent = "Knowledge active";
          } else {
            if (statusBeacon) statusBeacon.style.backgroundColor = "var(--accent-amber, #F2C572)";
            if (knowledgeStatusText) knowledgeStatusText.textContent = "Knowledge unavailable";
          }
        } else {
          if (statusBeacon) statusBeacon.style.backgroundColor = "var(--accent-amber, #F2C572)";
          if (knowledgeStatusText) knowledgeStatusText.textContent = "Knowledge status unknown";
        }
      } else {
        if (statusBeacon) statusBeacon.style.backgroundColor = "var(--accent-amber, #F2C572)";
        if (statusText) statusText.textContent = "Server degraded";
        if (knowledgeStatusText) knowledgeStatusText.textContent = "Knowledge status unknown";
      }
    } catch {
      if (statusBeacon) statusBeacon.style.backgroundColor = "var(--destructive, #F2A6A6)";
      if (statusText) statusText.textContent = "Server unreachable";
      if (knowledgeStatusText) knowledgeStatusText.textContent = "Knowledge status unknown";
    }
  }

  function showLoading() {
    const msgDiv = document.createElement("div");
    msgDiv.className = "message ai-message loading";
    msgDiv.id = "loading-message";

    const avatar = document.createElement("div");
    avatar.className = "avatar-mini";
    avatar.setAttribute("aria-hidden", "true");
    avatar.textContent = "SG";
    msgDiv.appendChild(avatar);

    const bubbleDiv = document.createElement("div");
    bubbleDiv.className = "bubble loading-bubble";
    bubbleDiv.setAttribute("role", "status");
    bubbleDiv.setAttribute("aria-live", "polite");

    const textSpan = document.createElement("span");
    textSpan.className = "loading-status-text";
    textSpan.textContent = "Waiting for reply";
    bubbleDiv.appendChild(textSpan);

    const dotsDiv = document.createElement("div");
    dotsDiv.className = "loading-dots";
    dotsDiv.setAttribute("aria-hidden", "true");
    dotsDiv.innerHTML = '<div class="dot"></div><div class="dot"></div><div class="dot"></div>';
    bubbleDiv.appendChild(dotsDiv);

    msgDiv.appendChild(bubbleDiv);
    chatMessages.appendChild(msgDiv);

    scrollTranscriptToBottom();
    return msgDiv;
  }

  function removeLoading(loadingEl) {
    if (loadingEl && typeof loadingEl.remove === "function") {
      loadingEl.remove();
    } else {
      const loadingMsg = document.getElementById("loading-message");
      if (loadingMsg) loadingMsg.remove();
    }
  }

  function scrollTranscriptToBottom() {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    chatMessages.scrollTo({
      top: chatMessages.scrollHeight,
      behavior: prefersReducedMotion ? "auto" : "smooth"
    });
  }

  function appendMessage(text, isUser, isError = false) {
    const msgDiv = document.createElement("div");
    msgDiv.className = `message ${isUser ? "user-message" : "ai-message"}${isError ? " error-message" : ""}`;

    if (!isUser) {
      const avatar = document.createElement("div");
      avatar.className = "avatar-mini";
      avatar.setAttribute("aria-hidden", "true");
      avatar.textContent = "SG";
      msgDiv.appendChild(avatar);
    }

    const bubbleDiv = document.createElement("div");
    bubbleDiv.className = "bubble";

    if (isUser) {
      bubbleDiv.textContent = text;
    } else {
      if (typeof window.DOMPurify !== "undefined" && typeof window.marked !== "undefined") {
        try {
          const rawMarkup = window.marked.parse(text);
          const cleanMarkup = window.DOMPurify.sanitize(rawMarkup);
          bubbleDiv.innerHTML = cleanMarkup;
          attachCodeCopyButtons(bubbleDiv);
        } catch {
          bubbleDiv.textContent = text;
        }
      } else {
        bubbleDiv.textContent = text;
      }
    }

    msgDiv.appendChild(bubbleDiv);
    chatMessages.appendChild(msgDiv);

    scrollTranscriptToBottom();
    return msgDiv;
  }

  function attachCodeCopyButtons(container) {
    const codeBlocks = container.querySelectorAll("pre");
    codeBlocks.forEach((pre) => {
      if (pre.querySelector(".code-copy-btn")) return;

      const copyBtn = document.createElement("button");
      copyBtn.className = "code-copy-btn";
      copyBtn.type = "button";
      copyBtn.textContent = "Copy";
      copyBtn.addEventListener("click", () => {
        const code = pre.querySelector("code")?.textContent || pre.textContent;
        navigator.clipboard.writeText(code).then(() => {
          copyBtn.textContent = "Copied!";
          setTimeout(() => {
            copyBtn.textContent = "Copy";
          }, 2000);
        }).catch(() => {
          copyBtn.textContent = "Failed";
          setTimeout(() => {
            copyBtn.textContent = "Copy";
          }, 2000);
        });
      });

      const header = document.createElement("div");
      header.className = "code-header";
      header.appendChild(copyBtn);
      pre.insertBefore(header, pre.firstChild);
    });
  }

  function renderRateLimitNotice(retrySeconds, originalText) {
    const msgDiv = document.createElement("div");
    msgDiv.className = "message ai-message error-message";

    const avatar = document.createElement("div");
    avatar.className = "avatar-mini";
    avatar.setAttribute("aria-hidden", "true");
    avatar.textContent = "SG";
    msgDiv.appendChild(avatar);

    const bubbleDiv = document.createElement("div");
    bubbleDiv.className = "bubble rate-limit-bubble";

    const noticeP = document.createElement("p");
    noticeP.textContent = `Rate limit exceeded. Please wait ${retrySeconds} seconds before retrying.`;
    bubbleDiv.appendChild(noticeP);

    const retryBtn = document.createElement("button");
    retryBtn.className = "btn-retry-429";
    retryBtn.type = "button";
    retryBtn.disabled = true;
    retryBtn.setAttribute("aria-disabled", "true");
    retryBtn.dataset.countdownComplete = "false";
    retryBtn.dataset.generation = String(chatState.generation);
    retryBtn.textContent = `Retry in ${retrySeconds}s`;

    let remaining = retrySeconds;
    const interval = setInterval(() => {
      remaining--;
      if (remaining > 0) {
        retryBtn.textContent = `Retry in ${remaining}s`;
      } else {
        clearInterval(interval);
        activeRateLimitTimers.delete(interval);
        retryBtn.dataset.countdownComplete = "true";
        retryBtn.textContent = "Retry request";
        updateControlState();
      }
    }, 1000);
    activeRateLimitTimers.add(interval);

    retryBtn.addEventListener("click", () => {
      const isCountdownComplete = (retryBtn.dataset.countdownComplete === "true");
      const isCurrentGeneration = (retryBtn.dataset.generation === String(chatState.generation));
      if (sessionStatus !== "ready" || !isCountdownComplete || !isCurrentGeneration) return;
      retryBtn.remove();
      handleSend(originalText, true);
    });

    bubbleDiv.appendChild(retryBtn);
    msgDiv.appendChild(bubbleDiv);
    chatMessages.appendChild(msgDiv);
    scrollTranscriptToBottom();
  }

  async function handleSend(textOverride = null, isRetry = false) {
    if (sessionStatus !== "ready") {
      return;
    }

    const text = (textOverride !== null ? textOverride : inputField.value).trim();
    if (!text) return;

    const requestId = generateId("req_");
    const requestGeneration = chatState.generation;

    chatState = beginRequest(chatState, requestId);
    hasHistory = true;
    sessionStatus = "chatPending";
    updateControlState();

    consoleOrb?.setState("pending");
    window.__consoleOrbState = "pending";

    if (!isRetry) {
      appendMessage(text, true);
      inputField.value = "";
    }

    const reqLoadingElement = showLoading();

    const abortController = new AbortController();
    activeAbortController = abortController;
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch("/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ message: text }),
        signal: abortController.signal
      });

      if (!acceptsReply(chatState, { requestId, generation: requestGeneration })) {
        reqLoadingElement.remove();
        return;
      }

      if (res.status === 401) {
        reqLoadingElement.remove();
        sessionStatus = "needsRecovery";
        appendMessage("Session required or expired. Please start a new conversation.", false, true);
        showInitError("Session expired. Please restart the conversation.");
        updateControlState();
        return;
      }

      if (res.status === 409) {
        reqLoadingElement.remove();
        appendMessage("A reply is already being processed. Please wait.", false, true);
        return;
      }

      if (res.status === 429) {
        reqLoadingElement.remove();
        const retryHeader = res.headers.get("Retry-After");
        let retrySeconds = parseInt(retryHeader, 10);
        if (isNaN(retrySeconds) || retrySeconds <= 0) {
          retrySeconds = DEFAULT_RETRY_AFTER_SECONDS;
        }
        renderRateLimitNotice(retrySeconds, text);
        return;
      }

      if (res.status === 422) {
        let problem = {};
        try {
          problem = await res.json();
        } catch (jsonErr) {
          if (abortController.signal.aborted) {
            throw jsonErr;
          }
        }
        reqLoadingElement.remove();

        if (!acceptsReply(chatState, { requestId, generation: requestGeneration })) {
          return;
        }

        let errorMessage = problem.detail || problem.message || "Message validation failed.";
        if (Array.isArray(problem.invalidParams) && problem.invalidParams.length > 0) {
          const paramDetails = problem.invalidParams.map((p) => `${p.name}: ${p.reason}`).join("; ");
          errorMessage = `${errorMessage} (${paramDetails})`;
        }
        appendMessage(`⚠️ Validation Error: ${errorMessage}`, false, true);
        return;
      }

      if (!res.ok) {
        reqLoadingElement.remove();
        if (!acceptsReply(chatState, { requestId, generation: requestGeneration })) {
          return;
        }
        appendMessage(
          "No reply received. An action may have completed. Verify with the business before repeating your request.",
          false,
          true
        );
        return;
      }

      const data = await res.json();
      reqLoadingElement.remove();

      if (acceptsReply(chatState, { requestId, generation: requestGeneration })) {
        appendMessage(data.reply, false);
        if (data.cost !== undefined && sessionCostEl) {
          sessionCostEl.textContent = `$${data.cost}`;
        }
      }
    } catch (err) {
      reqLoadingElement.remove();

      if (!acceptsReply(chatState, { requestId, generation: requestGeneration })) {
        return;
      }

      appendMessage(
        "No reply received. An action may have completed. Verify with the business before repeating your request.",
        false,
        true
      );
    } finally {
      clearTimeout(timeoutId);

      if (activeAbortController === abortController) {
        activeAbortController = null;
      }

      reqLoadingElement.remove();

      if (acceptsReply(chatState, { requestId, generation: requestGeneration })) {
        chatState = completeRequest(chatState, { requestId, generation: requestGeneration });
        consoleOrb?.setState("idle");
        window.__consoleOrbState = "idle";

        // Only revert to ready if sessionStatus was still chatPending
        if (sessionStatus === "chatPending") {
          sessionStatus = "ready";
          updateControlState();
          inputField.focus();
        }
      }
    }
  }

  // Form submit listener
  if (chatForm) {
    chatForm.addEventListener("submit", (e) => {
      e.preventDefault();
      if (sessionStatus !== "ready") return;
      handleSend();
    });
  }

  // Keydown listener for Enter / Shift+Enter respecting IME
  inputField.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      if (e.isComposing || e.keyCode === 229) {
        return; // Respect IME composition
      }
      e.preventDefault();
      if (sessionStatus !== "ready") return;
      handleSend();
    }
  });

  // Wire suggestion chips
  suggestionChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      if (sessionStatus !== "ready") return;
      const text = chip.textContent.trim();
      if (!text) return;
      inputField.value = text;
      inputField.focus();
      handleSend();
    });
  });

  // Wire reset button
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      if (sessionStatus === "chatPending" || sessionStatus === "resetting" || sessionStatus === "initializing") {
        return;
      }
      handleReset();
    });
  }

  // Periodic health check
  checkServerHealth();
  const healthInterval = setInterval(checkServerHealth, 60000);

  // Initialize control states immediately
  updateControlState();

  // Bootstrap session and capabilities on page load
  bootstrapSession();

  if (typeof window !== "undefined") {
    window.__checkServerHealth = checkServerHealth;
    window.__bootstrapSession = bootstrapSession;
    window.__getSessionStatus = () => sessionStatus;
  }

  window.addEventListener("pagehide", () => {
    if (consoleOrb) {
      consoleOrb.destroy();
    }
    clearInterval(healthInterval);
    clearActiveRateLimitTimers();
  });
}

// Auto-initialize if DOM is ready, or on DOMContentLoaded
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initConsole);
} else {
  initConsole();
}
