// ==========================================================================
// SupportGeniusAI Console Controller (Signal Desk)
// Pure ES Module • Strict CSP Compliant • Safe Rendering & Session State
// Governed by Task 2 / A2 Specifications
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

function getOrCreateSessionId() {
  try {
    let id = sessionStorage.getItem("supportGeniusSessionId");
    if (!id || id.length > 64) {
      id = generateId("sess_");
      sessionStorage.setItem("supportGeniusSessionId", id);
    }
    return id;
  } catch {
    return generateId("sess_");
  }
}

export function initConsole() {
  const chatMessages = document.getElementById("chat-messages");
  const inputField = document.getElementById("input");
  const sessionCostEl = document.getElementById("session-cost");
  const sendBtn = document.getElementById("send-btn");
  const resetBtn = document.getElementById("reset-btn");
  const chatForm = document.getElementById("chat-form");
  const statusBeacon = document.querySelector(".status-beacon");
  const statusText = document.getElementById("connection-status-text");

  if (!chatMessages || !inputField) return;

  let state = createChatState(getOrCreateSessionId());
  let hasHistory = false;
  let activeAbortController = null;

  // Mount console status orb
  const consoleOrbCanvas = document.getElementById("console-orb");
  const consoleOrb = consoleOrbCanvas ? mountOrb(consoleOrbCanvas, { state: "idle" }) : null;
  window.__consoleOrbState = "idle";

  // Auto-focus input on load
  inputField.focus();

  // Verify server reachability on page load
  checkServerHealth();
  const healthInterval = setInterval(checkServerHealth, 60000);

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

  async function checkServerHealth() {
    try {
      const res = await fetch("/health");
      if (res.ok) {
        if (statusBeacon) statusBeacon.style.backgroundColor = "var(--accent-emerald, #85D6BD)";
        if (statusText) statusText.textContent = "Server reachable";
      } else {
        if (statusBeacon) statusBeacon.style.backgroundColor = "var(--accent-amber, #F2C572)";
        if (statusText) statusText.textContent = "Server degraded";
      }
    } catch {
      if (statusBeacon) statusBeacon.style.backgroundColor = "var(--destructive, #F2A6A6)";
      if (statusText) statusText.textContent = "Server unreachable";
    }
  }

  function handleReset() {
    if (hasHistory) {
      const confirmed = confirm("Start a new conversation? Current conversation history will be cleared.");
      if (!confirmed) return;
    }

    if (activeAbortController) {
      activeAbortController.abort();
      activeAbortController = null;
    }

    const newSessionId = generateId("sess_");
    try {
      sessionStorage.setItem("supportGeniusSessionId", newSessionId);
    } catch {}

    state = resetChatState(state, newSessionId);
    hasHistory = false;
    consoleOrb?.setState("idle");
    window.__consoleOrbState = "idle";

    if (sessionCostEl) {
      sessionCostEl.textContent = "$0.0000";
    }

    removeLoading();
    chatMessages.innerHTML = `
      <div class="message ai-message">
        <div class="avatar-mini" aria-hidden="true">SG</div>
        <div class="bubble">
          <p>Welcome to the <strong>SupportGenius Signal Desk</strong> demonstration. How can I assist you with our documented policies or services today?</p>
        </div>
      </div>
    `;

    inputField.value = "";
    if (sendBtn) sendBtn.disabled = false;
    inputField.disabled = false;
    inputField.focus();
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
    bubbleDiv.className = "bubble loading-dots";
    bubbleDiv.innerHTML = '<div class="dot"></div><div class="dot"></div><div class="dot"></div>';

    msgDiv.appendChild(bubbleDiv);
    chatMessages.appendChild(msgDiv);

    scrollTranscriptToBottom();
  }

  function removeLoading() {
    const loadingMsg = document.getElementById("loading-message");
    if (loadingMsg) loadingMsg.remove();
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
      // User message is always literal text
      bubbleDiv.textContent = text;
    } else {
      // Markdown rendering with secure DOMPurify sanitization.
      // If DOMPurify is missing/blocked, fail safe to textContent (NEVER raw innerHTML).
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

    // Idempotency check: if already pending, prevent duplicate submissions
    if (state.pending !== null) {
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
    showLoading();

    activeAbortController = new AbortController();
    const timeoutId = setTimeout(() => {
      if (activeAbortController) {
        activeAbortController.abort();
      }
    }, REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch("/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, sessionId: state.sessionId }),
        signal: activeAbortController.signal
      });

      clearTimeout(timeoutId);

      // Check if this response is still accepted (session might have been reset)
      if (!acceptsReply(state, { requestId, generation: requestGeneration })) {
        removeLoading();
        return;
      }

      if (res.status === 429) {
        removeLoading();
        const retryHeader = res.headers.get("Retry-After");
        let retrySeconds = parseInt(retryHeader, 10);
        if (isNaN(retrySeconds) || retrySeconds <= 0) {
          retrySeconds = DEFAULT_RETRY_AFTER_SECONDS;
        }
        renderRateLimitNotice(retrySeconds, text);
        return;
      }

      if (res.status === 422) {
        removeLoading();
        const problem = await res.json().catch(() => ({}));
        let errorMessage = problem.detail || problem.message || "Message validation failed.";
        if (Array.isArray(problem.invalidParams) && problem.invalidParams.length > 0) {
          const paramDetails = problem.invalidParams.map((p) => `${p.name}: ${p.reason}`).join("; ");
          errorMessage = `${errorMessage} (${paramDetails})`;
        }
        appendMessage(`⚠️ Validation Error: ${errorMessage}`, false, true);
        return;
      }

      if (!res.ok) {
        removeLoading();
        // 5xx / gateway / upstream error: show approved honest uncertainty guidance with NO auto-retry
        appendMessage(
          "No reply received. An action may have completed. Verify with the business before repeating your request.",
          false,
          true
        );
        return;
      }

      const data = await res.json();
      removeLoading();

      if (acceptsReply(state, { requestId, generation: requestGeneration })) {
        appendMessage(data.reply, false);
        if (data.cost !== undefined && sessionCostEl) {
          sessionCostEl.textContent = `$${data.cost}`;
        }
      }
    } catch (err) {
      clearTimeout(timeoutId);

      if (!acceptsReply(state, { requestId, generation: requestGeneration })) {
        removeLoading();
        return;
      }

      removeLoading();
      // Network loss, timeout, or aborted fetch: approved uncertainty message with NO auto-retry
      appendMessage(
        "No reply received. An action may have completed. Verify with the business before repeating your request.",
        false,
        true
      );
    } finally {
      activeAbortController = null;
      consoleOrb?.setState("idle");
      window.__consoleOrbState = "idle";
      if (acceptsReply(state, { requestId, generation: requestGeneration })) {
        state = completeRequest(state, { requestId, generation: requestGeneration });
        if (sendBtn) sendBtn.disabled = false;
        inputField.disabled = false;
        inputField.focus();
      }
    }
  }
  window.addEventListener("unload", () => {
    if (consoleOrb) {
      consoleOrb.destroy();
    }
  });
}

// Auto-initialize if DOM is ready, or on DOMContentLoaded
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initConsole);
} else {
  initConsole();
}
