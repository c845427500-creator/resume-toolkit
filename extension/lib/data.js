// ─── 简历库助手 · 默认示例数据（多方向） ───
const DEFAULT_DATA = {
  shared: {
    personal: { name: "张三", phone: "13800000000", email: "example@email.com", idType: "身份证", gender: "", birthDate: "", highestDegree: "", idNumber: "", ethnicity: "", nativePlace: "", hukouLocation: "", hukouAddress: "", currentAddress: "", politicalStatus: "", maritalStatus: "", height: "", weight: "", emergencyContact: "", emergencyRelation: "", emergencyPhone: "", healthStatus: "" },
    education: {
      undergrad: { schoolName: "", degree: "", college: "", period: "", major: "", majorCategory: "", fullTime: "", unifiedEnrollment: "" },
      master: { schoolName: "", degree: "", college: "", period: "", major: "", majorCategory: "", fullTime: "", unifiedEnrollment: "" },
      highSchool: { schoolName: "", examOrigin: "", examScore: "", artsOrScience: "" },
    },
    family: [],
  },
  libraries: {
    "综合": { experiences: [], projects: [], campus: [], social: [], skills: {}, selfEval: "" },
    "产品": { experiences: [], projects: [], campus: [], social: [], skills: {}, selfEval: "" },
    "AI": { experiences: [], projects: [], campus: [], social: [], skills: {}, selfEval: "" },
    "技术": { experiences: [], projects: [], campus: [], social: [], skills: {}, selfEval: "" },
    "金融": { experiences: [], projects: [], campus: [], social: [], skills: {}, selfEval: "" },
  },
  directions: ["综合", "产品", "AI", "技术", "金融"],
};
