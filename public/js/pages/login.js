document.addEventListener("DOMContentLoaded", () => {
  UI.initTheme();
  // Auth page: intentionally no navbar

  if (API.state.token) {
    location.href = "/index.html";
    return;
  }

  document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    if (!email) {
      UI.toast("Invalid email", "Please enter a valid email address.");
      return;
    }

    try {
      const data = await API.request("/auth/login", { method: "POST", body: { email, password }, auth: false });
      API.setAuth(data.token, data.user);
      UI.toast("Logged in", "Welcome back.");
      location.href = "/index.html";
    } catch (err) {
      UI.toast("Login failed", err.message);
    }
  });
});

