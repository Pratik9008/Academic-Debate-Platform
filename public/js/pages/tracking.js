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
  async function downloadMatchPdf(match) {
    const userName = API.state.user?.name || "Student";
    const overlay = document.createElement("div");
    overlay.style = "position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: #000; z-index: 200000; display: flex; flex-direction: column; align-items: center; justify-content: center; color: white;";
    overlay.innerHTML = `<div class="spinner"></div><h2 style="margin-top:20px;">Preparing Scorecard...</h2><p>Please wait while we optimize the PDF</p>`;
    document.body.appendChild(overlay);

    const hiddenWrapper = document.createElement("div");
    // Absolute position at the top of the document for clean capture
    hiddenWrapper.style = "position: absolute; top: 0; left: 0; width: 1200px; height: 1000px; opacity: 1; pointer-events: none; z-index: -1000; overflow: hidden; background: white;";
    
    const container = document.createElement("div");
    // Mirroring Certificate style exactly: 1100px width with 50px internal padding
    container.style = "width: 1100px; padding: 50px; background: white; color: #1a1a1a; font-family: sans-serif; box-sizing: border-box;"; 
    container.innerHTML = `
      <div style="width: 1000px; margin: 0 auto; padding: 40px; border: 3px solid #7c3aed; border-radius: 15px; background: white; box-sizing: border-box;">
        <h1 style="color: #7c3aed; margin: 0 0 25px 0; text-align: center; font-size: 36px;">Official Debate Scorecard</h1>
        <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 30px; font-size: 18px;">
          <div style="font-weight: 600;">Student: <span style="font-weight: 400;">${userName}</span></div>
          <div style="font-weight: 600;">Opponent: <span style="font-weight: 400;">${escapeHtml(match.opponent)}</span></div>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <div style="font-size: 14px; color: #64748b; text-transform: uppercase; letter-spacing: 3px; margin-bottom: 10px;">Performance Score</div>
          <div style="font-size: 84px; font-weight: 800; color: #7c3aed; line-height: 1;">${match.score}<span style="font-size: 24px; color: #94a3b8; font-weight: 400;">/100</span></div>
        </div>
        <div style="background: #fdfaff; border-left: 6px solid #7c3aed; padding: 25px; margin-bottom: 35px; border-radius: 0 10px 10px 0;">
          <h3 style="color: #7c3aed; margin: 0 0 10px 0; font-size: 20px;">Judge Feedback</h3>
          <p style="font-style: italic; line-height: 1.8; color: #334155; margin: 0; font-size: 16px;">"${escapeHtml(match.feedback)}"</p>
        </div>
        <h3 style="color: #475569; margin: 0 0 10px 0; font-size: 18px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">Debate Transcript</h3>
        <div style="font-size: 14px; white-space: pre-wrap; background: #f8fafc; padding: 25px; border-radius: 10px; border: 1px solid #e2e8f0; color: #1e293b; line-height: 1.6;">${escapeHtml(match.transcript)}</div>
      </div>
    `;
    hiddenWrapper.appendChild(container);
    document.body.appendChild(hiddenWrapper);

    try {
      const html2pdf = await loadPdfLibrary();
      await new Promise(r => setTimeout(r, 2000));
      
      await html2pdf().set({
        margin: 0,
        filename: `Scorecard_${match.score}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true, 
          logging: false, 
          scrollY: 0, 
          scrollX: 0,
          windowWidth: 1200
        },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'landscape' }
      }).from(container).save();
      
      UI.toast("Success", "Scorecard downloaded!");
    } catch (e) {
      UI.toast("Error", "Generation failed");
    } finally {
      document.body.removeChild(container);
      document.body.removeChild(overlay);
    }
  }

  window.downloadCertificate = async function(debateId, title, score) {
    const userName = API.state.user?.name || "Student";
    const dateStr = new Date().toLocaleDateString();

    const overlay = document.createElement("div");
    // Solid black background so the background capture is 100% hidden
    overlay.style = "position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: #000; z-index: 200000; display: flex; flex-direction: column; align-items: center; justify-content: center; color: white;";
    overlay.innerHTML = `<div class="spinner"></div><h2 style="margin-top:20px;">Preparing Certificate...</h2>`;
    document.body.appendChild(overlay);

    const hiddenWrapper = document.createElement("div");
    hiddenWrapper.style = "position: absolute; top: 0; left: 0; width: 1200px; height: 1000px; opacity: 1; pointer-events: none; z-index: -1000; overflow: hidden; background: white;";

    const container = document.createElement("div");
    container.style = "width: 1100px; padding: 50px; background: white; box-sizing: border-box;"; // 50px gutter
    container.innerHTML = `
      <div id="certContainer_${debateId}" style="width: 1000px; height: 650px; background: #ffffff; padding: 30px; box-sizing: border-box; font-family: serif; color: #1a1a1a; border: 10px double #b08d57;">
        <div style="width: 100%; height: 100%; box-sizing: border-box; padding: 30px; text-align: center; background: #fffcf5; border: 1px solid #b08d57;">
          <div style="font-size: 18px; color: #b08d57; letter-spacing: 4px; text-transform: uppercase;">Official Academic Recognition</div>
          <h1 style="font-size: 55px; margin: 5px 0; font-family: 'Georgia', serif;">Certificate of Excellence</h1>
          <div style="width: 200px; height: 2px; background: #b08d57; margin: 15px auto;"></div>
          <p style="font-size: 18px; font-style: italic; margin: 10px 0;">This proudly certifies that</p>
          <h2 style="font-size: 44px; font-weight: bold; margin: 5px 0; color: #7c3aed;">${userName}</h2>
          <p style="font-size: 16px; color: #444; max-width: 800px; margin: 15px auto; line-height: 1.4;">
            Has demonstrated exceptional analytical rigor and academic integrity in the tournament:
          </p>
          <h3 style="font-size: 24px; font-weight: bold; margin: 5px 0;">"${title}"</h3>
          <div style="margin: 20px 0;">
            <span style="font-size: 22px; font-weight: bold; color: #b08d57; border: 2px solid #b08d57; padding: 8px 25px;">SCORE: ${score} / 100</span>
          </div>
          <div style="margin-top: 30px; display: flex; justify-content: space-around; align-items: flex-end;">
            <div style="text-align: center; width: 250px;"><div style="border-bottom: 1px solid #000; margin-bottom: 5px;"></div><div style="font-size: 14px; font-weight: bold;">AI Master Judge</div></div>
            <div style="width: 80px; height: 80px; border-radius: 50%; border: 3px double #b08d57; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; color: #b08d57;">OFFICIAL SEAL</div>
            <div style="text-align: center; width: 250px;"><div style="border-bottom: 1px solid #000; margin-bottom: 5px;"></div><div style="font-size: 14px; font-weight: bold;">Date: ${dateStr}</div></div>
          </div>
        </div>
      </div>
    `;
    hiddenWrapper.appendChild(container);
    document.body.appendChild(hiddenWrapper);

    try {
      const html2pdf = await loadPdfLibrary();
      await new Promise(r => setTimeout(r, 2000));
      
      await html2pdf().set({
        margin: 0,
        filename: `Certificate_${userName.replace(/\s+/g, '_')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true, 
          logging: false,
          x: 0,
          y: 0,
          scrollY: 0,
          scrollX: 0,
          windowWidth: 1200 
        },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'landscape' },
        pagebreak: { mode: 'avoid-all' }
      }).from(container).save();
      
      UI.toast("Success", "Certificate downloaded!");
    } catch (err) {
      UI.toast("Error", "Failed: " + err.message);
    } finally {
      document.body.removeChild(hiddenWrapper);
      document.body.removeChild(overlay);
    }
  };  function renderTimeline(debate) {
    const isApproved = debate.approved;
    const userId = API.state.user ? String(API.state.user._id || API.state.user.id) : null;
    const isCreator = userId && debate.createdBy && (String(debate.createdBy) === userId || String(debate.createdBy._id) === userId);
    const submittedTime = new Date(debate.createdAt).getTime();
    const now = Date.now();
    const ageHours = (now - submittedTime) / (1000 * 60 * 60);

    if (!isCreator) {
      // Participation Timeline
      const isCompleted = debate.status === 'completed';
      let myRankStr = "";
      let myRanking = null;
      if (isCompleted && debate.rankings) {
        myRanking = debate.rankings.find(r => 
          String(r.user) === userId || 
          (r.user && String(r.user._id) === userId)
        );
        if (myRanking) myRankStr = `You ranked #${myRanking.rank} with ${myRanking.score} points.`;
      }

      return `
        <div class="card pad" style="animation: fadeInUp 0.4s ease-out forwards; border: 1px solid rgba(124, 58, 237, 0.2);">
          <div class="row">
            <div>
              <h3 style="margin:0 0 4px 0">${debate.title}</h3>
              <div class="muted2" style="font-size:12px;">Active Tournament Participation</div>
            </div>
            <div class="spacer"></div>
            <span class="badge ${isCompleted ? 'good' : 'accent1'}">${isCompleted ? 'Completed' : 'Live Round'}</span>
          </div>
          
          <div class="timeline">
            <div class="timeline-item done active">
              <div class="timeline-content">
                <div class="timeline-title">Participated</div>
                <div class="timeline-desc">You successfully submitted your argument to this tournament.</div>
              </div>
            </div>
            <div class="timeline-item ${isCompleted ? 'done active' : ''}">
              <div class="timeline-content">
                <div class="timeline-title">Graded by AI Master Judge</div>
                <div class="timeline-desc">${isCompleted ? (myRankStr || 'The AI has ranked all participants.') : (debate.endTime ? 'Waiting for AI evaluation at ' + new Date(debate.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Waiting for the round to end for AI evaluation.')}</div>
                <div style="margin-top:10px; display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                  <a href="/debate.html?id=${debate._id}" class="btn btn-sm btn-primary">View Debate</a>
                  ${isCompleted && myRanking && myRanking.rank === 1 ? `<button class="btn btn-sm" style="background: linear-gradient(135deg, #fbbf24, #f59e0b); color: #000; border: none; font-weight: bold; height: 32px;" onclick="window.downloadCertificate('${debate._id}', '${debate.title.replace(/'/g, "\\'")}', ${myRanking.score})">Download Certificate 🏆</button>` : ''}
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    // Original Approval Timeline (for Creator)
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

  async function loadData() {
    try {
      // Parallel fetch for both endpoints
      const [trackRes, historyRes] = await Promise.allSettled([
        API.request(`/debates/tracking?t=${Date.now()}`, { auth: true }),
        API.request("/ai/history", { auth: true })
      ]);

      // 1. Handle Debates Tracking
      trackingMount.innerHTML = "";
      if (trackRes.status === "fulfilled") {
        const debates = trackRes.value.debates || [];
        if (debates.length === 0) {
          trackingMount.innerHTML = `
            <div style="text-align:center; padding: 40px 20px;">
              <div style="font-size: 40px; margin-bottom: 16px;">🔍</div>
              <h3 class="muted" style="margin-bottom: 8px;">No debates found.</h3>
              <p class="muted2" style="font-size: 14px;">Try participating in a debate first!</p>
              <a href="/all-debates.html" class="btn btn-sm btn-primary" style="margin-top: 16px; display: inline-block;">View All Debates</a>
            </div>`;
        } else {
          debates.forEach(d => {
            trackingMount.insertAdjacentHTML("beforeend", renderTimeline(d));
          });
        }
      } else {
        trackingMount.innerHTML = `<div class="muted" style="padding:20px; text-align:center;">Failed to load tracking data.</div>`;
      }

      // 2. Handle Match History
      historyMount.innerHTML = "";
      if (historyRes.status === "fulfilled") {
        const matches = historyRes.value.matches || [];
        document.getElementById("historyCount").textContent = matches.length;

        if (matches.length === 0) {
          historyMount.innerHTML = `<div class="muted" style="text-align:center; padding: 20px;">No matches played yet.</div>`;
        } else {
          matches.forEach(m => {
            const div = document.createElement("div");
            div.className = "row";
            div.style = "padding: 16px; border: 1px solid var(--border); border-radius: 12px; background: var(--bg0);";
            const icon = m.mode === "ai" ? "🤖" : "👤";
            const date = new Date(m.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            const scoreColor = m.score >= 80 ? "var(--good)" : (m.score >= 50 ? "var(--warn)" : "var(--danger)");
            
            div.innerHTML = `
              <div style="font-size: 24px; margin-right: 16px;">${icon}</div>
              <div style="flex-grow: 1; cursor: pointer;" class="details-trigger">
                <div style="font-weight: bold; font-size: 16px;">vs ${escapeHtml(m.opponent)}</div>
                <div class="muted" style="font-size: 13px;">${date} • Score: <span style="color: ${scoreColor}; font-weight: bold;">${m.score}/100</span></div>
              </div>
              <button class="btn btn-sm btn-ghost details-btn">Details</button>
            `;

            div.querySelector(".details-trigger").onclick = () => showMatchDetails(m);
            div.querySelector(".details-btn").onclick = () => showMatchDetails(m);

            historyMount.appendChild(div);
          });
        }
      } else {
        historyMount.innerHTML = `<div class="muted" style="padding:20px; text-align:center;">Failed to load match history.</div>`;
      }

    } catch (err) {
      console.error(err);
      UI.toast("Error", "Something went wrong while loading data.");
    }
  }

  // Global helpers for onclick
  window.showMatchDetails = showMatchDetails;
  window.downloadMatchPdf = downloadMatchPdf;

  await loadData();
});
