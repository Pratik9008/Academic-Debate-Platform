document.addEventListener("DOMContentLoaded", async () => {
  UI.initTheme();
  UI.mountNavbar("profile");
  if (!UI.mustAuth()) return;

  function escapeHtml(s) {
    return String(s || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  const bmMount = document.getElementById("bmMount");
  const partMount = document.getElementById("partMount");

  async function load() {
    const [me, bms, part] = await Promise.all([
      API.request("/users/me", { auth: true }),
      API.request("/bookmarks", { auth: true }),
      API.request("/users/me/participation", { auth: true }),
    ]);

    const u = me.user;
    API.setAuth(API.state.token, u);

    document.getElementById("name").textContent = u.name;
    document.getElementById("meta").textContent = `${u.email} • joined ${UI.fmtDate(u.createdAt)}`;
    document.getElementById("bioDisplay").textContent = u.bio || "No bio provided.";
    document.getElementById("repBadge").textContent = `rep ${Number(u.reputation || 0)}`;
    document.getElementById("roleBadge").textContent = u.role;
    document.getElementById("profileAvatar").textContent = (u.name || "U").charAt(0).toUpperCase();



    document.getElementById("argCount").textContent = `${Number(part.argumentsCount || 0)} args`;
    const debates = part.debates || [];
    partMount.innerHTML = "";
    if (debates.length === 0) partMount.innerHTML = `<div class="muted">No participation yet. Join a debate from the homepage.</div>`;
    debates.forEach((d) => {
      partMount.appendChild(
        UI.el(`
          <a class="mini" href="/debate.html?id=${d._id}">
            <div>
              <div class="title">${escapeHtml(d.title)}</div>
              <div class="sub">${escapeHtml(d.category)} • ${escapeHtml(d.status)} • updated ${UI.fmtDate(d.updatedAt)}</div>
            </div>
            <span class="badge ${d.status === "active" ? "good" : d.status === "completed" ? "warn" : ""}">${escapeHtml(d.status)}</span>
          </a>
        `)
      );
    });

    await UI.refreshNotificationsBadge();
  }

  // Edit form moved to settings.html



  try {
    await load();
  } catch (err) {
    UI.toast("Profile load failed", err.message);
  }
});

