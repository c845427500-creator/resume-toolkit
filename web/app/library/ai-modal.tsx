"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, X, Check, Copy, RotateCcw, ChevronRight, ChevronLeft, PenLine, Wand2 } from "lucide-react";
import { polishText, polishTextWithReason, generateExperience, optimizeCard, optimizeSingleBullet, type AiBullet } from "@/lib/deepseek-client";

type AiTab = "polish" | "write";
type WriteStep = "intro" | "asking" | "done";

interface StarAnswers {
  situation: string;
  task: string;
  action: string;
  result: string;
}

const QUESTIONS = [
  { key: "situation", label: "背景", question: "这段经历在什么背景下发生的？", hint: "在哪家公司/项目？当时的场景是什么？", placeholder: "我在一家XX公司实习，当时的项目是要…" },
  { key: "task", label: "任务", question: "你具体负责什么任务？目标是什么？", hint: "越具体越好——你的职责范围、KPI、交付标准是什么？", placeholder: "我负责…目标是…" },
  { key: "action", label: "行动", question: "你做了哪些具体动作？怎么做的？", hint: "分成几步？用了什么工具？克服了什么困难？", placeholder: "我先…然后…接着…" },
  { key: "result", label: "结果", question: "结果怎么衡量的？有数据吗？", hint: "效率提升X%？覆盖多少用户？获得什么反馈？", placeholder: "最终XX提升了30%，覆盖了500+用户…" },
];

interface AiModalProps {
  open: boolean;
  onClose: () => void;
  apiKey: string;
  selectedText: string;
  selectedLabel: string;
  onAcceptPolish: (text: string) => void;
}

const MINIMIZED_SIZE = 48;
const PANEL_W = 520;
const MIN_H = 320;
const MAX_H_PCT = 0.85;

