import type { Personal, EducationStage, CardItem } from "./resume-store";

interface ParsedResume {
  personal: Partial<Personal>;
  education: {
    undergrad?: Partial<EducationStage>;
    master?: Partial<EducationStage>;
  };
  experiences: CardItem[];
  projects: CardItem[];
  campus: CardItem[];
  social: CardItem[];
  skills: Record<string, string[]>;
  selfEval: string;
}

async function fetchDeepSeek(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  temperature = 0.3,
  maxTokens = 4000
): Promise<string | null> {
  try {
    const res = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature,
        max_tokens: maxTokens,
        stream: false,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  }
}

function cleanJson(s: string): string {
  let t = s.trim();
  if (t.startsWith("```json")) t = t.slice(7);
  if (t.startsWith("```")) t = t.slice(3);
  if (t.endsWith("```")) t = t.slice(0, -3);
  return t.trim();
}

let idCounter = 0;
function genId(prefix: string): string {
  idCounter++;
  return `${prefix}-${Date.now()}-${idCounter}`;
}

export async function parseResume(apiKey: string, rawText: string): Promise<ParsedResume | null> {
  const systemPrompt = `你是一位专业的简历解析专家。用户会给你一份简历文本，你需要将其解析为结构化的 JSON 数据。

要求：
1. 严格保留原文中的所有事实信息（姓名、日期、学校名称、公司名称、数据等），不要编造或修改。
2. 对经历（实习/工作/项目/校园/社会实践）的每一条要点，提取为独立的 bullet，并给每条 bullet 打上标签（2-3个标签，如：金融、AI、分析、运营、产品、技术、设计、管理、内容、数据、用户研究等）。
3. 每段经历整体也打上 2-4 个标签。
4. 技能按类别归类（如：金融工具、办公软件、编程语言、AI工具、语言等）。
5. 直接输出 JSON，不要任何解释或标记。`;

  const userPrompt = `请解析以下简历文本，输出结构化 JSON：

${rawText}

输出格式（严格 JSON）：
{
  "personal": {
    "name": "姓名",
    "phone": "手机号",
    "email": "邮箱",
    "gender": "性别",
    "birthDate": "出生日期",
    "highestDegree": "最高学历"
  },
  "education": [
    {
      "school": "学校名称",
      "degree": "学位（如本科/硕士）",
      "college": "学院",
      "major": "专业",
      "period": "起止时间",
      "notes": "补充信息",
      "honors": "荣誉奖项",
      "gpa": "GPA",
      "relevantCourses": "相关课程"
    }
  ],
  "experiences": [
    {
      "company": "公司/机构名称",
      "department": "部门（可选）",
      "role": "职位",
      "period": "起止时间",
      "tags": ["标签1", "标签2"],
      "bullets": [
        { "text": "工作要点描述", "tags": ["标签1", "标签2"] }
      ]
    }
  ],
  "projects": [
    {
      "name": "项目名称",
      "role": "角色",
      "period": "时间",
      "tags": ["标签1"],
      "bullets": [
        { "text": "项目要点描述", "tags": ["标签1"] }
      ]
    }
  ],
  "campus": [
    {
      "org": "组织名称",
      "role": "角色",
      "period": "时间",
      "tags": ["标签1"],
      "bullets": [
        { "text": "经历要点描述", "tags": ["标签1"] }
      ]
    }
  ],
  "social": [
    {
      "org": "组织/账号名称",
      "role": "角色",
      "period": "时间",
      "tags": ["标签1"],
      "bullets": [
        { "text": "经历要点描述", "tags": ["标签1"] }
      ]
    }
  ],
  "skills": {
    "金融工具": ["Wind", "Choice"],
    "办公软件": ["Excel", "PPT"],
    "语言": ["英语 CET-6"]
  },
  "selfEval": "自我评价文本（如有）"
}`;

  const result = await fetchDeepSeek(apiKey, systemPrompt, userPrompt, 0.1, 8000);
  if (!result) return null;

  try {
    const raw = JSON.parse(cleanJson(result));

    // Build education
    const edu: ParsedResume["education"] = {};
    const eduList = raw.education || [];
    for (const e of eduList) {
      const stage: Partial<EducationStage> = {
        schoolName: e.school || "",
        degree: e.degree || "",
        college: e.college || "",
        major: e.major || "",
        period: e.period || "",
        notes: e.notes || "",
        honors: e.honors || "",
        gpa: e.gpa || "",
        relevantCourses: e.relevantCourses || "",
      };
      const deg = e.degree || "";
      if ((deg.includes("硕士") || deg.includes("研究生")) && !edu.master) {
        edu.master = stage;
      } else if ((deg.includes("本科") || deg.includes("学士")) && !edu.undergrad) {
        edu.undergrad = stage;
      }
    }

    // Build card items
    const mapCards = (items: any[], source: "exp" | "proj" | "campus" | "social"): CardItem[] =>
      (items || []).map((item: any) => ({
        id: genId(source),
        name: item.company || item.name || item.org || "",
        department: item.department || undefined,
        role: item.role || "",
        period: item.period || "",
        tags: item.tags || [],
        bullets: (item.bullets || []).map((b: any) => ({
          text: b.text || "",
          tags: b.tags || [],
        })),
      }));

    return {
      personal: {
        name: raw.personal?.name || "",
        phone: raw.personal?.phone || "",
        email: raw.personal?.email || "",
        gender: raw.personal?.gender || "",
        birthDate: raw.personal?.birthDate || "",
        highestDegree: raw.personal?.highestDegree || "",
      },
      education: edu,
      experiences: mapCards(raw.experiences, "exp"),
      projects: mapCards(raw.projects, "proj"),
      campus: mapCards(raw.campus, "campus"),
      social: mapCards(raw.social, "social"),
      skills: raw.skills || {},
      selfEval: raw.selfEval || "",
    };
  } catch {
    return null;
  }
}

