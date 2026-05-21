export function exportForExtension(data: any, jobType: string) {
  const exportData = {
    exportedAt: new Date().toISOString(),
    jobType,
    personal: data.personal,
    education: data.education,
    experiences: data.experiences.map((e: any) => ({
      id: e.id,
      company: e.name,
      department: e.department || "",
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
    campus: (data.campus || []).map((c: any) => ({
      id: c.id,
      org: c.name,
      role: c.role,
      period: c.period,
      bullets: c.bullets.map((b: any) => b.text),
    })),
    social: (data.social || []).map((s: any) => ({
      id: s.id,
      org: s.name,
      role: s.role,
      period: s.period,
      bullets: s.bullets.map((b: any) => b.text),
    })),
    skills: data.skills,
    selfEval: data.selfEval || "",
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "resume-export.json";
  a.click();
  URL.revokeObjectURL(url);
}
