UI.initTheme();

if (!UI.mustAuth()) {
  // Not logged in
} else {
  UI.mountNavbar();

  const nameInput = document.getElementById("nameInput");
  const bioInput = document.getElementById("bioInput");
  const form = document.getElementById("settingsForm");
  const saveBtn = document.getElementById("saveBtn");

  // Pre-fill form
  const user = API.state.user;
  if (user) {
    nameInput.value = user.name || "";
    bioInput.value = user.bio || "";
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";

    try {
      const res = await API.request("/users/me", {
        method: "PUT",
        auth: true,
        body: {
          name: nameInput.value.trim(),
          bio: bioInput.value.trim()
        }
      });

      if (res.user) {
        // Update local state
        const updatedUser = { ...API.state.user, ...res.user };
        localStorage.setItem("adp_user", JSON.stringify(updatedUser));
        API.state.user = updatedUser;
        
        UI.mountNavbar(); // Refresh navbar with new name/avatar
        UI.toast("Success", "Profile updated successfully!");
      }
    } catch (err) {
      UI.toast("Error", err.message);
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = "Save Changes";
    }
  });
}
