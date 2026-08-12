(() => {
  "use strict";
  if (window.__DFFDF_ADMIN_SYSTEM__) return;
  window.__DFFDF_ADMIN_SYSTEM__ = true;

  const style = document.createElement("style");
  style.textContent = `
    :root {
      --glass-blur: 34px !important;
      --glass-opacity: .12 !important;
      --glass-border: .20 !important;
      --glass-shadow: .34 !important;
      --radius: 24px !important;
    }

    .glass {
      position: relative;
      overflow: hidden;
      background:
        linear-gradient(135deg, rgba(255,255,255,.14), rgba(255,255,255,.045) 48%, rgba(255,255,255,.025)) !important;
      border: 1px solid rgba(255,255,255,.18) !important;
      backdrop-filter: blur(34px) saturate(180%) contrast(105%) !important;
      -webkit-backdrop-filter: blur(34px) saturate(180%) contrast(105%) !important;
      box-shadow:
        inset 0 1px 0 rgba(255,255,255,.16),
        inset 0 -1px 0 rgba(255,255,255,.035),
        0 24px 70px rgba(0,0,0,.28),
        0 2px 12px rgba(255,255,255,.035) !important;
    }

    .glass::before {
      content: "";
      position: absolute;
      inset: 0;
      pointer-events: none;
      background: radial-gradient(circle at 18% 0%, rgba(255,255,255,.14), transparent 34%);
      opacity: .7;
    }

    .button, input, select, textarea, .theme-card, .page-item, .section-item, .ai-mode {
      transition: background .22s ease, border-color .22s ease, box-shadow .22s ease, transform .22s ease;
    }

    .button {
      border-color: rgba(255,255,255,.16) !important;
      background: rgba(255,255,255,.075) !important;
      box-shadow: inset 0 1px rgba(255,255,255,.08), 0 8px 24px rgba(0,0,0,.12);
    }

    .button:hover {
      background: rgba(255,255,255,.13) !important;
      border-color: rgba(255,255,255,.24) !important;
      transform: translateY(-1px);
    }

    .button.primary {
      box-shadow: 0 10px 30px rgba(128,101,255,.24), inset 0 1px rgba(255,255,255,.18);
    }

    #dffdf-login-gate {
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      display: grid;
      place-items: center;
      padding: 24px;
      background:
        radial-gradient(circle at 20% 10%, rgba(128,101,255,.24), transparent 36%),
        radial-gradient(circle at 85% 90%, rgba(80,150,255,.15), transparent 38%),
        rgba(5,5,10,.86);
      backdrop-filter: blur(24px) saturate(130%);
      -webkit-backdrop-filter: blur(24px) saturate(130%);
    }

    #dffdf-login-gate .login-card {
      width: min(430px, 100%);
      padding: 34px;
      border: 1px solid rgba(255,255,255,.18);
      border-radius: 30px;
      background: linear-gradient(145deg, rgba(255,255,255,.14), rgba(255,255,255,.045));
      box-shadow: inset 0 1px rgba(255,255,255,.16), 0 40px 100px rgba(0,0,0,.48);
      backdrop-filter: blur(40px) saturate(180%);
      -webkit-backdrop-filter: blur(40px) saturate(180%);
    }

    #dffdf-login-gate h1 { margin: 0 0 8px; font-size: 30px; letter-spacing: -.04em; }
    #dffdf-login-gate p { margin: 0 0 24px; color: #a8a8b5; }
    #dffdf-login-gate label { margin-top: 14px; }
    #dffdf-login-gate input { background: rgba(0,0,0,.22); }
    #dffdf-login-gate button { width: 100%; margin-top: 20px; }
    #dffdf-login-error { min-height: 20px; margin-top: 12px; color: #ff9ba8; font-size: 13px; }
    body.dffdf-logged-out > *:not(#dffdf-login-gate) { visibility: hidden !important; }
  `;
  document.head.appendChild(style);

  function showLogin() {
    if (document.getElementById("dffdf-login-gate")) return;
    document.body.classList.add("dffdf-logged-out");

    const gate = document.createElement("div");
    gate.id = "dffdf-login-gate";
    gate.innerHTML = `
      <form class="login-card" autocomplete="on">
        <h1>Welcome back.</h1>
        <p>Sign in to your DFFDF admin panel.</p>
        <label for="dffdf-user">Username</label>
        <input id="dffdf-user" name="username" autocomplete="username" required>
        <label for="dffdf-pass">Password</label>
        <input id="dffdf-pass" name="password" type="password" autocomplete="current-password" required>
        <button class="button primary" type="submit">Sign in</button>
        <div id="dffdf-login-error" role="alert"></div>
      </form>`;
    document.body.appendChild(gate);

    gate.querySelector("form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const button = form.querySelector("button");
      const error = document.getElementById("dffdf-login-error");
      button.disabled = true;
      button.textContent = "Signing in…";
      error.textContent = "";

      try {
        const response = await fetch("/api/login", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: form.username.value,
            password: form.password.value
          }),
          cache: "no-store"
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.success) throw new Error(data.error || "Login failed");
        window.location.reload();
      } catch (err) {
        error.textContent = err.message || "Login failed";
        button.disabled = false;
        button.textContent = "Sign in";
      }
    });

    setTimeout(() => gate.querySelector("input")?.focus(), 0);
  }

  async function checkSession() {
    try {
      const response = await fetch("/api/admin/session", {
        credentials: "same-origin",
        cache: "no-store",
        headers: { Accept: "application/json" }
      });
      const data = await response.json();
      if (!data.authenticated) showLogin();
      else document.body.classList.remove("dffdf-logged-out");
    } catch (error) {
      console.error("Admin session check failed", error);
      showLogin();
    }
  }

  function installLogout() {
    const actions = document.querySelector(".topbar .actions");
    if (!actions || actions.querySelector("[data-admin-logout]")) return;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "button danger";
    button.dataset.adminLogout = "1";
    button.textContent = "↪ Logout";

    button.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (button.disabled) return;
      if (!confirm("Log out of the admin panel?")) return;

      button.disabled = true;
      button.textContent = "Logging out…";
      try {
        const response = await fetch("/api/logout", {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store"
        });
        if (!response.ok) throw new Error(`Logout failed (${response.status})`);
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

  checkSession();
  installLogout();
  setTimeout(installLogout, 300);
  setTimeout(installLogout, 1000);
})();
