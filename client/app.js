// ==========================================================================
// SupportGeniusAI Console Controller (Signal Desk)
// Pure ES Module • Strict CSP Compliant • Safe Rendering & Session State
// Governed by Task 2 / A2 & B5 Specifications
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
const DEFAULT_RETRY_AFTER_SECONDS = 60;

function generateId(prefix = "id_") {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return prefix + crypto.randomUUID().replace(/-/g, "").substring(0, 24);
  }
  return prefix + Math.random().toString(36).substring(2, 11) + "_" + Date.now().toString(36);
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

  if (!chatMessages || !inputField) return;

  let state = createChatState();
  let isSessionInitialized = false;
  let isResetPending = false;
  let hasHistory = false;
  let activeAbortController = null;
  let capabilities = null;

  // Mount console status orb
  const consoleOrbCanvas = document.getElementById("console-orb");
  const consoleOrb = consoleOrbCanvas ? mountOrb(consoleOrbCanvas, { state: "idle" }) : null;
  window.__consoleOrbState = "idle";

  // Form submit listener
  if (chatForm) {
    chatForm.addEventListener("submit", (e) => {
      e.preventDefault();
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
      handleSend();
    }
  });

  // Wire suggestion chips
  const suggestionChips = document.querySelectorAll("[data-suggestion], .suggestion-chip");
  suggestionChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      if (!isSessionInitialized || state.pending !== null) return;
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
      handleReset();
    });
  }

  // Verify server reachability on page load
  checkServerHealth();
  const healthInterval = setInterval(checkServerHealth, 60000);

  // Bootstrap session and capabilities on page load
  bootstrapSession();

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

  async function bootstrapSession() {
    inputField.disabled = true;
    inputField.placeholder = "Preparing conversation...";
    if (sendBtn) sendBtn.disabled = true;
    if (resetBtn) resetBtn.disabled = true;
    removeInitError();

    try {
      // 1. Fetch server capabilities
      const capRes = await fetch("/capabilities", { credentials: "same-origin" });
      if (!capRes.ok) {
        throw new Error("Failed to load server capabilities");
      }
      let capData;
      try {
        capData = await capRes.json();
      } catch {
        throw new Error("Invalid capabilities response format");
      }
      if (!capData || (capData.mode !== "support" && capData.mode !== "demo")) {
        throw new Error("Invalid or unsupported server mode");
      }
      capabilities = capData;
      updateModeDisclosure(capData.mode);

      // 2. Initialize anonymous server session
      const sessRes = await fetch("/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin"
      });
      if (sessRes.status !== 204) {
        throw new Error(`Failed to initialize session (status: ${sessRes.status})`);
      }

      isSessionInitialized = true;
      inputField.disabled = false;
      inputField.placeholder = "Ask a question or enter your query...";
      if (sendBtn) sendBtn.disabled = false;
      if (resetBtn) resetBtn.disabled = false;
      inputField.focus();
    } catch (err) {
      isSessionInitialized = false;
      inputField.disabled = true;
      inputField.placeholder = "Initialization failed";
      if (sendBtn) sendBtn.disabled = true;
      if (resetBtn) resetBtn.disabled = true;
      if (modeBadge) modeBadge.textContent = "Unavailable";
      if (modeText) {
        modeText.textContent = "Configuration unavailable — automated actions unavailable";
      }
      showInitError(err.message || "Failed to initialize conversation session.");
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

  if (typeof window !== "undefined") {
    window.__checkServerHealth = checkServerHealth;
    window.__bootstrapSession = bootstrapSession;
  }

  async function handleReset() {
    if (isResetPending || state.pending !== null) {
      return; // Disabled while chat is pending or reset is already in progress
    }

    if (hasHistory) {
      const confirmed = confirm("Start a new conversation? Current conversation history will be cleared.");
      if (!confirmed) return;
    }

    if (activeAbortController) {
      activeAbortController.abort();
      activeAbortController = null;
    }

    isResetPending = true;
    if (resetBtn) {
      resetBtn.disabled = true;
      if (resetBtnText) resetBtnText.textContent = "Starting conversation...";
    }
    if (sendBtn) sendBtn.disabled = true;
    inputField.disabled = true;

    try {
      const res = await fetch("/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin"
      });

      if (res.status === 204) {
        state = resetChatState(state);
        hasHistory = false;
        isSessionInitialized = true;
        consoleOrb?.setState("idle");
        window.__consoleOrbState = "idle";

        if (sessionCostEl) {
          sessionCostEl.textContent = "$0.0000";
        }

        removeLoading();
        removeInitError();
        chatMessages.innerHTML = `
          <div class="message ai-message">
            <div class="avatar-mini" aria-hidden="true">SG</div>
            <div class="bubble">
              <p>Welcome to the <strong>SupportGenius Signal Desk</strong> demonstration. How can I assist you with our documented policies or services today?</p>
            </div>
          </div>
        `;

        inputField.value = "";
      } else {
        appendMessage("Failed to reset session. Your previous conversation history was retained.", false, true);
        showInitError("Server failed to rotate session. Please retry.");
      }
    } catch (err) {
      appendMessage("Failed to connect to server to reset session. Your previous conversation history was retained.", false, true);
      showInitError("Network error while rotating session. Please retry.");
    } finally {
      isResetPending = false;
      if (resetBtn) {
        resetBtn.disabled = false;
        if (resetBtnText) resetBtnText.textContent = "New conversation";
      }
      if (isSessionInitialized) {
        if (sendBtn) sendBtn.disabled = false;
        inputField.disabled = false;
        inputField.focus();
      }
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
    retryBtn.textContent = `Retry in ${retrySeconds}s`;

    let remaining = retrySeconds;
    const interval = setInterval(() => {
      remaining--;
      if (remaining > 0) {
        retryBtn.textContent = `Retry in ${remaining}s`;
      } else {
        clearInterval(interval);
        retryBtn.disabled = false;
        retryBtn.textContent = "Retry request";
      }
    }, 1000);

    retryBtn.addEventListener("click", () => {
      retryBtn.remove();
      handleSend(originalText, true);
    });

    bubbleDiv.appendChild(retryBtn);
    msgDiv.appendChild(bubbleDiv);
    chatMessages.appendChild(msgDiv);
    scrollTranscriptToBottom();
  }

  async function handleSend(textOverride = null, isRetry = false) {
    const text = (textOverride !== null ? textOverride : inputField.value).trim();
    if (!text) return;

    // Idempotency & session gate: if not initialized or already pending, block submission
    if (!isSessionInitialized || state.pending !== null) {
      return;
    }

    const requestId = generateId("req_");
    const requestGeneration = state.generation;

    state = beginRequest(state, requestId);
    hasHistory = true;
    consoleOrb?.setState("pending");
    window.__consoleOrbState = "pending";

    // Only append user message if not a retry of an already displayed turn
    if (!isRetry) {
      appendMessage(text, true);
      inputField.value = "";
    }

    if (sendBtn) sendBtn.disabled = true;
    inputField.disabled = true;
    if (resetBtn) resetBtn.disabled = true; // New conversation is disabled while chat is pending
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

      // Check if this response is still accepted (session might have been reset)
      if (!acceptsReply(state, { requestId, generation: requestGeneration })) {
        reqLoadingElement.remove();
        return;
      }

      if (res.status === 401) {
        // Session expired or required: require explicit session restart
        isSessionInitialized = false;
        reqLoadingElement.remove();
        appendMessage("Session required or expired. Please start a new conversation.", false, true);
        if (sendBtn) sendBtn.disabled = true;
        inputField.disabled = true;
        inputField.placeholder = "Session expired. Start a new conversation.";
        if (resetBtn) resetBtn.disabled = false;
        return;
      }

      if (res.status === 409) {
        // Single-flight contention: do not retry automatically
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

        if (!acceptsReply(state, { requestId, generation: requestGeneration })) {
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
        if (!acceptsReply(state, { requestId, generation: requestGeneration })) {
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

      if (acceptsReply(state, { requestId, generation: requestGeneration })) {
        appendMessage(data.reply, false);
        if (data.cost !== undefined && sessionCostEl) {
          sessionCostEl.textContent = `$${data.cost}`;
        }
      }
    } catch (err) {
      reqLoadingElement.remove();

      if (!acceptsReply(state, { requestId, generation: requestGeneration })) {
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

      // Re-enable reset button once chat request settles
      if (resetBtn) {
        resetBtn.disabled = false;
      }

      if (acceptsReply(state, { requestId, generation: requestGeneration })) {
        consoleOrb?.setState("idle");
        window.__consoleOrbState = "idle";
        state = completeRequest(state, { requestId, generation: requestGeneration });
        if (isSessionInitialized) {
          if (sendBtn) sendBtn.disabled = false;
          inputField.disabled = false;
          inputField.focus();
        }
      }
    }
  }

  window.addEventListener("unload", () => {
    if (consoleOrb) {
      consoleOrb.destroy();
    }
    clearInterval(healthInterval);
  });
}

// Auto-initialize if DOM is ready, or on DOMContentLoaded
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initConsole);
} else {
  initConsole();
}
