document.addEventListener("DOMContentLoaded", () => {
  UI.initTheme();
  UI.mountNavbar("play");
  if (!UI.mustAuth()) return;

  const chatBox = document.getElementById("chatBox");
  const userInput = document.getElementById("userInput");
  const sendBtn = document.getElementById("sendBtn");
  const gameArea = document.getElementById("gameArea");
  const reportArea = document.getElementById("reportArea");
  const roundIndicator = document.getElementById("roundIndicator");
  
  let history = [];
  let round = 1;
  const MAX_ROUNDS = 3;
  let fullTranscript = "";
  let currentInteractionId = 0;

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  function rebuildTranscript() {
    fullTranscript = history.map(h => `${h.role === 'user' ? 'Human' : 'Robot'}: ${h.text}\n\n`).join("");
  }

  function addMsg(role, text) {
    const div = document.createElement("div");
    div.className = `msg ${role}`;
    div.innerHTML = `<div class="msg-name">${role === 'user' ? 'You' : '🤖 Master AI'}</div><div style="white-space:pre-wrap;">${escapeHtml(text)}</div>`;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
    
    history.push({ role, text });
    rebuildTranscript();
  }

  async function handleSend() {
    const text = userInput.value.trim();
    if (!text) return;
    
    const thisInteraction = ++currentInteractionId;
    
    // Add user message with Edit button
    const div = document.createElement("div");
    div.className = `msg user`;
    div.innerHTML = `
      <div class="msg-name">You</div>
      <div style="white-space:pre-wrap;">${escapeHtml(text)}</div>
      <button class="btn btn-sm btn-ghost edit-btn" style="margin-top: 8px; font-size: 11px; padding: 4px 8px; color:var(--accent2); border-color:rgba(34,211,238,0.3);" id="edit-${thisInteraction}">✏️ Edit (5s)</button>
    `;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
    
    history.push({ role: "user", text, id: thisInteraction });
    rebuildTranscript();
    
    userInput.value = "";
    sendBtn.disabled = true;

    // Edit Timer Logic
    const btn = document.getElementById(`edit-${thisInteraction}`);
    let seconds = 5;
    const timer = setInterval(() => {
      seconds--;
      if (seconds <= 0) {
        clearInterval(timer);
        if (btn) btn.remove();
      } else {
        if (btn) btn.innerHTML = `✏️ Edit (${seconds}s)`;
      }
    }, 1000);

    btn.addEventListener("click", () => {
      clearInterval(timer);
      currentInteractionId++; // cancel AI
      div.remove();
      
      const loader = document.getElementById(`loader-${thisInteraction}`);
      if (loader) loader.remove();
      
      history = history.filter(h => h.id !== thisInteraction);
      rebuildTranscript();
      
      userInput.value = text;
      sendBtn.disabled = false;
      userInput.focus();
    });

    try {
      const loaderId = `loader-${thisInteraction}`;
      chatBox.insertAdjacentHTML("beforeend", `<div class="msg bot" id="${loaderId}"><em>Master AI is evaluating...</em></div>`);
      chatBox.scrollTop = chatBox.scrollHeight;

      // Clean history to remove 'id' for API
      const cleanHistory = history.slice(0, -1).map(h => ({ role: h.role, text: h.text }));

      const data = await API.request("/ai/bot", { 
        method: "POST", 
        body: { history: cleanHistory, userMessage: text },
        auth: true
      });
      
      const loader = document.getElementById(loaderId);
      if (loader) loader.remove();

      if (currentInteractionId !== thisInteraction) return; // User edited!
      
      if (btn) {
        clearInterval(timer);
        btn.remove();
      }
      
      addMsg("bot", data.reply);
      
      round++;
      if (round > MAX_ROUNDS) {
        endGame();
      } else {
        roundIndicator.textContent = `Round ${round} of ${MAX_ROUNDS}`;
        sendBtn.disabled = false;
        userInput.focus();
      }
    } catch (err) {
      if (currentInteractionId !== thisInteraction) return;
      const loader = document.getElementById(`loader-${thisInteraction}`);
      if (loader) loader.remove();

      UI.toast("Error", err.message);
      sendBtn.disabled = false;
    }
  }

  const micBtn = document.getElementById("micBtn");
  if (micBtn && (window.SpeechRecognition || window.webkitSpeechRecognition)) {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRec();
    recognition.continuous = false;
    recognition.interimResults = false;
    
    let isRecording = false;

    recognition.onstart = function() {
      isRecording = true;
      micBtn.style.background = "var(--danger)";
      micBtn.style.borderColor = "var(--danger)";
      userInput.placeholder = "Listening... Speak now";
    };

    recognition.onresult = function(event) {
      const transcript = event.results[0][0].transcript;
      userInput.value = userInput.value ? userInput.value + " " + transcript : transcript;
    };

    recognition.onerror = function(event) {
      console.error("Speech recognition error", event.error);
      UI.toast("Mic Error", "Could not recognize speech.");
    };

    recognition.onend = function() {
      isRecording = false;
      micBtn.style.background = "";
      micBtn.style.borderColor = "";
      userInput.placeholder = "Type your argument...";
      userInput.focus();
    };

    micBtn.addEventListener("click", () => {
      if (isRecording) {
        recognition.stop();
      } else {
        recognition.start();
      }
    });
  } else if (micBtn) {
    micBtn.style.display = "none";
    console.warn("Speech Recognition API not supported in this browser.");
  }

  sendBtn.addEventListener("click", handleSend);
  userInput.addEventListener("keypress", (e) => { if (e.key === "Enter") handleSend(); });

  async function endGame() {
    roundIndicator.textContent = "Debate Finished";
    roundIndicator.classList.replace("good", "accent2");
    userInput.disabled = true;
    sendBtn.style.display = "none";
    
    // Add judging loader
    const div = document.createElement("div");
    div.className = "msg bot";
    div.innerHTML = `<em>Evaluating performance and generating scorecard...</em>`;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;

    try {
      const data = await API.request("/ai/judge", { 
        method: "POST", 
        body: { transcript: fullTranscript, mode: "ai", opponent: "AI Robot" },
        auth: true
      });
      
      gameArea.style.display = "none";
      reportArea.style.display = "block";
      
      // Populate PDF data
      document.getElementById("pdfScore").textContent = `${data.score}/100`;
      document.getElementById("pdfFeedback").textContent = data.feedback;
      document.getElementById("pdfTranscript").innerText = fullTranscript;
      document.getElementById("pdfDate").textContent = new Date().toLocaleString();
      
    } catch (err) {
      UI.toast("Judging Error", err.message);
    }
  }

  document.getElementById("downloadPdfBtn").addEventListener("click", async () => {
    const element = document.getElementById("pdfContent");
    const opt = {
      margin:       0.5,
      filename:     'Debate_Scorecard.pdf',
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    
    if (typeof window.html2pdf === "undefined") {
      UI.toast("Info", "Loading PDF Library...");
      try {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      } catch (err) {
        return UI.toast("Error", "Failed to load PDF library.");
      }
    }
    
    window.html2pdf().set(opt).from(element).save().catch(err => {
      UI.toast("PDF Error", "Could not generate PDF.");
    });
  });
});
