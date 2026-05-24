// ============================================================
// 简历库助手 · Popup Script
// 多方向支持 · 栗子暖色调 · 一键同步
// ============================================================

const SYNC_URL = "https://c845427500-creator.github.io/resume-toolkit/resume-data.json";

let data = DEFAULT_DATA;       // { shared, libraries, directions }
let activeDir = "综合";

// ——— Init ———
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("importBtn").addEventListener("click", handleImport);
  document.getElementById("syncBtn").addEventListener("click", handleSync);
  document.getElementById("fileInput").addEventListener("change", handleFileSelect);

  // Step 1: load from storage
  chrome.storage.local.get("resumeData").then((result) => {
    if (result.resumeData && isValid(result.resumeData)) {
      data = result.resumeData;
      if (!data.directions) data.directions = Object.keys(data.libraries || {});
      if (!data.libraries) data.libraries = { "综合": { experiences: [], projects: [], campus: [], social: [], skills: {}, selfEval: "" } };
    }
    if (!data.directions.includes(activeDir)) activeDir = data.directions[0] || "综合";
    renderAll();
  }).catch(() => {
    renderAll();
  });

  // Step 2: auto-sync from active tab (if on resume toolkit page)
  trySyncFromTab();
});

// ——— Validation ———
function isValid(d) {
  return d && typeof d === "object" && d.libraries && Object.keys(d.libraries).length > 0;
}

// ——— Full render: tabs + sections ———
function renderAll() {
  renderTabs();
  renderSections();
}

// —── Direction Tabs ───
function renderTabs() {
  const container = document.getElementById("dirTabs");
  container.innerHTML = "";
  if (!data.directions || data.directions.length <= 1) {
    container.classList.add("hidden");
    return;
  }
  container.classList.remove("hidden");

  data.directions.forEach((dir) => {
    const btn = document.createElement("button");
    btn.className = "dir-tab" + (dir === activeDir ? " active" : "");
    btn.textContent = dir;
    btn.addEventListener("click", () => {
      activeDir = dir;
      renderAll();
    });
    container.appendChild(btn);
  });
}

// —── Sections Rendering ───
function renderSections() {
  const container = document.getElementById("sections");
  container.innerHTML = "";
  container.classList.remove("hidden");
  document.getElementById("loading").classList.add("hidden");
  document.getElementById("empty").classList.add("hidden");

  const lib = (data.libraries && data.libraries[activeDir]) ? data.libraries[activeDir] : null;
  const shared = data.shared || {};
  const p = shared.personal || {};
  const edu = shared.education || {};

  // Personal
  if (p.name || p.phone || p.email) {
    const items = [];
    if (p.name) items.push(item("姓名", p.name));
    if (p.phone) items.push(item("电话", p.phone));
    if (p.email) items.push(item("邮箱", p.email));
    if (items.length) container.appendChild(section("基本信息", items));
  }

  // Education
  const eduItems = [];
  if (edu.master?.schoolName) eduItems.push(item(edu.master.schoolName, `${edu.master.degree || ""} · ${edu.master.period || ""}`));
  if (edu.undergrad?.schoolName) eduItems.push(item(edu.undergrad.schoolName, `${edu.undergrad.degree || ""} · ${edu.undergrad.period || ""}`));
  if (edu.highSchool?.schoolName) eduItems.push(item(edu.highSchool.schoolName, "高中"));
  if (eduItems.length) container.appendChild(section("教育经历", eduItems));

  if (!lib) {
    document.getElementById("empty").classList.remove("hidden");
    container.classList.add("hidden");
    return;
  }

  // Experiences
  if (lib.experiences?.length) {
    const items = [];
    lib.experiences.forEach((exp) => {
      const label = `${exp.name || exp.company || ""} · ${exp.role || ""}`;
      (exp.bullets || []).forEach((b) => {
        const text = typeof b === "string" ? b : b.text || "";
        if (text) items.push(item(label, text));
      });
    });
    if (items.length) container.appendChild(section("工作/实习经历", items));
  }

  // Projects
  if (lib.projects?.length) {
    const items = [];
    lib.projects.forEach((proj) => {
      const label = `${proj.name || ""} · ${proj.role || ""}`;
      (proj.bullets || []).forEach((b) => {
        const text = typeof b === "string" ? b : b.text || "";
        if (text) items.push(item(label, text));
      });
    });
    if (items.length) container.appendChild(section("项目经历", items));
  }

  // Campus
  if (lib.campus?.length) {
    const items = [];
    lib.campus.forEach((c) => {
      const label = `${c.name || ""} · ${c.role || ""}`;
      (c.bullets || []).forEach((b) => {
        const text = typeof b === "string" ? b : b.text || "";
        if (text) items.push(item(label, text));
      });
    });
    if (items.length) container.appendChild(section("校园经历", items));
  }

  // Social
  if (lib.social?.length) {
    const items = [];
    lib.social.forEach((s) => {
      const label = `${s.name || ""} · ${s.role || ""}`;
      (s.bullets || []).forEach((b) => {
        const text = typeof b === "string" ? b : b.text || "";
        if (text) items.push(item(label, text));
      });
    });
    if (items.length) container.appendChild(section("社会/实践经历", items));
  }

  // Skills
  if (lib.skills && Object.keys(lib.skills).length > 0) {
    const items = [];
    Object.entries(lib.skills).forEach(([cat, skills]) => {
      if (Array.isArray(skills)) skills.forEach((s) => items.push(item(cat, s)));
    });
    if (items.length) container.appendChild(section("技能", items));
  }

  // SelfEval
  if (lib.selfEval) {
    container.appendChild(section("自我评价", [item("自我评价", lib.selfEval)]));
  }
}

