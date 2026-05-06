const chatMessages = document.getElementById("chat-messages");
const inputField = document.getElementById("input");

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
  bubbleDiv.innerText = text; // Prevent XSS by using innerText
  
  msgDiv.appendChild(bubbleDiv);
  chatMessages.appendChild(msgDiv);
  
  // Scroll to bottom
  chatMessages.scrollTop = chatMessages.scrollHeight;
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
  chatMessages.scrollTop = chatMessages.scrollHeight;
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
    const res = await fetch("http://localhost:3000/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text })
    });
    
    if (!res.ok) throw new Error("Server response not OK");
    const data = await res.json();
    removeLoading();
    appendMessage(data.reply, false);
  } catch (err) {
    console.error("Error communicating with server:", err);
    removeLoading();
    appendMessage("Sorry, I encountered an error connecting to the backend server. Is it running?", false);
  }
}