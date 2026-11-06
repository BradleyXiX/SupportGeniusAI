// ==========================================================================
// SupportGeniusAI Console Controller (Signal Desk)
// Pure ES Module • Strict CSP Compliant • Safe Rendering
// ==========================================================================

let sessionId = getOrCreateSessionId();

function getOrCreateSessionId() {
  try {
    let id = sessionStorage.getItem("supportGeniusSessionId");
    if (!id) {
      if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        id = "sess_" + crypto.randomUUID().replace(/-/g, "").substring(0, 24);
      } else {
        id = "sess_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now().toString(36);
      }
      sessionStorage.setItem("supportGeniusSessionId", id);
    }
    return id;
  } catch {
    return "sess_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now().toString(36);
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
      resetSession();
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

  function resetSession() {
    try {
      sessionStorage.removeItem("supportGeniusSessionId");
    } catch {}
    sessionId = getOrCreateSessionId();

    if (sessionCostEl) {
      sessionCostEl.textContent = "$0.0000";
    }

    if (chatMessages) {
      chatMessages.innerHTML = `
        <div class="message ai-message">
          <div class="avatar-mini" aria-hidden="true">SG</div>
          <div class="bubble">
            <p>Welcome to the <strong>SupportGenius Signal Desk</strong> demonstration. How can I assist you with our documented policies or services today?</p>
          </div>
        </div>
      `;
    }

    inputField.value = "";
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

    chatMessages.scrollTo({
      top: chatMessages.scrollHeight,
      behavior: "smooth"
    });
  }

  function removeLoading() {
    const loadingMsg = document.getElementById("loading-message");
    if (loadingMsg) loadingMsg.remove();
  }

  function appendMessage(text, isUser) {
    const msgDiv = document.createElement("div");
    msgDiv.className = `message ${isUser ? "user-message" : "ai-message"}`;

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
      // User message is always plain text
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

    chatMessages.scrollTo({
      top: chatMessages.scrollHeight,
      behavior: "smooth"
    });
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

  async function handleSend() {
    const text = inputField.value.trim();
    if (!text) return;

    appendMessage(text, true);
    inputField.value = "";

    if (sendBtn) sendBtn.disabled = true;
    inputField.disabled = true;
    showLoading();

    try {
      const res = await fetch("/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, sessionId: sessionId })
      });

      if (!res.ok) {
        const problem = await res.json().catch(() => ({}));
        let errorMessage = problem.detail || problem.message || `Gateway returned status ${res.status}`;
        if (Array.isArray(problem.invalidParams) && problem.invalidParams.length > 0) {
          const paramDetails = problem.invalidParams.map((p) => `${p.name}: ${p.reason}`).join("; ");
          errorMessage = `${errorMessage} (${paramDetails})`;
        }
        throw new Error(errorMessage);
      }

      const data = await res.json();
      removeLoading();
      appendMessage(data.reply, false);

      if (data.cost !== undefined && sessionCostEl) {
        sessionCostEl.textContent = `$${data.cost}`;
      }
    } catch (err) {
      removeLoading();
      appendMessage(`⚠️ System Notice: ${err.message}`, false);
    } finally {
      if (sendBtn) sendBtn.disabled = false;
      inputField.disabled = false;
      inputField.focus();
    }
  }
}

// Auto-initialize if DOM is ready, or on DOMContentLoaded
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initConsole);
} else {
  initConsole();
}
