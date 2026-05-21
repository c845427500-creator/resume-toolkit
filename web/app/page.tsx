"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Loader2, Upload, FileText, Check, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { parseResume, recommendDirections, matchCardsByDirection } from "@/lib/resume-parser";
import { initStore, importParsedResume, saveStore, JOB_TYPES, setDirectionLibrary } from "@/lib/resume-store";
import type { CardItem } from "@/lib/resume-store";

export default function HomePage() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [nicknameInput, setNicknameInput] = useState("");
  const [showNicknameEdit, setShowNicknameEdit] = useState(false);
  const [resumeText, setResumeText] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showApiModal, setShowApiModal] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState(false);
  const [parseError, setParseError] = useState("");
  const [summary, setSummary] = useState<{ name: string; eduCount: number; expCount: number; projCount: number; skillCats: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setNickname(localStorage.getItem("resume_nickname") || "");
    setApiKey(localStorage.getItem("ds_api_key") || "");
  }, []);

  const saveNickname = (name: string) => {
    setNickname(name);
    localStorage.setItem("resume_nickname", name);
    setShowNicknameEdit(false);
  };

  const saveApiKey = (key: string) => {
    setApiKey(key);
    if (key) {
      localStorage.setItem("ds_api_key", key);
    } else {
      localStorage.removeItem("ds_api_key");
    }
    setShowApiModal(false);
  };

  const extractTextFromFile = async (file: File): Promise<string | null> => {
    try {
      if (file.name.endsWith(".docx")) {
        const mammoth = (await import("mammoth")).default;
        const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
        return result.value;
      } else if (file.name.endsWith(".pdf")) {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@5.7.284/build/pdf.worker.min.mjs`;
        const pdfData = new Uint8Array(await file.arrayBuffer());
        const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
        let text = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          text += content.items.map((item: any) => item.str).join(" ") + "\n";
        }
        return text;
      } else {
        return await file.text();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setParseError(`文件解析失败（${msg}），请尝试粘贴文本`);
      return null;
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!apiKey) { setShowApiModal(true); return; }
    setParsing(true);
    setParseError("");
    const text = await extractTextFromFile(file);
    if (text === null) { setParsing(false); return; }
    setResumeText(text);
    await doParse(text);
  };

  const doParse = async (text: string) => {
    if (!apiKey) { setShowApiModal(true); return; }
    if (!text.trim()) { setParseError("请先粘贴或上传简历"); return; }
    setParsing(true);
    setParseError("");
    try {
      const data = await parseResume(apiKey, text);
      if (!data) { setParseError("AI 解析失败，请检查 API Key 或重试"); setParsing(false); return; }
      // Recommend directions
      const summaryText = [
        data.personal.name,
        data.education.undergrad ? `${data.education.undergrad.schoolName} ${data.education.undergrad.major}` : "",
        data.education.master ? `${data.education.master.schoolName} ${data.education.master.major}` : "",
        `实习经历: ${data.experiences.length} 段`,
        `项目经历: ${data.projects.length} 个`,
        `技能: ${Object.keys(data.skills).join("、")}`,
      ].filter(Boolean).join("\n");
      const dirs = await recommendDirections(apiKey, summaryText);
      // Init store and import
      let store = initStore();
      store = importParsedResume(store, data);
      // For each AI-recommended direction, match cards via AI semantic matching
      if (dirs && dirs.length > 0) {
        const allCards = [...data.experiences, ...data.projects, ...data.campus, ...data.social];
        const expIds = new Set(data.experiences.map((c) => c.id));
        const projIds = new Set(data.projects.map((c) => c.id));
        const campusIds = new Set(data.campus.map((c) => c.id));
        const socialIds = new Set(data.social.map((c) => c.id));
        for (const dir of dirs) {
          const normDir = dir.trim();
          if (!normDir) continue;
          const matchedIndices = await matchCardsByDirection(apiKey, normDir, allCards);
          const matched = matchedIndices.map((i) => allCards[i]).filter(Boolean);
          const lib = {
            experiences: matched.filter((c) => expIds.has(c.id)),
            projects: matched.filter((c) => projIds.has(c.id)),
            campus: matched.filter((c) => campusIds.has(c.id)),
            social: matched.filter((c) => socialIds.has(c.id)),
            skills: data.skills,
            selfEval: data.selfEval,
          };
          store = importParsedResume(store, {}, [normDir]);
          store = setDirectionLibrary(store, normDir, lib);
        }
      }
      saveStore(store);
      setSummary({
        name: data.personal.name || "未识别",
        eduCount: (data.education.undergrad ? 1 : 0) + (data.education.master ? 1 : 0),
        expCount: data.experiences.length,
        projCount: data.projects.length,
        skillCats: Object.keys(data.skills).length,
      });
      setParsed(true);
    } catch {
      setParseError("解析过程出错，请重试");
    } finally {
      setParsing(false);
    }
  };

  const handleParse = () => doParse(resumeText);

  const handleReset = () => {
    setResumeText("");
    setParsed(false);
    setSummary(null);
    setParseError("");
  };

  const goToLibrary = () => {
    router.push("/library");
  };

  return (
    <div className="min-h-screen bg-claude-canvas flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-claude-canvas/80 backdrop-blur-sm border-b border-claude-hairline">
        <div className="max-w-[720px] mx-auto px-6 h-14 flex items-center justify-between">
          <span className="text-[14px] font-medium text-claude-ink tracking-tight" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            简历库
          </span>
          <button
            onClick={() => setShowApiModal(true)}
            className="w-7 h-7 rounded-md hover:bg-claude-surface-card flex items-center justify-center transition-colors"
          >
            <Settings size={14} className="text-claude-muted" />
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[600px] space-y-10">
          {/* Hero */}
          <div className="text-center space-y-3">
            <h1 className="text-[40px] leading-[1.15] text-claude-ink" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, letterSpacing: "-0.5px" }}>
              {nickname && !showNicknameEdit ? `${nickname}的` : ""}简历库
            </h1>
            {nickname && !showNicknameEdit ? (
              <p className="text-[14px] text-claude-muted">
                你好，{nickname}
                <button
                  onClick={() => { setNicknameInput(nickname); setShowNicknameEdit(true); }}
                  className="ml-2 text-claude-muted-soft hover:text-claude-ink underline underline-offset-2 transition-colors"
                >
                  修改昵称
                </button>
              </p>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <input
                  value={nicknameInput}
                  onChange={(e) => setNicknameInput(e.target.value)}
                  placeholder="设置你的昵称"
                  className="text-[14px] text-claude-ink bg-claude-surface-card border border-claude-hairline rounded-[8px] px-3 py-2 w-[200px] placeholder-claude-muted-soft focus:border-claude-primary focus:outline-none transition-colors text-center"
                  onKeyDown={(e) => { if (e.key === "Enter") saveNickname(nicknameInput); }}
                  autoFocus
                />
                <button
                  onClick={() => saveNickname(nicknameInput)}
                  disabled={!nicknameInput.trim()}
                  className="text-[13px] font-medium px-4 py-2 rounded-[8px] bg-claude-primary text-claude-on-primary hover:bg-claude-primary-active disabled:opacity-40 transition-colors"
                >
                  确认
                </button>
              </div>
            )}
          </div>

          {/* Resume Import */}
          <div className="bg-claude-surface-card rounded-[16px] border border-claude-hairline p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[16px] font-medium text-claude-ink">导入简历</h2>
              {parsed && (
                <button
                  onClick={handleReset}
                  className="text-[12px] text-claude-muted hover:text-red-500 transition-colors"
                >
                  一键清空
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".docx,.pdf,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={parsing}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-[14px] font-medium rounded-[10px] bg-claude-primary text-claude-on-primary hover:bg-claude-primary-active disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {parsing ? (
                <><Loader2 size={16} className="animate-spin" />AI 解析中…</>
              ) : (
                <><Upload size={16} />上传简历 .docx / .pdf</>
              )}
            </button>
            <p className="text-center text-[12px] text-claude-muted-soft">
              上传后 AI 自动解析为结构化简历
            </p>
            {parseError && (
              <p className="text-[13px] text-red-500">{parseError}</p>
            )}
          </div>

          {/* Parse Result */}
          {parsed && summary && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-claude-surface-card rounded-[16px] border border-claude-hairline p-6 space-y-4"
            >
              <div className="flex items-center gap-2">
                <Check size={16} className="text-green-600" />
                <h2 className="text-[16px] font-medium text-claude-ink">解析完成</h2>
              </div>
              <div className="grid grid-cols-2 gap-3 text-[14px]">
                <div className="bg-claude-canvas rounded-[8px] px-3 py-2">
                  <span className="text-claude-muted-soft">姓名</span>
                  <p className="text-claude-ink font-medium">{summary.name}</p>
                </div>
                <div className="bg-claude-canvas rounded-[8px] px-3 py-2">
                  <span className="text-claude-muted-soft">教育</span>
                  <p className="text-claude-ink font-medium">{summary.eduCount} 段</p>
                </div>
                <div className="bg-claude-canvas rounded-[8px] px-3 py-2">
                  <span className="text-claude-muted-soft">实习/工作</span>
                  <p className="text-claude-ink font-medium">{summary.expCount} 段</p>
                </div>
                <div className="bg-claude-canvas rounded-[8px] px-3 py-2">
                  <span className="text-claude-muted-soft">项目</span>
                  <p className="text-claude-ink font-medium">{summary.projCount} 个</p>
                </div>
              </div>
              <button
                onClick={goToLibrary}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-[14px] font-medium rounded-[10px] bg-claude-ink text-claude-on-dark hover:bg-claude-surface-dark-elevated transition-colors"
              >
                进入简历库 <ArrowRight size={16} />
              </button>
              <p className="text-center text-[12px] text-claude-muted-soft">
                AI 已为你推荐匹配的岗位方向，点击上方进入查看
              </p>
            </motion.div>
          )}
        </div>
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-claude-surface-dark">
        <div className="max-w-[720px] mx-auto flex items-center px-6 h-12">
          <span className="flex-1 flex items-center justify-center gap-1.5 py-2">
            <span className="text-[13px] font-medium text-claude-on-dark">首页</span>
          </span>
          <Link href="/library" className="flex-1 flex items-center justify-center gap-1.5 py-2 text-claude-on-dark-soft hover:text-claude-on-dark transition-colors">
            <span className="text-[13px]">简历库</span>
          </Link>
          <Link href="/ai-write" className="flex-1 flex items-center justify-center gap-1.5 py-2 text-claude-on-dark-soft hover:text-claude-on-dark transition-colors">
            <span className="text-[13px]">AI 写作</span>
          </Link>
        </div>
      </nav>

      {/* API Key Modal */}
      {showApiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#272728]/20 p-5" onClick={() => setShowApiModal(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-claude-surface-card rounded-[16px] border border-claude-hairline p-6 w-full max-w-[380px] shadow-xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-[16px] font-medium text-claude-ink">DeepSeek API Key</h2>
            <p className="text-[13px] text-claude-muted">
              Key only stored in browser.  <a href="https://platform.deepseek.com/api_keys" target="_blank" className="text-claude-primary underline">get key →</a>
            </p>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full text-[14px] text-claude-ink bg-claude-canvas rounded-[8px] px-3 py-2.5 border border-claude-hairline focus:border-claude-primary focus:outline-none"
              autoFocus
            />
            <div className="flex gap-2">
              <button onClick={() => saveApiKey("")} className="flex-1 py-2.5 text-[13px] text-claude-muted rounded-[8px] hover:bg-claude-surface transition-colors">
                清除
              </button>
              <button onClick={() => saveApiKey(apiKey)} className="flex-1 py-2.5 bg-claude-primary text-claude-on-primary text-[13px] font-medium rounded-[8px] hover:bg-claude-primary-active transition-colors">
                保存
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
