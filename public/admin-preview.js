(() => {
  "use strict";
  if (window.__DFFDF_ADMIN_ENHANCED_V2__) return;
  window.__DFFDF_ADMIN_ENHANCED_V2__ = true;

  const $ = id => document.getElementById(id);
  const safe = (v, fallback = "") => v == null ? fallback : v;
  let preview = null;
  let previewTimer = null;
  let previewKeepAlive = null;

  function ensureShape() {
    if (typeof site === "undefined") return;
    site = site || {};
    site.themes = site.themes || (typeof builtInThemes !== "undefined" ? {...builtInThemes} : {});
    site.glass = {...(site.glass || {})};
    site.visitor = {...(site.visitor || {})};
    site.seo = {...(site.seo || {})};
    site.responsive = {...(site.responsive || {})};
    site.media = Array.isArray(site.media) ? site.media : [];
    site.navigation = Array.isArray(site.navigation) ? site.navigation : [];
  }

  function previewNow() {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(sendPreview, 60);
  }

  function sendPreview() {
    if (!preview || !document.body.contains(preview) || typeof pages === "undefined") return;
    const frame = preview.querySelector("iframe");
    if (!frame?.contentWindow) return;
    const slug = $("sectionPage")?.value || site.defaultPage || "home";
    const page = pages.find(p => p.slug === slug) || pages.find(p => p.slug === "home") || pages[0];
    if (!page) return;
    frame.contentWindow.postMessage({type:"DFFDF_PREVIEW_UPDATE", site: JSON.parse(JSON.stringify(site)), page: JSON.parse(JSON.stringify(page))}, location.origin);
  }

  function openPreview() {
    if (!preview) {
      preview = document.createElement("div");
      preview.id = "dffdf-live-preview";
      preview.innerHTML = `
        <div class="dffdf-preview-backdrop"></div>
        <div class="dffdf-preview-window">
          <div class="dffdf-preview-toolbar">
            <strong>Live Preview</strong>
            <div class="actions">
              <button type="button" class="button" data-preview-refresh>↻ Refresh</button>
              <button type="button" class="button primary" data-preview-close>Close</button>
            </div>
          </div>
          <iframe title="DFFDF live preview" src="/?preview=1" loading="eager"></iframe>
        </div>`;
      document.body.appendChild(preview);
      const style = document.createElement("style");
      style.textContent = `
        #dffdf-live-preview{position:fixed;inset:0;z-index:99999;display:grid;place-items:center}
        .dffdf-preview-backdrop{position:absolute;inset:0;background:rgba(0,0,0,.76);backdrop-filter:blur(14px)}
        .dffdf-preview-window{position:relative;width:min(1440px,96vw);height:min(900px,94vh);background:#09090d;border:1px solid rgba(255,255,255,.16);border-radius:22px;overflow:hidden;box-shadow:0 40px 120px rgba(0,0,0,.7);display:flex;flex-direction:column}
        .dffdf-preview-toolbar{height:58px;flex:0 0 58px;display:flex;align-items:center;justify-content:space-between;padding:0 12px 0 18px;background:rgba(17,18,26,.96);border-bottom:1px solid rgba(255,255,255,.1)}
        .dffdf-preview-toolbar .actions{display:flex;gap:8px}.dffdf-preview-window iframe{border:0;width:100%;height:100%;background:#07070b}
        @media(max-width:700px){.dffdf-preview-window{width:100vw;height:100vh;border-radius:0}.dffdf-preview-toolbar{height:52px;flex-basis:52px}}
      `;
      document.head.appendChild(style);
      preview.querySelector("[data-preview-close]").onclick = closePreview;
      preview.querySelector("[data-preview-refresh]").onclick = () => {
        const frame = preview.querySelector("iframe");
        frame.src = "/?preview=1&t=" + Date.now();
      };
      preview.querySelector("iframe").addEventListener("load", sendPreview);
    }
    preview.style.display = "grid";
    sendPreview();
    clearInterval(previewKeepAlive);
    previewKeepAlive = setInterval(sendPreview, 250);
  }

  function closePreview() {
    clearInterval(previewKeepAlive);
    previewKeepAlive = null;
    if (preview) preview.remove();
    preview = null;
  }

  function installReturnAndPreview() {
    const actions = document.querySelector(".topbar .actions");
    if (!actions) return;
    const previewLink = actions.querySelector('a[href="/"]');
    if (previewLink && !previewLink.dataset.dffdfBound) {
      previewLink.dataset.dffdfBound = "1";
      previewLink.removeAttribute("href");
      previewLink.removeAttribute("target");
      previewLink.textContent = "👁 Preview";
      previewLink.addEventListener("click", e => { e.preventDefault(); openPreview(); });
    }
    if (!actions.querySelector("[data-return-site]")) {
      const back = document.createElement("a");
      back.className = "button";
      back.href = "/";
      back.dataset.returnSite = "1";
      back.textContent = "↩ Return to Site";
      back.title = "Open the live website";
      actions.insertBefore(back, actions.firstChild);
    }
  }

  function themeFor(name) {
    const fallback = typeof builtInThemes !== "undefined" ? builtInThemes : {};
    return site.themes?.[name] || fallback[name] || fallback.midnight || {
      background:"#050507",surface:"#101117",surface2:"#171823",text:"#fff",muted:"#a1a1ae",accent:"#8065ff",accent2:"#bbaeff",border:"rgba(255,255,255,.14)"
    };
  }

  function applyAdminTheme() {
    if (typeof site === "undefined") return;
    ensureShape();
    const name = site.defaultTheme || "midnight";
    const t = themeFor(name);
    const root = document.documentElement;
    const values = {bg:t.background,surface:t.surface,surface2:t.surface2,text:t.text,muted:t.muted,accent:t.accent,accent2:t.accent2};
    Object.entries(values).forEach(([k,v]) => root.style.setProperty("--"+k,v));
    const glass = site.glass || {};
    root.style.setProperty("--glass-blur", glass.blur || "30px");
    root.style.setProperty("--glass-opacity", glass.transparency ?? .08);
    root.style.setProperty("--glass-border", glass.borderOpacity ?? .12);
    root.style.setProperty("--glass-shadow", glass.shadowStrength ?? .25);
    root.style.setProperty("--radius", glass.cornerRadius || "20px");
    document.body.dataset.dffdfTheme = name;
    const label = $("currentTheme");
    if (label) label.textContent = name;
  }

  function hookThemes() {
    const grid = $("themeGrid");
    if (!grid || grid.dataset.dffdfThemeHook) return;
    grid.dataset.dffdfThemeHook = "1";
    grid.addEventListener("click", e => {
      const card = e.target.closest(".theme-card");
      if (!card) return;
      const name = card.dataset.theme || card.getAttribute("data-name") || card.getAttribute("data-theme-name");
      if (name) {
        site.defaultTheme = name;
        applyAdminTheme();
        previewNow();
      }
    });
  }

  function bindInputs() {
    ensureShape();
    const fields = {
      siteNameInput:["siteName"],logoInput:["logo"],faviconInput:["favicon"],descriptionInput:["siteDescription"],siteUrlInput:["siteUrl"],defaultPageInput:["defaultPage"],backgroundInput:["backgroundImage"],cursorInput:["cursor"]
    };
    Object.entries(fields).forEach(([id,path]) => {
      const el=$(id); if(!el || el.dataset.dffdfBound) return;
      el.dataset.dffdfBound="1"; el.value=safe(site[path[0]],"");
      const set=()=>{site[path[0]]=el.value; previewNow();}; el.addEventListener("input",set); el.addEventListener("change",set);
    });
    const checks={maintenanceInput:"maintenance",loadingInput:"loadingScreen",transitionsInput:"pageTransitions"};
    Object.entries(checks).forEach(([id,key])=>{const el=$(id);if(!el||el.dataset.dffdfBound)return;el.dataset.dffdfBound="1";el.checked=key==="loadingScreen"?site[key]!==false:site[key]!==false;el.addEventListener("change",()=>{site[key]=el.checked;previewNow();});});
    const visitor=site.visitor;
    const vs={visitorTheme:"defaultTheme",mobileLayout:"mobileLayout"};
    Object.entries(vs).forEach(([id,key])=>{const el=$(id);if(!el||el.dataset.dffdfBound)return;el.dataset.dffdfBound="1";el.value=visitor[key]||el.value;el.addEventListener("change",()=>{visitor[key]=el.value;previewNow();});});
    const vc={rememberTheme:"remember",themeSwitcher:"themeSwitcher",reduceAnimations:"reduceAnimations"};
    Object.entries(vc).forEach(([id,key])=>{const el=$(id);if(!el||el.dataset.dffdfBound)return;el.dataset.dffdfBound="1";el.checked=visitor[key]!==false;el.addEventListener("change",()=>{visitor[key]=el.checked;previewNow();});});
    const seo={seoTitle:"title",seoDescription:"description",seoImage:"image",seoRobots:"robots",seoMeta:"meta"};
    Object.entries(seo).forEach(([id,key])=>{const el=$(id);if(!el||el.dataset.dffdfBound)return;el.dataset.dffdfBound="1";el.value=site.seo[key]||"";el.addEventListener("input",()=>{site.seo[key]=el.value;previewNow();});});
    const glass={blur:["blur",v=>v+"px"],transparency:["transparency",v=>v/100],borderOpacity:["borderOpacity",v=>v/100],shadowStrength:["shadowStrength",v=>v/100],cornerRadius:["cornerRadius",v=>v+"px"],animationSpeed:["animationSpeed",v=>v/100+"s"],glowStrength:["glowStrength",v=>v/100]};
    document.querySelectorAll("[data-glass]").forEach(el=>{if(el.dataset.dffdfBound)return;const key=el.dataset.glass,map=glass[key];if(!map)return;el.dataset.dffdfBound="1";const old=parseFloat(site.glass[map[0]]);if(!Number.isNaN(old))el.value=key==="transparency"||key==="borderOpacity"||key==="shadowStrength"||key==="glowStrength"?old*100:key==="animationSpeed"?old*100:old;el.addEventListener("input",()=>{site.glass[map[0]]=map[1](Number(el.value));applyAdminTheme();previewNow();});});
  }

  async function saveEverything() {
    ensureShape();
    const b=$("saveButton"); if(b){b.disabled=true;b.textContent="Saving…";}
    try{
      const r=await fetch("/api/admin/site",{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify(site)});
      const d=await r.json().catch(()=>({})); if(!r.ok)throw new Error(d.error||"Site settings could not be saved.");
      if(typeof pages!=="undefined") for(const p of pages){const pr=await fetch(`/api/admin/pages/${encodeURIComponent(p.slug)}`,{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify(p)});if(!pr.ok)throw new Error(`Could not save ${p.slug}.`);}
      if(typeof toast==="function")toast("✓ Saved");
      sendPreview();
    }catch(e){if(typeof toast==="function")toast("❌ "+e.message);}
    finally{if(b){b.disabled=false;b.textContent="Save Changes";}}
  }

  function hookSave(){const b=$("saveButton");if(!b||b.dataset.dffdfSave)return;b.dataset.dffdfSave="1";const n=b.cloneNode(true);b.replaceWith(n);n.addEventListener("click",saveEverything);}

  function boot(){
    if(typeof site==="undefined")return;
    ensureShape(); bindInputs(); applyAdminTheme(); hookThemes(); installReturnAndPreview(); hookSave();
    document.addEventListener("input",e=>{if(e.target.matches("input,textarea,select"))previewNow();},{passive:true});
    $("sectionPage")?.addEventListener("change",previewNow);
    setTimeout(()=>{installReturnAndPreview();hookThemes();applyAdminTheme();},500);
    setTimeout(()=>{installReturnAndPreview();hookThemes();applyAdminTheme();},1500);
  }
  setTimeout(boot,500);
  setTimeout(boot,1500);
})();
