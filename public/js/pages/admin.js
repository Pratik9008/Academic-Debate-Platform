// Replaced by completely new logic
document.addEventListener("DOMContentLoaded", async () => {
  UI.initTheme();
  if (!UI.mustAuth()) return;

  const role = API.state.user?.role || "user";
  if (!(role === "moderator" || role === "admin")) {
    UI.toast("Forbidden", "Admin access required.");
    location.href = "/index.html";
    return;
  }

  const nameDisplay = document.getElementById("adminNameDisplay");
  if (nameDisplay && API.state.user?.name) {
    nameDisplay.textContent = API.state.user.name + " (Admin)";
  }

  // Tab switching logic
  document.querySelectorAll(".sidebar-link[data-tab]").forEach(link => {
    link.addEventListener("click", (e) => {
      document.querySelectorAll(".sidebar-link").forEach(l => l.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(t => t.classList.remove("active"));
      
      e.currentTarget.classList.add("active");
      document.getElementById(e.currentTarget.dataset.tab).classList.add("active");
    });
  });

  function escapeHtml(s) {
    return String(s || "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  }

  // 1. Dashboard Stats
  async function loadDashboardStats() {
    try {
      const data = await API.request("/ai/stats", { auth: true });
      document.getElementById("totalUsersStat").textContent = data.totalUsers;
      document.getElementById("totalDebatesStat").textContent = data.totalDebates;
      document.getElementById("pendingStat").textContent = data.pendingDebates;
      document.getElementById("aiMatchesStat").textContent = data.aiMatches;
      document.getElementById("liveMatchesStat").textContent = data.liveMatches;
      
      if (data.growth) {
        // Reverse because backend returns [currentMonth, lastMonth, ...]
        initChart(data.growth.labels.reverse(), data.growth.data.reverse());
      }
    } catch (err) {
      console.error("Failed to load dashboard stats", err);
    }
  }

  // 2. Load Users Table
  async function loadUsers() {
    const tbody = document.getElementById("usersTableBody");
    try {
      const data = await API.request("/admin/users", { auth: true });
      const users = data.users || [];
      tbody.innerHTML = "";
      if (users.length === 0) return tbody.innerHTML = `<tr><td colspan="5" class="muted" style="text-align:center;">No users found!</td></tr>`;
      
      users.forEach(u => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td style="font-weight:600;">${escapeHtml(u.name)}</td>
          <td class="muted">${escapeHtml(u.email)}</td>
          <td>${u.reputation}</td>
          <td>${u.banned ? '<span class="badge" style="background:var(--warn);color:#000;">Banned</span>' : '<span class="badge" style="background:var(--good);color:#000;">Active</span>'}</td>
          <td>
            <button class="btn btn-sm btn-${u.banned ? 'good unban-btn' : 'danger ban-btn'}" data-id="${u._id}">
              ${u.banned ? 'Unban' : 'Ban'}
            </button>
          </td>
        `;
        tbody.appendChild(tr);
      });

      // Bind Ban/Unban
      document.querySelectorAll(".ban-btn, .unban-btn").forEach(btn => {
        btn.addEventListener("click", async (e) => {
          const id = e.target.dataset.id;
          const isBan = e.target.classList.contains("ban-btn");
          try {
            await API.request("/users/ban", { method: "POST", body: { userId: id, banned: isBan }, auth: true });
            UI.toast(isBan ? "User Banned" : "User Unbanned", "");
            loadUsers(); // Refresh
          } catch (err) {
            UI.toast("Action Failed", err.message);
          }
        });
      });
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="5" class="muted" style="text-align:center;">Error loading users.</td></tr>`;
    }
  }

  // 3. Load All Debates
  async function loadAllDebates() {
    const tbody = document.getElementById("debatesTableBody");
    try {
      const data = await API.request("/admin/debates", { auth: true });
      const debates = data.debates || [];
      tbody.innerHTML = "";
      if (debates.length === 0) return tbody.innerHTML = `<tr><td colspan="5" class="muted" style="text-align:center;">No debates found!</td></tr>`;
      
      debates.forEach(d => {
        const tr = document.createElement("tr");
        const statusBadge = d.approved ? '<span class="badge" style="background:var(--good);color:#000;">Approved</span>' : '<span class="badge" style="background:var(--warn);color:#000;">Pending</span>';
        
        tr.innerHTML = `
          <td style="font-weight:600;">${escapeHtml(d.title)}</td>
          <td><span class="badge">${escapeHtml(d.category)}</span></td>
          <td class="muted">${escapeHtml(d.createdBy?.name || "Unknown")}</td>
          <td>${statusBadge}</td>
          <td>
            <a class="btn btn-sm btn-ghost" href="/debate.html?id=${d._id}" target="_blank">View</a>
            ${!d.approved ? `<button class="btn btn-sm btn-good approve-btn" style="margin: 0 4px;" data-id="${d._id}">Approve</button>` : ''}
            <button class="btn btn-sm btn-danger delete-btn" style="margin-left: ${d.approved ? '4px' : '0'};" data-id="${d._id}">${!d.approved ? 'Reject' : 'Delete'}</button>
          </td>
        `;
        tbody.appendChild(tr);
      });

      document.querySelectorAll(".approve-btn").forEach(btn => {
        btn.addEventListener("click", async (e) => {
          try {
            await API.request(`/debates/${e.target.dataset.id}/approve`, { method: "POST", auth: true });
            UI.toast("Approved", "Debate is now live.");
            loadAllDebates();
            loadDashboardStats();
          } catch (err) {
            UI.toast("Failed", err.message);
          }
        });
      });

      document.querySelectorAll(".delete-btn").forEach(btn => {
        btn.addEventListener("click", async (e) => {
          if (!confirm("Are you sure you want to remove this debate?")) return;
          try {
            await API.request(`/debates/${e.target.dataset.id}`, { method: "DELETE", auth: true });
            UI.toast("Removed", "Debate has been deleted.");
            loadAllDebates();
            loadDashboardStats();
          } catch (err) {
            UI.toast("Failed", err.message);
          }
        });
      });
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="5" class="muted" style="text-align:center;">Error loading debates.</td></tr>`;
    }
  }

  // Demo Generator
  const generateDemoBtn = document.getElementById("generateDemoBtn");
  if (generateDemoBtn) {
    generateDemoBtn.addEventListener("click", async () => {
      generateDemoBtn.disabled = true;
      generateDemoBtn.textContent = "Generating 3 Debates...";
      try {
        const res = await API.request("/admin/demo-debate", { method: "POST", auth: true });
        UI.toast("Success", res.message);
        loadAllDebates();
      } catch (err) {
        UI.toast("Error", err.message);
      }
      generateDemoBtn.textContent = "🚀 Generate Demo Schedule";
      generateDemoBtn.disabled = false;
    });
  }

  const refreshDebates = document.getElementById("refreshDebates");
  if (refreshDebates) refreshDebates.addEventListener("click", loadAllDebates);

  // 4. Load Matches History
  function showMatchDetails(match) {
    const overlay = document.createElement("div");
    overlay.style = "position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.8); z-index: 99999; display: flex; align-items: center; justify-content: center; padding: 20px;";
    
    const modal = document.createElement("div");
    modal.style = "background: var(--bg0); border: 1px solid var(--border); border-radius: 16px; padding: 30px; max-width: 800px; width: 100%; max-height: 90vh; overflow-y: auto; position: relative;";
    
    modal.innerHTML = `
      <button class="btn btn-sm btn-ghost" style="position: absolute; top: 20px; right: 20px; font-size: 16px;" id="closeModal">✕</button>
      <h2 style="margin-top: 0;">Match Scorecard</h2>
      <div style="margin-bottom: 20px;" class="muted">
        <strong>Student:</strong> ${escapeHtml(match.userId?.name || "Unknown")} <br/>
        <strong>Opponent:</strong> vs ${escapeHtml(match.opponent)} <br/>
        <strong>Date:</strong> ${new Date(match.createdAt).toLocaleString()}
      </div>
      
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

  async function loadMatches() {
    const tbody = document.getElementById("matchesTableBody");
    try {
      const data = await API.request("/admin/matches", { auth: true });
      const matches = data.matches || [];
      tbody.innerHTML = "";
      if (matches.length === 0) return tbody.innerHTML = `<tr><td colspan="6" class="muted" style="text-align:center;">No matches found!</td></tr>`;
      
      matches.forEach(m => {
        const tr = document.createElement("tr");
        tr.style.cursor = "pointer";
        tr.title = "Click to view full scorecard and transcript";
        tr.classList.add("admin-row-hover");
        tr.innerHTML = `
          <td style="font-weight:600;">${escapeHtml(m.userId?.name || "Unknown")}</td>
          <td class="muted">${escapeHtml(m.opponent)}</td>
          <td>${m.mode === 'ai' ? '🤖 AI' : '👤 Live'}</td>
          <td style="color:${m.score >= 70 ? 'var(--good)' : (m.score >= 40 ? 'var(--warn)' : 'var(--danger)')}">
            ${m.score}/100
          </td>
          <td class="muted">${UI.fmtDate(m.createdAt)}</td>
          <td>
            <button class="btn btn-sm btn-danger delete-match-btn" data-id="${m._id}">Delete</button>
          </td>
        `;
        tr.addEventListener("click", () => showMatchDetails(m));
        
        const deleteBtn = tr.querySelector('.delete-match-btn');
        deleteBtn.addEventListener("click", async (e) => {
          e.stopPropagation(); // prevent opening details
          if (!confirm("Are you sure you want to permanently delete this match result?")) return;
          try {
            await API.request(`/admin/matches/${m._id}`, { method: "DELETE", auth: true });
            UI.toast("Deleted", "Match record removed");
            loadMatches();
            loadDashboardStats();
          } catch (err) {
            UI.toast("Error", err.message);
          }
        });
        
        tbody.appendChild(tr);
      });
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="6" class="muted" style="text-align:center;">Error loading matches.</td></tr>`;
    }
  }

  // Chart setup
  let myChart = null;
  function initChart(labels, dataArr) {
    const ctx = document.getElementById("growthChart")?.getContext("2d");
    if (!ctx) return;
    
    if (myChart) myChart.destroy();
    
    myChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels || ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [{
          label: 'Platform Activity (Matches)',
          data: dataArr || [0, 0, 0, 0, 0, 0],
          borderColor: '#7c3aed',
          tension: 0.4, fill: true, backgroundColor: 'rgba(124, 58, 237, 0.1)'
        }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }

  // Initial Load
  loadDashboardStats();
  loadUsers();
  loadAllDebates();
  loadMatches();
  loadDashboardStats(); // This will call initChart with real data
});
