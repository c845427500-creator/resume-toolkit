// Track the last focused element so it survives popup focus-steal
let lastFocusedEl = null;
document.addEventListener("focusin", (e) => {
  lastFocusedEl = e.target;
});

// ─── Auto-sync: read web app's localStorage and push to extension storage ───
function tryAutoSync() {
  try {
    const raw = localStorage.getItem("resume_library_v2");
    if (!raw) return;
    const store = JSON.parse(raw);
    if (!store || !store.libraries) return;

    const data = {
      shared: store.shared || {},
      libraries: store.libraries || {},
      directions: [
        ...["综合", "产品", "AI", "技术", "金融"].filter((d) => store.libraries[d]),
        ...(store.customDirections || []),
      ],
    };

    chrome.storage.local.set({ resumeData: data }).catch(() => {});
  } catch {}
}

// Sync on page load
tryAutoSync();

// Also sync whenever localStorage changes (user edits data in the app)
window.addEventListener("storage", () => {
  // localStorage event only fires for OTHER tabs. For same-tab changes,
  // we periodically check when the popup requests it.
});

// ─── Listen for messages from popup ───
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "fill") {
    const result = fillActiveElement(message.text);
    sendResponse(result);
    return true;
  }
  if (message.type === "sync") {
    tryAutoSync();
    sendResponse({ success: true });
    return true;
  }
  return false;
});

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
