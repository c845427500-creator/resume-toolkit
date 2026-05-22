"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, X, Check, Copy, RotateCcw, ChevronRight, ChevronLeft, PenLine, Wand2 } from "lucide-react";
import { polishText, generateExperience } from "@/lib/deepseek-client";

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

export default function AiModal({ open, onClose, apiKey, selectedText, selectedLabel, onAcceptPolish }: AiModalProps) {
  const [tab, setTab] = useState<AiTab>("polish");

  // ─── Polish state ──────────────────────────
  const [polishMode, setPolishMode] = useState<"directed" | "auto" | null>(null);
  const [requirement, setRequirement] = useState("");
  const [polishedText, setPolishedText] = useState("");
  const [polishing, setPolishing] = useState(false);
  const [polishComplete, setPolishComplete] = useState(false);

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
    setPolishedText("");
    setPolishComplete(false);
  }, [selectedText]);

  // ─── Polish handlers ───────────────────────
  const handlePolish = async (mode: "directed" | "auto") => {
    if (!selectedText || !apiKey) return;
    setPolishMode(mode);
    if (mode === "auto") {
      setPolishing(true);
      const result = await polishText(apiKey, selectedText);
      setPolishing(false);
      if (result) {
        setPolishedText(result);
        setPolishComplete(true);
      }
    }
  };

  const handleDirectedPolish = async () => {
    if (!selectedText || !apiKey || !requirement.trim()) return;
    setPolishing(true);
    const result = await polishText(apiKey, selectedText, requirement.trim());
    setPolishing(false);
    if (result) {
      setPolishedText(result);
      setPolishComplete(true);
    }
  };

  const handleAcceptPolish = () => {
    if (polishedText) {
      onAcceptPolish(polishedText);
      setPolishComplete(false);
      setPolishedText("");
      setPolishMode(null);
      setRequirement("");
    }
  };

  const handleRepolish = () => {
    setPolishComplete(false);
    setPolishedText("");
    if (polishMode === "auto") {
      handlePolish("auto");
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

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ duration: 0.2 }}
        className="bg-claude-surface-card rounded-t-[20px] sm:rounded-[16px] border border-claude-hairline w-full sm:max-w-[560px] max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center border-b border-claude-hairline shrink-0">
          <button
            onClick={() => { setTab("polish"); setPolishMode(null); setPolishComplete(false); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-[14px] font-medium transition-colors ${
              tab === "polish" ? "text-claude-ink border-b-2 border-claude-primary" : "text-claude-muted hover:text-claude-ink"
            }`}
          >
            <Wand2 size={14} />AI 润色
          </button>
          <button
            onClick={() => { setTab("write"); resetWrite(); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-[14px] font-medium transition-colors ${
              tab === "write" ? "text-claude-ink border-b-2 border-claude-primary" : "text-claude-muted hover:text-claude-ink"
            }`}
          >
            <PenLine size={14} />AI 写作
          </button>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center text-claude-muted-soft hover:text-claude-ink transition-colors mr-1">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1">
          {tab === "polish" ? (
            <div className="p-5 space-y-4">
              {/* Selected card indicator */}
              {selectedText ? (
                <div className="bg-claude-canvas rounded-[10px] p-4 border border-claude-hairline">
                  <p className="text-[11px] text-claude-muted-soft mb-1">已选择</p>
                  <p className="text-[13px] font-medium text-claude-ink mb-1.5">{selectedLabel}</p>
                  <p className="text-[12px] text-claude-body leading-relaxed line-clamp-4 whitespace-pre-wrap">{selectedText}</p>
                </div>
              ) : (
                <div className="bg-claude-canvas rounded-[10px] p-6 border border-claude-hairline border-dashed text-center">
                  <p className="text-[13px] text-claude-muted">点击页面上的自我评价或经历卡片，自动捕获文本</p>
                </div>
              )}

              {/* Polish actions */}
              {!polishComplete && (
                <div className="space-y-2">
                  {polishMode === "directed" ? (
                    <div className="space-y-2">
                      <textarea
                        value={requirement}
                        onChange={(e) => setRequirement(e.target.value)}
                        placeholder="输入润色要求，如：用词更专业、突出量化成果、缩短到50字以内…"
                        className="w-full h-[80px] px-3 py-2 bg-claude-canvas rounded-[8px] text-[13px] text-claude-ink placeholder-claude-muted-soft resize-none border border-claude-hairline focus:border-claude-primary focus:outline-none"
                        autoFocus
                      />
                      <button
                        onClick={handleDirectedPolish}
                        disabled={polishing || !requirement.trim() || !selectedText}
                        className="w-full py-2.5 bg-claude-primary disabled:bg-claude-hairline disabled:text-claude-muted-soft text-claude-on-primary text-[13px] font-medium rounded-[8px] flex items-center justify-center gap-1.5 hover:bg-claude-primary-active transition-colors"
                      >
                        {polishing ? <><Loader2 size={14} className="animate-spin" />润色中…</> : <><Sparkles size={14} />开始润色</>}
                      </button>
                      <button onClick={() => setPolishMode(null)} className="w-full py-2 text-[13px] text-claude-muted hover:text-claude-ink transition-colors">返回</button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPolishMode("directed")}
                        disabled={!selectedText}
                        className="flex-1 py-3 border border-claude-hairline text-claude-body text-[13px] font-medium rounded-[8px] hover:bg-claude-surface transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40"
                      >
                        <PenLine size={14} />自定义要求润色
                      </button>
                      <button
                        onClick={() => handlePolish("auto")}
                        disabled={!selectedText || polishing}
                        className="flex-1 py-3 bg-claude-primary disabled:bg-claude-hairline disabled:text-claude-muted-soft text-claude-on-primary text-[13px] font-medium rounded-[8px] hover:bg-claude-primary-active transition-colors flex items-center justify-center gap-1.5"
                      >
                        {polishing ? <><Loader2 size={14} className="animate-spin" />润色中…</> : <><Sparkles size={14} />一键自动润色</>}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Polish result — comparison */}
              {polishComplete && polishedText && (
                <div className="space-y-3">
                  {/* Optimized version */}
                  <div className="bg-claude-surface rounded-[10px] p-4 border border-claude-hairline">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Sparkles size={13} className="text-claude-primary" />
                      <p className="text-[12px] font-medium text-claude-ink">优化版</p>
                    </div>
                    <p className="text-[13px] text-claude-ink leading-relaxed whitespace-pre-wrap">{polishedText}</p>
                  </div>

                  {/* Original version */}
                  <details className="group">
                    <summary className="text-[12px] text-claude-muted cursor-pointer hover:text-claude-ink transition-colors list-none flex items-center gap-1">
                      <ChevronRight size={12} className="group-open:rotate-90 transition-transform" />查看原文
                    </summary>
                    <div className="mt-2 bg-claude-canvas rounded-[8px] p-3 border border-claude-hairline">
                      <p className="text-[12px] text-claude-body leading-relaxed whitespace-pre-wrap">{selectedText}</p>
                    </div>
                  </details>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={handleAcceptPolish}
                      className="flex-1 py-2.5 bg-claude-primary text-claude-on-primary text-[13px] font-medium rounded-[8px] flex items-center justify-center gap-1.5 hover:bg-claude-primary-active transition-colors"
                    >
                      <Check size={14} />采纳优化版
                    </button>
                    <button
                      onClick={handleRepolish}
                      className="px-4 py-2.5 border border-claude-hairline text-claude-body text-[13px] font-medium rounded-[8px] hover:bg-claude-surface transition-colors flex items-center gap-1.5"
                    >
                      <RotateCcw size={14} />重新润色
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ─── Write Tab ─── */
            <div className="p-5">
              <AnimatePresence mode="wait">
                {writeStep === "intro" && (
                  <motion.div key="intro" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
                    <div>
                      <h3 className="text-[18px] text-claude-ink mb-2" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500 }}>
                        AI 问你 4 个问题，生成一条简历 Bullet
                      </h3>
                      <p className="text-[13px] text-claude-body leading-relaxed">
                        用口语描述一段经历，AI 按照 STAR 法则自动提炼成专业简历措辞。
                      </p>
                    </div>
                    <div className="space-y-0.5">
                      {QUESTIONS.map((q, i) => (
                        <div key={q.key} className="flex items-center gap-3 px-3 py-2">
                          <span className="text-[12px] text-claude-muted-soft w-3">{i + 1}</span>
                          <div>
                            <p className="text-[13px] text-claude-ink">{q.label}</p>
                            <p className="text-[11px] text-claude-muted-soft">{q.question}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => setWriteStep("asking")}
                      className="w-full py-2.5 bg-claude-primary text-claude-on-primary text-[13px] font-medium rounded-[8px] flex items-center justify-center gap-1.5 hover:bg-claude-primary-active transition-colors"
                    >
                      开始写作 <ChevronRight size={14} />
                    </button>
                  </motion.div>
                )}

                {writeStep === "asking" && (
                  <motion.div key="asking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                    {/* Progress */}
                    <div className="flex items-center gap-1">
                      {QUESTIONS.map((q, i) => (
                        <div key={q.key} className="flex-1 h-0.5 rounded-full transition-colors duration-300"
                          style={{ background: answers[q.key as keyof StarAnswers] ? "var(--color-claude-primary)" : i <= currentQuestion ? "var(--color-claude-hairline)" : "var(--color-claude-surface-card)" }}
                        />
                      ))}
                    </div>

                    <AnimatePresence mode="wait">
                      <motion.div key={currentQuestion} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.15 }}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[11px] text-claude-muted-soft">{currentQuestion + 1} / 4</span>
                          <span className="text-[12px] text-claude-ink">{QUESTIONS[currentQuestion].label}</span>
                        </div>
                        <h4 className="text-[16px] text-claude-ink mb-1.5" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500 }}>
                          {QUESTIONS[currentQuestion].question}
                        </h4>
                        <p className="text-[12px] text-claude-muted mb-3">{QUESTIONS[currentQuestion].hint}</p>
                        <textarea
                          ref={writeInputRef}
                          value={currentAnswer}
                          onChange={(e) => setAnswers({ ...answers, [QUESTIONS[currentQuestion].key]: e.target.value })}
                          placeholder={QUESTIONS[currentQuestion].placeholder}
                          className="w-full h-[100px] px-3 py-2 bg-claude-canvas rounded-[8px] text-[13px] text-claude-ink placeholder-claude-muted-soft resize-none border border-claude-hairline focus:border-claude-primary focus:outline-none"
                          autoFocus
                        />
                      </motion.div>
                    </AnimatePresence>

                    <div className="flex items-center justify-between">
                      <button onClick={handleWritePrev} disabled={currentQuestion === 0} className="flex items-center gap-1 text-[12px] text-claude-muted disabled:opacity-30 hover:text-claude-ink transition-colors">
                        <ChevronLeft size={13} />上一题
                      </button>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setWriteStep("intro")} className="px-3 py-1.5 text-[12px] text-claude-muted hover:text-claude-ink transition-colors">取消</button>
                        {currentQuestion < QUESTIONS.length - 1 ? (
                          <button onClick={handleWriteNext} className="flex items-center gap-1 px-4 py-2 bg-claude-primary text-claude-on-primary text-[12px] font-medium rounded-[7px] hover:bg-claude-primary-active transition-colors">
                            下一题 <ChevronRight size={13} />
                          </button>
                        ) : (
                          <button onClick={handleGenerate} disabled={!allAnswered || generating} className="flex items-center gap-1.5 px-5 py-2 bg-claude-primary disabled:bg-claude-hairline disabled:text-claude-muted-soft text-claude-on-primary text-[12px] font-medium rounded-[7px] hover:bg-claude-primary-active transition-colors">
                            {generating ? <><Loader2 size={13} className="animate-spin" />生成中</> : <><Sparkles size={13} />生成</>}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Answer previews */}
                    <div className="grid grid-cols-2 gap-1.5">
                      {QUESTIONS.map((q) => {
                        const val = answers[q.key as keyof StarAnswers];
                        return (
                          <button key={q.key} onClick={() => setCurrentQuestion(QUESTIONS.findIndex((x) => x.key === q.key))}
                            className={`text-left p-2.5 rounded-[8px] border text-[11px] transition-all ${
                              currentQuestion === QUESTIONS.findIndex((x) => x.key === q.key)
                                ? "bg-claude-surface-card border-claude-primary" : val ? "bg-claude-canvas border-claude-hairline text-claude-body" : "bg-claude-surface-card border-transparent text-claude-muted-soft"
                            }`}>
                            <div className="flex items-center gap-1 mb-0.5">
                              <span className="text-claude-muted">{q.label}</span>
                              {val && <span className="text-claude-muted-soft ml-auto">✓</span>}
                            </div>
                            <p className="truncate">{val ? val.slice(0, 25) + (val.length > 25 ? "…" : "") : "点击填写"}</p>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                {writeStep === "done" && (
                  <motion.div key="done" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                    <div className="bg-claude-surface rounded-[10px] p-4 border border-claude-hairline">
                      <div className="flex items-center gap-1.5 mb-3">
                        <Sparkles size={13} className="text-claude-primary" />
                        <p className="text-[14px] text-claude-ink" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500 }}>生成结果</p>
                      </div>
                      <div className="p-4 bg-claude-canvas rounded-[8px] border border-claude-hairline mb-4">
                        <p className="text-[14px] text-claude-ink leading-relaxed">{generatedBullet}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={handleCopy} className="flex-1 py-2.5 bg-claude-primary text-claude-on-primary text-[13px] font-medium rounded-[8px] flex items-center justify-center gap-1.5 hover:bg-claude-primary-active transition-colors">
                          {copied ? <><Check size={14} />已复制</> : <><Copy size={14} />复制到剪贴板</>}
                        </button>
                        <button onClick={() => { setGeneratedBullet(""); handleGenerate(); }} className="px-4 py-2.5 border border-claude-hairline text-claude-body text-[13px] font-medium rounded-[8px] hover:bg-claude-surface transition-colors flex items-center gap-1.5">
                          <RotateCcw size={14} />重新生成
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={resetWrite} className="flex-1 py-2.5 bg-claude-primary text-claude-on-primary text-[13px] font-medium rounded-[8px] flex items-center justify-center gap-1.5 hover:bg-claude-primary-active transition-colors">
                        <Sparkles size={14} />写下一段经历
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
