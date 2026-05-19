// Track the last focused element so it survives popup focus-steal
let lastFocusedEl = null;
document.addEventListener("focusin", (e) => {
  lastFocusedEl = e.target;
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "fill") {
    const result = fillActiveElement(message.text, message.label);
    sendResponse(result);
    return true;
  }
  return false;
});

function fillActiveElement(text, label) {
  const el = lastFocusedEl || document.activeElement;
  if (!el || el === document.body) {
    return { success: false, error: "请先点击目标输入框" };
  }

  const tag = el.tagName.toLowerCase();

  // Handle <input> (text, email, tel, etc.)
  if (tag === "input") {
    el.value = text;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    return { success: true };
  }

  // Handle <textarea>
  if (tag === "textarea") {
    el.value = text;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    return { success: true };
  }

  // Handle <select>
  if (tag === "select") {
    const matchResult = matchSelect(el, text);
    if (matchResult.success) {
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }
    return matchResult;
  }

  // Handle contenteditable / rich text editors
  if (el.isContentEditable) {
    try {
      el.focus();
      document.execCommand("insertText", false, text);
      return { success: true };
    } catch {
      return { success: false, error: "富文本编辑器不支持，请手动粘贴" };
    }
  }

  // Handle if a parent has contenteditable
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

  // Normalize function: remove brackets, extra spaces, unify case
  const normalize = (s) =>
    s
      .replace(/[（(][^)）]*[)）]/g, "") // remove parenthetical content
      .replace(/\s+/g, "")               // remove spaces
      .toLowerCase();

  const target = normalize(text);

  // Try exact match first (after normalization)
  let match = options.find((opt) => normalize(opt.text) === target);
  if (match) {
    selectEl.value = match.value;
    return { success: true };
  }

  // Try includes match
  match = options.find((opt) => {
    const n = normalize(opt.text);
    return n.includes(target) || target.includes(n);
  });
  if (match) {
    selectEl.value = match.value;
    return { success: true };
  }

  // Try keyword match (split target and find option containing any keyword)
  const keywords = target.split(/[,，、/]+/).filter((k) => k.length >= 2);
  match = options.find((opt) => {
    const n = normalize(opt.text);
    return keywords.some((kw) => n.includes(kw));
  });
  if (match) {
    selectEl.value = match.value;
    return { success: true };
  }

  return {
    success: false,
    error: "未匹配到下拉选项，请手动选择",
  };
}
