"use client";

export function exportForExtension(data: any, jobType: string) {
  // Build a flat structure optimized for the extension popup
  const exportData = {
    exportedAt: new Date().toISOString(),
    jobType,
    personal: data.personal,
    education: data.education,
    experiences: data.experiences.map((e: any) => ({
      id: e.id,
      company: e.company,
      role: e.role,
      period: e.period,
      bullets: e.bullets.map((b: any) => b.text),
    })),
    projects: data.projects.map((p: any) => ({
      id: p.id,
      name: p.name,
      role: p.role,
      period: p.period,
      bullets: p.bullets.map((b: any) => b.text),
    })),
    leadership: data.leadership.map((l: any) => ({
      id: l.id,
      org: l.org,
      role: l.role,
      period: l.period,
      bullets: l.bullets.map((b: any) => b.text),
    })),
    skills: data.skills,
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "resume-export.json";
  a.click();
  URL.revokeObjectURL(url);
}
