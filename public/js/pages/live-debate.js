document.addEventListener("DOMContentLoaded", () => {
  UI.initTheme();
  UI.mountNavbar("play");
  if (!UI.mustAuth()) return;

  const chatBox = document.getElementById("chatBox");
  const userInput = document.getElementById("userInput");
  const sendBtn = document.getElementById("sendBtn");
  const gameArea = document.getElementById("gameArea");
  const loadingMatch = document.getElementById("loadingMatch");
  const reportArea = document.getElementById("reportArea");
  const roundIndicator = document.getElementById("roundIndicator");
  const endDebateBtn = document.getElementById("endDebateBtn");
  
  let fullTranscript = "";
  let myRoomId = null;
  const myName = API.state.user?.name || "Student";
  let opponentName = "Opponent";

  // Connect to Socket
  const socket = io();

  const role = API.state.user?.role || "user";
  if (role === "admin" || role === "moderator") {
    document.getElementById("adminEndWrapper").style.display = "block";
  }

  let totalMessages = 0;
  const MAX_MESSAGES = 6; // 3 turns each

  // Start matchmaking
  socket.emit("findMatch", { name: myName });

  socket.on("matchFound", (data) => {
    myRoomId = data.roomId;
    opponentName = (data.p1.name === myName ? data.p2.name : data.p1.name) || "Opponent";
    
    loadingMatch.style.display = "none";
    gameArea.style.display = "block";
    roundIndicator.textContent = `Live Match`;
    roundIndicator.classList.replace("warn", "good");

    addMsg("system", `Match found! You are debating against ${opponentName}. The AI will automatically end the debate after ${MAX_MESSAGES} messages.`);
  });

  socket.on("newLiveMessage", (data) => {
    const isMe = data.sender === myName;
    addMsg(isMe ? "me" : "opponent", data.text, data.sender);
    
    totalMessages++;
    if (totalMessages >= MAX_MESSAGES) {
      addMsg("system", "The AI has decided this debate has reached its conclusion. Fetching results...");
      triggerJudging();
    }
  });

  function addMsg(type, text, senderName = "") {
    const div = document.createElement("div");
    div.className = `msg ${type}`;
    
    if (type === "system") {
      div.innerText = text;
    } else {
      div.innerHTML = `<div class="msg-name">${senderName}</div>${text}`;
      fullTranscript += `${senderName}: ${text}\n\n`;
    }
    
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  function handleSend() {
    const text = userInput.value.trim();
    if (!text || !myRoomId || totalMessages >= MAX_MESSAGES) return;
    
    socket.emit("liveMessage", { roomId: myRoomId, text, sender: myName });
    userInput.value = "";
    userInput.focus();
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
  }

  sendBtn.addEventListener("click", handleSend);
  userInput.addEventListener("keypress", (e) => { if (e.key === "Enter") handleSend(); });

  async function triggerJudging() {
    roundIndicator.textContent = "Judging...";
    userInput.disabled = true;
    sendBtn.style.display = "none";
    endDebateBtn.style.display = "none";
    
    try {
      const data = await API.request("/ai/judge", { 
        method: "POST", 
        body: { transcript: fullTranscript, mode: "live", opponent: opponentName },
        auth: true
      });
      
      gameArea.style.display = "none";
      reportArea.style.display = "block";
      
      document.getElementById("pdfScore").textContent = `${data.score}/100`;
      document.getElementById("pdfFeedback").textContent = data.feedback;
      document.getElementById("pdfTranscript").innerText = fullTranscript || "No arguments were made.";
      document.getElementById("pdfDate").textContent = new Date().toLocaleString();
      
    } catch (err) {
      UI.toast("Judging Error", err.message);
    }
  }

  endDebateBtn.addEventListener("click", () => {
    socket.emit("endLiveMatch", myRoomId);
    addMsg("system", "You ended the debate. Requesting AI Master Judge evaluation...");
    triggerJudging();
  });

  socket.on("matchEndedByOpponent", () => {
    addMsg("system", "Opponent has ended the debate. Fetching final AI results...");
    triggerJudging();
  });

  document.getElementById("downloadPdfBtn").addEventListener("click", async () => {
    const element = document.getElementById("pdfContent");
    const opt = {
      margin:       0.5,
      filename:     'Live_Debate_Scorecard.pdf',
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
