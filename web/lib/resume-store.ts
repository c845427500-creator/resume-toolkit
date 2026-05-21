import type { AiBullet } from "./deepseek-client";

export type JobType = string;

export const DEFAULT_JOB_TYPES: JobType[] = ["综合", "产品", "AI", "技术", "金融"];

export const JOB_TYPES: { key: JobType; label: string }[] = DEFAULT_JOB_TYPES.map((k) => ({ key: k, label: k }));

export interface Bullet {
  text: string;
  tags: string[];
}

export interface CardItem {
  id: string;
  name: string;
  department?: string;
  role: string;
  period: string;
  tags?: string[];
  bullets: Bullet[];
  aiBullets?: AiBullet[];
}

export interface Library {
  experiences: CardItem[];
  projects: CardItem[];
  campus: CardItem[];
  social: CardItem[];
  skills: Record<string, string[]>;
  selfEval: string;
}

export interface Personal {
  name: string;
  phone: string;
  email: string;
  idType: string;
  gender: string;
  birthDate: string;
  highestDegree: string;
  idNumber: string;
  ethnicity: string;
  nativePlace: string;
  hukouLocation: string;
  hukouAddress: string;
  currentAddress: string;
  politicalStatus: string;
  maritalStatus: string;
  height: string;
  weight: string;
  emergencyContact: string;
  emergencyRelation: string;
  emergencyPhone: string;
  healthStatus: string;
  photo?: string;
}

export interface EducationStage {
  schoolName: string;
  degree: string;
  college: string;
  period: string;
  major: string;
  majorCategory: string;
  fullTime: string;
  unifiedEnrollment: string;
  notes?: string;
  honors?: string;
  relevantCourses?: string;
  courseGrades?: string;
  gpa?: string;
  ranking?: string;
  advisor?: string;
  customFields?: CustomField[];
}

export interface HighSchoolEducation {
  schoolName: string;
  examOrigin: string;
  examScore: string;
  artsOrScience: string;
  customFields?: CustomField[];
}

export interface FamilyMember {
  name: string;
  relation: string;
  workUnit: string;
  position: string;
}

export interface CustomField {
  id: string;
  title: string;
  content: string;
}

export interface ResumeStore {
  version: 6;
  shared: {
    personal: Personal;
    education: {
      highSchool?: HighSchoolEducation;
      undergrad?: EducationStage;
      master?: EducationStage;
    };
    family: FamilyMember[];
    customFields: Record<string, CustomField[]>;
  };
  libraries: Record<string, Library>;
  customDirections: string[];
}

export type CardSection = "experiences" | "projects" | "campus" | "social";

const STORAGE_KEY = "resume_library_v2";

const EMPTY_PERSONAL: Personal = {
  name: "", phone: "", email: "", idType: "身份证",
  gender: "", birthDate: "", highestDegree: "", idNumber: "",
  ethnicity: "", nativePlace: "", hukouLocation: "", hukouAddress: "",
  currentAddress: "", politicalStatus: "", maritalStatus: "", height: "", weight: "",
  emergencyContact: "", emergencyRelation: "", emergencyPhone: "", healthStatus: "",
  photo: "",
};

function defaultPersonal(): Personal {
  return { ...EMPTY_PERSONAL };
}

function defaultEducation(): ResumeStore["shared"]["education"] {
  return {};
}

function buildDefaultLibrary(jobType: JobType): Library {
  return {
    experiences: [],
    projects: [],
    campus: [],
    social: [],
    skills: {},
    selfEval: "",
  };
}

export function initStore(): ResumeStore {
  if (typeof window === "undefined") {
    return buildEmptyStore();
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.version === 6 && parsed?.shared && parsed?.libraries) {
        // Ensure customFields exists for older v6 data
        if (!parsed.shared.customFields) {
          parsed.shared.customFields = {};
        }
        // Repair missing default direction libraries
        for (const jt of DEFAULT_JOB_TYPES) {
          if (!parsed.libraries[jt]) {
            parsed.libraries[jt] = buildDefaultLibrary(jt);
          }
        }
        return parsed as ResumeStore;
      }
    }
  } catch {}
  return buildEmptyStore();
}

function buildEmptyStore(): ResumeStore {
  const libraries = {} as Record<string, Library>;
  for (const jt of DEFAULT_JOB_TYPES) {
    libraries[jt] = buildDefaultLibrary(jt);
  }
  return {
    version: 6,
    shared: {
      personal: defaultPersonal(),
      education: defaultEducation(),
      family: [],
      customFields: {},
    },
    libraries,
    customDirections: [],
  };
}

export function saveStore(store: ResumeStore): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {}
}

