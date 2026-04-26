document.addEventListener("DOMContentLoaded", async () => {
  UI.initTheme();
  UI.mountNavbar("leaderboard");

  const leaderboardMount = document.getElementById("leaderboardMount");

  function escapeHtml(s) {
    return String(s || "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  }

  try {
    const data = await API.request("/users/leaderboard");
    const leaderboard = data.leaderboard || [];

    if (leaderboard.length === 0) {
      leaderboardMount.innerHTML = `<div style="padding: 40px; text-align: center;" class="muted">No matches played yet. Start debating!</div>`;
      return;
    }

    leaderboardMount.innerHTML = "";
    leaderboard.forEach((entry, index) => {
      const rank = index + 1;
      let rankClass = "rank-other";
      if (rank === 1) rankClass = "rank-1";
      if (rank === 2) rankClass = "rank-2";
      if (rank === 3) rankClass = "rank-3";

      const user = entry.user;
      
      const div = document.createElement("div");
      div.className = "leaderboard-row";
      div.innerHTML = `
        <div class="rank-badge ${rankClass}">${rank}</div>
        <div class="avatar" style="width:40px;height:40px;border-radius:50%;background: linear-gradient(135deg, var(--accent1), var(--accent2)); color: white; display:flex; align-items:center; justify-content:center; font-size: 18px; font-weight:bold; margin-right: 16px;">
          ${(user.name || "U").charAt(0).toUpperCase()}
        </div>
        <div style="flex-grow: 1;">
          <div style="font-weight: 700; font-size: 18px; color: var(--fg0);">${escapeHtml(user.name)}</div>
          <div class="muted" style="font-size: 13px;">${entry.matchesPlayed} Matches Played</div>
        </div>
        <div class="score-display">
          ${entry.totalScore}
        </div>
      `;
      leaderboardMount.appendChild(div);
    });

  } catch (err) {
    leaderboardMount.innerHTML = `<div style="padding: 40px; text-align: center;" class="danger-text">Failed to load leaderboard.</div>`;
  }
});
