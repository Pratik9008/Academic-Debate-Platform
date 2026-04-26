document.addEventListener("DOMContentLoaded", async () => {
  UI.initTheme();
  UI.mountNavbar("mod");
  if (!UI.mustAuth()) return;

  const role = API.state.user?.role || "user";
  document.getElementById("roleBadge").textContent = role;
  if (!(role === "moderator" || role === "admin")) {
    UI.toast("Forbidden", "Moderator role required.");
    location.href = "/index.html";
    return;
  }

  const pendingMount = document.getElementById("pendingMount");

  function escapeHtml(s) {
    return String(s || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function pendingRow(d) {
    const node = UI.el(`
      <div class="mini">
        <div>
          <div class="title">${escapeHtml(d.title)}</div>
          <div class="sub">${escapeHtml(d.category)} • by ${escapeHtml(d.createdBy?.name || "Unknown")} • ${UI.fmtDate(d.createdAt)}</div>
        </div>
        <div class="row">
          <a class="btn btn-sm btn-ghost" href="/debate.html?id=${d._id}">Open</a>
          <button class="btn btn-sm btn-good" data-approve="${d._id}">Approve</button>
        </div>
      </div>
    `);
    return node;
  }

  async function loadPending() {
    pendingMount.innerHTML = `<div class="muted">Loading…</div>`;
    try {
      const data = await API.request("/debates/pending", { auth: true });
      const debates = data.debates || [];
      const statNode = document.getElementById("statPending");
      if(statNode) statNode.textContent = debates.length;

      pendingMount.innerHTML = "";
      if (debates.length === 0) pendingMount.innerHTML = `<div class="muted">No pending debates found (pending are hidden from public list).</div>`;
      debates.forEach((d) => pendingMount.appendChild(pendingRow(d)));
    } catch (err) {
      pendingMount.innerHTML = `<div class="muted">Failed: ${escapeHtml(err.message)}</div>`;
    }
  }

  pendingMount.addEventListener("click", async (e) => {
    const id = e.target?.dataset?.approve;
    if (!id) return;
    try {
      await API.request(`/debates/${id}/approve`, { method: "POST", auth: true });
      UI.toast("Approved", "Debate is now live.");
      await loadPending();
    } catch (err) {
      UI.toast("Approve failed", err.message);
    }
  });

  document.getElementById("refreshBtn").addEventListener("click", loadPending);

  document.getElementById("banForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const action = e.submitter?.dataset?.action || "ban";
    const userId = document.getElementById("userId").value.trim();
    try {
      await API.request("/users/ban", { method: "POST", body: { userId, banned: action === "ban" }, auth: true });
      UI.toast(action === "ban" ? "User banned" : "User unbanned", "");
      document.getElementById("userId").value = "";
    } catch (err) {
      UI.toast("Action failed", err.message);
    }
  });

  await loadPending();
});