// —── Section builder ───
function section(title, itemEls) {
  const div = document.createElement("div");
  div.className = "section";
  const header = document.createElement("div");
  header.className = "section-header";
  header.innerHTML = `<span class="section-title">${esc(title)}</span><span class="section-badge">${itemEls.length}</span><span class="section-arrow">▼</span>`;
  header.addEventListener("click", () => div.classList.toggle("collapsed"));
  const body = document.createElement("div");
  body.className = "section-body";
  itemEls.forEach((el) => body.appendChild(el));
  div.appendChild(header);
  div.appendChild(body);
  return div;
}

// —── Item builder ───
function item(label, text) {
  const btn = document.createElement("button");
  btn.className = "item-btn";
  btn.innerHTML = `<span class="item-label">${esc(label)}</span><span class="item-text">${esc(text)}</span>`;
  btn.addEventListener("click", () => fill(text));
  return btn;
}

// —── Fill active input ───
async function fill(text) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    const resp = await chrome.tabs.sendMessage(tab.id, { type: "fill", text });
    if (resp?.success) return status("✓ 已填入", "ok");
    if (resp?.error) return status(resp.error, "err");
    status("✓", "ok");
  } catch {
    status("请刷新网页后重试", "err");
  }
}

// —── Status toast ───
function status(msg, type) {
  const bar = document.getElementById("statusBar");
  bar.textContent = msg;
  bar.className = `status-bar ${type}`;
  bar.classList.remove("hidden");
  setTimeout(() => bar.classList.add("hidden"), 2000);
}

// —── Auto-sync from active tab (content script reads localStorage) ───
async function trySyncFromTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    await chrome.tabs.sendMessage(tab.id, { type: "sync" });
    // Re-read from storage after sync
    const result = await chrome.storage.local.get("resumeData");
    if (result.resumeData && isValid(result.resumeData)) {
      const prev = JSON.stringify(data);
      data = result.resumeData;
      if (!data.directions) data.directions = Object.keys(data.libraries || {});
      if (!data.directions.includes(activeDir)) activeDir = data.directions[0] || "综合";
      if (JSON.stringify(data) !== prev) renderAll();
    }
  } catch {} // Tab might not be the library page or content script not injected yet
}

// —── Sync: try tab first, then HTTP fetch ───
async function handleSync() {
  const btn = document.getElementById("syncBtn");
  btn.textContent = "同步中...";
  btn.disabled = true;

  try {
    // Try sync from active tab first (content script reads localStorage)
    await trySyncFromTab();

    const isEmpty = !isValid(data) || !data.libraries || Object.keys(data.libraries).every((k) => {
      const lib = data.libraries[k];
      return !lib.experiences?.length && !lib.projects?.length && !lib.campus?.length && !lib.social?.length;
    });

    if (isEmpty) {
      const resp = await fetch(SYNC_URL, { cache: "no-cache" });
      if (!resp.ok) throw new Error("HTTP " + resp.status);
      const json = await resp.json();
      if (!isValid(json)) throw new Error("数据格式不符");
      data = json;
      if (!data.directions) data.directions = Object.keys(data.libraries || {});
      if (!data.directions.includes(activeDir)) activeDir = data.directions[0] || "综合";
      await chrome.storage.local.set({ resumeData: data });
      renderAll();
    }
    status("✓ 同步成功（" + data.directions.length + " 个方向）", "ok");
  } catch (e) {
    status("同步失败：" + (e.message || "网络错误"), "err");
  } finally {
    btn.textContent = "同步";
    btn.disabled = false;
  }
}

// ——— Import from clipboard (primary) or file (fallback) ———
async function handleImport() {
  try {
    const clipText = await navigator.clipboard.readText();
    if (clipText) {
      const json = JSON.parse(clipText);
      if (isValid(json)) {
        data = json;
        if (!data.directions) data.directions = Object.keys(data.libraries || {});
        if (!data.directions.includes(activeDir)) activeDir = data.directions[0] || "综合";
        await chrome.storage.local.set({ resumeData: data });
        renderAll();
        status("✓ 已从剪贴板导入（" + data.directions.length + " 个方向）", "ok");
        return;
      }
    }
  } catch {}
  // Fallback: file import
  document.getElementById("fileInput").click();
}

function handleFileSelect(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (ev) => {
    try {
      const json = JSON.parse(ev.target.result);
      if (!isValid(json)) return status("数据格式不符，缺少 libraries 字段", "err");
      data = json;
      if (!data.directions) data.directions = Object.keys(data.libraries || {});
      if (!data.directions.includes(activeDir)) activeDir = data.directions[0] || "综合";
      await chrome.storage.local.set({ resumeData: data });
      renderAll();
      status("✓ 导入成功（" + data.directions.length + " 个方向）", "ok");
    } catch { status("JSON 格式错误", "err"); }
  };
  reader.readAsText(file);
  e.target.value = "";
}

// —── Escape ───
function esc(s) { const d = document.createElement("div"); d.textContent = s || ""; return d.innerHTML; }
