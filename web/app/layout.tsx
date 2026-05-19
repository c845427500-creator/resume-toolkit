import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "简历库工具包 · AI Resume Toolkit",
  description: "管理简历库 · AI 引导写作 · AI 优化改写 · 浏览器插件一键填入",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="bg-[#F5F5F5] text-[#1D2129]">{children}</body>
    </html>
  );
}
