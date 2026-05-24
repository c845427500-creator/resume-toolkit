// Track the last focused element so it survives popup focus-steal
let lastFocusedEl = null;
document.addEventListener("focusin", (e) => {
  lastFocusedEl = e.target;
});

// ─── Build sync data from web app's localStorage ───
function buildSyncData() {
  const raw = localStorage.getItem("resume_library_v2");
  if (!raw) return null;
  const store = JSON.parse(raw);
  if (!store || !store.libraries) return null;

  const dirs = Object.keys(store.libraries);
  // Count total items across all directions
  let totalExp = 0, totalProj = 0, totalCampus = 0, totalSocial = 0;
  dirs.forEach((d) => {
    const lib = store.libraries[d];
    if (lib) {
      totalExp += lib.experiences?.length || 0;
      totalProj += lib.projects?.length || 0;
      totalCampus += lib.campus?.length || 0;
      totalSocial += lib.social?.length || 0;
    }
  });

  return {
    shared: store.shared || {},
    libraries: store.libraries || {},
    directions: dirs,
    _counts: { dirs: dirs.length, exp: totalExp, proj: totalProj, campus: totalCampus, social: totalSocial },
  };
}

// ─── Auto-sync on page load: push to extension storage ───
(function () {
  const data = buildSyncData();
  if (data) {
    chrome.storage.local.set({ resumeData: data }).catch(() => {});
  }
})();

// ─── Listen for sync request from web page ───
window.addEventListener("resume:sync-to-extension", async () => {
  const data = buildSyncData();
  if (data) {
    await chrome.storage.local.set({ resumeData: data });
    window.dispatchEvent(new CustomEvent("resume:sync-done"));
  }
});

// ─── Listen for messages from popup ───
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "fill") {
    sendResponse(fillActiveElement(message.text));
    return true;
  }
  if (message.type === "sync") {
    const data = buildSyncData();
    if (data) {
      chrome.storage.local.set({ resumeData: data }).catch(() => {});
      sendResponse({ success: true, data });
    } else {
      sendResponse({ success: false, error: "未找到简历数据，请先打开简历库页面" });
    }
    return true;
  }
  if (message.type === "autoFill") {
    const result = autoFillAll(message.data);
    sendResponse(result);
    return true;
  }
  return false;
});

