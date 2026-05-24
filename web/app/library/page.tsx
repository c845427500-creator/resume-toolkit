"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Copy, Check, Loader2, Trash2, Download, Edit3, Save, X, Plus, Settings, GripVertical, Bold, Italic, Underline, List, Camera, ChevronDown, ArrowUp, Sparkles, RotateCcw } from "lucide-react";
import Link from "next/link";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, rectSortingStrategy, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { matchCardsByDirection } from "@/lib/resume-parser";
import AiModal from "./ai-modal";
import {
  initStore, saveStore, getLibrary,
  updatePersonal, updateEducation, updateFamily, updateCustomFields,
  updateCard, deleteCard, updateSkills, updateSelfEval,
  reorderCards, resetLibrary,
  undoAiPolish,
  addCustomDirection, removeCustomDirection, setDirectionLibrary,
  importParsedResume,
  DEFAULT_JOB_TYPES,
  type CardItem, type CardSection, type Library, type Personal, type EducationStage, type FamilyMember, type HighSchoolEducation,
  type CustomField,
} from "@/lib/resume-store";
import type { ResumeStore } from "@/lib/resume-store";

// ─── Types ────────────────────────────────────────
type TopSectionKey = "personal" | "education" | "family" | "skills" | "selfEval" | "resumeContent";
const DEFAULT_TOP_ORDER: TopSectionKey[] = ["personal", "education", "family", "skills", "selfEval", "resumeContent"];

const SECTION_META: { key: CardSection; title: string }[] = [
  { key: "experiences", title: "工作/实习" },
  { key: "projects", title: "项目经历" },
  { key: "campus", title: "校园经历" },
  { key: "social", title: "社会/实践" },
];

const SKILL_TAG_PRESETS: Record<string, string[]> = {
  "金融工具": ["Wind", "Choice", "Bloomberg", "Capital IQ"],
  "办公软件": ["Excel（透视表/Vlookup/高级函数）", "PPT", "Word"],
  "编程与数据工具": ["Python", "SQL", "Stata（数据清洗与可视化）"],
  "AI工具": ["ChatGPT", "Gemini", "DeepSeek", "Claude", "OpenClaw", "Codex"],
  "内容创作": ["Pr/剪映（视频）", "Ps/Canva/Procreate（设计）", "公众号运营"],
  "语言": ["普通话二级甲等", "英语 CET-6（流利）", "粤语"],
  "兴趣爱好": ["摄影", "篮球", "羽毛球"],
};

// ─── Helpers ──────────────────────────────────────
type InlineToken = { type: "text" | "bold" | "italic" | "underline"; content: string };

function parseInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  const patterns: { re: RegExp; type: InlineToken["type"] }[] = [
    { re: /\*\*(.+?)\*\*/g, type: "bold" },
    { re: /__(.+?)__/g, type: "underline" },
    { re: /\*(.+?)\*/g, type: "italic" },
  ];
  let pos = 0;
  while (pos < text.length) {
    let earliest: { index: number; match: RegExpExecArray; type: InlineToken["type"] } | null = null;
    for (let pi = 0; pi < patterns.length; pi++) {
      patterns[pi].re.lastIndex = 0;
      const m = patterns[pi].re.exec(text.slice(pos));
      if (m && (!earliest || m.index < earliest.index)) {
        earliest = { index: m.index, match: m, type: patterns[pi].type };
      }
    }
    if (earliest && earliest.index >= 0) {
      const { index, match, type } = earliest;
      if (index > 0) tokens.push({ type: "text", content: text.slice(pos, pos + index) });
      tokens.push({ type, content: match[1] });
      pos += index + match[0].length;
    } else {
      tokens.push({ type: "text", content: text.slice(pos) });
      break;
    }
  }
  return tokens;
}

function renderMarkdown(text: string) {
  return parseInline(text).map((p, i) => {
    if (p.type === "bold") return <strong key={i}>{p.content}</strong>;
    if (p.type === "italic") return <em key={i}>{p.content}</em>;
    if (p.type === "underline") return <u key={i}>{p.content}</u>;
    return <span key={i}>{p.content}</span>;
  });
}

// Convert stored markdown to HTML for contentEditable display
function markdownToHtml(md: string): string {
  return md
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(.+?)__/g, "<u>$1</u>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br>");
}

// Convert contentEditable HTML back to markdown for storage
function htmlToMarkdown(root: HTMLElement): string {
  let result = "";
  const walk = (nodes: NodeListOf<ChildNode>) => {
    for (const node of nodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        result += node.textContent || "";
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        const tag = el.tagName.toLowerCase();
        if (tag === "br") { result += "\n"; continue; }
        if (tag === "div" || tag === "p") {
          if (result && !result.endsWith("\n")) result += "\n";
          walk(el.childNodes);
          if (!result.endsWith("\n")) result += "\n";
          continue;
        }
        let prefix = "", suffix = "";
        if (tag === "strong" || tag === "b") { prefix = "**"; suffix = "**"; }
        else if (tag === "em" || tag === "i") { prefix = "*"; suffix = "*"; }
        else if (tag === "u") { prefix = "__"; suffix = "__"; }
        result += prefix;
        walk(el.childNodes);
        result += suffix;
      }
    }
  };
  walk(root.childNodes);
  return result.replace(/\n+$/, "");
}

function execFormat(cmd: string) {
  document.execCommand(cmd);
}

function insertBulletAtCursor() {
  const sel = window.getSelection();
  if (!sel?.rangeCount) return;
  const range = sel.getRangeAt(0);
  const node = document.createTextNode("• ");
  range.insertNode(node);
  range.setStartAfter(node);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
}

function MarkdownToolbar({ editorRef }: { editorRef: React.RefObject<HTMLDivElement | null> }) {
  const exec = (cmd: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd);
    editorRef.current?.dispatchEvent(new Event("input", { bubbles: true }));
  };
  const handleBullet = () => {
    editorRef.current?.focus();
    insertBulletAtCursor();
    editorRef.current?.dispatchEvent(new Event("input", { bubbles: true }));
  };
  return (
    <div className="flex items-center gap-0.5">
      <button type="button" onMouseDown={(e) => { e.preventDefault(); exec("bold"); }} className="w-6 h-6 flex items-center justify-center rounded-[4px] hover:bg-claude-cream-strong text-claude-muted hover:text-claude-ink transition-colors" title="加粗 (Ctrl+B)">
        <Bold size={13} />
      </button>
      <button type="button" onMouseDown={(e) => { e.preventDefault(); exec("italic"); }} className="w-6 h-6 flex items-center justify-center rounded-[4px] hover:bg-claude-cream-strong text-claude-muted hover:text-claude-ink transition-colors" title="斜体 (Ctrl+I)">
        <Italic size={13} />
      </button>
      <button type="button" onMouseDown={(e) => { e.preventDefault(); exec("underline"); }} className="w-6 h-6 flex items-center justify-center rounded-[4px] hover:bg-claude-cream-strong text-claude-muted hover:text-claude-ink transition-colors" title="下划线 (Ctrl+U)">
        <Underline size={13} />
      </button>
      <span className="w-px h-4 bg-claude-hairline mx-0.5" />
      <button type="button" onMouseDown={(e) => { e.preventDefault(); handleBullet(); }} className="w-6 h-6 flex items-center justify-center rounded-[4px] hover:bg-claude-cream-strong text-claude-muted hover:text-claude-ink transition-colors" title="分点 (Ctrl+L)">
        <List size={13} />
      </button>
    </div>
  );
}

function handleRichKeydown(e: React.KeyboardEvent<HTMLDivElement>, onChange: () => void) {
  const ctrl = e.ctrlKey || e.metaKey;
  if (ctrl && e.key === "b") { e.preventDefault(); execFormat("bold"); onChange(); }
  else if (ctrl && e.key === "i") { e.preventDefault(); execFormat("italic"); onChange(); }
  else if (ctrl && e.key === "u") { e.preventDefault(); execFormat("underline"); onChange(); }
  else if (ctrl && e.key === "l") { e.preventDefault(); insertBulletAtCursor(); onChange(); }
}

// ─── RichTextarea ──────────────────────────────────
function RichTextarea({
  value, onChange, placeholder, className, editorRef,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string; className?: string;
  editorRef: { current: HTMLDivElement | null };
}) {
  const isInternal = useRef(false);
  const prevValue = useRef(value);

  useEffect(() => {
    if (isInternal.current) { isInternal.current = false; return; }
    if (value !== prevValue.current && editorRef.current) {
      editorRef.current.innerHTML = markdownToHtml(value);
      prevValue.current = value;
    }
  }, [value]);

  useEffect(() => {
    if (editorRef.current && !editorRef.current.textContent) {
      editorRef.current.innerHTML = markdownToHtml(value);
      prevValue.current = value;
    }
  }, []);

  const sync = () => {
    if (!editorRef.current) return;
    isInternal.current = true;
    const md = htmlToMarkdown(editorRef.current);
    prevValue.current = md;
    onChange(md);
  };

  return (
    <div
      ref={editorRef}
      contentEditable
      suppressContentEditableWarning
      onInput={sync}
      onPaste={(e) => {
        e.preventDefault();
        const text = e.clipboardData.getData("text/plain");
        document.execCommand("insertText", false, text);
      }}
      onKeyDown={(e) => handleRichKeydown(e, sync)}
      className={className}
      data-placeholder={placeholder}
      style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
    />
  );
}

// ─── SortableSection ──────────────────────────────
function SortableSection({ id, title, icon, children, actions }: { id: string; title: string; icon?: React.ReactNode; children: React.ReactNode; actions?: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const [collapsed, setCollapsed] = useState(false);
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1, zIndex: isDragging ? 10 : undefined };
  return (
    <div ref={setNodeRef} style={style} className="bg-claude-surface-card rounded-[12px] border border-claude-hairline overflow-hidden">
      <div className="bg-claude-surface rounded-t-[12px] px-4 py-2.5 flex items-center gap-2 border-b border-claude-hairline">
        <button {...attributes} {...listeners} className="text-claude-muted-soft hover:text-claude-muted cursor-grab active:cursor-grabbing touch-none p-0.5">
          <GripVertical size={13} />
        </button>
        {icon}
        <button onClick={() => setCollapsed(!collapsed)} className="flex-1 flex items-center gap-2 cursor-pointer">
          <span className="text-[13px] font-medium text-claude-ink">{title}</span>
          <ChevronDown size={12} className={`text-claude-muted-soft transition-transform ${collapsed ? "" : "rotate-180"}`} />
        </button>
        {actions}
      </div>
      {!collapsed && <div className="p-4">{children}</div>}
    </div>
  );
}

// ─── SortableCard ─────────────────────────────────
function SortableCard({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1, zIndex: isDragging ? 10 : undefined };
  return (
    <div ref={setNodeRef} style={style} className="relative">
      <button {...attributes} {...listeners} className="absolute top-0 left-0 z-10 text-claude-muted-soft hover:text-claude-muted cursor-grab active:cursor-grabbing touch-none p-1">
        <GripVertical size={13} />
      </button>
      {children}
    </div>
  );
}

