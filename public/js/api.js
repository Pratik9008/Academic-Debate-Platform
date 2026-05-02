const API = (() => {
  const state = {
    token: localStorage.getItem("adp_token") || "",
    user: JSON.parse(localStorage.getItem("adp_user") || "null"),
  };

  function setAuth(token, user) {
    state.token = token || "";
    state.user = user || null;
    if (token) localStorage.setItem("adp_token", token);
    else localStorage.removeItem("adp_token");
    if (user) localStorage.setItem("adp_user", JSON.stringify(user));
    else localStorage.removeItem("adp_user");
  }

  function logout() {
    setAuth("", null);
    location.href = "/login.html";
  }

  async function request(path, { method = "GET", body, auth = true } = {}) {
    const headers = { "Content-Type": "application/json" };
    if (auth && state.token) headers.Authorization = `Bearer ${state.token}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

    try {
      const res = await fetch(path.startsWith("/api") ? path : `/api${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data.error || data.message || `Request failed (${res.status})`;
        throw new Error(msg);
      }
      return data;
    } catch (err) {
      if (err.name === 'AbortError') throw new Error('Request timed out');
      throw err;
    }
  }

  return {
    state,
    setAuth,
    logout,
    request,
  };
})();

