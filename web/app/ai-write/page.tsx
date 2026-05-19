"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Sparkles, Loader2, Check, Copy, RotateCcw, ChevronRight, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { generateExperience } from "@/lib/deepseek-client";

type Step = "intro" | "asking" | "done";

interface StarAnswers {
  situation: string;
  task: string;
  action: string;
  result: string;
}

const QUESTIONS = [
  {
    key: "situation",
    icon: "📍",
    label: "背景",
    question: "这段经历在什么背景下发生的？",
    hint: "在哪家公司/项目？当时的场景是什么？遇到了什么问题？",
    placeholder: "我在一家XX公司实习，当时的项目是要…",
  },
  {
    key: "task",
    icon: "🎯",
    label: "任务",
    question: "你具体负责什么任务？目标是什么？",
    hint: "越具体越好——你的职责范围、KPI、交付标准是什么？",
    placeholder: "我负责…目标是…",
  },
  {
    key: "action",
    icon: "⚡",
    label: "行动",
    question: "你做了哪些具体动作？怎么做的？",
    hint: "分成几步？用了什么工具？和谁协作？克服了什么困难？",
    placeholder: "我先…然后…接着…（用口语描述就可以）",
  },
  {
    key: "result",
    icon: "📊",
    label: "结果",
    question: "结果怎么衡量的？有数据吗？",
    hint: "效率提升X%？覆盖多少用户？获得什么反馈？带来什么影响？",
    placeholder: "最终XX提升了30%，覆盖了500+用户…",
  },
];