// ─── ResumeCard ───────────────────────────────────
function ResumeCard({
  item, onUpdate, onDelete, forceEdit, saveAllKey, onSelectForAi, onUndoPolish,
  filterMode, isChecked, onToggleCheck,
}: {
  item: CardItem;
  onUpdate: (updates: Partial<Pick<CardItem, "name" | "department" | "role" | "period" | "bullets">>) => void;
  onDelete: () => void;
  forceEdit?: boolean;
  saveAllKey?: number;
  onSelectForAi?: () => void;
  onUndoPolish?: (bulletIdx: number) => void;
  filterMode?: boolean;
  isChecked?: boolean;
  onToggleCheck?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const isEditing = editing || forceEdit;
  const snapshotRef = useRef<{ text: string; tags: string[] }[] | null>(null);
  const [expandedOriginals, setExpandedOriginals] = useState<Set<number>>(new Set());
  const bulletRefObjs = useRef<{ current: HTMLDivElement | null }[]>([]);
  if (bulletRefObjs.current.length < item.bullets.length) {
    for (let i = bulletRefObjs.current.length; i < item.bullets.length; i++) {
      bulletRefObjs.current.push({ current: null });
    }
  }

  useEffect(() => { if (saveAllKey != null && saveAllKey > 0) { snapshotRef.current = null; setEditing(false); } }, [saveAllKey]);

  useEffect(() => {
    if (isEditing && !snapshotRef.current) snapshotRef.current = item.bullets.map((b) => ({ ...b }));
    if (!isEditing) snapshotRef.current = null;
  }, [isEditing]);

  const handleCancel = () => {
    if (snapshotRef.current) onUpdate({ bullets: snapshotRef.current });
    snapshotRef.current = null;
    setEditing(false);
    setExpandedOriginals(new Set());
  };

  const handleSave = () => { snapshotRef.current = null; setEditing(false); setExpandedOriginals(new Set()); };

  return (
    <div className="bg-claude-surface-card rounded-[10px] border border-claude-hairline p-4 pl-7 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        {filterMode && (
          <input type="checkbox" checked={isChecked} onChange={onToggleCheck} className="accent-claude-primary w-4 h-4 mt-0.5 shrink-0 cursor-pointer" />
        )}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="space-y-1.5">
              <input value={item.name} onChange={(e) => onUpdate({ name: e.target.value })} className="w-full text-[14px] font-medium text-claude-ink bg-claude-canvas rounded-[6px] px-2 py-1 border border-claude-hairline focus:border-claude-primary focus:outline-none" />
              <input value={item.department || ""} onChange={(e) => onUpdate({ department: e.target.value })} placeholder="部门（可选）" className="w-full text-[12px] text-claude-muted bg-claude-canvas rounded-[6px] px-2 py-1 border border-claude-hairline focus:border-claude-primary focus:outline-none" />
              <div className="flex gap-1.5">
                <input value={item.role} onChange={(e) => onUpdate({ role: e.target.value })} placeholder="职位" className="flex-1 text-[12px] text-claude-ink bg-claude-canvas rounded-[6px] px-2 py-1 border border-claude-hairline focus:border-claude-primary focus:outline-none" />
                <input value={item.period} onChange={(e) => onUpdate({ period: e.target.value })} placeholder="时间" className="w-[130px] text-[12px] text-claude-muted bg-claude-canvas rounded-[6px] px-2 py-1 border border-claude-hairline focus:border-claude-primary focus:outline-none" />
              </div>
            </div>
          ) : (
            <>
              <h3 className="text-[14px] font-medium text-claude-ink">{item.name}</h3>
              {item.department && <p className="text-[12px] text-claude-muted">{item.department}</p>}
              <p className="text-[12px] text-claude-muted-soft">{item.role} · {item.period}</p>
            </>
          )}
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          {isEditing ? (
            <>
              {!forceEdit && (
                <button onClick={handleCancel} className="w-7 h-7 flex items-center justify-center rounded-[6px] hover:bg-claude-surface text-claude-muted-soft hover:text-claude-ink transition-colors" title="取消">
                  <X size={14} />
                </button>
              )}
              <button onClick={handleSave} className="w-7 h-7 flex items-center justify-center rounded-[6px] bg-claude-primary text-claude-on-primary hover:bg-claude-primary-active transition-colors" title="保存">
                <Save size={14} />
              </button>
            </>
          ) : (
            !forceEdit && (
              <button onClick={() => setEditing(true)} className="w-7 h-7 flex items-center justify-center rounded-[6px] hover:bg-claude-surface text-claude-muted-soft hover:text-claude-ink transition-colors" title="编辑">
                <Edit3 size={14} />
              </button>
            )
          )}
          <button onClick={onDelete} className="w-7 h-7 flex items-center justify-center rounded-[6px] hover:bg-red-50 text-claude-muted-soft hover:text-red-500 transition-colors ml-0.5" title="删除">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Bullets */}
      <div className="space-y-1.5">
        {isEditing ? (
          item.bullets.map((b, idx) => {
            const refObj = bulletRefObjs.current[idx];
            const hasOriginal = !!b.originalText;
            const expanded = expandedOriginals.has(idx);
            return (
              <div key={idx} className="space-y-1">
                <MarkdownToolbar editorRef={refObj} />
                <div className="flex items-start gap-1.5">
                  <RichTextarea
                    editorRef={refObj}
                    value={b.text}
                    onChange={(md) => {
                      const updated = [...item.bullets];
                      updated[idx] = { ...updated[idx], text: md };
                      onUpdate({ bullets: updated });
                    }}
                    className="flex-1 text-[13px] leading-relaxed text-claude-ink bg-claude-canvas rounded-[6px] px-2.5 py-1.5 border border-claude-hairline focus:border-claude-primary focus:outline-none min-h-[36px]"
                    placeholder="输入要点…"
                  />
                  <div className="flex flex-col items-center gap-0.5 shrink-0 mt-0.5">
                    <button
                      onClick={() => {
                        const updated = item.bullets.filter((_, i) => i !== idx);
                        onUpdate({ bullets: updated });
                      }}
                      className="w-6 h-6 flex items-center justify-center rounded-[4px] hover:bg-red-50 text-claude-muted-soft hover:text-red-500 transition-colors"
                      title="删除此要点"
                    >
                      <X size={13} />
                    </button>
                    {hasOriginal && (
                      <button
                        onClick={() => {
                          const next = new Set(expandedOriginals);
                          expanded ? next.delete(idx) : next.add(idx);
                          setExpandedOriginals(next);
                        }}
                        className={`w-6 h-6 flex items-center justify-center rounded-[4px] transition-colors ${
                          expanded
                            ? "bg-claude-cream-strong/80 text-claude-ink hover:bg-claude-cream-strong"
                            : "hover:bg-claude-cream-strong/50 text-claude-muted-soft hover:text-claude-ink"
                        }`}
                        title={expanded ? "收起原文" : "查看原文"}
                      >
                        {expanded ? <ArrowUp size={12} /> : <ChevronDown size={12} />}
                      </button>
                    )}
                  </div>
                </div>
                {/* Expanded original text */}
                {hasOriginal && expanded && (
                  <div className="ml-0 rounded-[6px] border-l border-claude-hairline bg-claude-surface-card/50 px-3 py-2">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] text-claude-muted uppercase tracking-wider">原文</span>
                      <button
                        onClick={() => {
                          const updated = [...item.bullets];
                          updated[idx] = { ...updated[idx], text: b.originalText! };
                          onUpdate({ bullets: updated });
                        }}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[11px] text-claude-muted hover:bg-claude-surface-card hover:text-claude-ink transition-colors"
                        title="替换为原文"
                      >
                        <RotateCcw size={10} />
                        <span>恢复原文</span>
                      </button>
                    </div>
                    <p className="text-[12px] text-claude-muted leading-relaxed whitespace-pre-wrap break-words">
                      {b.originalText}
                    </p>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div
            className={onSelectForAi ? "cursor-pointer" : ""}
            onClick={(e) => {
              if (onSelectForAi) { e.stopPropagation(); onSelectForAi(); }
            }}
          >
            {item.bullets.map((b, idx) => (
              <div key={idx} className={`text-[13px] leading-relaxed text-claude-body bg-claude-canvas rounded-[6px] px-3 py-2 break-words overflow-hidden ${idx > 0 ? "mt-1.5" : ""} ${onSelectForAi ? "hover:ring-1 hover:ring-claude-primary/30 hover:border-claude-primary/40 transition-all" : ""}`} >
                <span className="[word-break:break-word]">{renderMarkdown(b.text)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bullet count + add button — edit mode only */}
      {isEditing && (
        <div className="flex items-center justify-between pt-1">
          <button
            onClick={() => onUpdate({ bullets: [...item.bullets, { text: "", tags: [] }] })}
            className="flex items-center gap-1 text-[12px] text-claude-muted hover:text-claude-primary transition-colors"
            title="添加要点"
          >
            <Plus size={13} />
            <span>添加要点</span>
          </button>
          <span className="text-[12px] text-claude-muted-soft">{item.bullets.length} 条要点</span>
        </div>
      )}
    </div>
  );
}

// ─── PersonalEditor ───────────────────────────────
function PersonalEditor({ personal, onUpdate }: { personal: Personal; onUpdate: (p: Personal) => void }) {
  const [photoKey, setPhotoKey] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const compressPhoto = (file: File): Promise<string> => new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxW = 300;
        const scale = Math.min(1, maxW / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.6));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });

  const fields: [keyof Personal, string][] = [
    ["name", "姓名"], ["phone", "手机"], ["email", "邮箱"], ["gender", "性别"],
    ["ethnicity", "民族"], ["birthDate", "出生日期"], ["idType", "证件类型"],
    ["idNumber", "证件号码"], ["nativePlace", "籍贯"], ["hukouLocation", "户口所在地"],
    ["currentAddress", "现居地址"], ["politicalStatus", "政治面貌"], ["maritalStatus", "婚姻情况"],
    ["healthStatus", "健康状况"], ["emergencyContact", "紧急联系人"], ["emergencyRelation", "与紧急联系人关系"],
    ["emergencyPhone", "紧急联系人电话"], ["height", "身高"], ["weight", "体重"],
  ];

  const dropdownOptions: Record<string, string[]> = {
    idType: ["身份证", "护照", "港澳通行证", "台胞证", "港澳台居民居住证", "外国人永久居留身份证"],
    politicalStatus: ["中共党员", "中共预备党员", "共青团员", "群众", "民主党派", "无党派人士"],
    maritalStatus: ["未婚", "已婚", "离异", "丧偶"],
  };

  return (
    <div className="space-y-4">
      {/* Photo */}
      <div className="flex items-center gap-3">
        {personal.photo ? (
          <div className="relative">
            <img key={photoKey} src={personal.photo} alt="证件照" className="w-20 h-[26.67mm] object-cover rounded-[6px] border border-claude-hairline" />
            <button onClick={() => { onUpdate({ ...personal, photo: "" }); setPhotoKey(k => k + 1); }} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"><X size={10} /></button>
          </div>
        ) : (
          <button onClick={() => fileRef.current?.click()} className="w-20 h-[26.67mm] border-2 border-dashed border-claude-hairline rounded-[6px] flex flex-col items-center justify-center gap-1 text-claude-muted-soft hover:border-claude-primary hover:text-claude-primary transition-colors">
            <Camera size={16} /><span className="text-[10px]">证件照</span>
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) {
            const base64 = await compressPhoto(file);
            onUpdate({ ...personal, photo: base64 });
            setPhotoKey(k => k + 1);
          }
        }} />
        <div className="text-[12px] text-claude-muted-soft">上传证件照（自动压缩）</div>
      </div>
      {/* Fields */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {fields.map(([key, label]) => {
          const opts = dropdownOptions[key];
          return (
            <div key={key}>
              <label className="text-[11px] text-claude-muted-soft">{label}</label>
              {opts ? (
                <select
                  value={(personal as any)[key] || ""}
                  onChange={(e) => onUpdate({ ...personal, [key]: e.target.value })}
                  className="w-full text-[13px] text-claude-ink bg-claude-canvas rounded-[6px] px-2.5 py-1.5 border border-claude-hairline focus:border-claude-primary focus:outline-none mt-0.5"
                >
                  <option value="" disabled className="text-claude-muted-soft">请选择</option>
                  {opts.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input
                  value={(personal as any)[key] || ""}
                  onChange={(e) => onUpdate({ ...personal, [key]: e.target.value })}
                  className="w-full text-[13px] text-claude-ink bg-claude-canvas rounded-[6px] px-2.5 py-1.5 border border-claude-hairline focus:border-claude-primary focus:outline-none mt-0.5"
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── EducationEditor ──────────────────────────────
function EducationEditor({ education, onUpdate }: { education: ResumeStore["shared"]["education"]; onUpdate: (e: ResumeStore["shared"]["education"]) => void }) {
  type EduStringField = "schoolName" | "degree" | "college" | "major" | "majorCategory" | "fullTime" | "unifiedEnrollment" | "period" | "gpa" | "ranking" | "advisor";
  const fields: [EduStringField, string][] = [
    ["schoolName", "学校名称"], ["degree", "学历信息"], ["college", "学院"], ["major", "专业名称"],
    ["majorCategory", "专业学科分类"], ["fullTime", "全日制/非全日制"], ["unifiedEnrollment", "是否统招"],
    ["period", "起止时间"], ["gpa", "GPA"], ["ranking", "排名"],
    ["advisor", "导师"],
  ];
  const dropdownFields: Record<string, string[]> = {
    fullTime: ["全日制", "非全日制"],
    unifiedEnrollment: ["统招", "非统招"],
  };
  type HsStringField = "schoolName" | "examOrigin" | "examScore" | "artsOrScience";
  const hsFields: [HsStringField, string][] = [
    ["schoolName", "学校"], ["examOrigin", "生源地"], ["examScore", "高考成绩"], ["artsOrScience", "文理科"],
  ];

  const honorsRefs: Record<string, React.RefObject<HTMLDivElement | null>> = {
    undergrad: useRef<HTMLDivElement>(null),
    master: useRef<HTMLDivElement>(null),
  };

  const renderStage = (stage: EducationStage | undefined, key: "undergrad" | "master", label: string) => {
    const s = stage || {} as EducationStage;
    const honorsRef = honorsRefs[key];

    // Parse courses into tags from comma-separated string
    const courseTags = (s.relevantCourses || "").split(/[,，;；\n]/).filter(Boolean).map(c => c.trim());

    return (
      <div className="space-y-3">
        <h4 className="text-[13px] font-medium text-claude-ink">{label}</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {fields.map(([k, lbl]) => {
            const opts = dropdownFields[k];
            return (
              <div key={k}>
                <label className="text-[11px] text-claude-muted-soft">{lbl}</label>
                {opts ? (
                  <select
                    value={(s as any)[k] || ""}
                    onChange={(e) => onUpdate({ ...education, [key]: { ...s, [k]: e.target.value } })}
                    className="w-full text-[13px] text-claude-ink bg-claude-canvas rounded-[6px] px-2 py-1.5 border border-claude-hairline focus:border-claude-primary focus:outline-none mt-0.5"
                  >
                    <option value="" disabled className="text-claude-muted-soft">请选择</option>
                    {opts.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input
                    value={(s as any)[k] || ""}
                    onChange={(e) => onUpdate({ ...education, [key]: { ...s, [k]: e.target.value } })}
                    className="w-full text-[13px] text-claude-ink bg-claude-canvas rounded-[6px] px-2 py-1.5 border border-claude-hairline focus:border-claude-primary focus:outline-none mt-0.5"
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Honors - Rich Text */}
        <div className="space-y-1.5">
          <label className="text-[11px] text-claude-muted-soft">荣誉奖项</label>
          <MarkdownToolbar editorRef={honorsRef} />
          <RichTextarea
            editorRef={honorsRef}
            value={s.honors || ""}
            onChange={(v) => onUpdate({ ...education, [key]: { ...s, honors: v } })}
            placeholder="荣誉奖项..."
            className="w-full text-[13px] leading-relaxed text-claude-ink bg-claude-canvas rounded-[6px] px-2.5 py-1.5 border border-claude-hairline focus:border-claude-primary focus:outline-none min-h-[40px]"
          />
        </div>

        {/* Courses Tag Input */}
        <div className="space-y-1.5">
          <label className="text-[11px] text-claude-muted-soft">相关课程与成绩</label>
          {courseTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {courseTags.map((tag, idx) => (
                <span key={idx} className="inline-flex items-center gap-1 text-[12px] bg-claude-cream-strong text-claude-body rounded-full px-2.5 py-1 border border-claude-hairline">
                  {tag}
                  <button
                    onClick={() => {
                      const newTags = courseTags.filter((_, i) => i !== idx);
                      onUpdate({ ...education, [key]: { ...s, relevantCourses: newTags.join(",") } });
                    }}
                    className="text-claude-muted-soft hover:text-red-500"
                  ><X size={10} /></button>
                </span>
              ))}
            </div>
          )}
          <input
            placeholder="输入课程与成绩，回车添加..."
            className="w-full text-[13px] text-claude-ink bg-claude-canvas rounded-[6px] px-2.5 py-1.5 border border-claude-hairline focus:border-claude-primary focus:outline-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.currentTarget.value.trim()) {
                const newTag = e.currentTarget.value.trim();
                const newTags = [...courseTags, newTag];
                onUpdate({ ...education, [key]: { ...s, relevantCourses: newTags.join(",") } });
                e.currentTarget.value = "";
                e.preventDefault();
              }
            }}
          />
        </div>

        {/* Stage-level custom fields */}
        <div className="border-t border-claude-hairline pt-3">
          <CustomFieldsEditor
            fields={s.customFields || []}
            onUpdate={(f) => onUpdate({ ...education, [key]: { ...s, customFields: f } })}
          />
        </div>
      </div>
    );
  };

  const hs = education.highSchool;
  return (
    <div className="space-y-4">
      {renderStage(education.undergrad, "undergrad", "本科")}
      {renderStage(education.master, "master", "硕士")}
      {/* High School */}
      <div className="space-y-3">
        <h4 className="text-[13px] font-medium text-claude-ink">高中</h4>
        <div className="grid grid-cols-2 gap-2">
          {hsFields.map(([k, lbl]) => (
            <div key={k}>
              <label className="text-[11px] text-claude-muted-soft">{lbl}</label>
              <input
                value={hs?.[k] || ""}
                onChange={(e) => onUpdate({ ...education, highSchool: { ...(hs || {} as import("@/lib/resume-store").HighSchoolEducation), [k]: e.target.value } })}
                className="w-full text-[13px] text-claude-ink bg-claude-canvas rounded-[6px] px-2 py-1.5 border border-claude-hairline focus:border-claude-primary focus:outline-none mt-0.5"
              />
            </div>
          ))}
        </div>
        {/* High school custom fields */}
        <div className="border-t border-claude-hairline pt-3">
          <CustomFieldsEditor
            fields={hs?.customFields || []}
            onUpdate={(f) => onUpdate({ ...education, highSchool: { ...(hs || {} as import("@/lib/resume-store").HighSchoolEducation), customFields: f } })}
          />
        </div>
      </div>
    </div>
  );
}

// ─── FamilyEditor ─────────────────────────────────
function FamilyEditor({ family, onUpdate }: { family: FamilyMember[]; onUpdate: (f: FamilyMember[]) => void }) {
  const add = () => onUpdate([...family, { name: "", relation: "", workUnit: "", position: "" }]);
  const update = (idx: number, f: FamilyMember) => {
    const next = [...family];
    next[idx] = f;
    onUpdate(next);
  };
  const remove = (idx: number) => onUpdate(family.filter((_, i) => i !== idx));
  return (
    <div className="space-y-3">
      {family.map((m, idx) => (
        <div key={idx} className="flex items-start gap-2">
          <div className="grid grid-cols-2 gap-2 flex-1">
            {(["name", "relation", "workUnit", "position"] as (keyof FamilyMember)[]).map((k) => (
              <input key={k} value={m[k]} onChange={(e) => update(idx, { ...m, [k]: e.target.value })} placeholder={k === "name" ? "姓名" : k === "relation" ? "关系" : k === "workUnit" ? "工作单位" : "职位"} className="text-[13px] text-claude-ink bg-claude-canvas rounded-[6px] px-2 py-1.5 border border-claude-hairline focus:border-claude-primary focus:outline-none" />
            ))}
          </div>
          <button onClick={() => remove(idx)} className="w-6 h-6 flex items-center justify-center text-claude-muted-soft hover:text-red-500 transition-colors shrink-0"><X size={12} /></button>
        </div>
      ))}
      <button onClick={add} className="flex items-center gap-1 text-[12px] text-claude-primary hover:text-claude-primary-active transition-colors"><Plus size={12} />添加家庭成员</button>
    </div>
  );
}

// ─── SkillsEditor ─────────────────────────────────
function SkillsEditor({ skills, onUpdate }: { skills: Record<string, string[]>; onUpdate: (s: Record<string, string[]>) => void }) {
  const [newCat, setNewCat] = useState("");
  const addTag = (cat: string, tag: string) => {
    const existing = skills[cat] || [];
    if (!existing.includes(tag)) onUpdate({ ...skills, [cat]: [...existing, tag] });
  };
  const updateCat = (oldCat: string, newCat: string) => {
    if (oldCat === newCat) return;
    const { [oldCat]: items, ...rest } = skills;
    onUpdate({ ...rest, [newCat]: items || [] });
  };
  const removeItem = (cat: string, idx: number) => {
    const items = [...(skills[cat] || [])];
    items.splice(idx, 1);
    onUpdate({ ...skills, [cat]: items });
  };
  const removeCat = (cat: string) => {
    const { [cat]: _, ...rest } = skills;
    onUpdate(rest);
  };
  const addCat = () => {
    if (!newCat.trim()) return;
    onUpdate({ ...skills, [newCat.trim()]: [] });
    setNewCat("");
  };

  return (
    <div className="space-y-4">
      {Object.entries(skills).map(([cat, items]) => (
        <div key={cat}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <input value={cat} onChange={(e) => updateCat(cat, e.target.value)} className="text-[13px] font-medium text-claude-ink bg-transparent border-b border-claude-hairline focus:border-claude-primary focus:outline-none w-[120px]" />
            <button onClick={() => removeCat(cat)} className="text-claude-muted-soft hover:text-red-500"><X size={11} /></button>
          </div>
          <div className="flex flex-wrap gap-1.5 mb-1">
            {items.map((item, idx) => (
              <span key={idx} className="inline-flex items-center gap-1 text-[12px] bg-claude-cream-strong text-claude-body rounded-full px-2.5 py-1 border border-claude-hairline">
                {item}
                <button onClick={() => removeItem(cat, idx)} className="text-claude-muted-soft hover:text-red-500"><X size={10} /></button>
              </span>
            ))}
            <input
              placeholder="输入技能，回车添加"
              className="text-[12px] text-claude-ink bg-claude-canvas rounded-full px-2.5 py-1 border border-claude-hairline focus:border-claude-primary focus:outline-none w-[130px] placeholder:text-[11px] placeholder:text-claude-muted-soft"
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.currentTarget.value.trim()) {
                  addTag(cat, e.currentTarget.value.trim());
                  e.currentTarget.value = "";
                  e.preventDefault();
                }
              }}
            />
          </div>
          {/* Preset tag chips */}
          {SKILL_TAG_PRESETS[cat] && (
            <div className="flex flex-wrap gap-1">
              {SKILL_TAG_PRESETS[cat].map((tag) => (
                <button key={tag} onClick={() => addTag(cat, tag)} className="rounded-full px-2 py-0.5 text-[11px] bg-claude-surface hover:bg-claude-cream-strong cursor-pointer transition-colors text-claude-muted">
                  +{tag}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
      <div className="flex items-center gap-2">
        <input value={newCat} onChange={(e) => setNewCat(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addCat(); }} placeholder="新分类" className="text-[13px] text-claude-ink bg-claude-canvas rounded-[6px] px-2 py-1.5 border border-claude-hairline focus:border-claude-primary focus:outline-none w-[100px]" />
        <button onClick={addCat} className="text-[12px] text-claude-primary hover:text-claude-primary-active"><Plus size={14} /></button>
      </div>
    </div>
  );
}

// ─── SelfEvalEditor ───────────────────────────────
function SelfEvalEditor({ selfEval, onSave, originalText, onRestoreOriginal }: { selfEval: string; onSave: (v: string) => void; originalText?: string | null; onRestoreOriginal?: () => void }) {
  const [text, setText] = useState(selfEval);
  const [expanded, setExpanded] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  useEffect(() => { setText(selfEval); setExpanded(false); }, [selfEval]);

  return (
    <div className="space-y-2">
      <MarkdownToolbar editorRef={editorRef} />
      <div className="flex items-start gap-1.5">
        <RichTextarea
          editorRef={editorRef}
          value={text}
          onChange={(v) => { setText(v); onSave(v); }}
          placeholder="自我评价..."
          className="flex-1 text-[14px] leading-relaxed text-claude-ink bg-claude-canvas rounded-[8px] px-3 py-2 border border-claude-hairline focus:border-claude-primary focus:outline-none min-h-[60px]"
        />
        {originalText && (
          <button
            onClick={() => setExpanded(!expanded)}
            className={`w-6 h-6 flex items-center justify-center rounded-[4px] transition-colors mt-0.5 ${
              expanded
                ? "bg-claude-cream-strong/80 text-claude-ink hover:bg-claude-cream-strong"
                : "hover:bg-claude-cream-strong/50 text-claude-muted-soft hover:text-claude-ink"
            }`}
            title={expanded ? "收起原文" : "查看原文"}
          >
            {expanded ? <ArrowUp size={12} /> : <ChevronDown size={12} />}
          </button>
        )}
      </div>
      {originalText && expanded && (
        <div className="ml-0 rounded-[6px] border-l border-claude-hairline bg-claude-surface-card/50 px-3 py-2">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] text-claude-muted uppercase tracking-wider">原文</span>
            <button
              onClick={() => { setText(originalText); onSave(originalText); setExpanded(false); onRestoreOriginal?.(); }}
              className="flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[11px] text-claude-muted hover:bg-claude-surface-card hover:text-claude-ink transition-colors"
              title="替换为原文"
            >
              <RotateCcw size={10} />
              <span>恢复原文</span>
            </button>
          </div>
          <p className="text-[12px] text-claude-muted leading-relaxed whitespace-pre-wrap break-words">
            {originalText}
          </p>
        </div>
      )}
      <div className="text-[12px] text-claude-muted-soft">{text.length} 字</div>
    </div>
  );
}

// ─── CustomFieldsEditor ─────────────────────────────
function CustomFieldsEditor({ fields, onUpdate }: { fields: CustomField[]; onUpdate: (f: CustomField[]) => void }) {
  const refObjs = useRef<{ current: HTMLDivElement | null }[]>([]);
  if (refObjs.current.length < fields.length) {
    for (let i = refObjs.current.length; i < fields.length; i++) {
      refObjs.current.push({ current: null });
    }
  }
  const add = () => onUpdate([...fields, { id: `cf-${Date.now()}`, title: "", content: "" }]);
  const update = (idx: number, f: CustomField) => {
    const next = [...fields];
    next[idx] = f;
    onUpdate(next);
  };
  const remove = (idx: number) => onUpdate(fields.filter((_, i) => i !== idx));
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-medium text-claude-muted">自定义栏目</span>
        <button onClick={add} className="flex items-center gap-1 text-[12px] text-claude-primary hover:text-claude-primary-active transition-colors">
          <Plus size={12} />添加
        </button>
      </div>
      {fields.map((f, idx) => {
        const refObj = refObjs.current[idx];
        return (
          <div key={f.id} className="flex items-start gap-2">
            <div className="flex-1 space-y-1">
              <input
                value={f.title}
                onChange={(e) => update(idx, { ...f, title: e.target.value })}
                placeholder="栏目标题"
                className="w-full text-[13px] font-medium text-claude-ink bg-claude-canvas rounded-[6px] px-2 py-1 border border-claude-hairline focus:border-claude-primary focus:outline-none"
              />
              <MarkdownToolbar editorRef={refObj} />
              <RichTextarea
                editorRef={refObj}
                value={f.content}
                onChange={(v) => update(idx, { ...f, content: v })}
                placeholder="栏目内容"
                className="w-full text-[13px] text-claude-ink bg-claude-canvas rounded-[6px] px-2 py-1 border border-claude-hairline focus:border-claude-primary focus:outline-none min-h-[28px]"
              />
            </div>
            <button onClick={() => remove(idx)} className="w-6 h-6 flex items-center justify-center text-claude-muted-soft hover:text-red-500 transition-colors shrink-0 mt-1">
              <X size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ─── AutoResizeTextarea ─────────────────────────────
function AutoResizeTextarea({ value, onChange, placeholder, className, rows = 1 }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string; rows?: number }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.max(el.scrollHeight, rows * 24)}px`;
    }
  }, [value, rows]);
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={className}
      rows={rows}
    />
  );
}

// ─── Main Page ────────────────────────────────────
export default function LibraryPage() {
  // State
  const [store, setStore] = useState<ResumeStore | null>(null);
  const [nickname, setNickname] = useState("");
  const [editingNickname, setEditingNickname] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [apiKeyModal, setApiKeyModal] = useState(false);
  const [activeDirection, setActiveDirection] = useState<string>("综合");
  const [showAddDirection, setShowAddDirection] = useState(false);
  const [newDirection, setNewDirection] = useState("");
  const [addingDirection, setAddingDirection] = useState(false);
  const [filterMode, setFilterMode] = useState(false);
  const [exportSelection, setExportSelection] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);
  const [editingSections, setEditingSections] = useState<Set<string>>(new Set());
  const [editingSubSections, setEditingSubSections] = useState<Set<string>>(new Set());
  const [saveAllKey, setSaveAllKey] = useState(0);
  const [undoSnapshot, setUndoSnapshot] = useState<Library | null>(null);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [selectedCardText, setSelectedCardText] = useState("");
  const [selectedCardLabel, setSelectedCardLabel] = useState("");
  const [selectedCardSource, setSelectedCardSource] = useState<{ type: "selfEval" } | { type: "card"; section: string; cardId: string } | null>(null);
  const [selfEvalOriginal, setSelfEvalOriginal] = useState<string | null>(null);
  const [aiBtnPos, setAiBtnPos] = useState({ right: 24, bottom: 112 });
  const aiBtnDragRef = useRef({ dragging: false, moved: false, startX: 0, startY: 0, startRight: 24, startBottom: 112 });
  useEffect(() => { setUndoSnapshot(null); }, [activeDirection]);
  const [hiddenDefaultDirs, setHiddenDefaultDirs] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const saved = localStorage.getItem("resume_hidden_dirs");
      if (saved) return new Set(JSON.parse(saved));
    } catch {}
    return new Set();
  });
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("resume_hidden_dirs", JSON.stringify([...hiddenDefaultDirs]));
    }
  }, [hiddenDefaultDirs]);
  const [showBackToTop, setShowBackToTop] = useState(false);
  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > window.innerHeight);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const [sectionOrder, setSectionOrder] = useState<TopSectionKey[]>(() => {
    if (typeof window === "undefined") return DEFAULT_TOP_ORDER;
    try {
      const saved = localStorage.getItem("resume_section_order");
      if (saved) { const arr = JSON.parse(saved); if (Array.isArray(arr) && arr.length === DEFAULT_TOP_ORDER.length) return arr; }
    } catch {}
    return DEFAULT_TOP_ORDER;
  });
  const [subsectionOrder, setSubsectionOrder] = useState<CardSection[]>(() => {
    if (typeof window === "undefined") return ["experiences", "projects", "campus", "social"];
    try {
      const saved = localStorage.getItem("resume_subsection_order");
      if (saved) { const arr = JSON.parse(saved); if (Array.isArray(arr) && arr.length === 4) return arr; }
    } catch {}
    return ["experiences", "projects", "campus", "social"];
  });
  const nicknameInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Init
  useEffect(() => {
    setStore(initStore());
    setNickname(localStorage.getItem("resume_nickname") || "");
    setApiKey(localStorage.getItem("ds_api_key") || "");
  }, []);

  // Derived
  const library = useMemo(() => store ? getLibrary(store, activeDirection) : { experiences: [], projects: [], campus: [], social: [], skills: {}, selfEval: "" }, [store, activeDirection]);
  const allDirections = useMemo(() => {
    const defaults = DEFAULT_JOB_TYPES.filter(d => !store?.customDirections?.includes(d) && !hiddenDefaultDirs.has(d));
    const customs = (store?.customDirections || []).filter(d => !hiddenDefaultDirs.has(d));
    return [...defaults, ...customs];
  }, [store?.customDirections, hiddenDefaultDirs]);
  const totalItems = library.experiences.length + library.projects.length + library.campus.length + library.social.length;

  const saveNickname = (n: string) => { setNickname(n); localStorage.setItem("resume_nickname", n); setEditingNickname(false); };
  const saveApiKey = (key: string) => { setApiKey(key); if (key) localStorage.setItem("ds_api_key", key); else localStorage.removeItem("ds_api_key"); setApiKeyModal(false); };

  // Handlers
  const updateStore = useCallback((fn: (s: ResumeStore) => ResumeStore) => {
    setStore((prev) => { if (!prev) return prev; const next = fn(prev); saveStore(next); return next; });
  }, []);

  const handleReorderSections = (fromIdx: number, toIdx: number) => {
    const next = [...sectionOrder];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    setSectionOrder(next);
    localStorage.setItem("resume_section_order", JSON.stringify(next));
  };

  const handleSubsectionReorder = (fromIdx: number, toIdx: number) => {
    const next = [...subsectionOrder];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    setSubsectionOrder(next);
    localStorage.setItem("resume_subsection_order", JSON.stringify(next));
  };

  const handleReorderCards = (section: CardSection, fromIdx: number, toIdx: number) => {
    updateStore((s) => reorderCards(s, activeDirection, section, fromIdx, toIdx));
  };

  const handleAddCard = (section: CardSection) => {
    const newCard: CardItem = {
      id: `card-${Date.now()}`,
      name: "",
      role: "",
      period: "",
      bullets: [{ text: "", tags: [] }],
    };
    updateStore((s) => {
      const lib = s.libraries[activeDirection];
      const items = [...lib[section], newCard];
      return { ...s, libraries: { ...s.libraries, [activeDirection]: { ...lib, [section]: items } } };
    });
  };

  const handleAcceptPolish = (text: string, originalText: string) => {
    if (!selectedCardSource) return;
    if (selectedCardSource.type === "selfEval") {
      setSelfEvalOriginal(originalText);
      updateStore((s) => updateSelfEval(s, activeDirection, text));
    } else if (selectedCardSource.type === "card") {
      const originalBullets = originalText
        .split(/\n/)
        .filter((b) => b.trim().length > 0)
        .map((b) => b.trim());
      const acceptedBullets = text
        .split(/\n/)
        .map((b) => b.replace(/^[•·\-]\s*/, "").trim())
        .filter((b) => b.length > 0)
        .map((b, i) => ({
          text: b,
          tags: [] as string[],
          originalText: originalBullets[i] || undefined,
        }));
      if (acceptedBullets.length > 0) {
        updateStore((s) => {
          const lib = s.libraries[activeDirection];
          if (!lib) return s;
          const section = selectedCardSource.section as CardSection;
          const items = lib[section];
          const idx = items.findIndex((item) => item.id === selectedCardSource.cardId);
          if (idx === -1) return s;
          const card = items[idx];

          let finalBullets;
          if (acceptedBullets.length >= card.bullets.length) {
            finalBullets = acceptedBullets;
          } else {
            finalBullets = card.bullets.map((b) => {
              const match = acceptedBullets.find(
                (ab) => ab.originalText && ab.originalText === b.text,
              );
              return match || b;
            });
          }

          const updated = [...items];
          updated[idx] = { ...card, bullets: finalBullets };
          return {
            ...s,
            libraries: {
              ...s.libraries,
              [activeDirection]: { ...lib, [section]: updated },
            },
          };
        });
      }
    }
    setSelectedCardSource(null);
    setSelectedCardText("");
    setSelectedCardLabel("");
  };

  const handleAiBtnDragStart = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    aiBtnDragRef.current = {
      dragging: true,
      moved: false,
      startX: e.clientX,
      startY: e.clientY,
      startRight: aiBtnPos.right,
      startBottom: aiBtnPos.bottom,
    };
  }, [aiBtnPos]);

  const handleAiBtnDragMove = useCallback((e: React.PointerEvent) => {
    const d = aiBtnDragRef.current;
    if (!d.dragging) return;
    const dx = d.startX - e.clientX;
    const dy = d.startY - e.clientY;
    const newRight = Math.max(8, Math.min(window.innerWidth - 56, d.startRight + dx));
    const newBottom = Math.max(48, Math.min(window.innerHeight - 100, d.startBottom + dy));
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) d.moved = true;
    setAiBtnPos({ right: newRight, bottom: newBottom });
  }, []);

  const handleAiBtnDragEnd = useCallback((e: React.PointerEvent) => {
    const d = aiBtnDragRef.current;
    d.dragging = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    if (!d.moved) {
      setAiModalOpen(true);
      setSelectedCardText("");
      setSelectedCardLabel("");
      setSelectedCardSource(null);
    }
  }, []);

  // Export modal helpers
  const allExportKeys = () => {
    const keys = new Set<string>();
    keys.add("personal");
    if (store?.shared.education.undergrad?.schoolName) keys.add("edu:undergrad");
    if (store?.shared.education.master?.schoolName) keys.add("edu:master");
    if (store?.shared.education.highSchool?.schoolName) keys.add("edu:highSchool");
    if ((store?.shared.family?.length ?? 0) > 0) keys.add("family");
    if (Object.keys(library.skills).length > 0) keys.add("skills");
    if (library.selfEval) keys.add("selfEval");
    library.experiences.forEach((c) => keys.add(`exp:${c.id}`));
    library.projects.forEach((c) => keys.add(`proj:${c.id}`));
    library.campus.forEach((c) => keys.add(`cam:${c.id}`));
    library.social.forEach((c) => keys.add(`soc:${c.id}`));
    return keys;
  };

  const selectAllExport = () => setExportSelection(allExportKeys());
  const deselectAllExport = () => setExportSelection(new Set());
  const toggleExportKey = (key: string) => {
    setExportSelection((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };
  const selectSection = (prefix: string, cards: CardItem[]) => {
    setExportSelection((prev) => {
      const next = new Set(prev);
      cards.forEach((c) => next.add(`${prefix}:${c.id}`));
      return next;
    });
  };
  const deselectSection = (prefix: string, cards: CardItem[]) => {
    setExportSelection((prev) => {
      const next = new Set(prev);
      cards.forEach((c) => next.delete(`${prefix}:${c.id}`));
      return next;
    });
  };

  const handleExportFiltered = () => {
    if (!store) return;
    const sel = exportSelection;
    const lines: string[] = [];
    const p = store.shared.personal;
    const edu = store.shared.education;

    if (sel.has("personal")) {
      if (p.name) lines.push(p.name);
      if (p.phone || p.email) lines.push(`${p.phone} · ${p.email}`);
      lines.push("");
    }
    if (sel.has("edu:undergrad") || sel.has("edu:master") || sel.has("edu:highSchool")) {
      lines.push("▎教育经历");
      if (sel.has("edu:master") && edu.master?.schoolName) {
        lines.push(`${edu.master.schoolName}  ${edu.master.degree}  ${edu.master.period}`);
        if (edu.master.notes) lines.push(edu.master.notes);
      }
      if (sel.has("edu:undergrad") && edu.undergrad?.schoolName) {
        lines.push(`${edu.undergrad.schoolName}  ${edu.undergrad.degree}  ${edu.undergrad.period}`);
        if (edu.undergrad.notes) lines.push(edu.undergrad.notes);
      }
      if (sel.has("edu:highSchool") && edu.highSchool?.schoolName) {
        lines.push(`${edu.highSchool.schoolName}  高中  —`);
      }
      lines.push("");
    }
    if (sel.has("family") && (store.shared.family?.length ?? 0) > 0) {
      lines.push("▎家庭成员");
      store.shared.family.forEach((m) => {
        lines.push(`${m.name}  ${m.relation}  ${m.workUnit}  ${m.position}`);
      });
      lines.push("");
    }
    const cardSections: [string, string, CardItem[]][] = [
      ["工作/实习经历", "exp", library.experiences],
      ["项目经历", "proj", library.projects],
      ["校园经历", "cam", library.campus],
      ["社会/实践经历", "soc", library.social],
    ];
    cardSections.forEach(([title, prefix, items]) => {
      const selected = items.filter((c) => sel.has(`${prefix}:${c.id}`));
      if (selected.length > 0) {
        lines.push(`▎${title}`);
        selected.forEach((e) => {
          lines.push(`${e.name}  ${e.role}  ${e.period}`);
          e.bullets.forEach((b) => lines.push(`• ${b.text}`));
          lines.push("");
        });
      }
    });
    if (sel.has("selfEval") && library.selfEval) {
      lines.push("▎自我评价");
      lines.push(library.selfEval);
      lines.push("");
    }
    if (sel.has("skills")) {
      lines.push("▎技能");
      Object.entries(library.skills).forEach(([cat, items]) => {
        if (items.length > 0) lines.push(`${cat}：${items.join("、")}`);
      });
    }
    const text = lines.join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "简历.txt"; a.click();
    URL.revokeObjectURL(url);
    setFilterMode(false);
  };

  const toggleFilterMode = () => {
    if (!filterMode) {
      setExportSelection(allExportKeys());
    }
    setFilterMode(!filterMode);
  };

  const handleAddDirection = async () => {
    const dir = newDirection.trim();
    if (!dir) return;
    // Re-adding a hidden default direction
    if (DEFAULT_JOB_TYPES.includes(dir) && hiddenDefaultDirs.has(dir)) {
      setHiddenDefaultDirs(prev => { const next = new Set(prev); next.delete(dir); return next; });
      setActiveDirection(dir);
      setNewDirection("");
      setShowAddDirection(false);
      // AI match cards for the restored direction
      const allLib = store ? getLibrary(store, "综合") : null;
      const allCards = allLib ? [...allLib.experiences, ...allLib.projects, ...allLib.campus, ...allLib.social] : [];
      if (apiKey && allCards.length > 0) {
        setAddingDirection(true);
        const matchedIndices = await matchCardsByDirection(apiKey, dir, allCards);
        const matched = matchedIndices.map((i) => allCards[i]).filter(Boolean);
        const expIds = new Set(allLib!.experiences.map((c) => c.id));
        const projIds = new Set(allLib!.projects.map((c) => c.id));
        const campusIds = new Set(allLib!.campus.map((c) => c.id));
        const socialIds = new Set(allLib!.social.map((c) => c.id));
        updateStore((s) => setDirectionLibrary(s, dir, {
          experiences: matched.filter((c) => expIds.has(c.id)),
          projects: matched.filter((c) => projIds.has(c.id)),
          campus: matched.filter((c) => campusIds.has(c.id)),
          social: matched.filter((c) => socialIds.has(c.id)),
          skills: allLib?.skills || {},
          selfEval: allLib?.selfEval || "",
        }));
        setAddingDirection(false);
      }
      return;
    }
    if (allDirections.includes(dir)) return;
    setAddingDirection(true);
    // Get all cards from 综合 library
    const allLib = store ? getLibrary(store, "综合") : null;
    const allCards = allLib ? [...allLib.experiences, ...allLib.projects, ...allLib.campus, ...allLib.social] : [];
    if (apiKey && allCards.length > 0) {
      const matchedIndices = await matchCardsByDirection(apiKey, dir, allCards);
      const matched = matchedIndices.map((i) => allCards[i]).filter(Boolean);
      const expIds = new Set(allLib!.experiences.map((c) => c.id));
      const projIds = new Set(allLib!.projects.map((c) => c.id));
      const campusIds = new Set(allLib!.campus.map((c) => c.id));
      const socialIds = new Set(allLib!.social.map((c) => c.id));
      updateStore((s) => {
        s = addCustomDirection(s, dir);
        s = setDirectionLibrary(s, dir, {
          experiences: matched.filter((c) => expIds.has(c.id)),
          projects: matched.filter((c) => projIds.has(c.id)),
          campus: matched.filter((c) => campusIds.has(c.id)),
          social: matched.filter((c) => socialIds.has(c.id)),
          skills: allLib?.skills || {},
          selfEval: allLib?.selfEval || "",
        });
        return s;
      });
    } else {
      updateStore((s) => addCustomDirection(s, dir));
    }
    setActiveDirection(dir);
    setNewDirection("");
    setShowAddDirection(false);
    setAddingDirection(false);
  };

  if (!store) return null;

  return (
    <div className="min-h-screen bg-claude-canvas pb-20">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-claude-canvas/80 backdrop-blur-sm border-b border-claude-hairline">
        <div className="max-w-[1200px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-0">
            {editingNickname ? (
              <input ref={nicknameInputRef} value={nickname} onChange={(e) => setNickname(e.target.value)} onBlur={() => saveNickname(nickname)} onKeyDown={(e) => { if (e.key === "Enter") saveNickname(nickname); }} className="text-[14px] text-claude-ink bg-transparent border-b border-claude-primary outline-none italic" style={{ fontFamily: "'Cormorant Garamond', serif", width: `${Math.max(nickname.length * 10, 60)}px` }} autoFocus />
            ) : (
              <button onClick={() => { setEditingNickname(true); setTimeout(() => nicknameInputRef.current?.focus(), 0); }} className="text-[14px] text-claude-muted-soft hover:text-claude-ink transition-colors italic cursor-text" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                {nickname ? `${nickname}的` : ""}
              </button>
            )}
            <span className="text-[14px] font-medium text-claude-ink tracking-tight" style={{ fontFamily: "'Cormorant Garamond', serif" }}>简历库</span>
          </div>
          <button onClick={() => setApiKeyModal(true)} className="w-7 h-7 rounded-md hover:bg-claude-surface-card flex items-center justify-center transition-colors">
            <Settings size={14} className="text-claude-muted" />
          </button>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-6 space-y-12">
        {/* Hero */}
        <div className="pt-12 pb-2">
          <div className="flex items-baseline gap-1">
            <h1 className="text-[36px] leading-[1.15] text-claude-ink" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, letterSpacing: "-0.5px" }}>
              {nickname ? `${nickname}的` : ""}简历库
            </h1>
          </div>
          <p className="text-[14px] text-claude-muted mt-1.5">AI 优化的简历内容库，配合浏览器插件一键填入招聘表单。</p>
        </div>

        {/* Direction Tabs */}
        <div className="flex items-center gap-1 flex-wrap border-b border-claude-hairline pb-0">
          {allDirections.map((dir) => (
            <span key={dir} className="inline-flex items-center gap-0.5 group">
              <button
                onClick={() => setActiveDirection(dir)}
                className={`pb-3 -mb-px px-4 text-[14px] transition-colors ${activeDirection === dir ? "text-claude-ink border-b-[2px] border-claude-ink" : "text-claude-muted hover:text-claude-ink"}`}
              >
                {dir}
              </button>
              {dir !== "综合" && (
                <button
                  onClick={() => {
                    if (DEFAULT_JOB_TYPES.includes(dir)) {
                      setHiddenDefaultDirs(prev => {
                        const next = new Set(prev).add(dir);
                        localStorage.setItem("resume_hidden_dirs", JSON.stringify([...next]));
                        return next;
                      });
                    } else {
                      updateStore((s) => removeCustomDirection(s, dir));
                    }
                    if (activeDirection === dir) setActiveDirection("综合");
                  }}
                  className="pb-3 -mb-px text-[11px] text-claude-muted-soft hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <X size={12} />
                </button>
              )}
            </span>
          ))}
          <span className="pb-3 -mb-px text-claude-hairline mx-1">|</span>
          {showAddDirection ? (
            <div className="flex items-center gap-1 pb-3 -mb-px">
              <input
                value={newDirection}
                onChange={(e) => setNewDirection(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAddDirection(); if (e.key === "Escape") { setShowAddDirection(false); setNewDirection(""); } }}
                placeholder="方向名"
                className="text-[13px] text-claude-ink bg-claude-canvas rounded-[6px] px-2 py-1 border border-claude-hairline focus:border-claude-primary focus:outline-none w-[80px]"
                autoFocus
              />
              <button onClick={handleAddDirection} disabled={addingDirection || !newDirection.trim()} className="text-[12px] text-claude-primary hover:text-claude-primary-active disabled:opacity-40 font-medium">
                {addingDirection ? <Loader2 size={12} className="animate-spin" /> : "确定"}
              </button>
              <button onClick={() => { setShowAddDirection(false); setNewDirection(""); }} className="text-[12px] text-claude-muted-soft hover:text-claude-ink">
                <X size={12} />
              </button>
            </div>
          ) : (
            <button onClick={() => setShowAddDirection(true)} className="pb-3 -mb-px text-[13px] text-claude-muted-soft hover:text-claude-primary transition-colors">
              <Plus size={14} />
            </button>
          )}
        </div>

        {/* One-click buttons + 一键清空 */}
        <div className="flex items-center gap-2 -mt-2 pb-2">
          <button
            onClick={() => {
              if (filterMode) return;
              setSaveAllKey(k => k + 1);
              setEditingSections(new Set(["personal", "education", "family", "skills", "selfEval", "resumeContent"]));
              setEditingSubSections(new Set(subsectionOrder));
            }}
            disabled={filterMode}
            className="text-[12px] px-3 py-1 rounded-[6px] bg-claude-primary text-claude-on-primary hover:bg-claude-primary-active transition-colors disabled:opacity-30"
          >
            一键编辑
          </button>
          <button
            onClick={() => {
              if (filterMode) return;
              setSaveAllKey(k => k + 1);
              setEditingSections(new Set());
              setEditingSubSections(new Set());
            }}
            disabled={filterMode}
            className="text-[12px] px-3 py-1 rounded-[6px] bg-claude-surface-card border border-claude-hairline text-claude-ink hover:bg-claude-surface disabled:opacity-30 transition-colors"
          >
            一键保存
          </button>
          <div className="flex-1" />
          <button onClick={toggleFilterMode} className={`flex items-center gap-1 px-3 py-1 text-[12px] rounded-[6px] border transition-colors ${filterMode ? "bg-claude-primary text-claude-on-primary border-claude-primary" : "bg-claude-surface-card border-claude-hairline text-claude-ink hover:bg-claude-surface"}`}>
            <Download size={12} />{filterMode ? "退出筛选" : "筛选导出"}
          </button>
<button onClick={() => {
            if (!store) return;
            const payload = {
              shared: store.shared,
              libraries: store.libraries,
              directions: [...DEFAULT_JOB_TYPES.filter(d => store.libraries[d]), ...store.customDirections],
            };
            navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
            setCopied(true); setTimeout(() => setCopied(false), 2000);
          }} className="flex items-center gap-1 px-3 py-1 text-[12px] rounded-[6px] bg-claude-surface-card border border-claude-hairline text-claude-ink hover:bg-claude-surface transition-colors">
            <Copy size={12} />同步到插件
          </button>
          {undoSnapshot ? (
            <button
              onClick={() => {
                if (filterMode) return;
                updateStore((s) => ({ ...s, libraries: { ...s.libraries, [activeDirection]: undoSnapshot } }));
                setUndoSnapshot(null);
              }}
              disabled={filterMode}
              className="text-[12px] px-3 py-1 rounded-[6px] text-claude-primary hover:text-claude-primary-active transition-colors font-medium disabled:opacity-30"
            >
              撤销清空
            </button>
          ) : (
            <button
              onClick={() => {
                if (filterMode) return;
                setUndoSnapshot(JSON.parse(JSON.stringify(library)));
                updateStore((s) => resetLibrary(s, activeDirection));
              }}
              disabled={filterMode}
              className="text-[12px] px-3 py-1 rounded-[6px] bg-claude-surface-card border border-claude-hairline text-claude-ink hover:bg-claude-surface disabled:opacity-30 transition-colors"
            >
              一键清空
            </button>
          )}
        </div>

        {/* Top Sections */}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(event: DragEndEvent) => {
          const { active, over } = event;
          if (over && active.id !== over.id) {
            const fromIdx = sectionOrder.indexOf(active.id as TopSectionKey);
            const toIdx = sectionOrder.indexOf(over.id as TopSectionKey);
            if (fromIdx !== -1 && toIdx !== -1) handleReorderSections(fromIdx, toIdx);
          }
        }}>
          <SortableContext items={sectionOrder} strategy={verticalListSortingStrategy}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sectionOrder.map((key) => {
                const sectionEl = (() => {
                  switch (key) {
                    case "personal": {
                      const editing = editingSections.has("personal");
                      const toggle = () => setEditingSections((prev) => { const next = new Set(prev); if (next.has("personal")) next.delete("personal"); else next.add("personal"); return next; });
                      const p = store.shared.personal;
                      return (
                        <SortableSection key="personal" id="personal" title="个人信息"
                          actions={
                            filterMode ? (
                              <input type="checkbox" checked={exportSelection.has("personal")} onChange={() => toggleExportKey("personal")} className="accent-claude-primary w-4 h-4 cursor-pointer" />
                            ) : editing ? (
                              <div className="flex items-center gap-1">
                                <button onClick={toggle} className="text-[11px] px-2 py-0.5 rounded-[4px] hover:bg-claude-cream-strong text-claude-muted transition-colors">取消</button>
                                <button onClick={toggle} className="text-[11px] px-2 py-0.5 rounded-[4px] bg-claude-primary text-claude-on-primary hover:bg-claude-primary-active transition-colors flex items-center gap-0.5"><Save size={14} /></button>
                              </div>
                            ) : (
                              <button onClick={toggle} className="text-claude-muted-soft hover:text-claude-ink transition-colors"><Edit3 size={14} /></button>
                            )
                          }
                        >
                          {editing ? (
                            <div className="space-y-4">
                              <PersonalEditor personal={p} onUpdate={(np) => updateStore((s) => updatePersonal(s, np))} />
                              <div className="border-t border-claude-hairline" />
                              <CustomFieldsEditor
                                fields={store.shared.customFields["personal"] || []}
                                onUpdate={(f) => updateStore((s) => updateCustomFields(s, "personal", f))}
                              />
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {/* Top: photo + name / phone / email */}
                              <div className="flex items-start gap-4">
                                {p.photo ? (
                                  <img src={p.photo} alt="证件照" className="w-16 h-[21.3mm] object-cover rounded-[6px] border border-claude-hairline shrink-0" />
                                ) : (
                                  <div className="w-16 h-[21.3mm] border-2 border-dashed border-claude-hairline rounded-[6px] flex items-center justify-center shrink-0">
                                    <Camera size={14} className="text-claude-muted-soft" />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p className="text-[16px] font-medium text-claude-ink">{p.name || "未填写姓名"}</p>
                                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                                    {p.phone && <span className="text-[13px] text-claude-body">{p.phone}</span>}
                                    {p.email && <span className="text-[13px] text-claude-muted">{p.email}</span>}
                                  </div>
                                  {!p.name && !p.phone && !p.email && (
                                    <p className="text-[13px] text-claude-muted-soft">暂无个人信息，点击编辑添加</p>
                                  )}
                                </div>
                              </div>
                              {/* Other fields */}
                              {[p.idType, p.gender, p.birthDate, p.highestDegree, p.idNumber, p.ethnicity, p.nativePlace, p.hukouLocation, p.hukouAddress, p.currentAddress, p.politicalStatus, p.maritalStatus, p.height, p.weight, p.emergencyContact, p.emergencyRelation, p.emergencyPhone, p.healthStatus].some(Boolean) && (
                                <>
                                  <div className="border-t border-claude-hairline" />
                                  <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1.5">
                                    {p.idType && <div><span className="text-[11px] text-claude-muted-soft">证件类型</span><p className="text-[13px] text-claude-ink">{p.idType}</p></div>}
                                    {p.gender && <div><span className="text-[11px] text-claude-muted-soft">性别</span><p className="text-[13px] text-claude-ink">{p.gender}</p></div>}
                                    {p.birthDate && <div><span className="text-[11px] text-claude-muted-soft">出生日期</span><p className="text-[13px] text-claude-ink">{p.birthDate}</p></div>}
                                    {p.highestDegree && <div><span className="text-[11px] text-claude-muted-soft">最高学历</span><p className="text-[13px] text-claude-ink">{p.highestDegree}</p></div>}
                                    {p.idNumber && <div><span className="text-[11px] text-claude-muted-soft">证件号码</span><p className="text-[13px] text-claude-ink">{p.idNumber}</p></div>}
                                    {p.ethnicity && <div><span className="text-[11px] text-claude-muted-soft">民族</span><p className="text-[13px] text-claude-ink">{p.ethnicity}</p></div>}
                                    {p.nativePlace && <div><span className="text-[11px] text-claude-muted-soft">籍贯</span><p className="text-[13px] text-claude-ink">{p.nativePlace}</p></div>}
                                    {p.hukouLocation && <div><span className="text-[11px] text-claude-muted-soft">户口所在地</span><p className="text-[13px] text-claude-ink">{p.hukouLocation}</p></div>}
                                    {p.hukouAddress && <div><span className="text-[11px] text-claude-muted-soft">户口地址</span><p className="text-[13px] text-claude-ink">{p.hukouAddress}</p></div>}
                                    {p.currentAddress && <div><span className="text-[11px] text-claude-muted-soft">现居地址</span><p className="text-[13px] text-claude-ink">{p.currentAddress}</p></div>}
                                    {p.politicalStatus && <div><span className="text-[11px] text-claude-muted-soft">政治面貌</span><p className="text-[13px] text-claude-ink">{p.politicalStatus}</p></div>}
                                    {p.maritalStatus && <div><span className="text-[11px] text-claude-muted-soft">婚姻情况</span><p className="text-[13px] text-claude-ink">{p.maritalStatus}</p></div>}
                                    {p.height && <div><span className="text-[11px] text-claude-muted-soft">身高</span><p className="text-[13px] text-claude-ink">{p.height}</p></div>}
                                    {p.weight && <div><span className="text-[11px] text-claude-muted-soft">体重</span><p className="text-[13px] text-claude-ink">{p.weight}</p></div>}
                                    {p.emergencyContact && <div><span className="text-[11px] text-claude-muted-soft">紧急联系人</span><p className="text-[13px] text-claude-ink">{p.emergencyContact}</p></div>}
                                    {p.emergencyRelation && <div><span className="text-[11px] text-claude-muted-soft">紧急联系人关系</span><p className="text-[13px] text-claude-ink">{p.emergencyRelation}</p></div>}
                                    {p.emergencyPhone && <div><span className="text-[11px] text-claude-muted-soft">紧急联系人电话</span><p className="text-[13px] text-claude-ink">{p.emergencyPhone}</p></div>}
                                    {p.healthStatus && <div><span className="text-[11px] text-claude-muted-soft">健康状况</span><p className="text-[13px] text-claude-ink">{p.healthStatus}</p></div>}
                                  </div>
                                </>
                              )}
                              {/* Custom fields */}
                              {store.shared.customFields["personal"]?.length! > 0 && (
                                <>
                                  <div className="border-t border-claude-hairline" />
                                  <div className="space-y-2">
                                    {store.shared.customFields["personal"].map((f) => (
                                      <div key={f.id}>
                                        <span className="text-[11px] text-claude-muted-soft">{f.title}</span>
                                        <p className="text-[13px] text-claude-ink whitespace-pre-wrap">{renderMarkdown(f.content)}</p>
                                      </div>
                                    ))}
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </SortableSection>
                      );
                    }
                    case "education": {
                      const editing = editingSections.has("education");
                      const toggle = () => setEditingSections((prev) => { const next = new Set(prev); if (next.has("education")) next.delete("education"); else next.add("education"); return next; });
                      const edu = store.shared.education;
                      return (
                        <SortableSection key="education" id="education" title="教育经历"
                          actions={
                            filterMode ? (
                              <div className="flex items-center gap-2">
                                <input type="checkbox" checked={exportSelection.has("edu:undergrad") && exportSelection.has("edu:master") && exportSelection.has("edu:highSchool")} onChange={() => {
                                  const allKeys = ["edu:undergrad", "edu:master", "edu:highSchool"];
                                  const allChecked = allKeys.every((k) => exportSelection.has(k));
                                  setExportSelection((prev) => { const next = new Set(prev); allKeys.forEach((k) => allChecked ? next.delete(k) : next.add(k)); return next; });
                                }} className="accent-claude-primary w-4 h-4 cursor-pointer" />
                              </div>
                            ) : editing ? (
                              <div className="flex items-center gap-1">
                                <button onClick={toggle} className="text-[11px] px-2 py-0.5 rounded-[4px] hover:bg-claude-cream-strong text-claude-muted transition-colors">取消</button>
                                <button onClick={toggle} className="text-[11px] px-2 py-0.5 rounded-[4px] bg-claude-primary text-claude-on-primary hover:bg-claude-primary-active transition-colors flex items-center gap-0.5"><Save size={14} /></button>
                              </div>
                            ) : (
                              <button onClick={toggle} className="text-claude-muted-soft hover:text-claude-ink transition-colors"><Edit3 size={14} /></button>
                            )
                          }
                        >
                          {editing ? (
                            <div className="space-y-4">
                              <EducationEditor education={edu} onUpdate={(e) => updateStore((s) => updateEducation(s, e))} />
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {edu.master?.schoolName && (
                                <div className="bg-claude-canvas rounded-[8px] px-3 py-2 space-y-0.5">
                                  <span className="text-[11px] text-claude-muted-soft">硕士</span>
                                  <p className="text-[13px] text-claude-ink font-medium">{edu.master.schoolName}</p>
                                  <p className="text-[12px] text-claude-muted">{[edu.master.major, edu.master.degree, edu.master.college].filter(Boolean).join(" · ")}</p>
                                  {edu.master.period && <p className="text-[12px] text-claude-muted-soft">时间：{edu.master.period}</p>}
                                  {edu.master.fullTime && <p className="text-[12px] text-claude-muted-soft">全日制：{edu.master.fullTime}　是否统招：{edu.master.unifiedEnrollment || "—"}</p>}
                                  {edu.master.gpa && <p className="text-[12px] text-claude-muted-soft">GPA：{edu.master.gpa}{edu.master.ranking ? `　排名：${edu.master.ranking}` : ""}</p>}
                                  {edu.master.honors && <p className="text-[12px] text-claude-muted-soft">荣誉：{renderMarkdown(edu.master.honors)}</p>}
                                  {edu.master.relevantCourses && (
                                    <div className="flex flex-wrap gap-1 pt-0.5">
                                      {edu.master.relevantCourses.split(/[,，;；\n]/).filter(Boolean).map((c, i) => (
                                        <span key={i} className="text-[11px] text-claude-body bg-claude-cream-strong rounded-full px-2 py-0.5">{c.trim()}</span>
                                      ))}
                                    </div>
                                  )}
                                  {(edu.master.customFields?.length ?? 0) > 0 && edu.master.customFields!.map((f) => (
                                    <div key={f.id}><span className="text-[11px] text-claude-muted-soft">{f.title}</span><p className="text-[12px] text-claude-ink">{renderMarkdown(f.content)}</p></div>
                                  ))}
                                </div>
                              )}
                              {edu.undergrad?.schoolName && (
                                <div className="bg-claude-canvas rounded-[8px] px-3 py-2 space-y-0.5">
                                  <span className="text-[11px] text-claude-muted-soft">本科</span>
                                  <p className="text-[13px] text-claude-ink font-medium">{edu.undergrad.schoolName}</p>
                                  <p className="text-[12px] text-claude-muted">{[edu.undergrad.major, edu.undergrad.degree, edu.undergrad.college].filter(Boolean).join(" · ")}</p>
                                  {edu.undergrad.period && <p className="text-[12px] text-claude-muted-soft">时间：{edu.undergrad.period}</p>}
                                  {edu.undergrad.fullTime && <p className="text-[12px] text-claude-muted-soft">全日制：{edu.undergrad.fullTime}　是否统招：{edu.undergrad.unifiedEnrollment || "—"}</p>}
                                  {edu.undergrad.gpa && <p className="text-[12px] text-claude-muted-soft">GPA：{edu.undergrad.gpa}{edu.undergrad.ranking ? `　排名：${edu.undergrad.ranking}` : ""}</p>}
                                  {edu.undergrad.honors && <p className="text-[12px] text-claude-muted-soft">荣誉：{renderMarkdown(edu.undergrad.honors)}</p>}
                                  {edu.undergrad.relevantCourses && (
                                    <div className="flex flex-wrap gap-1 pt-0.5">
                                      {edu.undergrad.relevantCourses.split(/[,，;；\n]/).filter(Boolean).map((c, i) => (
                                        <span key={i} className="text-[11px] text-claude-body bg-claude-cream-strong rounded-full px-2 py-0.5">{c.trim()}</span>
                                      ))}
                                    </div>
                                  )}
                                  {(edu.undergrad.customFields?.length ?? 0) > 0 && edu.undergrad.customFields!.map((f) => (
                                    <div key={f.id}><span className="text-[11px] text-claude-muted-soft">{f.title}</span><p className="text-[12px] text-claude-ink">{renderMarkdown(f.content)}</p></div>
                                  ))}
                                </div>
                              )}
                              {edu.highSchool?.schoolName && (
                                <div className="bg-claude-canvas rounded-[8px] px-3 py-2 space-y-0.5">
                                  <span className="text-[11px] text-claude-muted-soft">高中</span>
                                  <p className="text-[13px] text-claude-ink font-medium">{edu.highSchool.schoolName}</p>
                                  {edu.highSchool.examOrigin && <p className="text-[12px] text-claude-muted-soft">生源地：{edu.highSchool.examOrigin}</p>}
                                  {edu.highSchool.examScore && <p className="text-[12px] text-claude-muted-soft">高考分数：{edu.highSchool.examScore}</p>}
                                  {edu.highSchool.artsOrScience && <p className="text-[12px] text-claude-muted-soft">文/理科：{edu.highSchool.artsOrScience}</p>}
                                  {(edu.highSchool.customFields?.length ?? 0) > 0 && edu.highSchool.customFields!.map((f) => (
                                    <div key={f.id}><span className="text-[11px] text-claude-muted-soft">{f.title}</span><p className="text-[12px] text-claude-ink">{renderMarkdown(f.content)}</p></div>
                                  ))}
                                </div>
                              )}
                              {!edu.master?.schoolName && !edu.undergrad?.schoolName && !edu.highSchool?.schoolName && (
                                <p className="text-[13px] text-claude-muted-soft">暂无教育经历，点击编辑添加</p>
                              )}
                            </div>
                          )}
                        </SortableSection>
                      );
                    }
                    case "family": {
                      const editing = editingSections.has("family");
                      const toggle = () => setEditingSections((prev) => { const next = new Set(prev); if (next.has("family")) next.delete("family"); else next.add("family"); return next; });
                      const fam = store.shared.family;
                      return (
                        <SortableSection key="family" id="family" title="家庭成员"
                          actions={
                            filterMode ? (
                              <input type="checkbox" checked={exportSelection.has("family")} onChange={() => toggleExportKey("family")} className="accent-claude-primary w-4 h-4 cursor-pointer" />
                            ) : editing ? (
                              <div className="flex items-center gap-1">
                                <button onClick={toggle} className="text-[11px] px-2 py-0.5 rounded-[4px] hover:bg-claude-cream-strong text-claude-muted transition-colors">取消</button>
                                <button onClick={toggle} className="text-[11px] px-2 py-0.5 rounded-[4px] bg-claude-primary text-claude-on-primary hover:bg-claude-primary-active transition-colors flex items-center gap-0.5"><Save size={14} /></button>
                              </div>
                            ) : (
                              <button onClick={toggle} className="text-claude-muted-soft hover:text-claude-ink transition-colors"><Edit3 size={14} /></button>
                            )
                          }
                        >
                          {editing ? (
                            <div className="space-y-4">
                              <FamilyEditor family={fam} onUpdate={(f) => updateStore((s) => updateFamily(s, f))} />
                              <div className="border-t border-claude-hairline" />
                              <CustomFieldsEditor
                                fields={store.shared.customFields["family"] || []}
                                onUpdate={(f) => updateStore((s) => updateCustomFields(s, "family", f))}
                              />
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {fam.length === 0 ? (
                                <p className="text-[13px] text-claude-muted-soft">暂无家庭成员，点击编辑添加</p>
                              ) : (
                                fam.map((m, idx) => (
                                  <div key={idx} className="bg-claude-canvas rounded-[8px] px-3 py-2 flex items-center gap-3">
                                    <span className="text-[13px] text-claude-ink font-medium">{m.name || "—"}</span>
                                    <span className="text-[12px] text-claude-muted">{m.relation || "—"}</span>
                                    <span className="text-[12px] text-claude-muted-soft">{m.workUnit || ""}{m.position ? ` · ${m.position}` : ""}</span>
                                  </div>
                                ))
                              )}
                              {store.shared.customFields["family"]?.length! > 0 && (
                                <>
                                  <div className="border-t border-claude-hairline" />
                                  <div className="space-y-2">
                                    {store.shared.customFields["family"].map((f) => (
                                      <div key={f.id}>
                                        <span className="text-[11px] text-claude-muted-soft">{f.title}</span>
                                        <p className="text-[13px] text-claude-ink whitespace-pre-wrap">{renderMarkdown(f.content)}</p>
                                      </div>
                                    ))}
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </SortableSection>
                      );
                    }
                    case "skills": {
                      const editing = editingSections.has("skills");
                      const toggle = () => setEditingSections((prev) => { const next = new Set(prev); if (next.has("skills")) next.delete("skills"); else next.add("skills"); return next; });
                      const sk = library.skills;
                      const hasSkills = Object.keys(sk).length > 0;
                      return (
                        <SortableSection key="skills" id="skills" title="技能"
                          actions={
                            filterMode ? (
                              <input type="checkbox" checked={exportSelection.has("skills")} onChange={() => toggleExportKey("skills")} className="accent-claude-primary w-4 h-4 cursor-pointer" />
                            ) : editing ? (
                              <div className="flex items-center gap-1">
                                <button onClick={toggle} className="text-[11px] px-2 py-0.5 rounded-[4px] hover:bg-claude-cream-strong text-claude-muted transition-colors">取消</button>
                                <button onClick={toggle} className="text-[11px] px-2 py-0.5 rounded-[4px] bg-claude-primary text-claude-on-primary hover:bg-claude-primary-active transition-colors flex items-center gap-0.5"><Save size={14} /></button>
                              </div>
                            ) : (
                              <button onClick={toggle} className="text-claude-muted-soft hover:text-claude-ink transition-colors"><Edit3 size={14} /></button>
                            )
                          }
                        >
                          {editing ? (
                            <div className="space-y-4">
                              <SkillsEditor skills={sk} onUpdate={(sk2) => updateStore((s) => updateSkills(s, activeDirection, sk2))} />
                              <div className="border-t border-claude-hairline" />
                              <CustomFieldsEditor
                                fields={store.shared.customFields["skills"] || []}
                                onUpdate={(f) => updateStore((s) => updateCustomFields(s, "skills", f))}
                              />
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {!hasSkills ? (
                                <p className="text-[13px] text-claude-muted-soft">暂无技能，点击编辑添加</p>
                              ) : (
                                Object.entries(sk).map(([cat, items]) => (
                                  <div key={cat}>
                                    <span className="text-[12px] font-medium text-claude-ink">{cat}</span>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {items.map((item, i) => (
                                        <span key={i} className="text-[12px] text-claude-body bg-claude-canvas rounded-[5px] px-2 py-0.5 border border-claude-hairline">{item}</span>
                                      ))}
                                    </div>
                                  </div>
                                ))
                              )}
                              {store.shared.customFields["skills"]?.length! > 0 && (
                                <>
                                  <div className="border-t border-claude-hairline" />
                                  <div className="space-y-2">
                                    {store.shared.customFields["skills"].map((f) => (
                                      <div key={f.id}>
                                        <span className="text-[11px] text-claude-muted-soft">{f.title}</span>
                                        <p className="text-[13px] text-claude-ink whitespace-pre-wrap">{renderMarkdown(f.content)}</p>
                                      </div>
                                    ))}
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </SortableSection>
                      );
                    }
                    case "selfEval": {
                      const editing = editingSections.has("selfEval");
                      const toggle = () => setEditingSections((prev) => { const next = new Set(prev); if (next.has("selfEval")) next.delete("selfEval"); else next.add("selfEval"); return next; });
                      const se = library.selfEval;
                      return (
                        <SortableSection key="selfEval" id="selfEval" title="自我评价"
                          actions={
                            filterMode ? (
                              <input type="checkbox" checked={exportSelection.has("selfEval")} onChange={() => toggleExportKey("selfEval")} className="accent-claude-primary w-4 h-4 cursor-pointer" />
                            ) : editing ? (
                              <div className="flex items-center gap-1">
                                <button onClick={toggle} className="text-[11px] px-2 py-0.5 rounded-[4px] hover:bg-claude-cream-strong text-claude-muted transition-colors">取消</button>
                                <button onClick={toggle} className="text-[11px] px-2 py-0.5 rounded-[4px] bg-claude-primary text-claude-on-primary hover:bg-claude-primary-active transition-colors flex items-center gap-0.5"><Save size={14} /></button>
                              </div>
                            ) : (
                              <button onClick={toggle} className="text-claude-muted-soft hover:text-claude-ink transition-colors"><Edit3 size={14} /></button>
                            )
                          }
                        >
                          {editing ? (
                            <div className="space-y-4">
                              <SelfEvalEditor selfEval={se} onSave={(v) => { updateStore((s) => updateSelfEval(s, activeDirection, v)); setSelfEvalOriginal(null); }} originalText={selfEvalOriginal} onRestoreOriginal={() => setSelfEvalOriginal(null)} />
                              <div className="border-t border-claude-hairline" />
                              <CustomFieldsEditor
                                fields={store.shared.customFields["selfEval"] || []}
                                onUpdate={(f) => updateStore((s) => updateCustomFields(s, "selfEval", f))}
                              />
                            </div>
                          ) : (
                            <div>
                              {se.trim() ? (
                                <p
                                  className={`text-[14px] leading-relaxed text-claude-body whitespace-pre-wrap ${aiModalOpen ? "cursor-pointer hover:ring-1 hover:ring-claude-primary/30 rounded-[6px] px-1 -mx-1 transition-all" : ""}`}
                                  onClick={() => {
                                    if (aiModalOpen) {
                                      setSelectedCardText(se);
                                      setSelectedCardLabel("自我评价");
                                      setSelectedCardSource({ type: "selfEval" });
                                    }
                                  }}
                                >{renderMarkdown(se)}</p>
                              ) : (
                                <p className="text-[13px] text-claude-muted-soft">暂无自我评价，点击编辑添加</p>
                              )}
                              {store.shared.customFields["selfEval"]?.length! > 0 && (
                                <>
                                  <div className="border-t border-claude-hairline mt-3" />
                                  <div className="space-y-2 mt-2">
                                    {store.shared.customFields["selfEval"].map((f) => (
                                      <div key={f.id}>
                                        <span className="text-[11px] text-claude-muted-soft">{f.title}</span>
                                        <p className="text-[13px] text-claude-ink whitespace-pre-wrap">{renderMarkdown(f.content)}</p>
                                      </div>
                                    ))}
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </SortableSection>
                      );
                    }
                    case "resumeContent":
                      return (
                        <div key="resumeContent" className="md:col-span-2">
                          <SortableSection id="resumeContent" title={activeDirection === "综合" ? "完整简历" : `${activeDirection}方向`} icon={null}>
                            <div className="space-y-6">
                              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(event: DragEndEvent) => {
                                const { active, over } = event;
                                if (over && active.id !== over.id) {
                                  const fromIdx = subsectionOrder.indexOf(active.id as CardSection);
                                  const toIdx = subsectionOrder.indexOf(over.id as CardSection);
                                  if (fromIdx !== -1 && toIdx !== -1) handleSubsectionReorder(fromIdx, toIdx);
                                }
                              }}>
                                <SortableContext items={subsectionOrder} strategy={verticalListSortingStrategy}>
                                  <div className="space-y-6">
                                    {subsectionOrder.map((subKey) => {
                                      const meta = SECTION_META.find((m) => m.key === subKey)!;
                                      const items = library[subKey];
                                      const subEditing = editingSubSections.has(subKey);
                                      const toggleSub = () => setEditingSubSections((prev) => {
                                        const next = new Set(prev);
                                        if (next.has(subKey)) next.delete(subKey); else next.add(subKey);
                                        return next;
                                      });
                                      const prefix = subKey === "experiences" ? "exp" : subKey === "projects" ? "proj" : subKey === "campus" ? "cam" : "soc";
                                      const subActions = (
                                        <div className="flex items-center gap-1">
                                          {filterMode ? (
                                            <div className="flex items-center gap-2">
                                              <span className="text-[11px] text-claude-muted-soft">{items.filter((c) => exportSelection.has(`${prefix}:${c.id}`)).length}/{items.length}</span>
                                              <button onClick={() => selectSection(prefix, items)} className="text-[11px] text-claude-primary hover:text-claude-primary-active font-medium">全选</button>
                                              <button onClick={() => deselectSection(prefix, items)} className="text-[11px] text-claude-muted hover:text-claude-ink">取消</button>
                                            </div>
                                          ) : (
                                            subEditing ? (
                                              <button onClick={toggleSub} className="text-[11px] px-2 py-0.5 rounded-[4px] bg-claude-primary text-claude-on-primary hover:bg-claude-primary-active transition-colors flex items-center gap-0.5">
                                                <Save size={14} />
                                              </button>
                                            ) : (
                                              <button onClick={toggleSub} className="text-claude-muted-soft hover:text-claude-ink transition-colors">
                                                <Edit3 size={14} />
                                              </button>
                                            )
                                          )}
                                        </div>
                                      );
                                      return (
                                        <SortableSection key={subKey} id={subKey} title={meta.title} actions={subActions}>
                                          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(event: DragEndEvent) => {
                                            const { active, over } = event;
                                            if (over && active.id !== over.id) {
                                              const fromIdx = items.findIndex((item) => item.id === active.id);
                                              const toIdx = items.findIndex((item) => item.id === over.id);
                                              if (fromIdx !== -1 && toIdx !== -1) handleReorderCards(subKey, fromIdx, toIdx);
                                            }
                                          }}>
                                            <SortableContext items={items.map((item) => item.id)} strategy={rectSortingStrategy}>
                                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {items.map((item) => (
                                                  <SortableCard key={item.id} id={item.id}>
                                                    <ResumeCard
                                                      item={item}
                                                      forceEdit={subEditing} saveAllKey={saveAllKey}
                                                      onUpdate={(updates) => updateStore((s) => updateCard(s, activeDirection, subKey, item.id, updates))}
                                                      onDelete={() => updateStore((s) => deleteCard(s, activeDirection, subKey, item.id))}
                                                      onSelectForAi={aiModalOpen ? () => {
                                                        setSelectedCardText(item.bullets.map((b) => b.text).join("\n"));
                                                        setSelectedCardLabel(`${item.name || "(空)"} · ${item.role || ""}`);
                                                        setSelectedCardSource({ type: "card", section: subKey, cardId: item.id });
                                                      } : undefined}
                                                      onUndoPolish={(bulletIdx) => updateStore((s) => undoAiPolish(s, activeDirection, subKey, item.id, bulletIdx))}
                                                      filterMode={filterMode}
                                                      isChecked={exportSelection.has(`${subKey === "experiences" ? "exp" : subKey === "projects" ? "proj" : subKey === "campus" ? "cam" : "soc"}:${item.id}`)}
                                                      onToggleCheck={() => toggleExportKey(`${subKey === "experiences" ? "exp" : subKey === "projects" ? "proj" : subKey === "campus" ? "cam" : "soc"}:${item.id}`)}
                                                    />
                                                  </SortableCard>
                                                ))}
                                              </div>
                                            </SortableContext>
                                            <button onClick={() => handleAddCard(subKey)} className="mt-3 flex items-center gap-1 text-[12px] text-claude-muted hover:text-claude-primary transition-colors">
                                              <Plus size={12} />添加经历
                                            </button>
                                          </DndContext>
                                        </SortableSection>
                                      );
                                    })}
                                  </div>
                                </SortableContext>
                              </DndContext>
                            </div>
                          </SortableSection>
                        </div>
                      );
                    default:
                      return null;
                  }
                })();
                return sectionEl;
              })}
            </div>
          </SortableContext>
        </DndContext>

        <div className="text-center py-6 space-y-1.5">
          <p className="text-[12px] text-claude-muted-soft">
            配合浏览器插件「简历库助手」使用 ·
            <a href="https://github.com/c845427500-creator/resume-toolkit/tree/main/extension" target="_blank" rel="noopener" className="text-claude-primary hover:text-claude-primary-active underline underline-offset-2 ml-0.5">
              安装说明
            </a>
          </p>
          <p className="text-[11px] text-claude-muted-soft/70">
            点击顶部「同步到插件」→ 在插件弹窗中「导入」JSON 即可
          </p>
        </div>

        {/* Filter mode bottom bar */}
        {filterMode && (
          <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between gap-3 px-6 py-3 border-t" style={{ background: "rgba(252,249,243,0.92)", borderColor: "var(--color-claude-hairline)", backdropFilter: "blur(16px)" }}>
            <div className="flex items-center gap-3">
              <button onClick={selectAllExport} className="text-[12px] text-claude-primary hover:text-claude-primary-active font-medium">全选</button>
              <button onClick={deselectAllExport} className="text-[12px] text-claude-muted hover:text-claude-ink">取消全选</button>
              <span className="text-[12px] text-claude-muted-soft">
                已选 {exportSelection.size} 项
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setFilterMode(false)} className="px-4 py-2 text-[12px] text-claude-muted rounded-[8px] hover:bg-claude-surface transition-colors">取消</button>
              <button onClick={handleExportFiltered} className="px-5 py-2 bg-claude-primary text-claude-on-primary text-[13px] font-medium rounded-[8px] hover:bg-claude-primary-active transition-colors flex items-center gap-1.5">
                <Download size={13} />导出选中内容
              </button>
            </div>
          </div>
        )}

        {/* Bottom padding when filter bar is visible */}
        {filterMode && <div className="h-16" />}
      </main>

      {/* Back to top */}
      {showBackToTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-16 right-6 z-40 w-10 h-10 rounded-full bg-claude-surface-card border border-claude-hairline shadow-md flex items-center justify-center text-claude-muted hover:text-claude-ink hover:border-claude-primary transition-all"
        >
          <ArrowUp size={18} />
        </button>
      )}

      {/* Floating AI button — glassmorphism, draggable */}
      <button
        onPointerDown={handleAiBtnDragStart}
        onPointerMove={handleAiBtnDragMove}
        onPointerUp={handleAiBtnDragEnd}
        className="fixed z-40 w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-xl select-none touch-none"
        style={{
          right: aiBtnPos.right,
          bottom: aiBtnPos.bottom,
          background: "rgba(184,117,74,0.72)",
          border: "1px solid rgba(255,255,255,0.22)",
          boxShadow: "0 0 0 0.5px rgba(255,252,248,0.25), inset 0 1px 0 rgba(255,255,255,0.25), 0 4px 20px rgba(80,50,20,0.12), 0 8px 32px rgba(80,50,20,0.06)",
          transition: "box-shadow 0.2s, background 0.2s",
        }}
        title="AI 助手（可拖拽移动）"
      >
        <Sparkles size={20} className="text-white/95 pointer-events-none" />
      </button>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-claude-surface-dark">
        <div className="w-full max-w-screen-lg mx-auto flex items-center px-6 h-12">
          <Link href="/" className="flex-1 flex items-center justify-center gap-1.5 py-2 text-claude-on-dark-soft hover:text-claude-on-dark transition-colors">
            <span className="text-[13px]">首页</span>
          </Link>
          <span className="flex-1 flex items-center justify-center gap-1.5 py-2">
            <span className="text-[13px] font-medium text-claude-on-dark">简历库</span>
          </span>
        </div>
      </nav>

      {/* API Key Modal */}
      {apiKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#272728]/20 p-5" onClick={() => setApiKeyModal(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="bg-claude-surface-card rounded-[16px] border border-claude-hairline p-6 w-full max-w-[380px] shadow-xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-[16px] font-medium text-claude-ink">DeepSeek API Key</h2>
            <p className="text-[13px] text-claude-muted">Key only stored in browser. <a href="https://platform.deepseek.com/api_keys" target="_blank" className="text-claude-primary underline">get key →</a></p>
            <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-..." className="w-full text-[14px] text-claude-ink bg-claude-canvas rounded-[8px] px-3 py-2.5 border border-claude-hairline focus:border-claude-primary focus:outline-none" autoFocus />
            <div className="flex gap-2">
              <button onClick={() => saveApiKey("")} className="flex-1 py-2.5 text-[13px] text-claude-muted rounded-[8px] hover:bg-claude-surface transition-colors">清除</button>
              <button onClick={() => saveApiKey(apiKey)} className="flex-1 py-2.5 bg-claude-primary text-claude-on-primary text-[13px] font-medium rounded-[8px] hover:bg-claude-primary-active transition-colors">保存</button>
            </div>
          </motion.div>
        </div>
      )}

      {/* AI Modal */}
      <AiModal
        open={aiModalOpen}
        onClose={() => { setAiModalOpen(false); setSelectedCardText(""); setSelectedCardLabel(""); setSelectedCardSource(null); }}
        apiKey={apiKey}
        selectedText={selectedCardText}
        selectedLabel={selectedCardLabel}
        onAcceptPolish={handleAcceptPolish}
      />
    </div>
  );
}

function exportForExtension(data: { personal: Personal; education: ResumeStore["shared"]["education"]; experiences: CardItem[]; projects: CardItem[]; campus: CardItem[]; social: CardItem[]; skills: Record<string, string[]>; selfEval: string }, _jobType: string) {
  const lines: string[] = [];
  lines.push(`${data.personal.name}`);
  lines.push(`${data.personal.phone} · ${data.personal.email}`);
  lines.push("");
  lines.push("▎教育经历");
  if (data.education.master?.schoolName) {
    lines.push(`${data.education.master.schoolName}  ${data.education.master.degree}  ${data.education.master.period}`);
    if (data.education.master.notes) lines.push(data.education.master.notes);
  }
  if (data.education.undergrad?.schoolName) {
    lines.push(`${data.education.undergrad.schoolName}  ${data.education.undergrad.degree}  ${data.education.undergrad.period}`);
    if (data.education.undergrad.notes) lines.push(data.education.undergrad.notes);
  }
  if (data.education.highSchool?.schoolName) {
    lines.push(`${data.education.highSchool.schoolName}  高中  —`);
  }
  lines.push("");
  const sections: [string, CardItem[]][] = [["工作/实习经历", data.experiences], ["项目经历", data.projects], ["校园经历", data.campus], ["社会/实践经历", data.social]];
  sections.forEach(([title, items]) => {
    if (items.length > 0) {
      lines.push(`▎${title}`);
      items.forEach((e) => {
        lines.push(`${e.name}  ${e.role}  ${e.period}`);
        e.bullets.forEach((b) => lines.push(`• ${b.text}`));
        lines.push("");
      });
    }
  });
  if (data.selfEval) { lines.push("▎自我评价"); lines.push(data.selfEval); lines.push(""); }
  lines.push("▎技能");
  Object.entries(data.skills).forEach(([cat, items]) => { lines.push(`${cat}：${items.join("、")}`); });
  const text = lines.join("\n");
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "简历.txt"; a.click();
  URL.revokeObjectURL(url);
}