export function getLibrary(store: ResumeStore, jobType: JobType): Library {
  return store.libraries[jobType] || buildDefaultLibrary(jobType);
}

export function updatePersonal(store: ResumeStore, personal: Personal): ResumeStore {
  return { ...store, shared: { ...store.shared, personal } };
}

export function updateEducation(store: ResumeStore, education: ResumeStore["shared"]["education"]): ResumeStore {
  return { ...store, shared: { ...store.shared, education } };
}

export function updateFamily(store: ResumeStore, family: FamilyMember[]): ResumeStore {
  return { ...store, shared: { ...store.shared, family } };
}

export function updateCustomFields(store: ResumeStore, sectionKey: string, fields: CustomField[]): ResumeStore {
  return {
    ...store,
    shared: {
      ...store.shared,
      customFields: { ...store.shared.customFields, [sectionKey]: fields },
    },
  };
}

export function updateCard(
  store: ResumeStore,
  jobType: JobType,
  section: CardSection,
  cardId: string,
  updates: Partial<Pick<CardItem, "name" | "department" | "role" | "period" | "bullets" | "aiBullets">>
): ResumeStore {
  const lib = store.libraries[jobType];
  const items = lib[section];
  const idx = items.findIndex((item) => item.id === cardId);
  if (idx === -1) return store;

  const updated = [...items];
  updated[idx] = { ...updated[idx], ...updates };

  return {
    ...store,
    libraries: {
      ...store.libraries,
      [jobType]: { ...lib, [section]: updated },
    },
  };
}

export function setAiVersion(
  store: ResumeStore,
  jobType: JobType,
  section: CardSection,
  cardId: string,
  aiBullets: AiBullet[]
): ResumeStore {
  const lib = store.libraries[jobType];
  const items = lib[section];
  const idx = items.findIndex((item) => item.id === cardId);
  if (idx === -1) return store;

  const updated = [...items];
  updated[idx] = { ...updated[idx], aiBullets };

  return {
    ...store,
    libraries: {
      ...store.libraries,
      [jobType]: { ...lib, [section]: updated },
    },
  };
}

export function deleteCard(
  store: ResumeStore,
  jobType: JobType,
  section: CardSection,
  cardId: string
): ResumeStore {
  const lib = store.libraries[jobType];
  return {
    ...store,
    libraries: {
      ...store.libraries,
      [jobType]: { ...lib, [section]: lib[section].filter((item) => item.id !== cardId) },
    },
  };
}

export function updateSkills(
  store: ResumeStore,
  jobType: JobType,
  skills: Record<string, string[]>
): ResumeStore {
  return {
    ...store,
    libraries: {
      ...store.libraries,
      [jobType]: { ...store.libraries[jobType], skills },
    },
  };
}

export function updateSelfEval(
  store: ResumeStore,
  jobType: JobType,
  selfEval: string
): ResumeStore {
  return {
    ...store,
    libraries: {
      ...store.libraries,
      [jobType]: { ...store.libraries[jobType], selfEval },
    },
  };
}

export function reorderCards(
  store: ResumeStore,
  jobType: JobType,
  section: CardSection,
  fromIndex: number,
  toIndex: number
): ResumeStore {
  const lib = store.libraries[jobType];
  const items = [...lib[section]];
  const [moved] = items.splice(fromIndex, 1);
  items.splice(toIndex, 0, moved);
  return {
    ...store,
    libraries: {
      ...store.libraries,
      [jobType]: { ...lib, [section]: items },
    },
  };
}

export function resetLibrary(store: ResumeStore, jobType: JobType): ResumeStore {
  return {
    ...store,
    libraries: {
      ...store.libraries,
      [jobType]: buildDefaultLibrary(jobType),
    },
  };
}

export function addCustomDirection(store: ResumeStore, direction: string): ResumeStore {
  if (store.customDirections.includes(direction)) return store;
  return {
    ...store,
    customDirections: [...store.customDirections, direction],
    libraries: {
      ...store.libraries,
      [direction]: buildDefaultLibrary(direction),
    },
  };
}

export function removeCustomDirection(store: ResumeStore, direction: string): ResumeStore {
  const { [direction]: _, ...restLibraries } = store.libraries;
  return {
    ...store,
    customDirections: store.customDirections.filter((d) => d !== direction),
    libraries: restLibraries,
  };
}

export function setDirectionLibrary(
  store: ResumeStore,
  direction: string,
  library: Library
): ResumeStore {
  if (!store.libraries[direction] && !store.customDirections.includes(direction)) {
    store = addCustomDirection(store, direction);
  }
  return {
    ...store,
    libraries: { ...store.libraries, [direction]: library },
  };
}

