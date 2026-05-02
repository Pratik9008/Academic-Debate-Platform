document.addEventListener("DOMContentLoaded", async () => {
  UI.initTheme();
  UI.mountNavbar("");
  if (!UI.mustAuth()) return;

  const { id } = UI.qs();
  if (!id) {
    UI.toast("Missing debate id", "Open a debate from the homepage.");
    location.href = "/index.html";
    return;
  }

  const user = API.state.user;
  const role = user?.role || "guest";
  document.getElementById("roleBadge").textContent = role;

  const mount = document.getElementById("threadMount");

  const approveBtn = document.getElementById("approveBtn");
  const deleteDebateBtn = document.getElementById("deleteDebateBtn");

  const canMod = role === "moderator" || role === "admin";

  if (canMod) {
    if (approveBtn) approveBtn.style.display = "inline-flex";
    if (deleteDebateBtn) deleteDebateBtn.style.display = "inline-flex";
  }

  function escapeHtml(s) {
    return String(s || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function postNode(a, { depth = 0 } = {}) {
    const indent = Math.min(depth, 4) * 14;
    const node = UI.el(`
      <div class="post" id="post-${a._id}" style="margin-left:${indent}px">
        <div class="meta">
          <div class="avatar"></div>
          <div>
            <div class="name">${escapeHtml(a.author?.name || "Unknown")}</div>
            <div class="muted2" style="font-size:12px">${escapeHtml(a.author?.role || "")} • rep ${Math.max(0, a.author?.reputation || 0)} • ${UI.fmtDate(a.createdAt)}</div>
          </div>
          <div class="spacer"></div>
          <div class="badge" id="score-${a._id}">${Number(a.score || 0)}</div>
        </div>
        <div class="content markdown-body" style="font-size:14px">${window.marked && window.DOMPurify ? DOMPurify.sanitize(marked.parse(a.content || "")) : escapeHtml(a.content)}</div>
        <div class="actions">
          <button class="btn btn-sm btn-ghost" data-up="${a._id}">Upvote</button>
          <button class="btn btn-sm btn-ghost" data-down="${a._id}">Downvote</button>
          <button class="btn btn-sm" data-reply="${a._id}">Reply</button>
          <button class="btn btn-sm btn-ghost" data-comments="${a._id}">Comments</button>
          <button class="btn btn-sm btn-ghost" data-report="${a._id}">Report</button>
          ${canMod ? `<button class="btn btn-sm btn-danger" data-del="${a._id}">Delete</button>` : ""}
        </div>
        <div class="grid" id="comments-${a._id}" style="margin-top:10px;display:none"></div>
      </div>
    `);
    return node;
  }

  function buildThread(argumentsList) {
    const byId = new Map(argumentsList.map((a) => [a._id, a]));
    const kids = new Map();
    argumentsList.forEach((a) => {
      const p = a.parentArgument || null;
      const key = p ? String(p) : "root";
      if (!kids.has(key)) kids.set(key, []);
      kids.get(key).push(a);
    });

    function walk(parentKey, depth) {
      const arr = kids.get(parentKey) || [];
      arr.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      const nodes = [];
      arr.forEach((a) => {
        nodes.push(postNode(a, { depth }));
        nodes.push(...walk(String(a._id), depth + 1));
      });
      return nodes;
    }

    return walk("root", 0);
  }

  async function load() {
    mount.innerHTML = `<div class="muted">Loading thread…</div>`;
    try {
      const data = await API.request(`/debates/${id}`, { auth: Boolean(API.state.token) });
      const d = data.debate;

      document.getElementById("debateTitle").textContent = d.title;
      document.getElementById("debateDesc").textContent = d.description;
      document.getElementById("debateMeta").textContent = `By ${d.createdBy?.name || "Unknown"} • ${UI.fmtDate(d.createdAt)}`;
      document.getElementById("debateCategory").innerHTML = `<i></i> ${d.category}`;
      document.getElementById("debateStatus").textContent = d.status.toUpperCase();
      
      const countdownBadge = document.getElementById("countdownBadge");
      if (d.status === "active" && d.endTime) {
        countdownBadge.style.display = "inline-flex";
        startCountdown(new Date(d.endTime), "🤖 AI Scoreboard in:");
      } else if (d.status === "upcoming" && d.startTime) {
        countdownBadge.style.display = "inline-flex";
        countdownBadge.classList.replace("danger", "warn");
        startCountdown(new Date(d.startTime), "Starts in");
      } else {
        countdownBadge.style.display = "none";
      }

      document.getElementById("roundHelp").textContent =
        d.status === "completed"
          ? "This debate has concluded."
          : d.status === "upcoming"
          ? "Debate starts soon."
          : "Debate is live. Post your arguments!";

      const openPostBtn = document.getElementById("openPostBtn");
      const participateCard = openPostBtn?.parentElement?.parentElement;
      if (openPostBtn) {
        // Hide entire Participate section for admin/moderator
        if (canMod) {
          if (participateCard) participateCard.style.display = "none";
          const thText = document.getElementById("threadHelpText");
          if (thText) thText.textContent = "Moderator View: Reviewing community arguments and maintaining discussion quality.";
        } else {
          const isActive = d.status === "active";
          const already = data.hasParticipated;
          
          openPostBtn.style.display = isActive ? "block" : "none";
          if (already) {
            openPostBtn.disabled = true;
            openPostBtn.textContent = "✅ Argument Submitted";
            openPostBtn.classList.add("btn-ghost");
            document.getElementById("roundHelp").textContent = "You have already participated in this round. AI will grade everyone soon!";
          } else {
            openPostBtn.disabled = false;
            openPostBtn.textContent = "🗣️ Post Your Argument";
            openPostBtn.classList.remove("btn-ghost");
          }
        }
      }

      if (canMod) {
        approveBtn.style.display = d.approved ? "none" : "inline-flex";
      }

      // Render Rankings if graded
      const rankingsPodium = document.getElementById("rankingsPodium");
      const rankingsMount = document.getElementById("rankingsMount");
      if (d.status === "completed" && d.aiGraded && d.rankings && d.rankings.length > 0) {
        rankingsPodium.style.display = "block";
        rankingsMount.innerHTML = "";
        d.rankings.forEach(r => {
          const editBtn = canMod ? `<button class="btn btn-sm btn-ghost override-score-btn" data-userid="${r.user?._id || r.user}" data-current="${r.score}" style="margin-left: 10px;">Edit Score</button>` : '';
          
          rankingsMount.appendChild(UI.el(`
            <div class="mini">
              <div>
                <div class="title" style="color: ${r.rank === 1 ? '#fbbf24' : r.rank === 2 ? '#9ca3af' : r.rank === 3 ? '#b45309' : ''}">
                  #${r.rank} ${escapeHtml(r.user?.name || "Student")}
                </div>
                <div class="muted markdown-body" style="margin-top:6px;font-size:13px">${escapeHtml(r.feedback)}</div>
              </div>
              <div class="row">
                <div class="badge good">${r.score}/100</div>
                ${editBtn}
              </div>
            </div>
          `));
        });

        // Add event listeners to the edit buttons
        if (canMod) {
          rankingsMount.querySelectorAll('.override-score-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
              const userId = e.target.dataset.userid;
              const current = e.target.dataset.current;
              const newScore = prompt(`Enter new score for this user (current: ${current}):`, current);
              if (newScore !== null && !isNaN(newScore)) {
                try {
                  await API.request(`/debates/${id}/override-score`, { method: "POST", body: { userId, newScore: Number(newScore) }, auth: true });
                  UI.toast("Success", "AI Score has been overridden.");
                  await load();
                } catch (err) {
                  UI.toast("Failed to update score", err.message);
                }
              }
            });
          });
        }
      } else {
        rankingsPodium.style.display = "none";
      }

      mount.innerHTML = "";
      const nodes = buildThread(data.arguments || []);
      if (nodes.length === 0) {
        if (d.status === "completed") {
          mount.innerHTML = `<div class="muted" style="text-align: center; padding: 20px;">Nobody participated in this debate. 😔</div>`;
          document.getElementById("roundHelp").textContent = "Debate ended with no participants.";
        } else {
          mount.innerHTML = `<div class="muted">No arguments in this round yet. Be the first.</div>`;
        }
      } else {
        nodes.forEach((n) => mount.appendChild(n));
      }
      
      renderChart(data.arguments || []);
    } catch (err) {
      mount.innerHTML = `<div class="muted">Failed to load debate: ${escapeHtml(err.message)}</div>`;
    }
  }

  let timerInterval = null;
  function startCountdown(targetDate, prefix = "Closes in") {
    if (timerInterval) clearInterval(timerInterval);
    const badge = document.getElementById("countdownBadge");
    
    timerInterval = setInterval(() => {
      const now = new Date().getTime();
      const distance = targetDate.getTime() - now;
      
      if (distance < 0) {
        clearInterval(timerInterval);
        badge.textContent = "Processing...";
        setTimeout(load, 2000); // Reload to get completed state
        return;
      }
      
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);
      
      badge.textContent = `${prefix} ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }, 1000);
  }

  let analyticsChart = null;
  function renderChart(args) {
    if (typeof Chart === "undefined") return;
    const ctx = document.getElementById('analyticsChart');
    if (!ctx) return;
    
    let labels, data, colors;

    if (!args || args.length === 0) {
      labels = ["Awaiting Arguments"];
      data = [1];
      colors = ['rgba(255, 255, 255, 0.08)'];
    } else {
      // Get top 5 arguments
      const sorted = [...args].sort((a,b) => (b.score || 0) - (a.score || 0)).slice(0, 5);
      labels = sorted.map(a => (a.author?.name || "Unknown").split(" ")[0]);
      
      const allZero = sorted.every(a => (a.score || 0) <= 0);
      data = allZero ? sorted.map(() => 1) : sorted.map(a => Math.max(a.score || 0, 0.1));
      
      colors = [
        'rgba(124, 58, 237, 0.8)',
        'rgba(34, 211, 238, 0.8)',
        'rgba(96, 165, 250, 0.8)',
        'rgba(16, 185, 129, 0.8)',
        'rgba(251, 191, 36, 0.8)'
      ];
      
      if (allZero) {
        colors = colors.map(c => c.replace('0.8', '0.2'));
      }
    }

    if (analyticsChart) {
      analyticsChart.data.labels = labels;
      analyticsChart.data.datasets[0].data = data;
      analyticsChart.data.datasets[0].backgroundColor = colors;
      analyticsChart.update();
    } else {
      analyticsChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: labels,
          datasets: [{
            data: data,
            backgroundColor: colors,
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: 'rgba(234, 240, 255, 0.72)' }
            }
          }
        }
      });
    }
  }

  // Post modal
  const postModal = document.getElementById("postModal");
  const openPostBtn = document.getElementById("openPostBtn");
  
  openPostBtn.addEventListener("click", () => {
    if (!API.state.token) {
      UI.toast("Login required", "Please login to post arguments.");
      location.href = "/login.html";
      return;
    }
    document.getElementById("parentArgumentId").value = "";
    postModal.classList.add("open");
  });
  
  document.getElementById("postClose").addEventListener("click", () => postModal.classList.remove("open"));

  document.getElementById("postForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = e.submitter || document.querySelector("#postForm button[type='submit']");
    const originalText = btn.textContent;
    
    const content = document.getElementById("postContent").value.trim();
    const parentArgumentId = document.getElementById("parentArgumentId").value || null;
    
    try {
      btn.disabled = true;
      btn.textContent = "Publishing...";
      
      await API.request("/arguments", { method: "POST", body: { debateId: id, content, parentArgumentId }, auth: true });
      
      UI.toast("Success!", "Your argument has been posted.");
      postModal.classList.remove("open");
      document.getElementById("postContent").value = "";
      await load();
    } catch (err) {
      UI.toast("Could not post", err.message);
      // If it's a conflict (already posted), just close the modal
      if (err.message.includes("already posted")) {
        postModal.classList.remove("open");
        await load();
      }
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  });

  // Comment modal
  const commentModal = document.getElementById("commentModal");
  document.getElementById("commentClose").addEventListener("click", () => commentModal.classList.remove("open"));
  document.getElementById("commentForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const argumentId = document.getElementById("commentArgumentId").value;
    const content = document.getElementById("commentContent").value.trim();
    try {
      await API.request("/arguments/reply", { method: "POST", body: { argumentId, content }, auth: true });
      UI.toast("Replied", "Your comment was posted.");
      commentModal.classList.remove("open");
      document.getElementById("commentContent").value = "";
    } catch (err) {
      UI.toast("Reply failed", err.message);
    }
  });

  // Delegated actions
  mount.addEventListener("click", async (e) => {
    const up = e.target?.dataset?.up;
    const down = e.target?.dataset?.down;
    const reply = e.target?.dataset?.reply;
    const report = e.target?.dataset?.report;
    const del = e.target?.dataset?.del;
    const comments = e.target?.dataset?.comments;

    if (up || down) {
      if (!API.state.token) {
        UI.toast("Login required", "Please login to vote.");
        location.href = "/login.html";
        return;
      }
      if (canMod) return UI.toast("Forbidden", "Admins cannot vote on debates.");
      
      try {
        await API.request("/vote", {
          method: "POST",
          body: { targetType: "argument", targetId: up || down, value: up ? 1 : -1 },
          auth: true,
        });
        await load();
      } catch (err) {
        UI.toast("Vote failed", err.message);
      }
    }

    if (reply) {
      if (!API.state.token) {
        UI.toast("Login required", "Please login to reply.");
        location.href = "/login.html";
        return;
      }
      if (canMod) return UI.toast("Forbidden", "Admins cannot participate in debates.");
      
      document.getElementById("parentArgumentId").value = reply;
      document.getElementById("postContent").value = "";
      postModal.classList.add("open");
    }

    if (comments) {
      if (!API.state.token) {
        UI.toast("Login required", "Please login to view comments.");
        location.href = "/login.html";
        return;
      }
      const box = document.getElementById(`comments-${comments}`);
      const isOpen = box.style.display !== "none";
      if (isOpen) {
        box.style.display = "none";
        box.innerHTML = "";
      } else {
        box.style.display = "grid";
        box.innerHTML = `<div class="muted">Loading comments…</div>`;
        try {
          const data = await API.request(`/arguments/comments?argumentId=${encodeURIComponent(comments)}`, { auth: true });
          const list = data.comments || [];
          box.innerHTML = "";
          if (list.length === 0) box.appendChild(UI.el(`<div class="muted">No comments yet.</div>`));
          list.forEach((c) => {
            box.appendChild(
              UI.el(`
                <div class="mini" style="align-items:flex-start">
                  <div>
                    <div class="title">${escapeHtml(c.author?.name || "Unknown")}</div>
                    <div class="sub">${UI.fmtDate(c.createdAt)}</div>
                    <div class="muted markdown-body" style="margin-top:6px;font-size:13px">${window.marked && window.DOMPurify ? DOMPurify.sanitize(marked.parse(c.content || "")) : escapeHtml(c.content)}</div>
                  </div>
                  <button class="btn btn-sm" data-opencomment="${comments}">Reply</button>
                </div>
              `)
            );
          });
        } catch (err) {
          box.innerHTML = `<div class="muted">Failed to load comments: ${escapeHtml(err.message)}</div>`;
        }
      }
    }

    if (e.target?.dataset?.opencomment) {
      const argId = e.target.dataset.opencomment;
      document.getElementById("commentArgumentId").value = argId;
      commentModal.classList.add("open");
    }

    if (report) {
      if (!API.state.token) {
        UI.toast("Login required", "Please login to report.");
        location.href = "/login.html";
        return;
      }
      try {
        await API.request("/arguments/report", { method: "POST", body: { targetType: "argument", targetId: report, reason: "Inappropriate" }, auth: true });
        UI.toast("Reported", "Thanks — moderators will review.");
      } catch (err) {
        UI.toast("Report failed", err.message);
      }
    }

    if (del) {
      if (!canMod) return;
      try {
        await API.request(`/arguments/${del}`, { method: "DELETE", auth: true });
        UI.toast("Deleted", "Argument removed by moderator.");
        await load();
      } catch (err) {
        UI.toast("Delete failed", err.message);
      }
    }
  });

  // Moderator actions
  if (approveBtn) {
    approveBtn.addEventListener("click", async () => {
      try {
        await API.request(`/debates/${id}/approve`, { method: "POST", auth: true });
        UI.toast("Approved", "Debate is now live.");
        await load();
      } catch (err) {
        UI.toast("Approve failed", err.message);
      }
    });
  }

  if (deleteDebateBtn) {
    deleteDebateBtn.addEventListener("click", async () => {
      if (!confirm("Are you sure you want to permanently delete this debate?")) return;
      try {
        await API.request(`/debates/${id}`, { method: "DELETE", auth: true });
        UI.toast("Deleted", "Debate has been removed.");
        location.href = "/index.html";
      } catch (err) {
        UI.toast("Delete failed", err.message);
      }
    });
  }

  await load();

  // Socket.io integration
  if (typeof io !== "undefined") {
    const socket = io();
    socket.emit("joinDebate", id);

    socket.on("new_argument", (arg) => {
      // Find where to append or just reload the thread if we can't find parent
      if (!arg.parentArgument) {
        mount.appendChild(postNode(arg));
      } else {
        // Full reload for nested replies to keep things simple and ordered
        load();
      }
    });

    socket.on("vote_update", ({ argumentId, score }) => {
      const badge = document.getElementById(`score-${argumentId}`);
      if (badge) badge.textContent = score;
    });
  }
});

