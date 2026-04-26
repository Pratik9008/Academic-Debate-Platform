document.addEventListener("DOMContentLoaded", async () => {
  UI.initTheme();
  UI.mountNavbar("notifications");
  if (!UI.mustAuth()) return;

  function escapeHtml(s) {
    return String(s || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  const notifMount = document.getElementById("notifMount");

  async function load() {
    try {
      const data = await API.request("/notifications", { auth: true });
      const notifications = data.notifications || [];
      
      notifMount.innerHTML = "";
      if (notifications.length === 0) {
        notifMount.innerHTML = `<div class="muted" style="text-align: center; padding: 20px;">No notifications yet.</div>`;
        return;
      }

      notifications.forEach((n) => {
        notifMount.appendChild(
          UI.el(`
            <a class="mini" href="${n.link || "#"}" style="text-decoration: none; display: block; padding: 15px; border-radius: 12px; background: ${n.read ? 'transparent' : 'var(--bg1)'}; border: 1px solid var(--border);">
              <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                  <div class="title" style="font-size: 16px; font-weight: 600; color: var(--fg0);">${escapeHtml(n.title)}</div>
                  <div class="sub" style="font-size: 12px; margin-top: 4px;">${escapeHtml(n.type)} • ${UI.fmtDate(n.createdAt)} ${n.read ? "" : "• <span style='color: var(--accent1); font-weight: bold;'>new</span>"}</div>
                  <div class="muted" style="margin-top:8px; font-size: 14px; line-height: 1.5; color: var(--fg2);">${escapeHtml(n.body || "")}</div>
                </div>
              </div>
            </a>
          `)
        );
      });

      await UI.refreshNotificationsBadge();
    } catch (err) {
      notifMount.innerHTML = `<div class="danger-text" style="text-align: center; padding: 20px;">Failed to load notifications.</div>`;
    }
  }

  document.getElementById("markReadBtn").addEventListener("click", async () => {
    try {
      await API.request("/notifications/read", { method: "POST", auth: true });
      UI.toast("Done", "Notifications marked as read.");
      await load();
    } catch (err) {
      UI.toast("Failed", err.message);
    }
  });

  load();
});
