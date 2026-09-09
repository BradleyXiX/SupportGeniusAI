const chatMessages = document.getElementById("chat-messages");
const inputField = document.getElementById("input");
const sessionCostEl = document.getElementById("session-cost");

// Generate a random session ID or retrieve from sessionStorage
let sessionId = sessionStorage.getItem("supportGeniusSessionId");
if (!sessionId) {
  sessionId = "sess_" + Math.random().toString(36).substring(2, 15);
  sessionStorage.setItem("supportGeniusSessionId", sessionId);
}

function handleKeyPress(e) {
  if (e.key === "Enter") {
    send();
  }
}

function appendMessage(text, isUser) {
  const msgDiv = document.createElement("div");
  msgDiv.className = `message ${isUser ? "user-message" : "ai-message"}`;
  
  const bubbleDiv = document.createElement("div");
  bubbleDiv.className = "bubble";
  
  if (isUser) {
    bubbleDiv.innerText = text;
  } else {
    // Render markdown and sanitize
    const rawMarkup = marked.parse(text);
    const cleanMarkup = DOMPurify.sanitize(rawMarkup);
    bubbleDiv.innerHTML = cleanMarkup;
  }
  
  msgDiv.appendChild(bubbleDiv);
  chatMessages.appendChild(msgDiv);
  
  // Smooth scroll to bottom
  chatMessages.scrollTo({
    top: chatMessages.scrollHeight,
    behavior: 'smooth'
  });
}

function showLoading() {
  const msgDiv = document.createElement("div");
  msgDiv.className = "message ai-message loading";
  msgDiv.id = "loading-message";
  
  const bubbleDiv = document.createElement("div");
  bubbleDiv.className = "bubble loading-dots";
  bubbleDiv.innerHTML = '<div class="dot"></div><div class="dot"></div><div class="dot"></div>';
  
  msgDiv.appendChild(bubbleDiv);
  chatMessages.appendChild(msgDiv);
  
  chatMessages.scrollTo({
    top: chatMessages.scrollHeight,
    behavior: 'smooth'
  });
}

function removeLoading() {
  const loadingMsg = document.getElementById("loading-message");
  if (loadingMsg) loadingMsg.remove();
}

async function send() {
  const text = inputField.value.trim();
  if (!text) return;
  
  appendMessage(text, true);
  inputField.value = "";
  
  showLoading();
  
  try {
    // Note: since we now serve static files from Express, we can use relative path
    const res = await fetch("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, sessionId: sessionId })
    });
    
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      if (res.status === 429) {
        throw new Error(errData.reply || "Rate limit exceeded. Please wait.");
      }
      throw new Error("Server response not OK");
    }
    
    const data = await res.json();
    removeLoading();
    appendMessage(data.reply, false);
    
    // Update FinOps cost
    if (data.cost !== undefined) {
      sessionCostEl.innerText = `$${data.cost}`;
    }
    
  } catch (err) {
    console.error("Error communicating with server:", err);
    removeLoading();
    appendMessage(`**Error:** ${err.message}`, false);
  }
}