document.addEventListener("DOMContentLoaded", async () => {
  UI.initTheme();
  UI.mountNavbar("archive");
  if (!UI.mustAuth()) return;

  const mount = document.getElementById("archiveMount");
  const cat = document.getElementById("cat");
  const from = document.getElementById("from");
  const to = document.getElementById("to");

  function escapeHtml(s) {
    return String(s || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function debateCard(d) {
    return UI.el(`
      <a class="card pad hover" href="/debate.html?id=${d._id}">
        <div class="row" style="align-items:flex-start">
          <div class="tag"><i></i> ${escapeHtml(d.category)}</div>
          <div class="spacer"></div>
          <div class="badge warn">completed</div>
        </div>
        <div style="margin-top:10px">
          <div class="card-title">${escapeHtml(d.title)}</div>
          <div class="muted" style="font-size:13px;line-height:1.5;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden">
            ${escapeHtml(d.description)}
          </div>
        </div>
        <div class="row" style="margin-top:12px">
          <div class="muted2" style="font-size:12px">By <strong>${escapeHtml(d.createdBy?.name || "Unknown")}</strong></div>
          <div class="spacer"></div>
          <div class="muted2" style="font-size:12px">Completed ${UI.fmtDate(d.updatedAt)}</div>
        </div>
      </a>
    `);
  }

  async function load() {
    mount.innerHTML = `<div class="muted">Loading archive…</div>`;
    const qs = new URLSearchParams();
    if (cat.value) qs.set("category", cat.value);
    if (from.value) qs.set("from", from.value);
    if (to.value) qs.set("to", to.value);

    try {
      const data = await API.request(`/archive?${qs.toString()}`, { auth: false });
      const debates = data.debates || [];
      mount.innerHTML = "";
      debates.forEach((d) => mount.appendChild(debateCard(d)));
      if (debates.length === 0) mount.innerHTML = `<div class="muted">No completed debates match your filters.</div>`;
    } catch (err) {
      mount.innerHTML = `<div class="muted">Failed to load archive: ${escapeHtml(err.message)}</div>`;
    }
  }

  document.getElementById("applyBtn").addEventListener("click", load);
  await load();
});

