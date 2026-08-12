(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const safe = (v, fallback = "") => v == null ? fallback : v;

  function ensureSiteShape() {
    site = site || {};
    site.themes = site.themes || { ...builtInThemes };
    site.glass = { ...(site.glass || {}) };
    site.visitor = { ...(site.visitor || {}) };
    site.responsive = { ...(site.responsive || {}) };
    site.seo = { ...(site.seo || {}) };
    site.media = Array.isArray(site.media) ? site.media : [];
    site.navigation = Array.isArray(site.navigation) ? site.navigation : [];
  }

  function bind(id, getter, setter) {
    const el = $(id);
    if (!el) return;
    el.value = getter();
    el.addEventListener("input", () => { setter(el.value); schedulePreview(); });
    el.addEventListener("change", () => { setter(el.value); schedulePreview(); });
  }

  function bindCheck(id, getter, setter) {
    const el = $(id);
    if (!el) return;
    el.checked = !!getter();
    el.addEventListener("change", () => { setter(el.checked); schedulePreview(); });
  }

  function bindNumber(id, getter, setter) {
    const el = $(id);
    if (!el) return;
    const v = getter();
    if (v !== undefined && v !== null && v !== "") el.value = Number(v);
    el.addEventListener("input", () => { setter(Number(el.value)); schedulePreview(); });
  }

  function bindSettings() {
    ensureSiteShape();

    bind("siteNameInput", () => safe(site.siteName, "DFFDF"), v => site.siteName = v);
    bind("logoInput", () => safe(site.logo), v => site.logo = v);
    bind("faviconInput", () => safe(site.favicon), v => site.favicon = v);
    bind("descriptionInput", () => safe(site.siteDescription), v => site.siteDescription = v);
    bind("siteUrlInput", () => safe(site.siteUrl), v => site.siteUrl = v);
    bind("defaultPageInput", () => safe(site.defaultPage, "home"), v => site.defaultPage = v);
    bindCheck("maintenanceInput", () => site.maintenance, v => site.maintenance = v);
    bindCheck("loadingInput", () => site.loadingScreen !== false, v => site.loadingScreen = v);
    bindCheck("transitionsInput", () => site.pageTransitions !== false, v => site.pageTransitions = v);
    bind("backgroundInput", () => safe(site.backgroundImage), v => site.backgroundImage = v);
    bind("cursorInput", () => safe(site.cursor), v => site.cursor = v);

    const visitor = site.visitor;
    bind("visitorTheme", () => visitor.defaultTheme || "default", v => visitor.defaultTheme = v);
    bindCheck("rememberTheme", () => visitor.remember !== false, v => visitor.remember = v);
    bindCheck("themeSwitcher", () => visitor.themeSwitcher !== false, v => visitor.themeSwitcher = v);
    bindCheck("reduceAnimations", () => visitor.reduceAnimations !== false, v => visitor.reduceAnimations = v);
    bind("mobileLayout", () => visitor.mobileLayout || "Automatic", v => visitor.mobileLayout = v);

    bind("seoTitle", () => site.seo.title || site.siteName || "DFFDF", v => site.seo.title = v);
    bind("seoDescription", () => site.seo.description || site.siteDescription || "", v => site.seo.description = v);
    bind("seoImage", () => site.seo.image || "", v => site.seo.image = v);
    bind("seoRobots", () => site.seo.robots || "index,follow", v => site.seo.robots = v);
    bind("seoMeta", () => site.seo.meta || "", v => site.seo.meta = v);

    const glassMap = {
      blur: ["blur", v => `${v}px`],
      transparency: ["transparency", v => v / 100],
      borderOpacity: ["borderOpacity", v => v / 100],
      shadowStrength: ["shadowStrength", v => v / 100],
      cornerRadius: ["cornerRadius", v => `${v}px`],
      animationSpeed: ["animationSpeed", v => `${v / 100}s`],
      glowStrength: ["glowStrength", v => v / 100]
    };

    document.querySelectorAll("[data-glass]").forEach(el => {
      const key = el.dataset.glass;
      const map = glassMap[key];
      if (!map) return;
      const current = site.glass[map[0]];
      if (current != null) {
        const n = parseFloat(current);
        if (!Number.isNaN(n)) el.value = key === "transparency" || key === "borderOpacity" || key === "shadowStrength" || key === "glowStrength" ? n * 100 : key === "animationSpeed" ? n * 100 : n;
      }
      el.addEventListener("input", () => {
        site.glass[map[0]] = map[1](Number(el.value));
        schedulePreview();
      });
    });

    ["desktop", "tablet", "mobile"].forEach(device => {
      site.responsive[device] = site.responsive[device] || {};
    });
  }

  function wireCustomTheme() {
    ensureSiteShape();
    site.themes.custom = site.themes.custom || { ...builtInThemes.midnight };
    const map = {
      customBackground: "background",
      customSurface: "surface",
      customText: "text",
      customAccent: "accent",
      customAccent2: "accent2"
    };
    Object.entries(map).forEach(([id, key]) => {
      const el = $(id);
      if (!el) return;
      el.value = site.themes.custom[key] || el.value;
      el.addEventListener("input", () => {
        site.themes.custom[key] = el.value;
        site.defaultTheme = "custom";
        renderThemes();
        schedulePreview();
      });
    });
  }

  let preview;
  let previewTimer;

  function openPreview() {
    if (!preview) {
      preview = document.createElement("div");
      preview.id = "dffdf-live-preview";
      preview.innerHTML = `
        <div class="dffdf-preview-backdrop"></div>
        <div class="dffdf-preview-window">
          <div class="dffdf-preview-toolbar">
            <strong>Live Preview</strong>
            <div>
              <button type="button" class="button" data-preview-refresh>↻ Refresh</button>
              <button type="button" class="button" data-preview-close>Close</button>
            </div>
          </div>
          <iframe title="DFFDF live preview" src="/?preview=1" loading="eager"></iframe>
        </div>`;
      document.body.appendChild(preview);
      const style = document.createElement("style");
      style.textContent = `
        #dffdf-live-preview{position:fixed;inset:0;z-index:9999;display:grid;place-items:center}
        .dffdf-preview-backdrop{position:absolute;inset:0;background:rgba(0,0,0,.72);backdrop-filter:blur(12px)}
        .dffdf-preview-window{position:relative;width:min(1440px,96vw);height:min(900px,94vh);background:#09090d;border:1px solid rgba(255,255,255,.14);border-radius:22px;overflow:hidden;box-shadow:0 40px 120px rgba(0,0,0,.6);display:flex;flex-direction:column}
        .dffdf-preview-toolbar{height:58px;flex:0 0 58px;display:flex;align-items:center;justify-content:space-between;padding:0 12px 0 18px;background:rgba(17,18,26,.95);border-bottom:1px solid rgba(255,255,255,.1)}
        .dffdf-preview-toolbar>div{display:flex;gap:8px}.dffdf-preview-window iframe{border:0;width:100%;height:100%;background:#07070b}
      `;
      document.head.appendChild(style);
      preview.querySelector("[data-preview-close]").onclick = () => preview.remove();
      preview.querySelector("[data-preview-refresh]").onclick = () => {
        const frame = preview.querySelector("iframe");
        frame.contentWindow.location.reload();
      };
      preview.querySelector("iframe").addEventListener("load", sendPreview);
    }
    preview.style.display = "grid";
    sendPreview();
  }

  function sendPreview() {
    if (!preview || !document.body.contains(preview)) return;
    const frame = preview.querySelector("iframe");
    if (!frame || !frame.contentWindow) return;
    const selected = $("sectionPage")?.value || site.defaultPage || "home";
    const page = pages.find(p => p.slug === selected) || pages.find(p => p.slug === "home") || pages[0];
    if (!page) return;
    frame.contentWindow.postMessage({ type: "DFFDF_PREVIEW_UPDATE", site, page }, location.origin);
  }

  function schedulePreview() {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(sendPreview, 80);
  }

  function installPreviewButton() {
    const old = document.querySelector('.topbar a[href="/"]');
    if (!old) return;
    old.removeAttribute("href");
    old.removeAttribute("target");
    old.addEventListener("click", e => { e.preventDefault(); openPreview(); });
  }

  async function saveEverything() {
    ensureSiteShape();
    const button = $("saveButton");
    if (button) { button.disabled = true; button.textContent = "Saving…"; }
    try {
      const siteResponse = await fetch("/api/admin/site", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(site)
      });
      const siteData = await siteResponse.json().catch(() => ({}));
      if (!siteResponse.ok) throw new Error(siteData.error || "Site settings could not be saved.");

      for (const page of pages) {
        const response = await fetch(`/api/admin/pages/${encodeURIComponent(page.slug)}`, {
          method: "POST", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(page)
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || `Could not save ${page.slug}.`);
      }
      toast("✓ All settings and pages saved");
      schedulePreview();
    } catch (error) {
      toast(`❌ ${error.message}`);
    } finally {
      if (button) { button.disabled = false; button.textContent = "Save Changes"; }
    }
  }

  function replaceSaveHandler() {
    const button = $("saveButton");
    if (!button) return;
    const fresh = button.cloneNode(true);
    button.replaceWith(fresh);
    fresh.addEventListener("click", saveEverything);
  }

  function improveSections() {
    const original = window.renderSections;
    window.renderSections = function improvedRenderSections() {
      original();
      const page = typeof getEditingPage === "function" ? getEditingPage() : null;
      const editor = $("sectionEditor");
      if (!page || !editor) return;
      page.sections.forEach((section, index) => {
        const row = editor.children[index];
        if (!row) return;
        const editorBox = document.createElement("div");
        editorBox.style.cssText = "grid-column:1/-1;margin-top:10px;display:grid;gap:8px";
        editorBox.innerHTML = `
          <input placeholder="Title" value="${escapeAttr(section.title || "")}" data-sec-title>
          <textarea placeholder="Text" data-sec-text>${escapeHTML(section.text || "")}</textarea>
          ${section.type === "hero" ? `<input placeholder="Badge" value="${escapeAttr(section.badge || "")}" data-sec-badge><input placeholder="Button text" value="${escapeAttr(section.buttonText || "")}" data-sec-button><input placeholder="Button URL" value="${escapeAttr(section.buttonUrl || "")}" data-sec-url>` : ""}
          ${section.type === "contact" ? `<input placeholder="Email" value="${escapeAttr(section.email || "")}" data-sec-email>` : ""}`;
        row.appendChild(editorBox);
        editorBox.querySelector("[data-sec-title]").oninput = e => { section.title = e.target.value; schedulePreview(); };
        editorBox.querySelector("[data-sec-text]").oninput = e => { section.text = e.target.value; schedulePreview(); };
        editorBox.querySelector("[data-sec-badge]")?.addEventListener("input", e => section.badge = e.target.value);
        editorBox.querySelector("[data-sec-button]")?.addEventListener("input", e => section.buttonText = e.target.value);
        editorBox.querySelector("[data-sec-url]")?.addEventListener("input", e => section.buttonUrl = e.target.value);
        editorBox.querySelector("[data-sec-email]")?.addEventListener("input", e => section.email = e.target.value);
      });
    };
  }

  function boot() {
    ensureSiteShape();
    bindSettings();
    wireCustomTheme();
    installPreviewButton();
    replaceSaveHandler();
    improveSections();
    window.addEventListener("message", event => {
      if (event.origin !== location.origin) return;
      if (event.data?.type === "DFFDF_PREVIEW_READY") sendPreview();
      if (event.data?.type === "DFFDF_PREVIEW_APPLIED") schedulePreview();
    });
    document.addEventListener("input", event => {
      if (event.target.matches("input,textarea,select")) schedulePreview();
    });
    $("sectionPage")?.addEventListener("change", schedulePreview);
  }

  // admin.html loads its data asynchronously, so initialize after the first load cycle.
  setTimeout(boot, 700);
  setTimeout(boot, 1800);
})();
