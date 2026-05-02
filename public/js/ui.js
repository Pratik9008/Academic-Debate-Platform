const UI = (() => {
  const toastWrapId = "toastWrap";

  function el(html) {
    const t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  function ensureToastWrap() {
    let w = document.getElementById(toastWrapId);
    if (!w) {
      w = document.createElement("div");
      w.id = toastWrapId;
      w.className = "toast-wrap";
      document.body.appendChild(w);
    }
    return w;
  }

  function toast(title, body = "", { ms = 3200 } = {}) {
    const w = ensureToastWrap();
    const node = el(`<div class="toast"><strong></strong><span></span></div>`);
    node.querySelector("strong").textContent = title;
    node.querySelector("span").textContent = body;
    w.appendChild(node);
    setTimeout(() => node.remove(), ms);
  }

  function fmtDate(d) {
    try {
      const date = new Date(d);
      const now = new Date();
      const diff = now - date;
      const day = 24 * 60 * 60 * 1000;

      if (diff < day && now.getDate() === date.getDate()) return `Today, ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
      if (diff < day * 2 && now.getDate() - date.getDate() === 1) return `Yesterday, ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
      
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return "";
    }
  }

  function fmtTimeStatus(d, prefix = "Ends") {
    try {
      const date = new Date(d);
      const now = new Date();
      const diff = date - now;
      const day = 24 * 60 * 60 * 1000;

      let label = "";
      if (date.toDateString() === now.toDateString()) label = "Today";
      else if (new Date(now.getTime() + day).toDateString() === date.toDateString()) label = "Tomorrow";
      else label = date.toLocaleDateString([], { month: 'short', day: 'numeric' });

      return `${prefix} ${label} at ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
    } catch {
      return "";
    }
  }

  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("adp_theme", theme);
  }

  function initTheme() {
    const stored = localStorage.getItem("adp_theme");
    const theme = stored || "dark";
    setTheme(theme);
  }

  function toggleTheme() {
    const curr = document.documentElement.dataset.theme || "dark";
    setTheme(curr === "dark" ? "light" : "dark");
  }

  function mustAuth() {
    if (!API.state.token) {
      location.href = "/login.html";
      return false;
    }
    return true;
  }

  function mountNavbar(active) {
    const root = document.getElementById("navbarMount");
    if (!root) return;

    const user = API.state.user;
    const role = user?.role || "guest";
    const isAuthPage = location.pathname === "/" || location.pathname.includes("login.html") || location.pathname.includes("signup.html");

    root.innerHTML = "";
    root.appendChild(
      el(`
      <div class="nav">
        <div class="container nav-inner">
          <a class="brand" href="/index.html">
            <div class="brand-badge"></div>
            <div>
              <div class="brand-name">Academic Debate Platform</div>
              <div class="muted2 brand-sub">Modern structured rounds • premium UX</div>
            </div>
          </a>

          <div class="spacer"></div>

          <div class="nav-right">
            ${!isAuthPage ? `
            <div class="nav-links">
              <a class="pill ${active === "all-debates" ? "active" : ""}" href="/all-debates.html">All Debates 🔎</a>
              ${(role === "user" || role === "guest") ? `
                <a class="pill ${active === "play" ? "active" : ""}" href="/play.html">Play Arena 🎮</a>
                <a class="pill" href="/live-debate.html" style="color: #ef4444; font-weight: bold;">🔴 Live Match</a>
                <a class="pill ${active === "tracking" ? "active" : ""}" href="/track-status.html">Track Status</a>
              ` : ""}
              <a class="pill ${active === "leaderboard" ? "active" : ""}" href="/leaderboard.html">Leaderboard 🏆</a>
              ${(role === "moderator" || role === "admin") ? `<a class="pill ${active === "mod" ? "active" : ""}" href="/admin.html">Admin Portal</a>` : ""}
            </div>
            ` : ""}

            <div class="nav-actions">
              <button class="pill" id="themeBtn" title="Toggle theme" type="button" style="padding: 6px 12px; font-size: 16px;">🌗</button>
              ${!isAuthPage ? `
              <a class="pill" href="/notifications.html" id="notifBtn" title="Notifications" style="padding: 6px 12px; font-size: 16px; position:relative;">
                🔔 <span class="badge" id="notifBadge" style="position:absolute; top:-4px; right:-8px; display:none;">0</span>
              </a>
              ` : ""}
              ${
                user
                  ? `<div class="profile-menu-container" style="position:relative;">
                       <button class="avatar-btn" id="profileDropdownBtn" title="${user.name}">
                         ${(user.name || "U").charAt(0).toUpperCase()}
                       </button>
                       <div class="profile-dropdown" id="profileDropdown" style="display:none;">
                         <div class="dropdown-header">
                           <strong>${user.name || "User"}</strong>
                           <span class="muted2" style="display:block;font-size:12px;margin-top:2px;">Rep: ${Math.max(0, user.reputation || 0)}</span>
                         </div>
                         <a href="/profile.html" class="dropdown-item">👤 My Profile</a>
                         <a href="/settings.html" class="dropdown-item">⚙️ Settings</a>
                         <div class="dropdown-divider"></div>
                         <button id="logoutBtn" class="dropdown-item danger-text" style="width:100%;text-align:left;border:none;background:none;font-size:14px;cursor:pointer;">🚪 Logout</button>
                       </div>
                     </div>`
                  : (!location.pathname.includes("login.html") && location.pathname !== "/") ? `<a class="pill primary" href="/login.html">Login</a>` : ""
              }
            </div>
          </div>
        </div>
      </div>
    `)
    );

    document.getElementById("themeBtn")?.addEventListener("click", toggleTheme);
    document.getElementById("logoutBtn")?.addEventListener("click", API.logout);

    const dropdownBtn = document.getElementById("profileDropdownBtn");
    const dropdownMenu = document.getElementById("profileDropdown");
    if (dropdownBtn && dropdownMenu) {
      dropdownBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const isHidden = dropdownMenu.style.display === "none";
        dropdownMenu.style.display = isHidden ? "block" : "none";
      });
      document.addEventListener("click", (e) => {
        if (!dropdownBtn.contains(e.target) && !dropdownMenu.contains(e.target)) {
          dropdownMenu.style.display = "none";
        }
      });
    }



    refreshNotificationsBadge().catch(() => {});
  }

  async function refreshNotificationsBadge() {
    if (!API.state.token) return;
    const data = await API.request("/notifications", { auth: true });
    const unread = (data.notifications || []).filter((n) => !n.read).length;
    const b = document.getElementById("notifBadge");
    if (!b) return;
    if (unread > 0) {
      b.style.display = "inline-flex";
      b.textContent = String(unread);
    } else {
      b.style.display = "none";
    }
  }

  function qs() {
    const params = new URLSearchParams(location.search);
    return Object.fromEntries(params.entries());
  }

  document.addEventListener("mousemove", (e) => {
    document.body.style.setProperty("--mouse-x-global", `${e.clientX}px`);
    document.body.style.setProperty("--mouse-y-global", `${e.clientY}px`);
    
    document.querySelectorAll('.auth-card, .card.hover').forEach(card => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty("--mouse-x", `${x}px`);
      card.style.setProperty("--mouse-y", `${y}px`);
    });
  });

  return {
    el,
    toast,
    fmtDate,
    fmtTimeStatus,
    initTheme,
    mountNavbar,
    mustAuth,
    refreshNotificationsBadge,
    qs,
  };
})();