export function importParsedResume(
  store: ResumeStore,
  parsed: {
    personal?: Partial<Personal>;
    education?: { undergrad?: Partial<EducationStage>; master?: Partial<EducationStage> };
    experiences?: CardItem[];
    projects?: CardItem[];
    campus?: CardItem[];
    social?: CardItem[];
    skills?: Record<string, string[]>;
    selfEval?: string;
  },
  customDirections?: string[]
): ResumeStore {
  const next = { ...store };
  // Merge personal
  if (parsed.personal) {
    next.shared = {
      ...next.shared,
      personal: { ...next.shared.personal, ...parsed.personal },
    };
  }
  // Merge education
  if (parsed.education) {
    const existing = next.shared.education;
    next.shared = {
      ...next.shared,
      education: {
        highSchool: existing.highSchool,
        undergrad: parsed.education.undergrad
          ? ({ ...existing.undergrad, ...parsed.education.undergrad } as EducationStage)
          : existing.undergrad,
        master: parsed.education.master
          ? ({ ...existing.master, ...parsed.education.master } as EducationStage)
          : existing.master,
      },
    };
  }
  // Write ALL cards into 综合 library
  const allLib = next.libraries["综合"] || buildDefaultLibrary("综合");
  const merged: Library = {
    experiences: [...allLib.experiences, ...(parsed.experiences || [])],
    projects: [...allLib.projects, ...(parsed.projects || [])],
    campus: [...allLib.campus, ...(parsed.campus || [])],
    social: [...allLib.social, ...(parsed.social || [])],
    skills: { ...allLib.skills, ...(parsed.skills || {}) },
    selfEval: parsed.selfEval || allLib.selfEval,
  };
  next.libraries = { ...next.libraries, ["综合"]: merged };
  // Add custom directions
  if (customDirections) {
    for (const d of customDirections) {
      if (!next.customDirections.includes(d)) {
        next.customDirections = [...next.customDirections, d];
      }
    }
  }
  return next;
}

export function exportLibrary(store: ResumeStore, jobType: JobType) {
  const lib = getLibrary(store, jobType);
  const { shared } = store;

  const sections: string[] = [];
  sections.push(`${shared.personal.name}`);
  sections.push(`${shared.personal.phone} · ${shared.personal.email}`);
  sections.push("");
  sections.push("▎教育经历");
  const { education } = shared;
  if (education.master?.schoolName) {
    sections.push(`${education.master.schoolName}  ${education.master.degree}  ${education.master.period}`);
    if (education.master.notes) sections.push(education.master.notes);
  }
  if (education.undergrad?.schoolName) {
    sections.push(`${education.undergrad.schoolName}  ${education.undergrad.degree}  ${education.undergrad.period}`);
    if (education.undergrad.notes) sections.push(education.undergrad.notes);
  }
  if (education.highSchool?.schoolName) {
    sections.push(`${education.highSchool.schoolName}  高中  —`);
  }
  sections.push("");

  if (lib.experiences.length > 0) {
    sections.push("▎工作/实习经历");
    lib.experiences.forEach((e) => {
      const dept = e.department ? ` · ${e.department}` : "";
      sections.push(`${e.name}${dept}  ${e.role}  ${e.period}`);
      e.bullets.forEach((b) => sections.push(`• ${b.text}`));
      sections.push("");
    });
  }

  if (lib.projects.length > 0) {
    sections.push("▎项目经历");
    lib.projects.forEach((p) => {
      sections.push(`${p.name}  ${p.role}  ${p.period}`);
      p.bullets.forEach((b) => sections.push(`• ${b.text}`));
      sections.push("");
    });
  }

  if (lib.campus.length > 0) {
    sections.push("▎校园经历");
    lib.campus.forEach((c) => {
      sections.push(`${c.name}  ${c.role}  ${c.period}`);
      c.bullets.forEach((b) => sections.push(`• ${b.text}`));
      sections.push("");
    });
  }

  if (lib.social.length > 0) {
    sections.push("▎社会/实践经历");
    lib.social.forEach((s) => {
      sections.push(`${s.name}  ${s.role}  ${s.period}`);
      s.bullets.forEach((b) => sections.push(`• ${b.text}`));
      sections.push("");
    });
  }

  if (lib.selfEval) {
    sections.push("▎自我评价");
    sections.push(lib.selfEval);
    sections.push("");
  }

  sections.push("▎技能");
  Object.entries(lib.skills).forEach(([cat, items]) => {
    sections.push(`${cat}：${items.join("、")}`);
  });

  return sections.join("\n");
}
