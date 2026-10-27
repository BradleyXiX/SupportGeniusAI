// ==========================================================================
// SupportGeniusAI Client Controller
// ==========================================================================

const chatMessages = document.getElementById("chat-messages");
const inputField = document.getElementById("input");
const sessionCostEl = document.getElementById("session-cost");
const sendBtn = document.getElementById("send-btn");

// Initialize or retrieve existing session identifier
let sessionId = getOrCreateSessionId();

function getOrCreateSessionId() {
  let id = sessionStorage.getItem("supportGeniusSessionId");
  if (!id) {
    id = "sess_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now().toString(36);
    sessionStorage.setItem("supportGeniusSessionId", id);
  }
  return id;
}

// Auto-focus input and verify gateway health on page load
window.addEventListener("DOMContentLoaded", () => {
  if (inputField) inputField.focus();
  checkGatewayHealth();
  setInterval(checkGatewayHealth, 60000);
});

async function checkGatewayHealth() {
  const statusBeacon = document.querySelector(".status-beacon");
  const statusText = document.querySelector(".chat-header .status span:last-child");
  try {
    const res = await fetch("/health");
    if (res.ok) {
      if (statusBeacon) statusBeacon.style.backgroundColor = "var(--accent-emerald)";
      if (statusText) statusText.innerHTML = "Online &bull; Enterprise Gateway";
    } else {
      if (statusBeacon) statusBeacon.style.backgroundColor = "var(--accent-amber)";
      if (statusText) statusText.innerHTML = "Degraded &bull; Enterprise Gateway";
    }
  } catch {
    if (statusBeacon) statusBeacon.style.backgroundColor = "#ef4444";
    if (statusText) statusText.innerHTML = "Offline &bull; Enterprise Gateway";
  }
}

function handleKeyPress(e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    send();
  }
}

function handleSuggestion(buttonEl) {
  const query = buttonEl.innerText.replace(/^[^\w\s]+\s*/, "").trim();
  if (!query) return;
  inputField.value = query;
  inputField.focus();
  send();
}

function resetChat() {
  if (confirm("Reset current support session? This clears chat history and starts a new session.")) {
    sessionStorage.removeItem("supportGeniusSessionId");
    sessionId = getOrCreateSessionId();
    sessionCostEl.innerText = "$0.0000";

    // Reset chat messages to default welcome
    chatMessages.innerHTML = `
      <div class="message ai-message">
        <div class="avatar-mini" aria-hidden="true">SG</div>
        <div class="bubble">
          <p>Hello! I am <strong>SupportGenius Copilot</strong>. I have instant access to our enterprise knowledge base and order management system.</p>
          <p>How can I assist you today?</p>
        </div>
      </div>
    `;
    inputField.value = "";
    inputField.focus();
  }
}

function appendMessage(text, isUser) {
  const msgDiv = document.createElement("div");
  msgDiv.className = `message ${isUser ? "user-message" : "ai-message"}`;

  if (!isUser) {
    const avatar = document.createElement("div");
    avatar.className = "avatar-mini";
    avatar.setAttribute("aria-hidden", "true");
    avatar.innerText = "SG";
    msgDiv.appendChild(avatar);
  }

  const bubbleDiv = document.createElement("div");
  bubbleDiv.className = "bubble";

  if (isUser) {
    bubbleDiv.innerText = text;
  } else {
    // Markdown rendering with secure DOMPurify sanitization
    const rawMarkup = typeof marked !== "undefined" ? marked.parse(text) : text;
    const cleanMarkup = typeof DOMPurify !== "undefined" ? DOMPurify.sanitize(rawMarkup) : rawMarkup;
    bubbleDiv.innerHTML = cleanMarkup;

    // Attach copy buttons to pre/code blocks
    attachCodeCopyButtons(bubbleDiv);
  }

  msgDiv.appendChild(bubbleDiv);
  chatMessages.appendChild(msgDiv);

  // Smooth scroll to bottom
  chatMessages.scrollTo({
    top: chatMessages.scrollHeight,
    behavior: "smooth"
  });
}

function attachCodeCopyButtons(container) {
  const codeBlocks = container.querySelectorAll("pre");
  codeBlocks.forEach((pre) => {
    // Avoid duplicate copy buttons
    if (pre.querySelector(".code-copy-btn")) return;

    const copyBtn = document.createElement("button");
    copyBtn.className = "code-copy-btn";
    copyBtn.type = "button";
    copyBtn.innerText = "Copy";
    copyBtn.addEventListener("click", () => {
      const code = pre.querySelector("code")?.innerText || pre.innerText;
      navigator.clipboard.writeText(code).then(() => {
        copyBtn.innerText = "Copied!";
        setTimeout(() => {
          copyBtn.innerText = "Copy";
        }, 2000);
      });
    });

    const header = document.createElement("div");
    header.className = "code-header";
    header.appendChild(copyBtn);
    pre.insertBefore(header, pre.firstChild);
  });
}

function showLoading() {
  const msgDiv = document.createElement("div");
  msgDiv.className = "message ai-message loading";
  msgDiv.id = "loading-message";

  const avatar = document.createElement("div");
  avatar.className = "avatar-mini";
  avatar.setAttribute("aria-hidden", "true");
  avatar.innerText = "SG";
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

async function send() {
  const text = inputField.value.trim();
  if (!text) return;

  // Append user message immediately
  appendMessage(text, true);
  inputField.value = "";
  
  // Set UI state to busy
  sendBtn.disabled = true;
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

    // Update FinOps telemetry
    if (data.cost !== undefined) {
      sessionCostEl.innerText = `$${data.cost}`;
    }

  } catch (err) {
    console.error("Error communicating with gateway:", err);
    removeLoading();
    appendMessage(`⚠️ **System Notice**: ${err.message}`, false);
  } finally {
    sendBtn.disabled = false;
    inputField.disabled = false;
    inputField.focus();
  }
}