export default function AiModal({ open, onClose, apiKey, selectedText, selectedLabel, onAcceptPolish }: AiModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, left: 0, top: 0 });
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);

  const [tab, setTab] = useState<AiTab>("polish");

  // ─── Polish state ──────────────────────────
  const [polishMode, setPolishMode] = useState<"directed" | "auto" | null>(null);
  const [requirement, setRequirement] = useState("");
  const [polishing, setPolishing] = useState(false);
  const [polishComplete, setPolishComplete] = useState(false);
  const [polishResults, setPolishResults] = useState<AiBullet[]>([]);

  // Bullet detection: split selectedText by newlines
  const bullets = useMemo(() => {
    if (!selectedText) return [];
    return selectedText.split("\n").filter((b) => b.trim()).map((b) => b.trim());
  }, [selectedText]);

  const [activeBulletIdx, setActiveBulletIdx] = useState<number | null>(null); // null = all
  const multiBullet = bullets.length > 1;

  // The text that will actually be polished
  const effectiveText = multiBullet && activeBulletIdx !== null
    ? bullets[activeBulletIdx]
    : selectedText;

  // ─── Write state ───────────────────────────
  const [writeStep, setWriteStep] = useState<WriteStep>("intro");
  const [answers, setAnswers] = useState<StarAnswers>({ situation: "", task: "", action: "", result: "" });
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [generatedBullet, setGeneratedBullet] = useState("");
  const [copied, setCopied] = useState(false);
  const writeInputRef = useRef<HTMLTextAreaElement>(null);

  // Reset polish state when selected text changes
  useEffect(() => {
    setPolishMode(null);
    setRequirement("");
    setPolishComplete(false);
    setPolishResults([]);
    setActiveBulletIdx(null);
  }, [selectedText]);

  // Reset position & size on open
  useEffect(() => {
    if (open) { setPosition(null); setPanelSize(null); }
  }, [open]);

  // Reset panelSize on tab switch (auto-fit to content)
  useEffect(() => { setPanelSize(null); }, [tab]);

  // ─── Drag & Resize ──────────────────────────
  const [panelSize, setPanelSize] = useState<{ w: number; h: number } | null>(null);
  const resizing = useRef<{ dir: string; sx: number; sy: number; sw: number; sh: number; sl: number; st: number } | null>(null);

  const MIN_W = 360;
  const MIN_H = 340;

  const currentW = panelSize?.w ?? PANEL_W;
  const currentH = panelSize?.h;

  const onDragPointerDown = useCallback((e: React.PointerEvent) => {
    if (!panelRef.current) return;
    e.preventDefault();
    const rect = panelRef.current.getBoundingClientRect();
    dragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY, left: rect.left, top: rect.top };
    panelRef.current.setPointerCapture(e.pointerId);

    const onMove = (ev: PointerEvent) => {
      if (!dragging.current) return;
      const dx = ev.clientX - dragStart.current.x;
      const dy = ev.clientY - dragStart.current.y;
      let left = dragStart.current.left + dx;
      let top = dragStart.current.top + dy;
      left = Math.max(0, Math.min(left, window.innerWidth - (panelSize?.w ?? PANEL_W)));
      top = Math.max(0, Math.min(top, window.innerHeight - MINIMIZED_SIZE));
      setPosition({ left, top });
    };

    const cleanup = () => {
      dragging.current = false;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", cleanup);
      window.removeEventListener("pointercancel", cleanup);
      try { panelRef.current?.releasePointerCapture(e.pointerId); } catch {}
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", cleanup);
    window.addEventListener("pointercancel", cleanup);
  }, [panelSize?.w]);

  const onResizePointerDown = useCallback((dir: string) => (e: React.PointerEvent) => {
    if (!panelRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = panelRef.current.getBoundingClientRect();
    resizing.current = { dir, sx: e.clientX, sy: e.clientY, sw: rect.width, sh: rect.height, sl: rect.left, st: rect.top };
    panelRef.current.setPointerCapture(e.pointerId);

    const onMove = (ev: PointerEvent) => {
      const r = resizing.current;
      if (!r) return;
      const dx = ev.clientX - r.sx;
      const dy = ev.clientY - r.sy;
      let nw = r.sw;
      let nh = r.sh;
      let nl = r.sl;
      let nt = r.st;

      const maxW = Math.max(MIN_W, window.innerWidth / 2);
      const maxH = Math.max(MIN_H, window.innerHeight / 2);

      if (r.dir.includes("e")) nw = Math.min(maxW, Math.max(MIN_W, r.sw + dx));
      if (r.dir.includes("w")) { nw = Math.min(maxW, Math.max(MIN_W, r.sw - dx)); nl = r.sl + (r.sw - nw); }
      if (r.dir.includes("s")) nh = Math.min(maxH, Math.max(MIN_H, r.sh + dy));
      if (r.dir.includes("n")) { nh = Math.min(maxH, Math.max(MIN_H, r.sh - dy)); nt = r.st + (r.sh - nh); }

      nl = Math.max(0, Math.min(nl, window.innerWidth - MIN_W));
      nt = Math.max(0, Math.min(nt, window.innerHeight - MINIMIZED_SIZE));

      setPanelSize({ w: nw, h: nh });
      setPosition({ left: nl, top: nt });
    };

    const cleanup = () => {
      resizing.current = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", cleanup);
      window.removeEventListener("pointercancel", cleanup);
      try { panelRef.current?.releasePointerCapture(e.pointerId); } catch {}
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", cleanup);
    window.addEventListener("pointercancel", cleanup);
  }, []);

  // Reset panelSize when selected text changes (auto-fit)
  useEffect(() => {
    if (selectedText) setPanelSize(null);
  }, [selectedText]);

  // ─── Polish handlers ───────────────────────
  const handleAutoPolish = async () => {
    if (!selectedText || !apiKey) return;
    setPolishMode("auto");
    setPolishing(true);

    if (multiBullet && activeBulletIdx === null) {
      // All bullets — use optimizeCard which returns AiBullet[]
      const results = await optimizeCard(apiKey, selectedText);
      setPolishing(false);
      if (results) {
        setPolishResults(results);
        setPolishComplete(true);
      }
    } else {
      // Single bullet — use optimizeSingleBullet
      const result = await optimizeSingleBullet(apiKey, effectiveText);
      setPolishing(false);
      if (result) {
        setPolishResults([result]);
        setPolishComplete(true);
      }
    }
  };

  const handleDirectedPolish = async () => {
    if (!effectiveText || !apiKey || !requirement.trim()) return;
    setPolishing(true);
    const result = await polishTextWithReason(apiKey, effectiveText, requirement.trim());
    setPolishing(false);
    if (result) {
      setPolishResults([{ original: effectiveText, issues: "", quantify: "", rewritten: result.rewritten, reason: result.reason }]);
      setPolishComplete(true);
    }
  };

  const handleAcceptPolish = (idx: number) => {
    const item = polishResults[idx];
    if (item) {
      onAcceptPolish(item.rewritten);
      // Remove accepted result; if none left, reset
      const next = polishResults.filter((_, i) => i !== idx);
      if (next.length === 0) {
        setPolishComplete(false);
        setPolishResults([]);
        setPolishMode(null);
        setRequirement("");
      } else {
        setPolishResults(next);
      }
    }
  };

  const handleAcceptAll = () => {
    const allText = polishResults.map((r) => r.rewritten).join("\n");
    onAcceptPolish(allText);
    setPolishComplete(false);
    setPolishResults([]);
    setPolishMode(null);
    setRequirement("");
  };

  const handleRepolish = () => {
    setPolishComplete(false);
    setPolishResults([]);
    if (polishMode === "auto") {
      handleAutoPolish();
    } else {
      setPolishMode("directed");
    }
  };

  // ─── Write handlers ────────────────────────
  const handleWriteNext = () => {
    if (currentQuestion < QUESTIONS.length - 1) {
      setCurrentQuestion((c) => c + 1);
      setTimeout(() => writeInputRef.current?.focus(), 150);
    }
  };

  const handleWritePrev = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion((c) => c - 1);
      setTimeout(() => writeInputRef.current?.focus(), 150);
    }
  };

  const handleGenerate = async () => {
    if (!apiKey) return;
    setGenerating(true);
    try {
      const result = await generateExperience(apiKey, answers);
      if (result) {
        setGeneratedBullet(result);
        setWriteStep("done");
      }
    } catch {} finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedBullet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resetWrite = () => {
    setWriteStep("intro");
    setAnswers({ situation: "", task: "", action: "", result: "" });
    setCurrentQuestion(0);
    setGeneratedBullet("");
    setCopied(false);
  };

  const allAnswered = answers.situation.trim() && answers.task.trim() && answers.action.trim() && answers.result.trim();
  const currentAnswer = answers[QUESTIONS[currentQuestion].key as keyof StarAnswers];

  if (!open) return null;

  const style = position
    ? { left: position.left, top: position.top, transform: "none" }
    : { left: `calc(50% - ${currentW / 2}px)`, top: "50%", transform: "translateY(-50%)" };

  return (
    <motion.div
      ref={panelRef}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      style={{
        ...style,
        width: currentW,
        height: currentH || "auto",
        maxHeight: panelSize ? undefined : `min(${Math.floor(window.innerHeight / 2)}px, 80vh)`,
        // Apple frosted glass: 75% transparent (25% overlay) — the background page bleeds through
        background: "linear-gradient(135deg, rgba(252,249,243,0.25) 0%, rgba(246,240,229,0.28) 100%)",
        borderColor: "rgba(255,255,255,0.22)",
        boxShadow:
          // Outer ring — subtle white for glass edge
          "0 0 0 0.5px rgba(255,252,248,0.6)," +
          // Inner top highlight — light hitting the glass rim
          "inset 0 1px 0 rgba(255,255,255,0.45)," +
          // Close soft shadow for elevation
          "0 2px 16px rgba(80,50,20,0.06)," +
          // Deep diffuse shadow for floating depth
          "0 16px 48px rgba(80,50,20,0.10)," +
          // Far ambient shadow
          "0 32px 64px rgba(80,50,20,0.04)",
        borderRadius: 20,
      } as React.CSSProperties}
      className="fixed z-50 flex flex-col overflow-hidden select-none backdrop-blur-3xl backdrop-saturate-200"
    >
      {/* Drag handle — top edge bar, nearly transparent */}
      <div
        onPointerDown={onDragPointerDown}
        className="h-3 shrink-0 cursor-grab active:cursor-grabbing flex items-center justify-center group"
        style={{ background: "rgba(255,255,255,0.15)" }}
      >
        <div className="w-8 h-0.5 rounded-full bg-claude-muted-soft/25 group-hover:bg-claude-muted-soft/50 transition-colors" />
      </div>

      {/* Header — tab switcher, light translucent */}
      <div
        className="flex items-center border-b shrink-0"
        style={{ borderColor: "rgba(255,255,255,0.2)", background: "rgba(255,252,248,0.35)" }}
      >
        <button
          onClick={() => { setTab("polish"); setPolishMode(null); setPolishComplete(false); }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[13px] font-medium transition-colors ${
            tab === "polish" ? "text-claude-ink" : "text-claude-muted hover:text-claude-ink"
          }`}
        >
          <Wand2 size={13} />AI 润色
        </button>
        <button
          onClick={() => { setTab("write"); resetWrite(); }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[13px] font-medium transition-colors ${
            tab === "write" ? "text-claude-ink" : "text-claude-muted hover:text-claude-ink"
          }`}
        >
          <PenLine size={13} />AI 写作
        </button>
        <button onClick={onClose} className="w-9 h-9 flex items-center justify-center text-claude-muted-soft hover:text-claude-ink transition-colors mr-1">
          <X size={15} />
        </button>
      </div>

      {/* Active tab indicator — translucent */}
      <div className="flex shrink-0" style={{ background: "rgba(255,255,255,0.12)" }}>
        <div
          className="flex-1 h-0.5 transition-all duration-300 rounded-r"
          style={{ background: tab === "polish" ? "var(--color-claude-primary)" : "transparent" }}
        />
        <div
          className="flex-1 h-0.5 transition-all duration-300 rounded-l"
          style={{ background: tab === "write" ? "var(--color-claude-primary)" : "transparent" }}
        />
      </div>

      {/* Body */}
      <div
        className="overflow-y-auto min-h-0 select-text"
        style={{ flex: panelSize ? "1 1 0%" : "0 1 auto", minHeight: panelSize ? undefined : 240 }}
      >
        {tab === "polish" ? (
          <div className="p-4 space-y-3">
            {/* Selected card indicator */}
            {selectedText ? (
              <>
                <div className="rounded-[10px] p-3.5 border" style={{ background: "rgba(255,255,255,0.45)", borderColor: "rgba(255,255,255,0.3)" }}>
                  <p className="text-[10px] text-claude-muted-soft mb-0.5 uppercase tracking-wider">已选择</p>
                  <p className="text-[12px] font-medium text-claude-ink mb-1.5">{selectedLabel}</p>
                  {!multiBullet && (
                    <p className="text-[12px] text-claude-body leading-relaxed whitespace-pre-wrap">{selectedText}</p>
                  )}
                </div>

                {/* Bullet list selector — when card has multiple bullets */}
                {multiBullet && !polishComplete && (
                  <div className="space-y-1">
                    <p className="text-[10px] text-claude-muted-soft uppercase tracking-wider px-1 mb-1">
                      选择优化范围（共 {bullets.length} 条）
                    </p>
                    {/* Select all */}
                    <button
                      onClick={() => setActiveBulletIdx(null)}
                      className={`w-full text-left px-3 py-2 rounded-[7px] text-[12px] transition-all border flex items-center gap-2 ${
                        activeBulletIdx === null
                          ? "bg-claude-primary/15 border-claude-primary/40 text-claude-ink font-medium"
                          : "bg-white/20 border-white/15 text-claude-body hover:bg-white/30"
                      }`}
                    >
                      <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                        activeBulletIdx === null ? "border-claude-primary" : "border-claude-muted-soft/50"
                      }`}>
                        {activeBulletIdx === null && <span className="w-1.5 h-1.5 rounded-full bg-claude-primary" />}
                      </span>
                      全选（{bullets.length} 条一起润色）
                    </button>
                    {/* Individual bullets */}
                    {bullets.map((b, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveBulletIdx(i)}
                        className={`w-full text-left px-3 py-2 rounded-[7px] text-[12px] transition-all border flex items-center gap-2 ${
                          activeBulletIdx === i
                            ? "bg-claude-primary/15 border-claude-primary/40 text-claude-ink font-medium"
                            : "bg-white/20 border-white/15 text-claude-body hover:bg-white/30"
                        }`}
                      >
                        <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                          activeBulletIdx === i ? "border-claude-primary" : "border-claude-muted-soft/50"
                        }`}>
                          {activeBulletIdx === i && <span className="w-1.5 h-1.5 rounded-full bg-claude-primary" />}
                        </span>
                        <span className="truncate">{b}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-[10px] p-5 border border-dashed text-center" style={{ background: "rgba(255,255,255,0.25)", borderColor: "rgba(255,255,255,0.25)" }}>
                <p className="text-[12px] text-claude-muted">点击页面上的自我评价或经历卡片，自动捕获文本</p>
              </div>
            )}

            {/* Polish actions */}
            {!polishComplete && selectedText && (
              <div className="space-y-2">
                {polishMode === "directed" ? (
                  <div className="space-y-2">
                    {multiBullet && activeBulletIdx !== null && (
                      <p className="text-[11px] text-claude-muted px-1">只润色第 {activeBulletIdx + 1} 条 bullet</p>
                    )}
                    <textarea
                      value={requirement}
                      onChange={(e) => setRequirement(e.target.value)}
                      placeholder="输入润色要求，如：用词更专业、突出量化成果、缩短到50字以内…"
                      className="w-full h-[72px] px-3 py-2 bg-white/30 rounded-[8px] text-[12px] text-claude-ink placeholder-claude-muted-soft resize-none border border-white/20 focus:border-claude-primary focus:outline-none backdrop-blur-sm"
                      autoFocus
                    />
                    <button
                      onClick={handleDirectedPolish}
                      disabled={polishing || !requirement.trim()}
                      className="w-full py-2.5 bg-claude-primary disabled:bg-claude-hairline disabled:text-claude-muted-soft text-claude-on-primary text-[13px] font-medium rounded-[8px] flex items-center justify-center gap-1.5 hover:bg-claude-primary-active transition-colors"
                    >
                      {polishing ? <><Loader2 size={13} className="animate-spin" />润色中…</> : <><Sparkles size={13} />开始润色</>}
                    </button>
                    <button onClick={() => setPolishMode(null)} className="w-full py-2 text-[12px] text-claude-muted hover:text-claude-ink transition-colors">返回</button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPolishMode("directed")}
                      className="flex-1 py-2.5 border text-claude-body text-[12px] font-medium rounded-[8px] hover:bg-white/30 transition-colors flex items-center justify-center gap-1.5"
                      style={{ borderColor: "rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.35)" }}
                    >
                      <PenLine size={13} />自定义要求润色
                    </button>
                    <button
                      onClick={handleAutoPolish}
                      disabled={polishing}
                      className="flex-1 py-2.5 bg-claude-primary disabled:bg-claude-hairline disabled:text-claude-muted-soft text-claude-on-primary text-[12px] font-medium rounded-[8px] hover:bg-claude-primary-active transition-colors flex items-center justify-center gap-1.5"
                    >
                      {polishing ? <><Loader2 size={13} className="animate-spin" />润色中…</> : <><Sparkles size={13} />自动润色</>}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Polish results — comparison cards */}
            {polishComplete && polishResults.length > 0 && (
              <div className="space-y-3">
                {polishResults.length > 1 && (
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] text-claude-muted">
                      {polishResults.length} 条优化结果
                    </p>
                    <button
                      onClick={handleAcceptAll}
                      className="px-3 py-1.5 bg-claude-primary text-claude-on-primary text-[11px] font-medium rounded-[6px] flex items-center gap-1 hover:bg-claude-primary-active transition-colors"
                    >
                      <Check size={11} />全部采纳
                    </button>
                  </div>
                )}
                {polishResults.map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="rounded-[10px] border overflow-hidden"
                    style={{ background: "rgba(255,255,255,0.45)", borderColor: "rgba(255,255,255,0.3)" }}
                  >
                    {/* Side-by-side comparison */}
                    <div className="grid grid-cols-2 divide-x" style={{ borderColor: "rgba(255,255,255,0.25)" }}>
                      <div className="p-3">
                        <p className="text-[10px] text-claude-muted-soft mb-1.5 uppercase tracking-wider">原文</p>
                        <p className="text-[12px] text-claude-body leading-relaxed whitespace-pre-wrap">{item.original}</p>
                      </div>
                      <div className="p-3">
                        <div className="flex items-center gap-1 mb-1.5">
                          <Sparkles size={10} className="text-claude-primary" />
                          <p className="text-[10px] text-claude-primary font-medium uppercase tracking-wider">优化版</p>
                        </div>
                        <p className="text-[12px] text-claude-ink leading-relaxed whitespace-pre-wrap">{item.rewritten}</p>
                      </div>
                    </div>

                    {/* Reason */}
                    {item.reason && (
                      <div className="px-3 pb-3 pt-2 border-t" style={{ borderColor: "rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.15)" }}>
                        <p className="text-[11px] text-claude-muted leading-relaxed">
                          <span className="text-claude-muted-soft mr-1">为什么这样改：</span>
                          {item.reason}
                        </p>
                      </div>
                    )}

                    {/* Per-item actions */}
                    <div className="flex gap-2 px-3 pb-3">
                      <button
                        onClick={() => handleAcceptPolish(i)}
                        className="flex-1 py-2 bg-claude-primary text-claude-on-primary text-[11px] font-medium rounded-[7px] flex items-center justify-center gap-1 hover:bg-claude-primary-active transition-colors"
                      >
                        <Check size={12} />采纳这条
                      </button>
                    </div>
                  </motion.div>
                ))}

                {/* Re-polish */}
                <button
                  onClick={handleRepolish}
                  className="w-full py-2.5 border text-claude-body text-[12px] font-medium rounded-[8px] hover:bg-white/30 transition-colors flex items-center justify-center gap-1.5"
                  style={{ borderColor: "rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.35)" }}
                >
                  <RotateCcw size={13} />重新润色
                </button>
              </div>
            )}
          </div>
        ) : (
          /* ─── Write Tab ─── */
          <div className="p-4">
            <AnimatePresence mode="wait">
              {writeStep === "intro" && (
                <motion.div key="intro" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                  <div>
                    <h3 className="text-[17px] text-claude-ink mb-1.5" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500 }}>
                      AI 问你 4 个问题，生成一条简历 Bullet
                    </h3>
                    <p className="text-[12px] text-claude-body leading-relaxed">
                      用口语描述一段经历，AI 按照 STAR 法则自动提炼成专业简历措辞。
                    </p>
                  </div>
                  <div className="space-y-0">
                    {QUESTIONS.map((q, i) => (
                      <div key={q.key} className="flex items-center gap-3 px-3 py-1.5">
                        <span className="text-[11px] text-claude-muted-soft w-3">{i + 1}</span>
                        <div>
                          <p className="text-[12px] text-claude-ink">{q.label}</p>
                          <p className="text-[11px] text-claude-muted-soft">{q.question}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => setWriteStep("asking")}
                    className="w-full py-2.5 bg-claude-primary text-claude-on-primary text-[12px] font-medium rounded-[8px] flex items-center justify-center gap-1.5 hover:bg-claude-primary-active transition-colors"
                  >
                    开始写作 <ChevronRight size={13} />
                  </button>
                </motion.div>
              )}

              {writeStep === "asking" && (
                <motion.div key="asking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                  {/* Progress */}
                  <div className="flex items-center gap-1">
                    {QUESTIONS.map((q, i) => (
                      <div key={q.key} className="flex-1 h-0.5 rounded-full transition-colors duration-300"
                        style={{ background: answers[q.key as keyof StarAnswers] ? "var(--color-claude-primary)" : i <= currentQuestion ? "var(--color-claude-hairline)" : "var(--color-claude-surface-card)" }}
                      />
                    ))}
                  </div>

                  <AnimatePresence mode="wait">
                    <motion.div key={currentQuestion} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.12 }}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[10px] text-claude-muted-soft">{currentQuestion + 1} / 4</span>
                        <span className="text-[11px] text-claude-ink">{QUESTIONS[currentQuestion].label}</span>
                      </div>
                      <h4 className="text-[15px] text-claude-ink mb-1" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500 }}>
                        {QUESTIONS[currentQuestion].question}
                      </h4>
                      <p className="text-[11px] text-claude-muted mb-2">{QUESTIONS[currentQuestion].hint}</p>
                      <textarea
                        ref={writeInputRef}
                        value={currentAnswer}
                        onChange={(e) => setAnswers({ ...answers, [QUESTIONS[currentQuestion].key]: e.target.value })}
                        placeholder={QUESTIONS[currentQuestion].placeholder}
                        className="w-full h-[88px] px-3 py-2 bg-white/30 rounded-[8px] text-[12px] text-claude-ink placeholder-claude-muted-soft resize-none border border-white/20 focus:border-claude-primary focus:outline-none backdrop-blur-sm"
                        autoFocus
                      />
                    </motion.div>
                  </AnimatePresence>

                  <div className="flex items-center justify-between">
                    <button onClick={handleWritePrev} disabled={currentQuestion === 0} className="flex items-center gap-1 text-[11px] text-claude-muted disabled:opacity-30 hover:text-claude-ink transition-colors">
                      <ChevronLeft size={12} />上一题
                    </button>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setWriteStep("intro")} className="px-3 py-1.5 text-[11px] text-claude-muted hover:text-claude-ink transition-colors">取消</button>
                      {currentQuestion < QUESTIONS.length - 1 ? (
                        <button onClick={handleWriteNext} className="flex items-center gap-1 px-3 py-2 bg-claude-primary text-claude-on-primary text-[11px] font-medium rounded-[7px] hover:bg-claude-primary-active transition-colors">
                          下一题 <ChevronRight size={12} />
                        </button>
                      ) : (
                        <button onClick={handleGenerate} disabled={!allAnswered || generating} className="flex items-center gap-1.5 px-4 py-2 bg-claude-primary disabled:bg-claude-hairline disabled:text-claude-muted-soft text-claude-on-primary text-[11px] font-medium rounded-[7px] hover:bg-claude-primary-active transition-colors">
                          {generating ? <><Loader2 size={12} className="animate-spin" />生成中</> : <><Sparkles size={12} />生成</>}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Answer previews */}
                  <div className="grid grid-cols-2 gap-1">
                    {QUESTIONS.map((q) => {
                      const val = answers[q.key as keyof StarAnswers];
                      return (
                        <button key={q.key} onClick={() => setCurrentQuestion(QUESTIONS.findIndex((x) => x.key === q.key))}
                          className={`text-left p-2 rounded-[7px] border text-[11px] transition-all ${
                            currentQuestion === QUESTIONS.findIndex((x) => x.key === q.key)
                              ? "bg-claude-surface-card border-claude-primary" : val ? "bg-claude-canvas border-claude-hairline text-claude-body" : "border-transparent text-claude-muted-soft"
                          }`}
                          style={currentQuestion !== QUESTIONS.findIndex((x) => x.key === q.key) && !val ? { background: "rgba(255,255,255,0.15)" } : {}}>
                          <div className="flex items-center gap-1 mb-0.5">
                            <span className="text-claude-muted">{q.label}</span>
                            {val && <span className="text-claude-muted-soft ml-auto">✓</span>}
                          </div>
                          <p className="truncate">{val ? val.slice(0, 20) + (val.length > 20 ? "…" : "") : "点击填写"}</p>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {writeStep === "done" && (
                <motion.div key="done" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
                  <div className="rounded-[10px] p-3.5 border" style={{ background: "rgba(255,255,255,0.5)", borderColor: "rgba(255,255,255,0.3)" }}>
                    <div className="flex items-center gap-1.5 mb-2.5">
                      <Sparkles size={12} className="text-claude-primary" />
                      <p className="text-[13px] text-claude-ink" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500 }}>生成结果</p>
                    </div>
                    <div className="p-3.5 bg-white/60 rounded-[8px] border border-white/30 mb-3">
                      <p className="text-[13px] text-claude-ink leading-relaxed">{generatedBullet}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleCopy} className="flex-1 py-2.5 bg-claude-primary text-claude-on-primary text-[12px] font-medium rounded-[8px] flex items-center justify-center gap-1.5 hover:bg-claude-primary-active transition-colors">
                        {copied ? <><Check size={13} />已复制</> : <><Copy size={13} />复制到剪贴板</>}
                      </button>
                      <button onClick={() => { setGeneratedBullet(""); handleGenerate(); }} className="px-3 py-2.5 border text-claude-body text-[12px] font-medium rounded-[8px] hover:bg-white/30 transition-colors flex items-center gap-1.5" style={{ borderColor: "rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.35)" }}>
                        <RotateCcw size={13} />重新生成
                      </button>
                    </div>
                  </div>
                  <button onClick={resetWrite} className="w-full py-2.5 bg-claude-primary text-claude-on-primary text-[12px] font-medium rounded-[8px] flex items-center justify-center gap-1.5 hover:bg-claude-primary-active transition-colors">
                    <Sparkles size={13} />写下一段经历
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Resize handles — 4 edges + 4 corners */}
      {/* Top edge */}
      <div onPointerDown={onResizePointerDown("n")} className="absolute top-0 left-3 right-3 h-1 cursor-ns-resize z-10" />
      {/* Bottom edge */}
      <div onPointerDown={onResizePointerDown("s")} className="absolute bottom-0 left-3 right-3 h-1 cursor-ns-resize z-10" />
      {/* Left edge */}
      <div onPointerDown={onResizePointerDown("w")} className="absolute left-0 top-3 bottom-3 w-1 cursor-ew-resize z-10" />
      {/* Right edge */}
      <div onPointerDown={onResizePointerDown("e")} className="absolute right-0 top-3 bottom-3 w-1 cursor-ew-resize z-10" />
      {/* Top-left corner */}
      <div onPointerDown={onResizePointerDown("nw")} className="absolute top-0 left-0 w-3 h-3 cursor-nwse-resize z-10" />
      {/* Top-right corner */}
      <div onPointerDown={onResizePointerDown("ne")} className="absolute top-0 right-0 w-3 h-3 cursor-nesw-resize z-10" />
      {/* Bottom-left corner */}
      <div onPointerDown={onResizePointerDown("sw")} className="absolute bottom-0 left-0 w-3 h-3 cursor-nesw-resize z-10" />
      {/* Bottom-right corner */}
      <div onPointerDown={onResizePointerDown("se")} className="absolute bottom-0 right-0 w-3 h-3 cursor-nwse-resize z-10" />
    </motion.div>
  );
}
