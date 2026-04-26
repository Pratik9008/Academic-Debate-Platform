const AIWidget = (() => {
  let isOpen = false;
  let isThinking = false;
  let history = [];

  function init() {
    // Inject HTML
    const widgetHTML = `
      <div id="ai-widget-container" class="ai-widget-container">
        <button id="ai-widget-fab" class="ai-widget-fab" title="Ask AI">
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path><path d="M9 10h.01"></path><path d="M15 10h.01"></path><path d="M12 10h.01"></path></svg>
        </button>
        
        <div id="ai-chat-window" class="ai-chat-window">
          <div class="ai-chat-header">
            <div class="ai-header-info">
              <div class="ai-avatar"></div>
              <div>
                <strong id="ai-widget-title">Debate AI</strong>
                <span class="ai-status">Online</span>
              </div>
            </div>
            <button id="ai-close-btn" class="ai-close-btn">&times;</button>
          </div>
          
          <div id="ai-chat-body" class="ai-chat-body">
            <div class="ai-message bot">
              <div class="ai-bubble" id="ai-welcome-msg">Hello! I am your Academic Debate AI. How can I help you today?</div>
            </div>
          </div>
          
          <div class="ai-chips-container" id="ai-chips-container">
            <button class="ai-chip">What is a round?</button>
            <button class="ai-chip">How do I gain reputation?</button>
            <button class="ai-chip">Rules of debate</button>
          </div>
          
          <div class="ai-chat-input-area">
            <input type="text" id="ai-chat-input" placeholder="Ask something..." autocomplete="off"/>
            <button id="ai-send-btn">
              <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", widgetHTML);

    // Event Listeners
    document.getElementById("ai-widget-fab").addEventListener("click", toggleChat);
    document.getElementById("ai-close-btn").addEventListener("click", toggleChat);
    
    document.getElementById("ai-send-btn").addEventListener("click", sendMessage);
    document.getElementById("ai-chat-input").addEventListener("keypress", (e) => {
      if (e.key === "Enter") sendMessage();
    });

    const role = API.state.user?.role || "guest";
    if (role === "admin" || role === "moderator") {
      document.getElementById("ai-widget-title").textContent = "Admin Consultant";
      document.getElementById("ai-welcome-msg").textContent = "Hello! I am your Platform Growth Consultant. I can analyze platform stats and give you actionable advice.";
      
      const chipsContainer = document.getElementById("ai-chips-container");
      chipsContainer.innerHTML = `
        <button class="ai-chip">Analyze platform growth</button>
        <button class="ai-chip">How to increase engagement?</button>
        <button class="ai-chip">Moderation strategies</button>
      `;
    }

    document.querySelectorAll(".ai-chip").forEach(chip => {
      chip.addEventListener("click", () => {
        document.getElementById("ai-chat-input").value = chip.textContent;
        sendMessage();
      });
    });
  }

  function toggleChat() {
    isOpen = !isOpen;
    const win = document.getElementById("ai-chat-window");
    if (isOpen) {
      win.classList.add("open");
      document.getElementById("ai-chat-input").focus();
    } else {
      win.classList.remove("open");
    }
  }

  function addMessage(text, sender) {
    const body = document.getElementById("ai-chat-body");
    
    let formattedText = text;
    if (window.marked && window.DOMPurify) {
      formattedText = DOMPurify.sanitize(marked.parse(text));
    }

    const msgHTML = `
      <div class="ai-message ${sender}">
        <div class="ai-bubble markdown-body" style="font-size:13px">${formattedText}</div>
      </div>
    `;
    body.insertAdjacentHTML("beforeend", msgHTML);
    body.scrollTop = body.scrollHeight;
  }

  function showTyping() {
    const body = document.getElementById("ai-chat-body");
    const msgHTML = `
      <div class="ai-message bot" id="ai-typing">
        <div class="ai-bubble typing-indicator">
          <span></span><span></span><span></span>
        </div>
      </div>
    `;
    body.insertAdjacentHTML("beforeend", msgHTML);
    body.scrollTop = body.scrollHeight;
  }

  function hideTyping() {
    const typing = document.getElementById("ai-typing");
    if (typing) typing.remove();
  }

  async function sendMessage() {
    if (isThinking) return;
    const input = document.getElementById("ai-chat-input");
    const text = input.value.trim();
    if (!text) return;

    input.value = "";
    addMessage(text, "user");

    isThinking = true;
    showTyping();

    try {
      // Build context from history
      history.push({ role: "user", parts: [{ text }] });
      
      const reqBody = { message: text };
      const data = await API.request("/ai/chat", { method: "POST", body: reqBody });
      
      hideTyping();
      if (data.reply) {
        addMessage(data.reply, "bot");
        history.push({ role: "model", parts: [{ text: data.reply }] });
      } else {
        addMessage("Sorry, I didn't get a response.", "bot");
      }
    } catch (err) {
      hideTyping();
      addMessage(`Error: ${err.message}`, "bot");
    } finally {
      isThinking = false;
    }
  }

  // Auto-init when loaded
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  return { toggleChat };
})();
