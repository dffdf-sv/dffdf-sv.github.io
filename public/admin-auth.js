(() => {
  "use strict";
  if (window.__DFFDF_ADMIN_AUTH__) return;
  window.__DFFDF_ADMIN_AUTH__ = true;

  let redirecting = false;
  const originalFetch = window.fetch.bind(window);

  function goToLogin() {
    if (redirecting) return;
    redirecting = true;
    window.location.replace("/admin");
  }

  window.fetch = async (...args) => {
    const response = await originalFetch(...args);
    const url = typeof args[0] === "string" ? args[0] : args[0]?.url || "";
    if (response.status === 401 && url.includes("/api/admin/")) goToLogin();
    return response;
  };

  async function verifySession() {
    try {
      const response = await originalFetch("/api/admin/session", {
        credentials: "same-origin",
        cache: "no-store",
        headers: { Accept: "application/json" }
      });
      const data = await response.json().catch(() => ({}));
      if (!data.authenticated) goToLogin();
    } catch {
      // Do not kick out on a temporary network failure.
    }
  }

  verifySession();
  setInterval(verifySession, 4000);
})();
