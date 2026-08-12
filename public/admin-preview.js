(() => {
  "use strict";
  if (window.__DFFDF_ADMIN_PREVIEW_V3__) return;
  window.__DFFDF_ADMIN_PREVIEW_V3__ = true;

  const $ = id => document.getElementById(id);
  const clone = value => {
    try { return JSON.parse(JSON.stringify(value)); }
    catch { return value; }
  };

  let preview = null;
  let sendTimer = null;
  let bound = false;

  function ensureShape() {
    if (typeof site === "undefined") return false;
    site = site || {};
    site.themes = site.themes || (typeof builtInThemes !== "undefined" ? {...builtInThemes} : {});
    site.glass = site.glass || {};
    site.visitor = site.visitor || {};
    site.seo = site.seo || {};
    site.responsive = site.responsive || {};
    site.navigation = Array.isArray(site.navigation) ? site.navigation : [];
    site.media = Array.isArray(site.media) ? site.media : [];
    return true;
  }

  function themeFor(name) {
    const themes = site.themes || {};
    const fallback = typeof builtInThemes !== "undefined" ? builtInThemes : {};
    return themes[name] || fallback[name] || fallback.midnight || {
      background:"#07070b", surface:"#11121a", surface2:"#181925",
      text:"#fff", muted:"#9b9ba8", accent:"#8065ff", accent2:"#b19cff"
    };
  }

  function applyAdminTheme() {
    if (!ensureShape()) return;
    const t = themeFor(site.defaultTheme || "midnight");
    const root = document.documentElement;
    const vars = {
      "--bg": t.background,
      "--surface": t.surface,
      "--surface2": t.surface2,
      "--text": t.text,
      "--muted": t.muted,
      "--accent": t.accent,
      "--accent2": t.accent2
    };
    Object.entries(vars).forEach(([key,value]) => root.style.setProperty(key, value));
    const g = site.glass || {};
    root.style.setProperty("--glass-blur", g.blur || "30px");
    root.style.setProperty("--glass-opacity", g.transparency ?? .08);
    root.style.setProperty("--glass-border", g.borderOpacity ?? .12);
    root.style.setProperty("--glass-shadow", g.shadowStrength ?? .25);
    root.style.setProperty("--radius", g.cornerRadius || "20px");
    document.body.dataset.dffdfTheme = site.defaultTheme || "midnight";
    const label = $("currentTheme");
    if (label) label.textContent = site.defaultTheme || "midnight";
  }

  function schedulePreview() {
    clearTimeout(sendTimer);
    sendTimer = setTimeout(sendPreview, 80);
  }

  function sendPreview() {
    if (!preview || !document.body.contains(preview) || typeof pages === "undefined") return;
    const frame = preview.querySelector("iframe");
    if (!frame || !frame.contentWindow) return;
    const slug = $("sectionPage")?.value || site.defaultPage || "home";
    const page = pages.find(p => p.slug === slug) || pages.find(p => p.slug === "home") || pages[0];
    if (!page) return;
    frame.contentWindow.postMessage({
      type: "DFFDF_PREVIEW_UPDATE",
      site: clone(site),
      page: clone(page)
    }, location.origin);
  }

  function closePreview() {
    if (!preview) return;
    preview.style.display = "none";
    document.body.classList.remove("dffdf-preview-open");
  }

  function openPreview() {
    if (!preview) {
      preview = document.createElement("div");
      preview.id = "dffdf-live-preview";
      preview.innerHTML = `
        <div class="dffdf-preview-backdrop"></div>
        <div class="dffdf-preview-window" role="dialog" aria-label="Live Preview">
          <div class="dffdf-preview-toolbar">
            <strong>Live Preview</strong>
            <div class="actions">
              <button type="button" class="button" data-preview-refresh>↻ Reload</button>
              <button type="button" class="button primary" data-preview-close>Close</button>
            </div>
          </div>
          <iframe title="DFFDF live preview" src="/?preview=1" loading="eager"></iframe>
        </div>`;
      document.body.appendChild(preview);

      const style = document.createElement("style");
      style.textContent = `
        body.dffdf-preview-open{overflow:hidden}
        #dffdf-live-preview{position:fixed;inset:0;z-index:99999;display:grid;place-items:center}
        .dffdf-preview-backdrop{position:absolute;inset:0;background:rgba(0,0,0,.72);backdrop-filter:blur(12px)}
        .dffdf-preview-window{position:relative;width:min(1440px,96vw);height:min(900px,94vh);background:#09090d;border:1px solid rgba(255,255,255,.16);border-radius:22px;overflow:hidden;box-shadow:0 40px 120px rgba(0,0,0,.7);display:flex;flex-direction:column}
        .dffdf-preview-toolbar{height:58px;flex:0 0 58px;display:flex;align-items:center;justify-content:space-between;padding:0 12px 0 18px;background:rgba(17,18,26,.96);border-bottom:1px solid rgba(255,255,255,.1)}
        .dffdf-preview-toolbar .actions{display:flex;gap:8px}
        .dffdf-preview-window iframe{border:0;width:100%;height:100%;background:#07070b;display:block}
        @media(max-width:700px){.dffdf-preview-window{width:100vw;height:100vh;border-radius:0}.dffdf-preview-toolbar{height:52px;flex-basis:52px}}
      `;
      document.head.appendChild(style);
      preview.querySelector("[data-preview-close]").addEventListener("click", closePreview);
      preview.querySelector("[data-preview-refresh]").addEventListener("click", () => {
        const frame = preview.querySelector("iframe");
        frame.src = "/?preview=1";
      });
      preview.querySelector("iframe").addEventListener("load", () => {
        // Send only after the new document has finished loading. No polling = no flashing.
        requestAnimationFrame(sendPreview);
      });
    }
    preview.style.display = "grid";
    document.body.classList.add("dffdf-preview-open");
    requestAnimationFrame(sendPreview);
  }

  function installPreviewButtons() {
    const actions = document.querySelector(".topbar .actions");
    if (!actions) return;

    // Keep exactly one admin preview trigger.
    const candidates = [...actions.querySelectorAll("a,button")].filter(el =>
      /preview/i.test(el.textContent || "")
    );
    const trigger = candidates[0];
    candidates.slice(1).forEach(el => el.remove());

    if (trigger && !trigger.dataset.dffdfPreviewBound) {
      trigger.dataset.dffdfPreviewBound = "1";
      trigger.removeAttribute("href");
      trigger.removeAttribute("target");
      trigger.type = "button";
      trigger.textContent = "👁 Preview";
      trigger.addEventListener("click", event => {
        event.preventDefault();
        openPreview();
      });
    }

    if (!actions.querySelector("[data-return-site]")) {
      const back = document.createElement("a");
      back.className = "button";
      back.href = "/";
      back.dataset.returnSite = "1";
      back.textContent = "↩ Return to Site";
      actions.insertBefore(back, actions.firstChild);
    }
  }

  function hookThemes() {
    const grid = $("themeGrid");
    if (!grid || grid.dataset.dffdfThemeHook) return;
    grid.dataset.dffdfThemeHook = "1";
    grid.addEventListener("click", event => {
      const card = event.target.closest(".theme-card");
      if (!card || !ensureShape()) return;
      const name = card.dataset.theme || card.dataset.name;
      if (!name) return;
      site.defaultTheme = name;
      grid.querySelectorAll(".theme-card").forEach(c => c.classList.toggle("selected", c === card));
      applyAdminTheme();
      schedulePreview();
    });
  }

  function bindInputs() {
    if (!ensureShape()) return;
    const fields = {
      siteNameInput:"siteName", logoInput:"logo", faviconInput:"favicon",
      descriptionInput:"siteDescription", siteUrlInput:"siteUrl", defaultPageInput:"defaultPage",
      backgroundInput:"backgroundImage", cursorInput:"cursor"
    };
    Object.entries(fields).forEach(([id,key]) => {
      const el = $(id); if (!el || el.dataset.dffdfBound) return;
      el.dataset.dffdfBound = "1";
      el.value = site[key] ?? "";
      const update = () => { site[key] = el.value; schedulePreview(); };
      el.addEventListener("input", update);
      el.addEventListener("change", update);
    });

    const checks = {maintenanceInput:"maintenance",loadingInput:"loadingScreen",transitionsInput:"pageTransitions"};
    Object.entries(checks).forEach(([id,key]) => {
      const el = $(id); if (!el || el.dataset.dffdfBound) return;
      el.dataset.dffdfBound = "1";
      el.checked = site[key] !== false;
      el.addEventListener("change", () => { site[key] = el.checked; schedulePreview(); });
    });

    document.querySelectorAll("[data-glass]").forEach(el => {
      if (el.dataset.dffdfBound) return;
      const key = el.dataset.glass;
      const converters = {
        blur:v=>v+"px", transparency:v=>v/100, borderOpacity:v=>v/100,
        shadowStrength:v=>v/100, cornerRadius:v=>v+"px", animationSpeed:v=>v/100+"s", glowStrength:v=>v/100
      };
      if (!converters[key]) return;
      el.dataset.dffdfBound = "1";
      const current = parseFloat(site.glass[key]);
      if (Number.isFinite(current)) el.value = ["transparency","borderOpacity","shadowStrength","glowStrength"].includes(key) ? current*100 : key === "animationSpeed" ? current*100 : current;
      el.addEventListener("input", () => { site.glass[key] = converters[key](Number(el.value)); applyAdminTheme(); schedulePreview(); });
    });
  }

  function boot() {
    if (!ensureShape() || bound) return;
    bound = true;
    bindInputs();
    applyAdminTheme();
    hookThemes();
    installPreviewButtons();
    document.addEventListener("input", event => {
      if (event.target.matches("input,textarea,select")) schedulePreview();
    }, {passive:true});
    $("sectionPage")?.addEventListener("change", schedulePreview);
  }

  setTimeout(boot, 300);
  setTimeout(() => { installPreviewButtons(); hookThemes(); applyAdminTheme(); }, 1000);
})();
