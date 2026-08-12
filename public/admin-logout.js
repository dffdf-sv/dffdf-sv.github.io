(() => {
  "use strict";
  if (window.__DFFDF_ADMIN_LOGOUT__) return;
  window.__DFFDF_ADMIN_LOGOUT__ = true;

  function install() {
    const actions = document.querySelector(".topbar .actions");
    if (!actions || actions.querySelector("[data-admin-logout]")) return;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "button danger";
    button.dataset.adminLogout = "1";
    button.textContent = "↪ Logout";
    button.addEventListener("click", async () => {
      if (!confirm("Log out of the admin panel?")) return;
      button.disabled = true;
      button.textContent = "Logging out…";
      try {
        const response = await fetch("/api/logout", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" }
        });
        if (!response.ok) throw new Error("Logout failed");
        window.location.replace("/admin");
      } catch (error) {
        console.error(error);
        button.disabled = false;
        button.textContent = "↪ Logout";
        if (typeof toast === "function") toast("❌ Could not log out");
        else alert("Could not log out. Please try again.");
      }
    });
    actions.appendChild(button);
  }

  install();
  setTimeout(install, 300);
  setTimeout(install, 1000);
})();
