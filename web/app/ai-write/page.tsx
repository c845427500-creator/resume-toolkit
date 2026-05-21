"use client";

import { useState, useRef, useEffect } from "react";
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
    label: "背景",
    question: "这段经历在什么背景下发生的？",
    hint: "在哪家公司/项目？当时的场景是什么？遇到了什么问题？",
    placeholder: "我在一家XX公司实习，当时的项目是要…",
  },
  {
    key: "task",
    label: "任务",
    question: "你具体负责什么任务？目标是什么？",
    hint: "越具体越好——你的职责范围、KPI、交付标准是什么？",
    placeholder: "我负责…目标是…",
  },
  {
    key: "action",
    label: "行动",
    question: "你做了哪些具体动作？怎么做的？",
    hint: "分成几步？用了什么工具？和谁协作？克服了什么困难？",
    placeholder: "我先…然后…接着…（用口语描述就可以）",
  },
  {
    key: "result",
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

  useEffect(() => {
    setApiKey(localStorage.getItem("ds_api_key") || "");
  }, []);

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
    <div className="min-h-screen bg-claude-canvas pb-20">
      {/* Header — cream canvas */}
      <header className="sticky top-0 z-20 bg-claude-canvas/80 backdrop-blur-sm border-b border-claude-hairline">
        <div className="max-w-[708px] mx-auto px-6 h-14 flex items-center gap-3">
          <Link href="/" className="w-7 h-7 rounded-md hover:bg-claude-surface-card flex items-center justify-center transition-colors">
            <ArrowLeft size={14} className="text-claude-muted" />
          </Link>
          <div>
            <h1
              className="text-[16px] text-claude-ink"
              style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500 }}
            >
              AI 写作助手
            </h1>
            <p className="text-[11px] text-claude-muted-soft">STAR 法则引导 · AI 自动提炼为简历措辞</p>
          </div>
        </div>
      </header>

      <main className="max-w-[708px] mx-auto px-6 py-10">
        <AnimatePresence mode="wait">
          {/* Intro */}
          {step === "intro" && (
            <motion.div key="intro" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-8">
              <div className="bg-claude-surface-card rounded-[12px] p-8">
                <h2
                  className="text-[28px] leading-[1.2] text-claude-ink mb-4"
                  style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, letterSpacing: "-0.3px" }}
                >
                  AI 问你 4 个问题，<br />生成一条简历 Bullet
                </h2>
                <p className="text-[16px] text-claude-body leading-relaxed mb-8 max-w-lg">
                  面试官看简历用的是 <span className="text-claude-ink font-medium">STAR 法则</span>（背景 → 任务 → 行动 → 结果）。
                  你只需要用口语依次回答下面 4 个问题，AI 自动提炼成专业简历措辞。
                </p>

                {/* Preview of 4 questions */}
                <div className="space-y-1 mb-8">
                  {QUESTIONS.map((q, i) => (
                    <div key={q.key} className="flex items-center gap-4 px-4 py-3">
                      <span className="text-[13px] text-claude-muted-soft w-4">{i + 1}</span>
                      <div>
                        <p className="text-[14px] text-claude-ink">{q.label}</p>
                        <p className="text-[12px] text-claude-muted-soft">{q.question}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {!apiKey && (
                  <div className="flex items-center gap-2 px-4 py-3 bg-claude-canvas rounded-[8px] mb-6 border border-claude-hairline">
                    <span className="text-[13px] text-claude-muted">请先在首页设置 DeepSeek API Key</span>
                  </div>
                )}

                <button
                  onClick={() => setStep("asking")}
                  disabled={!apiKey}
                  className="w-full py-3 bg-claude-primary disabled:bg-claude-hairline disabled:text-claude-muted-soft text-claude-on-primary text-[14px] font-medium rounded-[8px] flex items-center justify-center gap-1.5 hover:bg-claude-primary-active transition-colors"
                >
                  开始写作 <ChevronRight size={15} />
                </button>
              </div>

              {/* Tips — surface-card */}
              <div className="bg-claude-surface-card rounded-[12px] p-6">
                <p className="text-[14px] text-claude-ink mb-3" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500 }}>
                  小提示
                </p>
                <ul className="space-y-2">
                  {[
                    "用口语写就行，不用在意措辞",
                    "数字越多越好——结果能量化就量化",
                    "说不清楚的地方可以先概括，AI 会帮你展开",
                    "生成后不满意可以重新生成",
                  ].map((tip, i) => (
                    <li key={i} className="text-[13px] text-claude-body flex gap-2">
                      <span className="text-claude-muted-soft">{i + 1}.</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          )}

          {/* Question flow */}
          {step === "asking" && (
            <motion.div key="asking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
              {/* Progress */}
              <div className="flex items-center gap-1">
                {QUESTIONS.map((q, i) => (
                  <div key={q.key} className="flex-1 flex items-center gap-1">
                    <div
                      className={`flex-1 h-0.5 rounded-full transition-colors duration-300 ${
                        answers[q.key as keyof StarAnswers] ? "bg-claude-primary" : i <= currentQuestion ? "bg-claude-hairline" : "bg-claude-surface-card"
                      }`}
                    />
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
                  transition={{ duration: 0.15 }}
                  className="bg-claude-surface-card rounded-[12px] p-8"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[12px] text-claude-muted-soft">
                      {currentQuestion + 1} / 4
                    </span>
                    <span className="text-[12px] text-claude-ink">
                      {QUESTIONS[currentQuestion].label}
                    </span>
                  </div>
                  <h2
                    className="text-[22px] text-claude-ink mb-2"
                    style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, letterSpacing: "-0.3px" }}
                  >
                    {QUESTIONS[currentQuestion].question}
                  </h2>
                  <p className="text-[14px] text-claude-muted mb-6">{QUESTIONS[currentQuestion].hint}</p>

                  <textarea
                    ref={inputRef}
                    value={currentAnswer}
                    onChange={(e) =>
                      setAnswers({ ...answers, [QUESTIONS[currentQuestion].key]: e.target.value })
                    }
                    placeholder={QUESTIONS[currentQuestion].placeholder}
                    className="w-full h-[128px] px-4 py-3 bg-claude-canvas rounded-[8px] text-[14px] text-claude-ink placeholder-claude-muted-soft resize-none border border-claude-hairline focus:border-claude-primary focus:outline-none transition-colors"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleNext();
                    }}
                  />

                  {/* Navigation */}
                  <div className="flex items-center justify-between mt-5">
                    <button
                      onClick={handlePrev}
                      disabled={currentQuestion === 0}
                      className="flex items-center gap-1 text-[13px] text-claude-muted disabled:opacity-30 hover:text-claude-ink transition-colors"
                    >
                      <ChevronLeft size={14} />上一题
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setStep("intro")}
                        className="px-3 py-1.5 text-[13px] text-claude-muted hover:text-claude-ink transition-colors"
                      >
                        取消
                      </button>
                      {currentQuestion < QUESTIONS.length - 1 ? (
                        <button
                          onClick={handleNext}
                          className="flex items-center gap-1.5 px-5 py-2.5 bg-claude-primary text-claude-on-primary text-[13px] font-medium rounded-[8px] hover:bg-claude-primary-active transition-colors"
                        >
                          下一题 <ChevronRight size={14} />
                        </button>
                      ) : (
                        <button
                          onClick={handleGenerate}
                          disabled={!allAnswered || generating}
                          className="flex items-center gap-1.5 px-6 py-2.5 bg-claude-primary disabled:bg-claude-hairline disabled:text-claude-muted-soft text-claude-on-primary text-[13px] font-medium rounded-[8px] hover:bg-claude-primary-active transition-colors"
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
                  <p className="text-[11px] text-claude-muted-soft mt-4 text-right">⌘ + Enter 快速跳下一题</p>
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
                      className={`text-left p-3.5 rounded-[10px] border text-[12px] transition-all ${
                        currentQuestion === QUESTIONS.findIndex((x) => x.key === q.key)
                          ? "bg-claude-surface-card border-claude-primary"
                          : val
                          ? "bg-claude-canvas border-claude-hairline text-claude-body"
                          : "bg-claude-surface-card border-transparent text-claude-muted-soft"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-claude-muted">{q.label}</span>
                        {val && <span className="text-claude-muted-soft ml-auto">✓</span>}
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
            <motion.div key="done" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
              {/* Generated bullet */}
              <div className="bg-claude-surface-card rounded-[12px] p-8">
                <div className="flex items-center gap-2 mb-5">
                  <Sparkles size={15} className="text-claude-muted" />
                  <h2
                    className="text-[18px] text-claude-ink"
                    style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500 }}
                  >
                    生成结果
                  </h2>
                </div>
                <div className="p-5 bg-claude-canvas rounded-[8px] border border-claude-hairline mb-6">
                  <p className="text-[15px] text-claude-ink leading-relaxed">{generatedBullet}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCopy}
                    className="flex-1 py-3 bg-claude-primary text-claude-on-primary text-[14px] font-medium rounded-[8px] flex items-center justify-center gap-2 hover:bg-claude-primary-active transition-colors"
                  >
                    {copied ? <><Check size={15} />已复制</> : <><Copy size={15} />复制到剪贴板</>}
                  </button>
                  <button
                    onClick={() => { setGeneratedBullet(""); handleGenerate(); }}
                    className="px-5 py-3 border border-claude-hairline text-claude-body text-[14px] font-medium rounded-[8px] hover:bg-claude-surface-card transition-colors flex items-center gap-1.5"
                  >
                    <RotateCcw size={14} />重新生成
                  </button>
                </div>
              </div>

              {/* Your answers recap */}
              <div className="bg-claude-surface-card rounded-[12px] p-6">
                <p
                  className="text-[12px] text-claude-muted uppercase tracking-[1.5px] mb-4"
                  style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500 }}
                >
                  你的原始回答
                </p>
                <div className="space-y-4">
                  {QUESTIONS.map((q) => (
                    <div key={q.key} className="text-[13px]">
                      <p className="text-claude-ink mb-0.5">{q.label}</p>
                      <p className="text-claude-body leading-relaxed">{answers[q.key as keyof StarAnswers] || "—"}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={reset}
                  className="flex-1 py-3 bg-claude-primary text-claude-on-primary text-[14px] font-medium rounded-[8px] flex items-center justify-center gap-2 hover:bg-claude-primary-active transition-colors"
                >
                  <Sparkles size={15} />写下一段经历
                </button>
                <Link
                  href="/library"
                  className="px-6 py-3 border border-claude-hairline text-claude-body text-[14px] font-medium rounded-[8px] hover:bg-claude-surface-card transition-colors flex items-center gap-1.5"
                >
                  回到简历库 <ChevronRight size={15} />
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-claude-surface-dark">
        <div className="max-w-[708px] mx-auto flex items-center px-6 h-12">
          <Link href="/" className="flex-1 flex items-center justify-center gap-1.5 py-2 text-claude-on-dark-soft hover:text-claude-on-dark transition-colors">
            <span className="text-[13px]">首页</span>
          </Link>
          <Link href="/library" className="flex-1 flex items-center justify-center gap-1.5 py-2 text-claude-on-dark-soft hover:text-claude-on-dark transition-colors">
            <span className="text-[13px]">简历库</span>
          </Link>
          <Link href="/ai-write" className="flex-1 flex items-center justify-center gap-1.5 py-2">
            <span className="text-[13px] font-medium text-claude-on-dark">AI 写作</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