// ─── Field matching patterns (expanded, with weights) ───
const FIELD_PATTERNS = [
  // Personal — high priority keywords
  { keys: ["姓名", "名字", "name", "fullname", "full_name", "fullName", "姓 名"], field: "name", weight: 10 },
  { keys: ["电话", "手机", "联系电话", "联系方式", "phone", "tel", "mobile", "手机号码", "电话号码", "联系 电话"], field: "phone", weight: 10 },
  { keys: ["邮箱", "邮件", "电子邮箱", "email", "e-mail", "电子邮件", "mail", "e mail"], field: "email", weight: 10 },
  { keys: ["身份证", "身份证号", "id", "idNumber", "证件号码", "证件号", "身份证 号码"], field: "idNumber", weight: 9 },
  { keys: ["性别", "gender", "sex"], field: "gender", weight: 8 },
  { keys: ["出生", "生日", "birth", "出生日期", "birthday", "出生年月", "出生 日期"], field: "birthDate", weight: 9 },
  { keys: ["民族", "ethnicity"], field: "ethnicity", weight: 7 },
  { keys: ["籍贯", "nativePlace", "籍贯地"], field: "nativePlace", weight: 7 },
  { keys: ["政治面貌", "politicalStatus", "政治"], field: "politicalStatus", weight: 7 },
  { keys: ["婚姻", "marital", "maritalStatus", "婚姻状况", "婚否"], field: "marital", weight: 7 },
  { keys: ["身高", "height", "身高cm"], field: "height", weight: 6 },
  { keys: ["体重", "weight", "体重kg"], field: "weight", weight: 6 },
  { keys: ["户籍", "户口", "hukou", "户籍所在地", "户口所在地", "户口地址", "户籍地址"], field: "hukou", weight: 8 },
  { keys: ["现居", "现住", "居住地址", "current Address", "现居住地", "通讯地址", "联系地址", "所在地区"], field: "address", weight: 8 },
  { keys: ["紧急联系人", "emergencyContact", "紧急 联系人"], field: "emergencyContact", weight: 6 },
  { keys: ["紧急电话", "emergencyPhone", "紧急 电话", "联系人电话"], field: "emergencyPhone", weight: 6 },
  { keys: ["健康状况", "health", "健康"], field: "healthStatus", weight: 5 },

  // Education
  { keys: ["学校", "毕业院校", "院校", "school", "university", "college", "毕业学校", "所在学校", "就读学校"], field: "school", weight: 9 },
  { keys: ["学历", "学位", "degree", "教育程度", "最高学历", "文化程度", "学历层次"], field: "degree", weight: 9 },
  { keys: ["专业", "major", "所学专业", "就读专业", "专业名称", "主修专业"], field: "major", weight: 9 },
  { keys: ["学制", "全日制", "fullTime", "统招", "学习形式"], field: "fullTime", weight: 6 },
  { keys: ["学院", "collegeName", "院系", "所在学院"], field: "college", weight: 7 },
  { keys: ["毕业时间", "毕业日期", "毕业年月", "period"], field: "eduPeriod", weight: 7 },

  // Experience
  { keys: ["公司", "工作单位", "company", "employer", "单位名称", "所在单位", "工作 单位", "任职单位"], field: "company", weight: 8 },
  { keys: ["职位", "岗位", "职务", "role", "position", "job", "title", "担任职务", "应聘职位", "求职意向", "期望职位", "应聘岗位"], field: "role", weight: 8 },
  { keys: ["工作城市", "期望城市", "city", "意向城市", "期望工作地", "所在城市"], field: "city", weight: 7 },

  // Self
  { keys: ["自我评价", "个人评价", "自我介绍", "selfEval", "self", "evaluation", "个人简介", "特长", "其他说明", "能力描述"], field: "selfEval", weight: 6 },
  { keys: ["技能", "skills", "专业技能", "掌握技能", "技术栈", "个人技能", "能力特长"], field: "skills", weight: 6 },
];

// ─── Context blocks for section-aware matching ───
const CONTEXT_BLOCKS = {
  education: { keywords: ["教育", "学历", "学习经历", "教育背景", "教育经历", "education"], fields: ["school", "degree", "major", "college", "eduPeriod", "fullTime"] },
  experience: { keywords: ["工作", "实习", "职业", "就业", "从业", "experience", "work"], fields: ["company", "role", "city"] },
  personal: { keywords: ["基本", "个人", "联系", "basic", "personal", "info"], fields: ["name", "phone", "email", "idNumber", "gender", "birthDate", "ethnicity", "nativePlace", "politicalStatus", "marital", "height", "weight", "hukou", "address", "emergencyContact", "emergencyPhone"] },
};

// ─── Extract label text for a form element ───
function getFieldLabel(el) {
  const parts = [];

  // 1. <label for="id">
  if (el.id) {
    const label = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
    if (label) parts.push(label.textContent.trim());
  }

  // 2. Wrapping <label>
  let p = el.parentElement;
  while (p && p.tagName !== "BODY") {
    if (p.tagName === "LABEL") {
      parts.push(p.textContent.trim());
      break;
    }
    p = p.parentElement;
  }

  // 3. aria-labelledby
  const labelledBy = el.getAttribute("aria-labelledby");
  if (labelledBy) {
    labelledBy.split(/\s+/).forEach((id) => {
      const el = document.getElementById(id);
      if (el) parts.push(el.textContent.trim());
    });
  }

  // 4. Preceding sibling text (e.g., <span>姓名</span><input>)
  let prev = el.previousElementSibling;
  if (prev && ["SPAN", "LABEL", "DIV", "P", "EM", "STRONG"].includes(prev.tagName)) {
    const text = prev.textContent.trim();
    if (text.length <= 20) parts.push(text);
  }

  // 5. Table cell pattern: <td>label</td><td><input></td>
  const td = el.closest("td");
  if (td) {
    const prevTd = td.previousElementSibling;
    if (prevTd && prevTd.tagName === "TD") {
      const text = prevTd.textContent.trim();
      if (text.length <= 20) parts.push(text);
    }
  }

  // 6. Placeholder
  if (el.placeholder) parts.push(el.placeholder);

  // 7. Name attribute
  if (el.name) parts.push(el.name);

  // 8. aria-label
  const ariaLabel = el.getAttribute("aria-label");
  if (ariaLabel) parts.push(ariaLabel);

  // 9. data-field attribute
  const dataField = el.getAttribute("data-field");
  if (dataField) parts.push(dataField);

  return parts.join(" ").toLowerCase();
}

