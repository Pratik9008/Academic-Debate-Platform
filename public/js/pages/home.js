document.addEventListener("DOMContentLoaded", async () => {
  UI.initTheme();
  UI.mountNavbar("home");
  if (!UI.mustAuth()) return;

  const liveMount = document.getElementById("liveMount");
  const upcomingMount = document.getElementById("upcomingMount");
  const completedMount = document.getElementById("completedMount");
  const endedMount = document.getElementById("endedMount");
  const leaderboardMount = document.getElementById("leaderboardMount");
  const searchInput = document.getElementById("searchInput");
  const createBtn = document.getElementById("createDebateBtn");

  const role = API.state.user?.role || "guest";
  if (role === "admin" || role === "moderator") {
    const heroActions = document.querySelector(".hero-actions");
    if (heroActions) {
      heroActions.innerHTML = `
        <a class="btn btn-primary" href="/admin.html">View Activity on Admin Portal ➡️</a>
        <div class="kbd">Manage users, view AI/Live matches, and approve debates</div>
      `;
    }
  }

  function debateCard(d) {
    let timeStatus = "";
    if (d.status === "active" && d.endTime) {
      timeStatus = `<div class="badge danger">Closes at ${new Date(d.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>`;
    } else if (d.status === "upcoming" && d.startTime) {
      timeStatus = `<div class="badge warn">Starts at ${new Date(d.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>`;
    } else if (d.status === "completed") {
      let myRank = null;
      if (d.rankings && API.state.user) {
        const myRanking = d.rankings.find(r => 
          String(r.user) === String(API.state.user._id) || 
          (r.user && String(r.user._id) === String(API.state.user._id))
        );
        if (myRanking) myRank = myRanking.rank;
      }

      if (myRank) {
        timeStatus = `<div class="badge good">Completed (Rank #${myRank})</div>`;
      } else {
        timeStatus = `<div class="badge" style="background:var(--bg2);color:var(--muted);">Ended</div>`;
      }
    }

    return UI.el(`
      <a class="card pad hover" href="/debate.html?id=${d._id}">
        <div class="row" style="align-items:flex-start">
          <div class="tag"><i></i> ${d.category}</div>
          <div class="spacer"></div>
          ${timeStatus}
        </div>
        <div style="margin-top:10px">
          <div class="card-title" style="font-size:16px">${escapeHtml(d.title)}</div>
          <div class="muted" style="font-size:13px;line-height:1.5;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden">
            ${escapeHtml(d.description)}
          </div>
        </div>
        <div class="row" style="margin-top:12px">
          <div class="muted2" style="font-size:12px">By <strong>${escapeHtml(d.createdBy?.name || "System")}</strong></div>
          <div class="spacer"></div>
          <div class="muted2" style="font-size:12px">${UI.fmtDate(d.createdAt)}</div>
        </div>
      </a>
    `);
  }

  function escapeHtml(s) {
    return String(s || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  async function loadDebates(q = "") {
    if(liveMount) liveMount.innerHTML = `<div class="muted">Loading debates…</div>`;
    if(upcomingMount) upcomingMount.innerHTML = ``;
    if(completedMount) completedMount.innerHTML = ``;
    if(endedMount) endedMount.innerHTML = ``;

    try {
      const data = await API.request(`/debates?q=${encodeURIComponent(q)}`, { auth: false });
      const debates = data.debates || [];
      
      const live = debates.filter(d => d.status === "active");
      const upcoming = debates.filter(d => d.status === "upcoming" || d.status === "pending");
      
      const completedList = [];
      const endedList = [];

      debates.filter(d => d.status === "completed").forEach(d => {
        const isAdmin = API.state.user && (API.state.user.role === "admin" || API.state.user.role === "moderator");
        if (isAdmin) {
          completedList.push(d); // Admin sees everything in one list
        } else {
          let isParticipant = false;
          if (d.rankings && API.state.user) {
            isParticipant = d.rankings.some(r => 
              String(r.user) === String(API.state.user._id) || 
              (r.user && String(r.user._id) === String(API.state.user._id))
            );
          }
          if (isParticipant) completedList.push(d);
          else endedList.push(d);
        }
      });
      
      const isAdminView = API.state.user && (API.state.user.role === "admin" || API.state.user.role === "moderator");
      if (isAdminView) {
        const cTitle = document.getElementById("completedTitle");
        if(cTitle) cTitle.innerHTML = "🏆 All Completed Debates";
        const eRow = document.getElementById("endedTitleRow");
        if(eRow) eRow.style.display = "none";
        if(endedMount) endedMount.style.display = "none";
      }

      if(liveMount) {
        liveMount.innerHTML = "";
        live.forEach((d) => liveMount.appendChild(debateCard(d)));
        if (live.length === 0) liveMount.innerHTML = `<div class="muted">No live debates right now.</div>`;
      }

      if(upcomingMount) {
        upcomingMount.innerHTML = "";
        upcoming.forEach((d) => upcomingMount.appendChild(debateCard(d)));
        if (upcoming.length === 0) upcomingMount.innerHTML = `<div class="muted">No upcoming debates scheduled.</div>`;
      }

      if(completedMount) {
        completedMount.innerHTML = "";
        completedList.slice(0, 5).forEach((d) => completedMount.appendChild(debateCard(d)));
        if (completedList.length === 0) {
          if (isAdminView) {
            completedMount.innerHTML = `<div class="muted">No debates have been completed yet.</div>`;
          } else {
            completedMount.innerHTML = `<div class="muted">You haven't completed any debates yet.</div>`;
          }
        }
      }

      if(endedMount) {
        endedMount.innerHTML = "";
        endedList.slice(0, 5).forEach((d) => endedMount.appendChild(debateCard(d)));
        if (endedList.length === 0) endedMount.innerHTML = `<div class="muted">No missed debates.</div>`;
      }
    } catch (e) {
      if(liveMount) liveMount.innerHTML = `<div class="muted">Failed to load debates.</div>`;
    }
  }

  async function loadLeaderboard() {
    leaderboardMount.innerHTML = `<div class="muted">Loading…</div>`;
    try {
      const data = await API.request("/users/leaderboard", { auth: false });
      const users = data.leaderboard || [];
      leaderboardMount.innerHTML = "";
      users.forEach((entry, idx) => {
        const u = entry.user || {};
        leaderboardMount.appendChild(
          UI.el(`
            <div class="mini">
              <div>
                <div class="title">#${idx + 1} ${escapeHtml(u.name || "Student")}</div>
                <div class="sub">${entry.matchesPlayed} Matches Played</div>
              </div>
              <div class="badge good">${entry.totalScore} Pts</div>
            </div>
          `)
        );
      });
      if (users.length === 0) leaderboardMount.innerHTML = `<div class="muted">No users yet.</div>`;
    } catch {
      leaderboardMount.innerHTML = `<div class="muted">Failed to load leaderboard.</div>`;
    }
  }

  searchInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") loadDebates(searchInput.value.trim());
  });

  createBtn?.addEventListener("click", () => {
    if (!API.state.token) {
      UI.toast("Login required", "Please login to create a debate.");
      location.href = "/login.html";
      return;
    }
    document.getElementById("createModal")?.classList.add("open");
  });

  document.getElementById("createClose")?.addEventListener("click", () => {
    document.getElementById("createModal")?.classList.remove("open");
  });

  document.getElementById("createForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = document.getElementById("cTitle").value.trim();
    const description = document.getElementById("cDesc").value.trim();
    const category = document.getElementById("cCat").value;
    try {
      const data = await API.request("/debates", { method: "POST", body: { title, description, category }, auth: true });
      UI.toast("Debate created", data.debate.approved ? "It’s now live." : "Awaiting approval by moderators.");
      document.getElementById("createModal")?.classList.remove("open");
      location.href = `/debate.html?id=${data.debate._id}`;
    } catch (err) {
      UI.toast("Could not create debate", err.message);
    }
  });

  await Promise.all([loadDebates(""), loadLeaderboard()]);
});

