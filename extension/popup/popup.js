// ============================================================
// 简历库助手 · Popup Script
// 策略：先用内嵌数据同步渲染（保证秒开），再异步从 storage 升级
// ============================================================

const BUILTIN = {
  personal: { name: "蔡琳", phone: "18817238535", email: "c845427500@163.com" },
  education: [
    { school: "中山大学", degree: "岭南学院 金融 专业硕士", period: "2025.09 – 2027.06" },
    { school: "复旦大学", degree: "化学系 化学 / 经济学与金融学（2+X） 本科", period: "2020.09 – 2024.09" },
  ],
  experiences: [
    { id: "yuexiu", company: "越秀产业基金", role: "S基金投资实习生", period: "2026.04 – 至今",
      bullets: ["依托本地部署AI工具，设计拆解逻辑与分析指令，批量导入拟投资项目尽调材料进行定向解析，快速完成企业基本面与行业格局系统梳理，产出公司一页纸报告，缩短立项报告撰写周期65%。"] },
    { id: "hongnei", company: "红内数科", role: "数字营销实习生", period: "2023.01 – 2023.03",
      bullets: [
        "结合品牌方投放要求与小红书平台生态，搭建达人价值量化评估体系，纳入CPC/CPE/CPM等核心投放指标，建立筛选SOP，日均精准筛选KOL/KOC 20+，筛选效率提升68%。",
        "基于广告投放数据、用户行为分析及搜索词表现，定位影响CTR/CPC关键因素，总结高点击素材共性特征，输出数据日报，形成可复用的投放策略模板，助力品牌广告CTR平均提升至5%。",
      ] },
  ],
  projects: [
    { id: "dongmiane", name: "懂面鹅", role: "独立产品设计 & 全栈开发", period: "2026.05",
      bullets: [
        "从「求职者对AI面试半信半疑」痛点出发，设计「先猜→实测→AI逐维度拆解评分→个性化通关」游戏化体验闭环，覆盖4模块、11话题、单人+投屏双场景。",
        "独立全栈开发，基于Next.js 16 + TypeScript + DeepSeek API，设计7条独立AI Prompt管线，纯静态导出部署于Vercel + GitHub Pages双线。",
        "将腾讯BBSI面试评分方法论落地为可执行评分引擎：四维BARS行为锚定（0/3/6/10）+ STAR完整性约束规则 + 本地fallback评分器。",
      ] },
  ],
  leadership: [
    { id: "fda", org: "复旦大学天文协会", role: "会长 / 宣传部部长", period: "2022.01 – 2023.01",
      bullets: ["协调6个部门，负责活动策划、流程设计、人员协调与现场管理，成功落地全国大学生天文摄影比赛、招新季活动等8场大型活动，累计2000+人次参与。"] },
  ],
  skills: {
    "金融工具": ["Wind", "Choice", "Excel（透视表/Vlookup/高级函数）", "PPT"],
    "数据分析": ["Python", "SQL", "Stata"],
    "AI工具": ["ChatGPT", "DeepSeek", "Claude", "OpenClaw"],
    "语言": ["普通话二级甲等", "英语CET-6", "粤语"],
  },
};

let resume = BUILTIN;

// ——— Init: render immediately with builtin, then load from storage & web ———
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("importBtn").addEventListener("click", handleImport);
  document.getElementById("fileInput").addEventListener("change", handleFileSelect);
  document.getElementById("resetBtn").addEventListener("click", handleReset);

  // Step 1: render synchronously with builtin data (no async dependency)
  render();

  // Step 2: try to upgrade from storage
  chrome.storage.local.get("resumeData").then((result) => {
    if (result.resumeData && isValid(result.resumeData)) {
      resume = result.resumeData;
      render();
    }
  }).catch(() => {});

  // Step 3: fetch latest from web (localhost → GitHub Pages)
  syncFromWeb();
});