export default function AiWritePage() {
  const [step, setStep] = useState<Step>("intro");
  const [apiKey, setApiKey] = useState("");
  const [answers, setAnswers] = useState<StarAnswers>({ situation: "", task: "", action: "", result: "" });
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [generatedBullet, setGeneratedBullet] = useState("");
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useState(() => {
    if (typeof window !== "undefined") {
      setApiKey(localStorage.getItem("ds_api_key") || "");
    }
  });

  const handleNext = () => {
    if (currentQuestion < QUESTIONS.length - 1) {
      setCurrentQuestion((c) => c + 1);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  };

  const handlePrev = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion((c) => c - 1);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  };

  const handleGenerate = async () => {
    if (!apiKey) return;
    setGenerating(true);
    try {
      const result = await generateExperience(apiKey, {
        situation: answers.situation,
        task: answers.task,
        action: answers.action,
        result: answers.result,
      });
      if (result) {
        setGeneratedBullet(result);
        setStep("done");
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

  const reset = () => {
    setStep("intro");
    setAnswers({ situation: "", task: "", action: "", result: "" });
    setCurrentQuestion(0);
    setGeneratedBullet("");
    setCopied(false);
  };

  const allAnswered = answers.situation.trim() && answers.task.trim() && answers.action.trim() && answers.result.trim();
  const currentAnswer = answers[QUESTIONS[currentQuestion].key as keyof StarAnswers];

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      {/* Header */}
      <header className="bg-white border-b border-[#E2E8F0] sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-5 h-14 flex items-center gap-3">
          <Link href="/" className="w-8 h-8 rounded-lg hover:bg-[#F1F5F9] flex items-center justify-center transition-colors">
            <ArrowLeft size={17} className="text-[#64748B]" />
          </Link>
          <div>
            <h1 className="text-[15px] font-bold text-[#0F172A] leading-tight">AI 写作助手</h1>
            <p className="text-[11px] text-[#64748B]">STAR 法则引导 · AI 自动提炼</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 py-5">
        <AnimatePresence mode="wait">
          {/* Intro */}
          {step === "intro" && (
            <motion.div key="intro" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
              <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5">
                <div className="w-12 h-12 rounded-2xl bg-[#F2F3FF] flex items-center justify-center text-2xl mb-4">
                  🐧
                </div>
                <h2 className="text-[17px] font-bold text-[#0F172A] mb-2">
                  AI 问你 4 个问题，帮你生成一条简历 Bullet
                </h2>
                <p className="text-[13px] text-[#64748B] leading-relaxed mb-5">
                  面试官看简历用的是 <span className="font-semibold text-[#0052D9]">STAR 法则</span>（背景 → 任务 → 行动 → 结果）。
                  你只需要用口语依次回答下面 4 个问题，AI 自动提炼成专业简历措辞。
                </p>

                {/* Preview of 4 questions */}
                <div className="space-y-2 mb-5">
                  {QUESTIONS.map((q, i) => (
                    <div key={q.key} className="flex items-center gap-3 px-3.5 py-2.5 bg-[#F8FAFC] rounded-xl">
                      <span className="text-sm font-bold text-[#94A3B8] w-5">{i + 1}</span>
                      <span className="text-lg">{q.icon}</span>
                      <div>
                        <p className="text-[12px] font-semibold text-[#0F172A]">{q.label}</p>
                        <p className="text-[11px] text-[#94A3B8]">{q.question}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {!apiKey && (
                  <div className="flex items-center gap-2 px-3.5 py-2.5 bg-[#FEF3C7] rounded-xl mb-4">
                    <span className="text-sm">⚠️</span>
                    <p className="text-[11px] text-[#92400E]">请先在首页设置 DeepSeek API Key</p>
                  </div>
                )}

                <button
                  onClick={() => setStep("asking")}
                  disabled={!apiKey}
                  className="w-full py-3 bg-[#0052D9] disabled:bg-[#E2E8F0] disabled:text-[#94A3B8] text-white text-[14px] font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-[#366EF4] transition-colors"
                >
                  开始写作 <ChevronRight size={16} />
                </button>
              </div>

              {/* Tips */}
              <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4">
                <p className="text-[12px] font-semibold text-[#0F172A] mb-2">💡 小提示</p>
                <ul className="space-y-1.5">
                  {[
                    "用口语写就行，不用在意措辞",
                    "数字越多越好——结果能量化就量化",
                    "说不清楚的地方可以先概括，AI 会帮你展开",
                    "生成后不满意可以重新生成",
                  ].map((tip, i) => (
                    <li key={i} className="text-[12px] text-[#64748B] flex gap-2">
                      <span className="text-[#0052D9] font-bold">{i + 1}.</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          )}

          {/* Question flow */}
          {step === "asking" && (
            <motion.div key="asking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              {/* Progress */}
              <div className="flex items-center gap-1">
                {QUESTIONS.map((q, i) => (
                  <div key={q.key} className="flex-1 flex items-center gap-1">
                    <div className={`flex-1 h-1 rounded-full transition-colors duration-300 ${
                      answers[q.key as keyof StarAnswers] ? "bg-[#0052D9]" : i <= currentQuestion ? "bg-[#CBD5E1]" : "bg-[#F1F5F9]"
                    }`} />
                    {i < 3 && <div className={`w-1 h-1 rounded-full ${i < currentQuestion ? "bg-[#0052D9]" : "bg-[#F1F5F9]"}`} />}
                  </div>
                ))}
              </div>

              {/* Question card */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentQuestion}
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.2 }}
                  className="bg-white rounded-2xl border border-[#E2E8F0] p-5"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">
                      {currentQuestion + 1} / 4
                    </span>
                    <span className="text-[11px] font-semibold text-[#0052D9] bg-[#F2F3FF] px-2 py-0.5 rounded-full">
                      {QUESTIONS[currentQuestion].label}
                    </span>
                  </div>
                  <h2 className="text-[16px] font-bold text-[#0F172A] mb-1">
                    {QUESTIONS[currentQuestion].question}
                  </h2>
                  <p className="text-[12px] text-[#94A3B8] mb-4">{QUESTIONS[currentQuestion].hint}</p>

                  <textarea
                    ref={inputRef}
                    value={currentAnswer}
                    onChange={(e) =>
                      setAnswers({ ...answers, [QUESTIONS[currentQuestion].key]: e.target.value })
                    }
                    placeholder={QUESTIONS[currentQuestion].placeholder}
                    className="w-full h-[120px] px-3.5 py-3 bg-[#F8FAFC] rounded-xl text-[13px] text-[#0F172A] placeholder-[#94A3B8] resize-none border border-transparent focus:border-[#0052D9] focus:bg-white focus:outline-none transition-all"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleNext();
                    }}
                  />

                  {/* Navigation */}
                  <div className="flex items-center justify-between mt-4">
                    <button
                      onClick={handlePrev}
                      disabled={currentQuestion === 0}
                      className="flex items-center gap-1 text-[12px] text-[#64748B] disabled:opacity-30 hover:text-[#0F172A] transition-colors"
                    >
                      <ChevronLeft size={14} />上一题
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setStep("intro")}
                        className="px-3 py-1.5 text-[12px] text-[#64748B] hover:text-[#0F172A] transition-colors"
                      >
                        取消
                      </button>
                      {currentQuestion < QUESTIONS.length - 1 ? (
                        <button
                          onClick={handleNext}
                          className="flex items-center gap-1.5 px-4 py-2 bg-[#0F172A] text-white text-[12px] font-medium rounded-lg hover:bg-[#1E293B] transition-colors"
                        >
                          下一题 <ChevronRight size={14} />
                        </button>
                      ) : (
                        <button
                          onClick={handleGenerate}
                          disabled={!allAnswered || generating}
                          className="flex items-center gap-1.5 px-5 py-2 bg-[#0052D9] disabled:bg-[#E2E8F0] disabled:text-[#94A3B8] text-white text-[12px] font-semibold rounded-lg hover:bg-[#366EF4] transition-colors"
                        >
                          {generating ? (
                            <><Loader2 size={14} className="animate-spin" />生成中</>
                          ) : (
                            <><Sparkles size={14} />生成</>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-[10px] text-[#94A3B8] mt-2 text-right">⌘ + Enter 快速跳下一题</p>
                </motion.div>
              </AnimatePresence>

              {/* Answer previews */}
              <div className="grid grid-cols-2 gap-2">
                {QUESTIONS.map((q) => {
                  const val = answers[q.key as keyof StarAnswers];
                  return (
                    <button
                      key={q.key}
                      onClick={() => setCurrentQuestion(QUESTIONS.findIndex((x) => x.key === q.key))}
                      className={`text-left p-3 rounded-xl border text-[11px] transition-all ${
                        currentQuestion === QUESTIONS.findIndex((x) => x.key === q.key)
                          ? "bg-white border-[#0052D9] ring-1 ring-[#0052D9]/10"
                          : val
                          ? "bg-white border-[#E2E8F0] text-[#334155]"
                          : "bg-[#F1F5F9] border-transparent text-[#94A3B8]"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span>{q.icon}</span>
                        <span className="font-semibold">{q.label}</span>
                        {val && <span className="text-[#10B981] ml-auto">✓</span>}
                      </div>
                      <p className="leading-snug truncate">
                        {val ? val.slice(0, 35) + (val.length > 35 ? "…" : "") : "点击填写"}
                      </p>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Result */}
          {step === "done" && (
            <motion.div key="done" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              {/* Generated bullet */}
              <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-xl bg-[#E8FFEA] flex items-center justify-center text-base">✨</div>
                  <h2 className="text-[15px] font-bold text-[#0F172A]">生成结果</h2>
                </div>
                <div className="p-4 bg-[#F2F3FF] border border-[#0052D9]/10 rounded-xl mb-4">
                  <p className="text-[14px] text-[#0F172A] leading-relaxed">{generatedBullet}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCopy}
                    className="flex-1 py-2.5 bg-[#0052D9] text-white text-[13px] font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-[#366EF4] transition-colors"
                  >
                    {copied ? <><Check size={15} />已复制</> : <><Copy size={15} />复制到剪贴板</>}
                  </button>
                  <button
                    onClick={() => { setGeneratedBullet(""); handleGenerate(); }}
                    className="px-4 py-2.5 bg-[#F1F5F9] text-[#64748B] text-[13px] font-medium rounded-xl hover:bg-[#E2E8F0] transition-colors flex items-center gap-1.5"
                  >
                    <RotateCcw size={14} />重新生成
                  </button>
                </div>
              </div>

              {/* Your answers recap */}
              <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4">
                <p className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mb-3">你的原始回答</p>
                <div className="space-y-2.5">
                  {QUESTIONS.map((q) => (
                    <div key={q.key} className="text-[12px]">
                      <p className="font-semibold text-[#0F172A] mb-0.5">
                        {q.icon} {q.label}
                      </p>
                      <p className="text-[#475569] leading-relaxed">{answers[q.key as keyof StarAnswers] || "—"}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={reset}
                  className="flex-1 py-3 bg-[#0052D9] text-white text-[14px] font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-[#366EF4] transition-colors"
                >
                  <Sparkles size={15} />写下一段经历
                </button>
                <Link
                  href="/"
                  className="px-5 py-3 bg-[#F1F5F9] text-[#64748B] text-[14px] font-medium rounded-xl hover:bg-[#E2E8F0] transition-colors flex items-center gap-1.5"
                >
                  回到简历库 <ChevronRight size={15} />
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/90 backdrop-blur-lg border-t border-[#E2E8F0]">
        <div className="max-w-2xl mx-auto flex items-center px-5 h-16">
          <Link href="/" className="flex-1 flex items-center justify-center gap-2 py-2 text-[#64748B] hover:text-[#0F172A] transition-colors">
            <span className="w-7 h-7 rounded-lg bg-[#F1F5F9] flex items-center justify-center text-sm">📋</span>
            <span className="text-[13px] font-medium">简历库</span>
          </Link>
          <Link href="/ai-write" className="flex-1 flex items-center justify-center gap-2 py-2">
            <span className="w-7 h-7 rounded-lg bg-[#F2F3FF] flex items-center justify-center text-sm">✍️</span>
            <span className="text-[13px] font-semibold text-[#0052D9]">AI 写作</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
