document.addEventListener("DOMContentLoaded", async () => {
  UI.initTheme();
  UI.mountNavbar("tracking");
  if (!UI.mustAuth()) return;

  const trackingMount = document.getElementById("trackingMount");
  const historyMount = document.getElementById("historyMount");

  // Robust PDF loader
  function loadPdfLibrary() {
    return new Promise((resolve, reject) => {
      if (window.html2pdf) return resolve(window.html2pdf);
      
      // Check if script is already injected
      let script = document.getElementById('html2pdf-script');
      if (script) {
        script.addEventListener('load', () => resolve(window.html2pdf));
        script.addEventListener('error', () => reject(new Error("Failed to load PDF generator")));
        return;
      }

      script = document.createElement("script");
      script.id = 'html2pdf-script';
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
      script.onload = () => resolve(window.html2pdf);
      script.onerror = () => reject(new Error("Failed to load PDF generator"));
      document.head.appendChild(script);
    });
  }

  function renderTimeline(debate) {
    const isApproved = debate.approved;
    const submittedTime = new Date(debate.createdAt).getTime();
    const now = Date.now();
    const ageHours = (now - submittedTime) / (1000 * 60 * 60);

    // Determine stages
    let stage = 1; // Submitted
    if (ageHours > 0.1) stage = 2; // Transferred to Panel
    if (ageHours > 2 && !isApproved) stage = 3; // AI Verification
    if (isApproved) stage = 4; // Approved & Live

    return `
      <div class="card pad" style="animation: fadeInUp 0.4s ease-out forwards;">
        <div class="row">
          <div>
            <h3 style="margin:0 0 4px 0">${debate.title}</h3>
            <div class="muted2" style="font-size:12px;">Submitted ${UI.fmtDate(debate.createdAt)}</div>
          </div>
          <div class="spacer"></div>
          <span class="badge ${isApproved ? 'good' : 'warn'}">${isApproved ? 'Approved' : 'In Progress'}</span>
        </div>
        
        <div class="timeline">
          <div class="timeline-item ${stage >= 1 ? 'done' : ''} ${stage === 1 ? 'active' : ''}">
            <div class="timeline-content">
              <div class="timeline-title">Submitted</div>
              <div class="timeline-desc">Your debate has been securely received by the system.</div>
            </div>
          </div>
          
          <div class="timeline-item ${stage >= 2 ? 'done' : ''} ${stage === 2 ? 'active' : ''}">
            <div class="timeline-content">
              <div class="timeline-title">Transferred to Panel</div>
              <div class="timeline-desc">Assigned to our expert Moderator panel for manual review.</div>
            </div>
          </div>
          
          <div class="timeline-item ${stage >= 3 ? 'done' : ''} ${stage === 3 ? 'active' : ''}" style="${isApproved && stage < 3 ? 'display:none;' : ''}">
            <div class="timeline-content">
              <div class="timeline-title">AI Verification</div>
              <div class="timeline-desc">Our AI system is running a secondary check for academic integrity.</div>
            </div>
          </div>
          
          <div class="timeline-item ${stage >= 4 ? 'done' : ''} ${stage === 4 ? 'active' : ''}">
            <div class="timeline-content">
              <div class="timeline-title">Approved & Live</div>
              <div class="timeline-desc">Your debate is now live on the platform!</div>
              ${isApproved ? `<a href="/debate.html?id=${debate._id}" class="btn btn-sm btn-primary" style="margin-top:10px; display:inline-block;">View Debate</a>` : ''}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  async function downloadMatchPdf(match) {
    // 1. Create a full-screen solid overlay to hide the PDF container from the user
    const overlay = document.createElement("div");
    overlay.style = "position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: var(--bg0); z-index: 99999; display: flex; flex-direction: column; align-items: center; justify-content: center;";
    overlay.innerHTML = `<h2 style="margin-bottom:10px;">Generating Scorecard...</h2><p class="muted">Please wait a moment</p>`;
    document.body.appendChild(overlay);

    // 2. Create the actual PDF container and append it to the body (underneath the overlay)
    const container = document.createElement("div");
    container.style = "position: absolute; top: 0; left: 0; width: 800px; padding: 30px; background: white; color: black; z-index: 99990; font-family: 'Inter', sans-serif;";
    
    container.innerHTML = `
      <h1 style="color: #111; border-bottom: 2px solid #ccc; padding-bottom: 10px;">Academic Debate Scorecard</h1>
      <p><strong>Mode:</strong> ${match.mode === 'ai' ? 'Player vs AI Robot' : 'Live Student vs Student'}</p>
      <p><strong>Opponent:</strong> ${escapeHtml(match.opponent)}</p>
      <p><strong>Date:</strong> ${new Date(match.createdAt).toLocaleString()}</p>
      
      <div style="font-size: 48px; font-weight: 900; color: #7c3aed; text-align: center; margin: 20px 0;">${match.score}/100</div>
      
      <h3>Judge's Feedback:</h3>
      <p style="line-height: 1.6; text-align: left;">${escapeHtml(match.feedback)}</p>
      
      <h3 style="margin-top:30px;">Transcript:</h3>
      <div style="text-align: left; font-size: 14px; color: #444; white-space: pre-wrap;">${escapeHtml(match.transcript)}</div>
    `;

    document.body.appendChild(container);

    try {
      const pdfGen = await loadPdfLibrary();
      
      // WAIT FOR BROWSER TO PAINT DOM! This is the critical fix for the blank PDF issue.
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const opt = {
        margin:       0.5,
        filename:     `Scorecard_${match.opponent}_${match.score}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
      };
      
      await pdfGen().set(opt).from(container).save();
    } catch (err) {
      UI.toast("Error", "PDF generator could not be loaded.");
    } finally {
      if(document.body.contains(container)) document.body.removeChild(container);
      if(document.body.contains(overlay)) document.body.removeChild(overlay);
    }
  }

  function showMatchDetails(match) {
    const overlay = document.createElement("div");
    overlay.style = "position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.8); z-index: 99999; display: flex; align-items: center; justify-content: center; padding: 20px;";
    
    const modal = document.createElement("div");
    modal.style = "background: var(--bg0); border: 1px solid var(--border); border-radius: 16px; padding: 30px; max-width: 800px; width: 100%; max-height: 90vh; overflow-y: auto; position: relative;";
    
    modal.innerHTML = `
      <button class="btn btn-sm btn-ghost" style="position: absolute; top: 20px; right: 20px; font-size: 16px;" id="closeModal">✕</button>
      <h2 style="margin-top: 0;">Match Scorecard</h2>
      <div style="margin-bottom: 20px;" class="muted">vs ${escapeHtml(match.opponent)} • ${new Date(match.createdAt).toLocaleString()}</div>
      
      <div style="font-size: 48px; font-weight: 900; color: #7c3aed; text-align: center; margin: 20px 0;">${match.score}/100</div>
      
      <h3 style="margin-bottom: 10px;">Judge's Feedback</h3>
      <div style="line-height: 1.6; color: var(--fg1); margin-bottom: 24px;">${escapeHtml(match.feedback)}</div>
      
      <h3 style="margin-bottom: 10px;">Full Transcript</h3>
      <div style="background: var(--bg1); padding: 15px; border-radius: 8px; font-size: 14px; white-space: pre-wrap; color: var(--fg2); line-height: 1.5;">${escapeHtml(match.transcript)}</div>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    const close = () => {
      if(document.body.contains(overlay)) document.body.removeChild(overlay);
    };
    
    overlay.addEventListener("click", (e) => {
      if(e.target === overlay) close();
    });
    modal.querySelector("#closeModal").addEventListener("click", close);
  }

  try {
    const data = await API.request("/debates/tracking", { auth: true });
    const debates = data.debates || [];
    
    trackingMount.innerHTML = "";
    if (debates.length === 0) {
      trackingMount.innerHTML = `
        <div class="card pad" style="text-align:center;">
          <h3 class="muted">No debates submitted yet.</h3>
          <p class="muted2">Create a debate from the Home page to track its progress here.</p>
        </div>`;
    } else {
      debates.forEach(d => {
        trackingMount.insertAdjacentHTML("beforeend", renderTimeline(d));
      });
    }

    try {
      const histData = await API.request("/ai/history", { auth: true });
      const matches = histData.matches || [];
      document.getElementById("historyCount").textContent = matches.length;

      if (matches.length === 0) {
        historyMount.innerHTML = `<div class="muted" style="text-align:center; padding: 20px;">No matches played yet. Head over to the Play Arena!</div>`;
      } else {
        historyMount.innerHTML = "";
        matches.forEach(m => {
          const div = document.createElement("div");
          div.className = "row";
          div.style = "padding: 16px; border: 1px solid var(--border); border-radius: 12px; background: var(--bg0);";
          
          const icon = m.mode === "ai" ? "🤖" : "👤";
          const date = new Date(m.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
          const scoreColor = m.score >= 80 ? "var(--good)" : (m.score >= 50 ? "var(--warn)" : "var(--danger)");

          div.innerHTML = `
            <div style="font-size: 24px; margin-right: 16px;">${icon}</div>
            <div style="flex-grow: 1; cursor: pointer;" class="view-details-area">
              <div style="font-weight: bold; font-size: 16px;">vs ${escapeHtml(m.opponent)}</div>
              <div class="muted" style="font-size: 13px;">${date} • Score: <span style="color: ${scoreColor}; font-weight: bold;">${m.score}/100</span></div>
            </div>
            <button class="btn btn-sm btn-ghost view-btn" style="margin-right: 8px;">View Details</button>
            <button class="btn btn-sm btn-secondary dl-pdf-btn">Download PDF</button>
          `;

          div.querySelector(".dl-pdf-btn").addEventListener("click", (e) => {
            e.stopPropagation();
            downloadMatchPdf(m);
          });
          div.querySelector(".view-btn").addEventListener("click", (e) => {
            e.stopPropagation();
            showMatchDetails(m);
          });
          div.querySelector(".view-details-area").addEventListener("click", () => {
            showMatchDetails(m);
          });

          historyMount.appendChild(div);
        });
      }
    } catch (err) {
      console.error(err);
      historyMount.innerHTML = `<div class="muted">Failed to load history.</div>`;
    }
  } catch (err) {
    trackingMount.innerHTML = `<div class="muted">Failed to load tracking data: ${err.message}</div>`;
  }
});
