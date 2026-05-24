// ============================================================
// 简历库助手 · Popup Script
// 多方向支持 · 栗子暖色调 · 一键同步
// ============================================================

const SYNC_URL = "https://c845427500-creator.github.io/resume-toolkit/resume-data.json";

let data = DEFAULT_DATA;       // { shared, libraries, directions }
let activeDir = "综合";

// ——— Init ———
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("matchBtn").addEventListener("click", handleAutoFill);
  document.getElementById("syncBtn").addEventListener("click", handleSync);

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

  // Step 2: auto-sync from active tab
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

  // Personal — each field as a tag
  const personalTags = [];
  const personalFields = [
    ["姓名", p.name], ["电话", p.phone], ["邮箱", p.email],
  ];
  personalFields.forEach(([label, value]) => {
    if (value) personalTags.push(tag(label, value));
  });
  if (personalTags.length) container.appendChild(section("基本信息", personalTags));

  // Education — each school as a tag
  const eduTags = [];
  if (edu.master?.schoolName) {
    eduTags.push(tag(edu.master.schoolName, `${edu.master.degree || ""} · ${edu.master.period || ""}`));
  }
  if (edu.undergrad?.schoolName) {
    eduTags.push(tag(edu.undergrad.schoolName, `${edu.undergrad.degree || ""} · ${edu.undergrad.period || ""}`));
  }
  if (edu.highSchool?.schoolName) {
    eduTags.push(tag(edu.highSchool.schoolName, "高中"));
  }
  if (eduTags.length) container.appendChild(section("教育经历", eduTags));

  if (!lib) {
    document.getElementById("empty").classList.remove("hidden");
    container.classList.add("hidden");
    return;
  }

  // Experiences — each experience as a tag
  if (lib.experiences?.length) {
    const tags = lib.experiences.map((exp) => {
      const label = `${exp.name || exp.company || ""} · ${exp.role || ""}`;
      return tag(label, label);
    });
    container.appendChild(section("工作/实习经历", tags));
  }

  // Projects — each project as a tag
  if (lib.projects?.length) {
    const tags = lib.projects.map((proj) => {
      const label = `${proj.name || ""} · ${proj.role || ""}`;
      return tag(label, label);
    });
    container.appendChild(section("项目经历", tags));
  }

  // Campus
  if (lib.campus?.length) {
    const tags = lib.campus.map((c) => {
      const label = `${c.name || ""} · ${c.role || ""}`;
      return tag(label, label);
    });
    container.appendChild(section("校园经历", tags));
  }

  // Social
  if (lib.social?.length) {
    const tags = lib.social.map((s) => {
      const label = `${s.name || ""} · ${s.role || ""}`;
      return tag(label, label);
    });
    container.appendChild(section("社会/实践经历", tags));
  }

  // Skills — each category as a tag
  if (lib.skills && Object.keys(lib.skills).length > 0) {
    const tags = Object.entries(lib.skills).map(([cat, skills]) => {
      const skillText = Array.isArray(skills) ? skills.join("、") : "";
      return tag(cat, skillText);
    });
    container.appendChild(section("技能", tags));
  }

  // SelfEval
  if (lib.selfEval) {
    container.appendChild(section("自我评价", [tag("自我评价", lib.selfEval)]));
  }
}

// —── Section builder (collapsed by default) ───
function section(title, tagEls) {
  const div = document.createElement("div");
  div.className = "section collapsed";
  const header = document.createElement("div");
  header.className = "section-header";
  header.innerHTML = `<span class="section-title">${esc(title)}</span><span class="section-badge">${tagEls.length}</span><span class="section-arrow">▼</span>`;
  header.addEventListener("click", () => div.classList.toggle("collapsed"));
  const body = document.createElement("div");
  body.className = "section-body";
  const grid = document.createElement("div");
  grid.className = "tag-grid";
  tagEls.forEach((el) => grid.appendChild(el));
  body.appendChild(grid);
  div.appendChild(header);
  div.appendChild(body);
  return div;
}

// —── Tag builder ───
function tag(label, fillText) {
  const btn = document.createElement("button");
  btn.className = "info-tag";
  btn.textContent = label;
  btn.title = fillText || label;
  btn.addEventListener("click", () => fill(fillText || label));
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

// —── Auto-sync from active tab ───
async function trySyncFromTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return false;
    const resp = await chrome.tabs.sendMessage(tab.id, { type: "sync" });
    if (resp?.success && resp.data && isValid(resp.data)) {
      const prev = JSON.stringify(data);
      data = resp.data;
      if (!data.directions) data.directions = Object.keys(data.libraries || {});
      if (!data.directions.includes(activeDir)) activeDir = data.directions[0] || "综合";
      if (JSON.stringify(data) !== prev) renderAll();
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// —── Sync: try tab first, then HTTP fetch ───
async function handleSync() {
  const btn = document.getElementById("syncBtn");
  btn.textContent = "同步中...";
  btn.disabled = true;

  try {
    // Try sync from active tab first (content script reads localStorage)
    const synced = await trySyncFromTab();

    if (!synced) {
      // Fallback: HTTP fetch
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
    const c = data._counts;
    if (c) {
      status("✓ 已同步 " + c.dirs + " 个方向（" + c.exp + " 经历 + " + c.proj + " 项目 + " + c.campus + " 校园 + " + c.social + " 实践）", "ok");
    } else {
      status("✓ 同步成功（" + data.directions.length + " 个方向）", "ok");
    }
  } catch (e) {
    status("同步失败：" + (e.message || "网络错误"), "err");
  } finally {
    btn.textContent = "同步";
    btn.disabled = false;
  }
}

// —── One-click auto-fill ───
async function handleAutoFill() {
  const btn = document.getElementById("matchBtn");
  btn.textContent = "匹配中...";
  btn.disabled = true;

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) { status("无法获取当前标签页", "err"); return; }

    const lib = data.libraries?.[activeDir] || {};
    const payload = {
      shared: data.shared || {},
      lib: lib,
    };

    const resp = await chrome.tabs.sendMessage(tab.id, { type: "autoFill", data: payload });
    if (resp?.success) {
      const msg = "✓ 已匹配 " + resp.filled + " 个字段" + (resp.unmatched > 0 ? "，" + resp.unmatched + " 个未匹配已标红" : "");
      status(msg, resp.unmatched > 0 ? "err" : "ok");
    } else {
      status("匹配失败：" + (resp?.error || "未知错误"), "err");
    }
  } catch {
    status("请刷新网页后重试", "err");
  } finally {
    btn.textContent = "一键匹配";
    btn.disabled = false;
  }
}

// —── Escape ───
function esc(s) { const d = document.createElement("div"); d.textContent = s || ""; return d.innerHTML; }