// ─── Get context block for an element ───
function getContextBlock(el) {
  // Walk up to find a container with section-like text
  let current = el.parentElement;
  while (current && current !== document.body) {
    // Check for heading or section title
    const headings = current.querySelectorAll("h1, h2, h3, h4, h5, h6, legend, .section-title, .form-title, .block-title, [class*=title], [class*=header]");
    for (const h of headings) {
      const text = h.textContent.trim().toLowerCase();
      for (const [blockName, block] of Object.entries(CONTEXT_BLOCKS)) {
        for (const kw of block.keywords) {
          if (text.includes(kw)) return blockName;
        }
      }
    }

    // Check the container's own text (first few words)
    const ownText = (current.textContent || "").trim().toLowerCase().slice(0, 100);
    for (const [blockName, block] of Object.entries(CONTEXT_BLOCKS)) {
      for (const kw of block.keywords) {
        if (ownText.includes(kw)) return blockName;
      }
    }

    current = current.parentElement;
    // Only go up so far
    if (current && (current.tagName === "FORM" || current.tagName === "FIELDSET")) break;
  }
  return null;
}

// ─── Match a form element to a resume field ───
function matchField(el) {
  const label = getFieldLabel(el);
  const context = getContextBlock(el);

  let bestMatch = null;
  let bestScore = 0;

  for (const pattern of FIELD_PATTERNS) {
    // Score from label keywords
    let score = 0;
    for (const key of pattern.keys) {
      if (label.includes(key.toLowerCase())) {
        score += pattern.weight;
      }
    }

    // Bonus: field is in the expected context block
    if (context) {
      const block = CONTEXT_BLOCKS[context];
      if (block && block.fields.includes(pattern.field)) {
        score += 5;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = pattern.field;
    }
  }

  // Only return if score threshold met
  return bestScore >= 5 ? bestMatch : null;
}

// ─── Get fill value for a matched field ───
function getFillValue(data, field) {
  const shared = data.shared || {};
  const p = shared.personal || {};
  const edu = shared.education || {};
  const lib = data.lib || {};

  switch (field) {
    case "name": return p.name || "";
    case "phone": return p.phone || "";
    case "email": return p.email || "";
    case "idNumber": return p.idNumber || "";
    case "gender": return p.gender || "";
    case "birthDate": return p.birthDate || "";
    case "ethnicity": return p.ethnicity || "";
    case "nativePlace": return p.nativePlace || "";
    case "politicalStatus": return p.politicalStatus || "";
    case "marital": return p.maritalStatus || "";
    case "height": return p.height || "";
    case "weight": return p.weight || "";
    case "hukou": return p.hukouLocation || p.hukouAddress || "";
    case "address": return p.currentAddress || p.hukouAddress || "";
    case "emergencyContact": return p.emergencyContact || "";
    case "emergencyPhone": return p.emergencyPhone || "";
    case "healthStatus": return p.healthStatus || "";

    case "school": return edu.undergrad?.schoolName || edu.master?.schoolName || "";
    case "degree": {
      const d = edu.undergrad?.degree || edu.master?.degree || "";
      if (d.includes("硕士") || d.includes("研究生")) return "硕士研究生";
      if (d.includes("本科") || d.includes("学士")) return "大学本科";
      if (d.includes("博士")) return "博士研究生";
      if (d.includes("专科") || d.includes("大专")) return "大专";
      return d;
    }
    case "major": return edu.undergrad?.major || edu.master?.major || "";
    case "college": return edu.undergrad?.college || edu.master?.college || "";
    case "fullTime": {
      const ft = edu.undergrad?.fullTime || edu.master?.fullTime || "";
      if (ft) return ft;
      if (edu.undergrad?.unifiedEnrollment) return edu.undergrad.unifiedEnrollment;
      if (edu.master?.unifiedEnrollment) return edu.master.unifiedEnrollment;
      return "";
    }
    case "eduPeriod": return edu.undergrad?.period || edu.master?.period || "";

    case "company": return lib.experiences?.[0]?.name || lib.experiences?.[0]?.company || "";
    case "role": return lib.experiences?.[0]?.role || "";
    case "selfEval": return lib.selfEval || "";
    case "skills": {
      if (!lib.skills) return "";
      return Object.values(lib.skills).flat().join("、");
    }
    case "city": return p.hukouLocation || p.currentAddress || "";

    default: return "";
  }
}

// ─── Highlight unmatched fields on the page ───
function highlightUnmatched(elements) {
  elements.forEach((el) => {
    const origOutline = el.style.outline;
    const origBoxShadow = el.style.boxShadow;
    const origTransition = el.style.transition;

    el.style.outline = "2px solid #E53935";
    el.style.outlineOffset = "2px";
    el.style.boxShadow = "0 0 0 4px rgba(229,57,53,0.25)";
    el.style.transition = "outline 0.3s, box-shadow 0.3s";

    // Inject a small "未匹配" badge
    const badge = document.createElement("span");
    badge.className = "__resume_unmatch_badge";
    badge.textContent = "未匹配";
    badge.style.cssText = `
      position:absolute;top:-20px;right:0;z-index:2147483646;
      font-size:10px;color:#fff;background:#E53935;
      padding:1px 5px;border-radius:3px;white-space:nowrap;
      pointer-events:none;
    `;
    // Try to position relative to the element
    const elPos = window.getComputedStyle(el).position;
    if (elPos === "static") el.style.position = "relative";
    el.appendChild(badge);

    // Remove after 3.5 seconds
    setTimeout(() => {
      el.style.outline = origOutline;
      el.style.boxShadow = origBoxShadow;
      el.style.transition = origTransition;
      if (badge.parentNode) badge.remove();
    }, 3500);
  });
}

// ─── Auto-fill all form fields ───
function autoFillAll(data) {
  if (!data) return { success: false, error: "无数据" };

  const formEls = document.querySelectorAll("input, textarea, select, [contenteditable]");
  let filled = 0;
  let skipped = 0;
  const unmatched = [];

  formEls.forEach((el) => {
    const tag = el.tagName.toLowerCase();
    const type = (el.getAttribute("type") || "text").toLowerCase();
    const isTextInput = tag === "input" && ["text", "email", "tel", "url", "number", "search", ""].includes(type);
    const isTextArea = tag === "textarea";
    const isSelect = tag === "select";
    const isEditable = el.isContentEditable;

    if (!isTextInput && !isTextArea && !isSelect && !isEditable) { skipped++; return; }

    // Skip already filled fields
    if (isSelect) {
      if (el.value && el.selectedIndex > 0) { skipped++; return; }
    } else if (isEditable) {
      if (el.textContent && el.textContent.trim()) { skipped++; return; }
    } else {
      if (el.value && el.value.trim()) { skipped++; return; }
    }

    const field = matchField(el);
    if (!field) {
      unmatched.push(el);
      skipped++;
      return;
    }

    const value = getFillValue(data, field);
    if (!value) {
      unmatched.push(el);
      skipped++;
      return;
    }

    if (isSelect) {
      const result = matchSelect(el, value);
      if (result.success) {
        el.dispatchEvent(new Event("change", { bubbles: true }));
        filled++;
      } else {
        unmatched.push(el);
        skipped++;
      }
      return;
    }

    if (isTextInput || isTextArea) {
      el.value = value;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      filled++;
      return;
    }

    if (isEditable) {
      try {
        el.focus();
        document.execCommand("insertText", false, value);
        filled++;
      } catch {
        unmatched.push(el);
        skipped++;
      }
      return;
    }

    skipped++;
  });

  // Highlight unmatched
  if (unmatched.length > 0) {
    highlightUnmatched(unmatched);
  }

  return { success: true, filled, skipped, unmatched: unmatched.length };
}

// ─── Fill single active element ───
function fillActiveElement(text) {
  const el = lastFocusedEl || document.activeElement;
  if (!el || el === document.body) {
    return { success: false, error: "请先点击目标输入框" };
  }

  const tag = el.tagName.toLowerCase();

  if (tag === "input" || tag === "textarea") {
    el.value = text;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    return { success: true };
  }

  if (tag === "select") {
    const matchResult = matchSelect(el, text);
    if (matchResult.success) {
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }
    return matchResult;
  }

  if (el.isContentEditable) {
    try {
      el.focus();
      document.execCommand("insertText", false, text);
      return { success: true };
    } catch {
      return { success: false, error: "富文本编辑器不支持，请手动粘贴" };
    }
  }

  let parent = el.parentElement;
  while (parent) {
    if (parent.isContentEditable) {
      try {
        parent.focus();
        document.execCommand("insertText", false, text);
        return { success: true };
      } catch {
        return { success: false, error: "富文本编辑器不支持" };
      }
    }
    parent = parent.parentElement;
  }

  return { success: false, error: "无法识别输入框类型" };
}

// ─── Select matching ───
function matchSelect(selectEl, text) {
  const options = Array.from(selectEl.options);
  if (options.length === 0) {
    return { success: false, error: "下拉框无选项" };
  }

  const normalize = (s) =>
    s
      .replace(/[（(][^)）]*[)）]/g, "")
      .replace(/\s+/g, "")
      .toLowerCase();

  const target = normalize(text);

  let match = options.find((opt) => normalize(opt.text) === target);
  if (match) { selectEl.value = match.value; return { success: true }; }

  match = options.find((opt) => {
    const n = normalize(opt.text);
    return n.includes(target) || target.includes(n);
  });
  if (match) { selectEl.value = match.value; return { success: true }; }

  const keywords = target.split(/[,，、/]+/).filter((k) => k.length >= 2);
  match = options.find((opt) => {
    const n = normalize(opt.text);
    return keywords.some((kw) => n.includes(kw));
  });
  if (match) { selectEl.value = match.value; return { success: true }; }

  return { success: false, error: "未匹配到下拉选项，请手动选择" };
}