// ——— Sync: fetch latest data from web app ———
async function syncFromWeb() {
  const urls = [
    "http://localhost:3456/resume-data.json",
    "https://c845427500-creator.github.io/resume-toolkit/resume-data.json",
  ];

  for (const url of urls) {
    try {
      const resp = await fetch(url, { cache: "no-cache" });
      if (!resp.ok) continue;
      const data = await resp.json();
      if (!isValid(data)) continue;

      // Only update if this data is different from what we have
      const current = JSON.stringify(resume);
      const incoming = JSON.stringify(data);
      if (incoming !== current) {
        resume = data;
        await chrome.storage.local.set({ resumeData: data });
        render();
        status("✓ 已从网页同步最新数据", "ok");
      }
      return; // Success — stop trying further URLs
    } catch {
      // try next URL
    }
  }
}

function isValid(data) {
  if (!data || typeof data !== "object") return false;
  return (data.education?.length > 0) ||
    (data.experiences?.length > 0) ||
    (data.projects?.length > 0) ||
    (data.leadership?.length > 0) ||
    (data.skills && Object.keys(data.skills).length > 0);
}

// ——— Render ———
function render() {
  const container = document.getElementById("sections");
  container.innerHTML = "";
  container.classList.remove("hidden");
  document.getElementById("loading").classList.add("hidden");
  document.getElementById("empty").classList.add("hidden");

  if (resume.personal) {
    const p = resume.personal;
    container.appendChild(section("基本信息", [
      item("姓名", p.name), item("电话", p.phone), item("邮箱", p.email),
    ]));
  }
  if (resume.education?.length) {
    container.appendChild(section("教育", resume.education.map((e) =>
      item(e.school, `${e.degree} · ${e.period}`)
    )));
  }
  if (resume.experiences?.length) {
    const items = [];
    resume.experiences.forEach((exp) => {
      (exp.bullets || []).forEach((b) => {
        const t = typeof b === "string" ? b : b.text || "";
        items.push(item(`${exp.company} · ${exp.role}`, t));
      });
    });
    if (items.length) container.appendChild(section("实习经历", items));
  }
  if (resume.projects?.length) {
    const items = [];
    resume.projects.forEach((proj) => {
      (proj.bullets || []).forEach((b) => {
        const t = typeof b === "string" ? b : b.text || "";
        items.push(item(`${proj.name} · ${proj.role}`, t));
      });
    });
    if (items.length) container.appendChild(section("项目经历", items));
  }
  if (resume.leadership?.length) {
    const items = [];
    resume.leadership.forEach((l) => {
      (l.bullets || []).forEach((b) => {
        const t = typeof b === "string" ? b : b.text || "";
        items.push(item(`${l.org} · ${l.role}`, t));
      });
    });
    if (items.length) container.appendChild(section("校园/实践", items));
  }
  if (resume.skills) {
    const items = [];
    Object.entries(resume.skills).forEach(([cat, skills]) => {
      if (Array.isArray(skills)) skills.forEach((s) => items.push(item(cat, s)));
    });
    if (items.length) container.appendChild(section("技能", items));
  }
}

// ——— Section builder ———
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

// ——— Item button builder ———
function item(label, text) {
  const btn = document.createElement("button");
  btn.className = "item-btn";
  btn.innerHTML = `<span class="item-label">${esc(label)}</span><span class="item-text">${esc(text)}</span>`;
  btn.addEventListener("click", () => fill(text));
  return btn;
}

// ——— Fill: send text to active tab's focused element ———
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

function status(msg, type) {
  const bar = document.getElementById("statusBar");
  bar.textContent = msg;
  bar.className = `status-bar ${type}`;
  bar.classList.remove("hidden");
  setTimeout(() => bar.classList.add("hidden"), 1800);
}

// ——— Import / Reset ———
function handleImport() { document.getElementById("fileInput").click(); }

function handleFileSelect(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (ev) => {
    try {
      const data = JSON.parse(ev.target.result);
      if (!isValid(data)) return status("导入的数据不完整，缺少教育/实习/项目等字段", "err");
      resume = data;
      await chrome.storage.local.set({ resumeData: data });
      render();
      status("✓ 导入成功", "ok");
    } catch { status("JSON 格式错误", "err"); }
  };
  reader.readAsText(file);
  e.target.value = "";
}

async function handleReset() {
  resume = BUILTIN;
  await chrome.storage.local.set({ resumeData: BUILTIN });
  render();
  status("✓ 已恢复默认", "ok");
}

function esc(s) { const d = document.createElement("div"); d.textContent = s; return d.innerHTML; }