export async function recommendDirections(
  apiKey: string,
  resumeSummary: string
): Promise<string[] | null> {
  const systemPrompt = `你是一位职业规划专家。用户给你一份简历的摘要信息，你需要根据简历中的经历、技能和专业背景，推荐 3-5 个最适合的岗位方向。

要求：
1. 方向名称简洁（2-4个字），如：金融、AI、产品、技术、运营、咨询、市场、数据
2. 方向应与简历中的实际经历强相关，不要推荐不相关的方向
3. 按匹配度从高到低排列
4. 直接输出方向列表，每行一个方向，以 - 开头，不要任何解释`;

  const userPrompt = `简历摘要：
${resumeSummary}

请推荐 3-5 个岗位方向：`;

  const result = await fetchDeepSeek(apiKey, systemPrompt, userPrompt, 0.3, 500);
  if (!result) return null;

  return result
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("-") || l.startsWith("•"))
    .map((l) => l.replace(/^[-•]\s*/, "").trim())
    .filter(Boolean);
}

export async function matchCardsByDirection(
  apiKey: string,
  direction: string,
  allCards: CardItem[]
): Promise<number[]> {
  if (allCards.length === 0) return [];

  const cardsText = allCards
    .map(
      (c, i) =>
        `[${i}] ${c.name} · ${c.role} (${c.period})\n${c.bullets.map((b) => `  - ${b.text}`).join("\n")}`
    )
    .join("\n\n");

  const systemPrompt = `你是一位简历筛选专家。用户选择一个岗位方向，你需要从所有经历卡片中筛选出与该方向相关的卡片。

要求：
1. 仔细分析方向"${direction}"的含义和所需能力
2. 逐一审查每张卡片的经历内容，判断是否与该方向相关
3. 只要卡片内容与方向有一定关联（技能、行业、工作性质等），就应纳入
4. 直接输出匹配的卡片序号列表，如：[0, 2, 5, 7]
5. 不要输出任何解释`;

  const userPrompt = `方向：${direction}

所有经历卡片：
${cardsText}

请输出与该方向匹配的卡片序号列表（JSON数组格式）：`;

  const result = await fetchDeepSeek(apiKey, systemPrompt, userPrompt, 0.2, 1000);
  if (!result) return allCards.map((_, i) => i); // fallback: all cards

  try {
    const match = result.match(/\[[\d,\s]+\]/);
    if (match) {
      const indices: number[] = JSON.parse(match[0]);
      return indices.filter((i) => i >= 0 && i < allCards.length);
    }
  } catch {}
  return allCards.map((_, i) => i);
}
