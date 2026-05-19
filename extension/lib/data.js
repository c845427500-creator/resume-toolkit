// Default sample data for the extension
// Users can replace this by importing from the web app
const DEFAULT_DATA = {
  personal: {
    name: "蔡琳",
    phone: "18817238535",
    email: "c845427500@163.com",
  },
  education: [
    {
      school: "中山大学",
      degree: "岭南学院 金融 专业硕士",
      period: "2025.09 – 2027.06",
    },
    {
      school: "复旦大学",
      degree: "化学系 化学 / 经济学与金融学（2+X） 本科",
      period: "2020.09 – 2024.09",
    },
  ],
  experiences: [
    {
      id: "yuexiu-fund",
      company: "越秀产业基金",
      role: "S基金投资实习生",
      period: "2026.04 – 至今",
      bullets: [
        "依托本地部署AI工具，设计拆解逻辑与分析指令，批量导入拟投资项目尽调材料进行定向解析，快速完成企业基本面与行业格局系统梳理，产出公司一页纸报告，缩短立项报告撰写周期65%。",
      ],
    },
    {
      id: "hongnei-tech",
      company: "红内数科（小红书内容营销官方合作服务商）",
      role: "数字营销实习生",
      period: "2023.01 – 2023.03",
      bullets: [
        "结合品牌方投放要求与小红书平台生态，搭建达人价值量化评估体系，纳入CPC/CPE/CPM等核心投放指标，建立筛选SOP，日均精准筛选KOL/KOC 20+，筛选效率提升68%。",
        "基于广告投放数据、用户行为分析及搜索词表现，定位影响CTR/CPC关键因素，总结高点击素材共性特征，输出数据日报，形成可复用的投放策略模板，助力品牌广告CTR平均提升至5%。",
      ],
    },
  ],
  projects: [
    {
      id: "dongmiane",
      name: "懂面鹅 · AI面试互动产品",
      role: "独立产品设计 & 全栈开发",
      period: "2026.05",
      bullets: [
        "从「求职者对AI面试半信半疑」痛点出发，设计「先猜→实测→AI逐维度拆解评分→个性化通关」游戏化体验闭环，覆盖4模块、11话题、单人+投屏双场景。",
        "独立全栈开发，基于Next.js 16 + TypeScript + DeepSeek API，设计7条独立AI Prompt管线，纯静态导出部署于Vercel + GitHub Pages双线。",
        "将腾讯BBSI面试评分方法论落地为可执行评分引擎：四维BARS行为锚定（0/3/6/10）+ STAR完整性约束规则 + 本地fallback评分器。",
      ],
    },
  ],
  leadership: [
    {
      id: "fda-president",
      org: "复旦大学天文协会",
      role: "会长 / 宣传部部长",
      period: "2022.01 – 2023.01",
      bullets: [
        "协调6个部门，负责活动策划、流程设计、人员协调与现场管理，成功落地全国大学生天文摄影比赛、招新季活动等8场大型活动，累计2000+人次参与。",
      ],
    },
  ],
  skills: {
    金融工具: ["Wind", "Choice", "Excel（透视表/Vlookup/高级函数）", "PPT"],
    数据分析: ["Python", "SQL", "Stata"],
    AI工具: ["ChatGPT", "DeepSeek", "Claude", "OpenClaw"],
    语言: ["普通话二级甲等", "英语CET-6", "粤语"],
  },
};
