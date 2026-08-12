(() => {
  "use strict";
  if (window.__DFFDF_ADMIN_SYSTEM__) return;
  window.__DFFDF_ADMIN_SYSTEM__ = true;

  const style = document.createElement("style");
  style.textContent = `
    :root {
      --glass-blur: 10px !important;
      --glass-opacity: .14 !important;
      --glass-border: .22 !important;
      --glass-shadow: .28 !important;
      --glass-saturation: 165% !important;
      --glass-radius: 22px !important;
    }

    .glass, .sidebar-inner, .topbar, .card, .stat, .theme-card,
    .page-item, .section-item, .ai-mode, .message.ai, .button,
    input, select, textarea, .toggle .slider, .toast {
      background: linear-gradient(145deg, rgba(255,255,255,.14), rgba(255,255,255,.045)) !important;
      border-color: rgba(255,255,255,.20) !important;
      backdrop-filter: blur(10px) saturate(165%) !important;
      -webkit-backdrop-filter: blur(10px) saturate(165%) !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.16), 0 14px 40px rgba(0,0,0,.18) !important;
    }

    .glass::before, .glass::after { opacity: .8; }

    .button:hover, .theme-card:hover, .page-item:hover, .section-item:hover, .ai-mode:hover {
      background: linear-gradient(145deg, rgba(255,255,255,.20), rgba(255,255,255,.065)) !important;
      border-color: rgba(255,255,255,.30) !important;
    }

    #dffdf-login-gate {
      position: fixed; inset: 0; z-index: 2147483647;
      display: grid; place-items: center; padding: 24px;
      background: rgba(5,5,10,.72);
      backdrop-filter: blur(10px) saturate(135%);
      -webkit-backdrop-filter: blur(10px) saturate(135%);
    }

    #dffdf-login-gate .login-card {
      width: min(430px,100%); padding: 34px;
      border: 1px solid rgba(255,255,255,.22); border-radius: 28px;
      background: linear-gradient(145deg, rgba(255,255,255,.16), rgba(255,255,255,.05));
      box-shadow: inset 0 1px 0 rgba(255,255,255,.18), 0 30px 80px rgba(0,0,0,.38);
      backdrop-filter: blur(10px) saturate(165%);
      -webkit-backdrop-filter: blur(10px) saturate(165%);
    }
    #dffdf-login-gate h1 { margin:0 0 8px; font-size:30px; letter-spacing:-.04em; }
    #dffdf-login-gate p { margin:0 0 24px; color:#a8a8b5; }
    #dffdf-login-gate label { margin-top:14px; }
    #dffdf-login-gate input { background:rgba(255,255,255,.07) !important; }
    #dffdf-login-gate button { width:100%; margin-top:20px; }
    #dffdf-login-error { min-height:20px; margin-top:12px; color:#ff9ba8; font-size:13px; }
    body.dffdf-logged-out > *:not(#dffdf-login-gate) { visibility:hidden !important; }
  `;
  document.head.appendChild(style);

  function showLogin() {
    if (document.getElementById("dffdf-login-gate")) return;
    document.body.classList.add("dffdf-logged-out");
    const gate = document.createElement("div");
    gate.id = "dffdf-login-gate";
    gate.innerHTML = `<form class="login-card" autocomplete="on"><h1>Welcome back.</h1><p>Sign in to your DFFDF admin panel.</p><label for="dffdf-user">Username</label><input id="dffdf-user" name="username" autocomplete="username" required><label for="dffdf-pass">Password</label><input id="dffdf-pass" name="password" type="password" autocomplete="current-password" required><button class="button primary" type="submit">Sign in</button><div id="dffdf-login-error" role="alert"></div></form>`;
    document.body.appendChild(gate);
    gate.querySelector("form").addEventListener("submit", async event => {
      event.preventDefault();
      const form = event.currentTarget, button = form.querySelector("button"), error = document.getElementById("dffdf-login-error");
      button.disabled = true; button.textContent = "Signing in…"; error.textContent = "";
      try {
        const response = await fetch("/api/login", { method:"POST", credentials:"same-origin", headers:{"Content-Type":"application/json"}, body:JSON.stringify({username:form.username.value,password:form.password.value}), cache:"no-store" });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.success) throw new Error(data.error || "Login failed");
        window.location.reload();
      } catch (err) { error.textContent = err.message || "Login failed"; button.disabled=false; button.textContent="Sign in"; }
    });
    setTimeout(() => gate.querySelector("input")?.focus(), 0);
  }

  async function checkSession() {
    try {
      const response = await fetch("/api/admin/session", {credentials:"same-origin", cache:"no-store", headers:{Accept:"application/json"}});
      const data = await response.json();
      if (!data.authenticated) showLogin(); else document.body.classList.remove("dffdf-logged-out");
    } catch (error) { console.error("Admin session check failed", error); showLogin(); }
  }

  // No automatic login. A logged-out visitor must enter credentials manually.
  checkSession();
})();