// ─── Floating button ───
(function injectFloatBtn() {
  const formEls = document.querySelectorAll("input, textarea, select");
  if (formEls.length === 0) return;
  if (window.location.href.includes("resume-toolkit")) return;

  const btn = document.createElement("button");
  btn.id = "__resume_float_btn";
  btn.innerHTML = "⚡";
  btn.title = "一键匹配简历";
  btn.style.cssText = `
    position:fixed;bottom:24px;right:24px;z-index:2147483647;
    width:48px;height:48px;border-radius:50%;border:none;
    background:#B8754A;color:#fff;font-size:20px;cursor:pointer;
    box-shadow:0 4px 16px rgba(184,117,74,0.35);
    transition:transform .15s,box-shadow .15s;
    display:flex;align-items:center;justify-content:center;
  `;
  btn.addEventListener("mouseenter", () => {
    btn.style.transform = "scale(1.1)";
    btn.style.boxShadow = "0 6px 24px rgba(184,117,74,0.45)";
  });
  btn.addEventListener("mouseleave", () => {
    btn.style.transform = "scale(1)";
    btn.style.boxShadow = "0 4px 16px rgba(184,117,74,0.35)";
  });

  btn.addEventListener("click", async () => {
    try {
      const result = await chrome.storage.local.get("resumeData");
      if (!result.resumeData) {
        alert("请先同步简历数据：打开简历库页面 → 点击插件 → 同步");
        return;
      }
      const store = result.resumeData;
      const dir = store.directions?.[0] || "综合";
      const payload = {
        shared: store.shared || {},
        lib: store.libraries?.[dir] || {},
      };
      const fillResult = autoFillAll(payload);
      if (fillResult.success) {
        const msg = "匹配 " + fillResult.filled + " 个" + (fillResult.unmatched > 0 ? "，" + fillResult.unmatched + " 个未匹配已标红" : "");
        btn.textContent = fillResult.unmatched > 0 ? "!" : "✓";
        btn.style.background = fillResult.unmatched > 0 ? "#E53935" : "#5C8A4A";
        btn.title = msg;
        setTimeout(() => {
          btn.textContent = "⚡";
          btn.style.background = "#B8754A";
        }, 3000);
      }
    } catch {}
  });

  document.body.appendChild(btn);
})();
