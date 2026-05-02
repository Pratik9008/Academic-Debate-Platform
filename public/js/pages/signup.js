document.addEventListener("DOMContentLoaded", () => {
  UI.initTheme();
  UI.mountNavbar(); // Add glassmorphic navbar

  if (API.state.token) {
    location.href = "/index.html";
    return;
  }

  document.getElementById("signupForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    if (!/^[^\s@]+@gmail\.com$/i.test(email)) {
      UI.toast("Invalid email", "Please use a valid @gmail.com address.");
      return;
    }

    if (password !== confirmPassword) {
      UI.toast("Passwords don’t match", "Please re-check and try again.");
      return;
    }

    try {
      const data = await API.request("/auth/signup", {
        method: "POST",
        body: { name, email, password, confirmPassword },
        auth: false,
      });
      API.setAuth(data.token, data.user);
      UI.toast("Account created", "Welcome to Academic Debate.");
      location.href = "/index.html";
    } catch (err) {
      UI.toast("Signup failed", err.message);
    }
  });
});

