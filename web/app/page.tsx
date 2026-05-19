"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings,
  Copy,
  Check,
  Sparkles,
  Loader2,
  Trash2,
  Download,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import resumeData from "@/lib/resume-data.json";
import { optimizeResume } from "@/lib/deepseek-client";
import { exportForExtension } from "@/lib/export-utils";

type JobType = "产品" | "AI" | "技术" | "金融" | "综合";

const JOB_TYPES: { key: JobType; label: string; emoji: string }[] = [
  { key: "综合", label: "综合", emoji: "📋" },
  { key: "产品", label: "产品", emoji: "💡" },
  { key: "AI", label: "AI", emoji: "🤖" },
  { key: "技术", label: "技术", emoji: "💻" },
  { key: "金融", label: "金融", emoji: "📊" },
];

function tagMatch(itemTags: string[], targetJob: JobType): boolean {
  if (targetJob === "综合") return true;
  return itemTags.includes(targetJob);
}

export default function Home() {
  const [jobType, setJobType] = useState<JobType>("综合");
  const [apiKeyModal, setApiKeyModal] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [jdText, setJdText] = useState("");
  const [optimizing, setOptimizing] = useState(false);
  const [optimizedSections, setOptimizedSections] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);

  useState(() => {
    if (typeof window !== "undefined") {
      setApiKey(localStorage.getItem("ds_api_key") || "");
    }
  });

  const saveApiKey = (key: string) => {
    setApiKey(key);
    if (key) localStorage.setItem("ds_api_key", key);
    else localStorage.removeItem("ds_api_key");
    setApiKeyModal(false);
  };

  const filtered = useMemo(() => {
    const filterBullets = (bullets: { text: string; tags: string[] }[]) =>
      jobType === "综合"
        ? bullets
        : bullets.filter((b) => b.tags.some((t) => tagMatch([t], jobType)));

    return {
      personal: resumeData.personal,
      education: resumeData.education,
      experiences: resumeData.experiences
        .filter((e) => tagMatch(e.tags, jobType))
        .map((e) => ({ ...e, bullets: filterBullets(e.bullets) }))
        .filter((e) => e.bullets.length > 0),
      projects: resumeData.projects
        .filter((p) => tagMatch(p.tags, jobType))
        .map((p) => ({ ...p, bullets: filterBullets(p.bullets) }))
        .filter((p) => p.bullets.length > 0),
      leadership: resumeData.leadership
        .filter((l) => tagMatch(l.tags, jobType))
        .map((l) => ({ ...l, bullets: filterBullets(l.bullets) }))
        .filter((l) => l.bullets.length > 0),
      skills: resumeData.skills,
    };
  }, [jobType]);

  const totalItems = filtered.experiences.length + filtered.projects.length + filtered.leadership.length;

  const resumeText = useMemo(() => {
    const sections: string[] = [];
    sections.push(`${resumeData.personal.name}`);
    sections.push(`${resumeData.personal.phone} · ${resumeData.personal.email}`);
    sections.push("");
    sections.push("▎教育经历");
    filtered.education.forEach((e) => {
      sections.push(`${e.school}  ${e.degree}  ${e.period}`);
      if (e.notes) sections.push(e.notes);
    });
    sections.push("");
    if (filtered.experiences.length > 0) {
      sections.push("▎实习经历");
      filtered.experiences.forEach((e) => {
        sections.push(`${e.company}  ${e.role}  ${e.period}`);
        e.bullets.forEach((b) => sections.push(`• ${b.text}`));
        sections.push("");
      });
    }
    if (filtered.projects.length > 0) {
      sections.push("▎项目经历");
      filtered.projects.forEach((p) => {
        sections.push(`${p.name}  ${p.role}  ${p.period}`);
        p.bullets.forEach((b) => sections.push(`• ${b.text}`));
        sections.push("");
      });
    }
    if (filtered.leadership.length > 0) {
      sections.push("▎校园/实践经历");
      filtered.leadership.forEach((l) => {
        sections.push(`${l.org}  ${l.role}  ${l.period}`);
        l.bullets.forEach((b) => sections.push(`• ${b.text}`));
        sections.push("");
      });
    }
    sections.push("▎技能");
    Object.entries(resumeData.skills).forEach(([cat, items]) => {
      sections.push(`${cat}：${items.join("、")}`);
    });
    return sections.join("\n");
  }, [filtered]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(resumeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [resumeText]);

  const handleOptimize = async () => {
    if (!apiKey || !jdText.trim()) return;
    setOptimizing(true);
    try {
      const result = await optimizeResume(apiKey, jdText, resumeText);
      if (result) setOptimizedSections({ full: result });
    } catch {} finally {
      setOptimizing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      {/* Header */}
      <header className="bg-white border-b border-[#E2E8F0] sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#0052D9] flex items-center justify-center text-white text-sm font-bold">
              R
            </div>
            <div>
              <h1 className="text-[15px] font-bold text-[#0F172A] leading-tight">简历库</h1>
              <p className="text-[11px] text-[#64748B]">AI Resume Toolkit</p>
            </div>
          </div>
          <button
            onClick={() => setApiKeyModal(true)}
            className="w-8 h-8 rounded-lg hover:bg-[#F1F5F9] flex items-center justify-center transition-colors"
          >
            <Settings size={16} className="text-[#64748B]" />
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 py-5 space-y-5">
        {/* Pills: Job Type Selector */}
        <div className="flex gap-1.5 p-1 bg-[#F1F5F9] rounded-xl">
          {JOB_TYPES.map((jt) => (
            <button
              key={jt.key}
              onClick={() => { setJobType(jt.key); setOptimizedSections({}); }}
              className={`flex-1 py-2 text-xs font-medium rounded-[10px] transition-all duration-200 ${
                jobType === jt.key
                  ? "bg-white text-[#0052D9] shadow-sm"
                  : "text-[#64748B] hover:text-[#334155]"
              }`}
            >
              <span className="mr-1">{jt.emoji}</span>
              {jt.label}
            </button>
          ))}
        </div>

        {/* AI Optimization Panel */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-lg bg-[#F2F3FF] flex items-center justify-center">
              <Sparkles size={13} className="text-[#0052D9]" />
            </div>
            <p className="text-[13px] font-semibold text-[#0F172A]">AI 简历优化</p>
            <p className="text-[11px] text-[#64748B]">粘贴目标 JD，AI 自动匹配关键词</p>
          </div>
          <textarea
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
            placeholder="粘贴目标岗位的职位描述..."
            className="w-full h-[72px] px-3.5 py-3 bg-[#F8FAFC] rounded-xl text-[13px] text-[#0F172A] placeholder-[#94A3B8] resize-none border border-transparent focus:border-[#0052D9] focus:bg-white focus:outline-none transition-all"
          />
          <div className="flex items-center justify-between mt-3">
            <span className="text-[11px] text-[#94A3B8]">
              {apiKey ? "API Key 已就绪" : "请先设置 API Key"}
            </span>
            <button
              onClick={handleOptimize}
              disabled={!apiKey || !jdText.trim() || optimizing}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#0052D9] disabled:bg-[#CBD5E1] disabled:text-[#94A3B8] text-white text-[12px] font-medium rounded-lg hover:bg-[#366EF4] transition-colors"
            >
              {optimizing ? (
                <><Loader2 size={13} className="animate-spin" />优化中</>
              ) : (
                <><Sparkles size={13} />优化简历</>
              )}
            </button>
          </div>
        </div>

        {/* Resume Card */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
          {/* Card header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#F1F5F9]">
            <div className="flex items-center gap-2">
              <h2 className="text-[14px] font-bold text-[#0F172A]">
                {jobType === "综合" ? "完整简历" : `${jobType}方向`}
              </h2>
              <span className="text-[11px] text-[#94A3B8] bg-[#F1F5F9] px-2 py-0.5 rounded-full">
                {totalItems} 段经历
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {optimizedSections.full && (
                <button
                  onClick={() => setOptimizedSections({})}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] text-[#64748B] hover:text-[#EF4444] rounded-lg hover:bg-[#FEF2F2] transition-colors"
                >
                  <Trash2 size={12} />还原
                </button>
              )}
              <button
                onClick={() => exportForExtension(resumeData, jobType)}
                className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] text-[#64748B] hover:text-[#0F172A] bg-[#F1F5F9] rounded-lg hover:bg-[#E2E8F0] transition-colors"
              >
                <Download size={12} />导出
              </button>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-3 py-1.5 bg-[#0F172A] text-white text-[11px] font-medium rounded-lg hover:bg-[#1E293B] transition-colors"
              >
                {copied ? <><Check size={12} />已复制</> : <><Copy size={12} />复制全文</>}
              </button>
            </div>
          </div>

          {/* Resume content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={jobType + (optimizedSections.full ? "-opt" : "-raw")}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="px-5 py-4"
            >
              {optimizedSections.full ? (
                <pre className="font-sans text-[13px] leading-relaxed whitespace-pre-wrap text-[#334155]">
                  {optimizedSections.full}
                </pre>
              ) : (
                <div className="space-y-5">
                  {/* Name + Contact */}
                  <div className="text-center pb-4 border-b border-[#F1F5F9]">
                    <h3 className="text-[17px] font-bold text-[#0F172A] mb-1">{resumeData.personal.name}</h3>
                    <p className="text-[12px] text-[#64748B]">
                      {resumeData.personal.phone} · {resumeData.personal.email}
                    </p>
                  </div>

                  {/* Education */}
                  <Section title="教育经历" icon="🎓">
                    {filtered.education.map((e, i) => (
                      <div key={i} className="flex justify-between items-start py-2">
                        <div>
                          <p className="text-[13px] font-semibold text-[#0F172A]">{e.school}</p>
                          <p className="text-[12px] text-[#475569]">{e.degree}</p>
                          {e.notes && <p className="text-[11px] text-[#64748B] mt-0.5">{e.notes}</p>}
                        </div>
                        <span className="text-[11px] text-[#94A3B8] whitespace-nowrap ml-4">{e.period}</span>
                      </div>
                    ))}
                  </Section>

                  {/* Experiences */}
                  {filtered.experiences.length > 0 && (
                    <Section title="实习经历" icon="💼">
                      {filtered.experiences.map((e) => (
                        <div key={e.id} className="py-2.5">
                          <div className="flex justify-between items-baseline mb-1.5">
                            <p className="text-[13px] font-semibold text-[#0F172A]">{e.company}</p>
                            <span className="text-[11px] text-[#94A3B8] whitespace-nowrap ml-4">{e.period}</span>
                          </div>
                          <p className="text-[12px] text-[#0052D9] font-medium mb-2">{e.role}</p>
                          <ul className="space-y-1.5">
                            {e.bullets.map((b: any, idx: number) => (
                              <li key={idx} className="flex gap-2 text-[13px] text-[#334155] leading-relaxed">
                                <span className="text-[#CBD5E1] mt-[3px]">▸</span>
                                <span>{b.text}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </Section>
                  )}

                  {/* Projects */}
                  {filtered.projects.length > 0 && (
                    <Section title="项目经历" icon="🚀">
                      {filtered.projects.map((p) => (
                        <div key={p.id} className="py-2.5">
                          <div className="flex justify-between items-baseline mb-1.5">
                            <p className="text-[13px] font-semibold text-[#0F172A]">{p.name}</p>
                            <span className="text-[11px] text-[#94A3B8] whitespace-nowrap ml-4">{p.period}</span>
                          </div>
                          <p className="text-[12px] text-[#0052D9] font-medium mb-2">{p.role}</p>
                          <ul className="space-y-1.5">
                            {p.bullets.map((b: any, idx: number) => (
                              <li key={idx} className="flex gap-2 text-[13px] text-[#334155] leading-relaxed">
                                <span className="text-[#CBD5E1] mt-[3px]">▸</span>
                                <span>{b.text}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </Section>
                  )}

                  {/* Leadership */}
                  {filtered.leadership.length > 0 && (
                    <Section title="校园 / 实践经历" icon="🌟">
                      {filtered.leadership.map((l) => (
                        <div key={l.id} className="py-2.5">
                          <div className="flex justify-between items-baseline mb-1.5">
                            <p className="text-[13px] font-semibold text-[#0F172A]">{l.org}</p>
                            <span className="text-[11px] text-[#94A3B8] whitespace-nowrap ml-4">{l.period}</span>
                          </div>
                          <p className="text-[12px] text-[#0052D9] font-medium mb-2">{l.role}</p>
                          <ul className="space-y-1.5">
                            {l.bullets.map((b: any, idx: number) => (
                              <li key={idx} className="flex gap-2 text-[13px] text-[#334155] leading-relaxed">
                                <span className="text-[#CBD5E1] mt-[3px]">▸</span>
                                <span>{b.text}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </Section>
                  )}

                  {/* Skills */}
                  <Section title="技能" icon="🛠">
                    <div className="space-y-1.5">
                      {Object.entries(filtered.skills).map(([cat, items]) => (
                        <div key={cat} className="flex text-[12px]">
                          <span className="text-[#64748B] min-w-[72px] font-medium">{cat}</span>
                          <span className="text-[#334155]">{items.join("、")}</span>
                        </div>
                      ))}
                    </div>
                  </Section>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/90 backdrop-blur-lg border-t border-[#E2E8F0]">
        <div className="max-w-2xl mx-auto flex items-center px-5 h-16">
          <Link href="/" className="flex-1 flex items-center justify-center gap-2 py-2">
            <span className="w-7 h-7 rounded-lg bg-[#F2F3FF] flex items-center justify-center text-sm">📋</span>
            <span className="text-[13px] font-semibold text-[#0052D9]">简历库</span>
          </Link>
          <Link href="/ai-write" className="flex-1 flex items-center justify-center gap-2 py-2 text-[#64748B] hover:text-[#0F172A] transition-colors">
            <span className="w-7 h-7 rounded-lg bg-[#F1F5F9] flex items-center justify-center text-sm">✍️</span>
            <span className="text-[13px] font-medium">AI 写作</span>
          </Link>
        </div>
      </nav>

      {/* API Key Modal */}
      {apiKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-5" onClick={() => setApiKeyModal(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-xl"
          >
            <div className="w-10 h-10 rounded-xl bg-[#F2F3FF] flex items-center justify-center mb-3">
              <Settings size={18} className="text-[#0052D9]" />
            </div>
            <h3 className="text-[15px] font-bold text-[#0F172A] mb-1">DeepSeek API Key</h3>
            <p className="text-[12px] text-[#64748B] mb-4 leading-relaxed">
              Key 仅存储在浏览器，不上传任何服务器。
              <a href="https://platform.deepseek.com/api_keys" target="_blank" className="text-[#0052D9] font-medium ml-1">
                获取 Key →
              </a>
            </p>
            <input
              type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full px-3.5 py-2.5 bg-[#F8FAFC] rounded-xl text-[13px] border border-[#E2E8F0] focus:border-[#0052D9] focus:outline-none mb-3 transition-colors"
            />
            <div className="flex gap-2">
              <button onClick={() => saveApiKey(apiKey)} className="flex-1 py-2.5 bg-[#0052D9] text-white text-[13px] font-medium rounded-xl hover:bg-[#366EF4] transition-colors">
                保存
              </button>
              <button onClick={() => setApiKeyModal(false)} className="px-4 py-2.5 text-[13px] text-[#64748B] rounded-xl hover:bg-[#F1F5F9] transition-colors">
                取消
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Footer hint */}
      <div className="text-center py-8">
        <p className="text-[11px] text-[#94A3B8]">配合浏览器插件「简历库助手」使用更高效</p>
        <a href="https://github.com/c845427500-creator/resume-toolkit" target="_blank" className="text-[11px] text-[#0052D9] font-medium mt-1 inline-block">
          查看源码 →
        </a>
      </div>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2.5">
        <span className="text-[13px]">{icon}</span>
        <h4 className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">{title}</h4>
        <div className="flex-1 h-px bg-[#E2E8F0]" />
      </div>
      {children}
    </div>
  );
}
