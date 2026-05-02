document.addEventListener("DOMContentLoaded", async () => {
  UI.initTheme();
  UI.mountNavbar("all-debates");
  if (!UI.mustAuth()) return;

  const debatesMount = document.getElementById("debatesMount");
  const statusFilter = document.getElementById("statusFilter");
  const catFilter = document.getElementById("catFilter");
  const applyBtn = document.getElementById("applyBtn");

  const { filter } = UI.qs();
  if (filter) {
    statusFilter.value = filter;
  }

  function debateCard(d) {
    let timeStatus = "";
    if (d.status === "active" && d.endTime) {
      timeStatus = `<div class="badge danger">${UI.fmtTimeStatus(d.endTime, "Closes")}</div>`;
      if (d.participants && API.state.user && d.participants.some(p => String(p) === String(API.state.user._id) || (p._id && String(p._id) === String(API.state.user._id)))) {
        timeStatus += `<div class="badge good" style="margin-left: 8px;">✅ Participated</div>`;
      }
    } else if (d.status === "upcoming" && d.startTime) {
      timeStatus = `<div class="badge warn">${UI.fmtTimeStatus(d.startTime, "Starts")}</div>`;
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

  async function load() {
    debatesMount.innerHTML = `<div class="muted">Loading debates…</div>`;
    try {
      const q = ""; // Can add search if needed
      const data = await API.request(`/debates?q=${encodeURIComponent(q)}`, { auth: false });
      let debates = data.debates || [];

      // Filter by category
      const cat = catFilter.value;
      if (cat) {
        debates = debates.filter(d => d.category === cat);
      }

      // Filter by status
      const status = statusFilter.value;
      if (status === "live") {
        debates = debates.filter(d => d.status === "active").sort((a,b) => new Date(a.endTime||0) - new Date(b.endTime||0));
      } else if (status === "upcoming") {
        debates = debates.filter(d => d.status === "upcoming" || d.status === "pending").sort((a,b) => new Date(a.startTime||Infinity) - new Date(b.startTime||Infinity));
      } else if (status === "completed") {
        debates = debates.filter(d => d.status === "completed");
      } else {
        // Default All view: sort upcoming to bottom, live to top? 
        // We'll leave the default as created newest first.
      }

      debatesMount.innerHTML = "";
      if (debates.length === 0) {
        debatesMount.innerHTML = `<div class="muted">No debates found matching your filters.</div>`;
      } else {
        debates.forEach(d => debatesMount.appendChild(debateCard(d)));
      }
    } catch (err) {
      debatesMount.innerHTML = `<div class="muted">Failed to load debates.</div>`;
    }
  }

  applyBtn.addEventListener("click", load);
  load();
});
