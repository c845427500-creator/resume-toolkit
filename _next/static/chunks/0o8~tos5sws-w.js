(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,31177,65711,16,e=>{"use strict";let t=(0,e.i(3983).default)("settings",[["path",{d:"M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915",key:"1i5ecw"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]]);async function a(e,t,r,s=.3,i=4e3){try{let a=await fetch("https://api.deepseek.com/chat/completions",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${e}`},body:JSON.stringify({model:"deepseek-chat",messages:[{role:"system",content:t},{role:"user",content:r}],temperature:s,max_tokens:i,stream:!1})});if(!a.ok)return null;let l=await a.json();return l.choices?.[0]?.message?.content?.trim()||null}catch{return null}}e.s(["Settings",0,t],31177);let r=0;async function s(e,t){let s=`你是一位专业的简历解析专家。用户会给你一份简历文本，你需要将其解析为结构化的 JSON 数据。

要求：
1. 严格保留原文中的所有事实信息（姓名、日期、学校名称、公司名称、数据等），不要编造或修改。
2. 对经历（实习/工作/项目/校园/社会实践）的每一条要点，提取为独立的 bullet，并给每条 bullet 打上标签（2-3个标签，如：金融、AI、分析、运营、产品、技术、设计、管理、内容、数据、用户研究等）。
3. 每段经历整体也打上 2-4 个标签。
4. 技能按类别归类（如：金融工具、办公软件、编程语言、AI工具、语言等）。
5. 直接输出 JSON，不要任何解释或标记。`,i=`请解析以下简历文本，输出结构化 JSON：

${t}

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
}`,l=await a(e,s,i,.1,8e3);if(!l)return null;try{let e,t=JSON.parse(((e=l.trim()).startsWith("```json")&&(e=e.slice(7)),e.startsWith("```")&&(e=e.slice(3)),e.endsWith("```")&&(e=e.slice(0,-3)),e.trim())),a={};for(let e of t.education||[]){let t={schoolName:e.school||"",degree:e.degree||"",college:e.college||"",major:e.major||"",period:e.period||"",notes:e.notes||"",honors:e.honors||"",gpa:e.gpa||"",relevantCourses:e.relevantCourses||""},r=e.degree||"";(r.includes("硕士")||r.includes("研究生"))&&!a.master?a.master=t:(r.includes("本科")||r.includes("学士"))&&!a.undergrad&&(a.undergrad=t)}let s=(e,t)=>(e||[]).map(e=>({id:(r++,`${t}-${Date.now()}-${r}`),name:e.company||e.name||e.org||"",department:e.department||void 0,role:e.role||"",period:e.period||"",tags:e.tags||[],bullets:(e.bullets||[]).map(e=>({text:e.text||"",tags:e.tags||[]}))}));return{personal:{name:t.personal?.name||"",phone:t.personal?.phone||"",email:t.personal?.email||"",gender:t.personal?.gender||"",birthDate:t.personal?.birthDate||"",highestDegree:t.personal?.highestDegree||""},education:a,experiences:s(t.experiences,"exp"),projects:s(t.projects,"proj"),campus:s(t.campus,"campus"),social:s(t.social,"social"),skills:t.skills||{},selfEval:t.selfEval||""}}catch{return null}}async function i(e,t){let r=`你是一位职业规划专家。用户给你一份简历的摘要信息，你需要根据简历中的经历、技能和专业背景，推荐 3-5 个最适合的岗位方向。

要求：
1. 方向名称简洁（2-4个字），如：金融、AI、产品、技术、运营、咨询、市场、数据
2. 方向应与简历中的实际经历强相关，不要推荐不相关的方向
3. 按匹配度从高到低排列
4. 直接输出方向列表，每行一个方向，以 - 开头，不要任何解释`,s=`简历摘要：
${t}

请推荐 3-5 个岗位方向：`,i=await a(e,r,s,.3,500);return i?i.split("\n").map(e=>e.trim()).filter(e=>e.startsWith("-")||e.startsWith("•")).map(e=>e.replace(/^[-•]\s*/,"").trim()).filter(Boolean):null}async function l(e,t,r){if(0===r.length)return[];let s=r.map((e,t)=>`[${t}] ${e.name} \xb7 ${e.role} (${e.period})
${e.bullets.map(e=>`  - ${e.text}`).join("\n")}`).join("\n\n"),i=`你是一位简历筛选专家。用户选择一个岗位方向，你需要从所有经历卡片中筛选出与该方向相关的卡片。

要求：
1. 仔细分析方向"${t}"的含义和所需能力
2. 逐一审查每张卡片的经历内容，判断是否与该方向相关
3. 只要卡片内容与方向有一定关联（技能、行业、工作性质等），就应纳入
4. 直接输出匹配的卡片序号列表，如：[0, 2, 5, 7]
5. 不要输出任何解释`,l=`方向：${t}

所有经历卡片：
${s}

请输出与该方向匹配的卡片序号列表（JSON数组格式）：`,n=await a(e,i,l,.2,1e3);if(!n)return r.map((e,t)=>t);try{let e=n.match(/\[[\d,\s]+\]/);if(e)return JSON.parse(e[0]).filter(e=>e>=0&&e<r.length)}catch{}return r.map((e,t)=>t)}e.s(["matchCardsByDirection",0,l,"parseResume",0,s,"recommendDirections",0,i],65711);let n=["综合","产品","AI","技术","金融"];n.map(e=>({key:e,label:e}));let c="resume_library_v2",o={name:"",phone:"",email:"",idType:"身份证",gender:"",birthDate:"",highestDegree:"",idNumber:"",ethnicity:"",nativePlace:"",hukouLocation:"",hukouAddress:"",currentAddress:"",politicalStatus:"",maritalStatus:"",height:"",weight:"",emergencyContact:"",emergencyRelation:"",emergencyPhone:"",healthStatus:"",photo:""};function d(e){return{experiences:[],projects:[],campus:[],social:[],skills:{},selfEval:""}}function u(e,t){return e.customDirections.includes(t)?e:{...e,customDirections:[...e.customDirections,t],libraries:{...e.libraries,[t]:d(t)}}}e.s(["DEFAULT_JOB_TYPES",0,n,"addCustomDirection",0,u,"deleteCard",0,function(e,t,a,r){let s=e.libraries[t];return{...e,libraries:{...e.libraries,[t]:{...s,[a]:s[a].filter(e=>e.id!==r)}}}},"getLibrary",0,function(e,t){return e.libraries[t]||d(t)},"importParsedResume",0,function(e,t,a){let r={...e};if(t.personal&&(r.shared={...r.shared,personal:{...r.shared.personal,...t.personal}}),t.education){let e=r.shared.education;r.shared={...r.shared,education:{highSchool:e.highSchool,undergrad:t.education.undergrad?{...e.undergrad,...t.education.undergrad}:e.undergrad,master:t.education.master?{...e.master,...t.education.master}:e.master}}}let s=r.libraries["综合"]||d("综合"),i={experiences:[...s.experiences,...t.experiences||[]],projects:[...s.projects,...t.projects||[]],campus:[...s.campus,...t.campus||[]],social:[...s.social,...t.social||[]],skills:{...s.skills,...t.skills||{}},selfEval:t.selfEval||s.selfEval};if(r.libraries={...r.libraries,综合:i},a)for(let e of a)r.customDirections.includes(e)||(r.customDirections=[...r.customDirections,e]);return r},"initStore",0,function(){try{let e=localStorage.getItem(c);if(e){let t=JSON.parse(e);if(t?.version===6&&t?.shared&&t?.libraries){for(let e of(t.shared.customFields||(t.shared.customFields={}),n))t.libraries[e]||(t.libraries[e]=d(e));return t}}}catch{}let e={};for(let t of n)e[t]=d(t);return{version:6,shared:{personal:{...o},education:{},family:[],customFields:{}},libraries:e,customDirections:[]}},"removeCustomDirection",0,function(e,t){let{[t]:a,...r}=e.libraries;return{...e,customDirections:e.customDirections.filter(e=>e!==t),libraries:r}},"reorderCards",0,function(e,t,a,r,s){let i=e.libraries[t],l=[...i[a]],[n]=l.splice(r,1);return l.splice(s,0,n),{...e,libraries:{...e.libraries,[t]:{...i,[a]:l}}}},"resetLibrary",0,function(e,t){return{...e,libraries:{...e.libraries,[t]:d(t)}}},"saveStore",0,function(e){try{localStorage.setItem(c,JSON.stringify(e))}catch{}},"setDirectionLibrary",0,function(e,t,a){return e.libraries[t]||e.customDirections.includes(t)||(e=u(e,t)),{...e,libraries:{...e.libraries,[t]:a}}},"undoAiPolish",0,function(e,t,a,r,s){let i=e.libraries[t],l=i[a],n=l.findIndex(e=>e.id===r);if(-1===n)return e;let c=l[n],o=c.bullets[s];if(!o?.originalText)return e;let d=[...c.bullets];d[s]={text:o.originalText,tags:o.tags};let u=[...l];return u[n]={...c,bullets:d},{...e,libraries:{...e.libraries,[t]:{...i,[a]:u}}}},"updateCard",0,function(e,t,a,r,s){let i=e.libraries[t],l=i[a],n=l.findIndex(e=>e.id===r);if(-1===n)return e;let c=[...l];return c[n]={...c[n],...s},{...e,libraries:{...e.libraries,[t]:{...i,[a]:c}}}},"updateCustomFields",0,function(e,t,a){return{...e,shared:{...e.shared,customFields:{...e.shared.customFields,[t]:a}}}},"updateEducation",0,function(e,t){return{...e,shared:{...e.shared,education:t}}},"updateFamily",0,function(e,t){return{...e,shared:{...e.shared,family:t}}},"updatePersonal",0,function(e,t){return{...e,shared:{...e.shared,personal:t}}},"updateSelfEval",0,function(e,t,a){return{...e,libraries:{...e.libraries,[t]:{...e.libraries[t],selfEval:a}}}},"updateSkills",0,function(e,t,a){return{...e,libraries:{...e.libraries,[t]:{...e.libraries[t],skills:a}}}}],16)},58497,(e,t,a)=>{t.exports=e.r(67976)},51134,e=>{"use strict";var t=e.i(32640),a=e.i(42220),r=e.i(10657),s=e.i(3983);let i=(0,s.default)("arrow-right",[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"m12 5 7 7-7 7",key:"xquz4c"}]]);var l=e.i(10471);let n=(0,s.default)("upload",[["path",{d:"M12 3v12",key:"1x0j5s"}],["path",{d:"m17 8-5-5-5 5",key:"7q97r8"}],["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",key:"ih7n3h"}]]);var c=e.i(48864),o=e.i(31177),d=e.i(58497),u=e.i(4336),m=e.i(65711),p=e.i(16);e.s(["default",0,function(){let s=(0,d.useRouter)(),[x,h]=(0,a.useState)(""),[f,g]=(0,a.useState)(""),[b,y]=(0,a.useState)(!1),[j,k]=(0,a.useState)(""),[v,N]=(0,a.useState)(""),[w,S]=(0,a.useState)(!1),[C,D]=(0,a.useState)(!1),[$,A]=(0,a.useState)(!1),[P,I]=(0,a.useState)(""),[E,O]=(0,a.useState)(null),T=(0,a.useRef)(null);(0,a.useEffect)(()=>{h(localStorage.getItem("resume_nickname")||""),N(localStorage.getItem("ds_api_key")||"")},[]);let _=e=>{h(e),localStorage.setItem("resume_nickname",e),y(!1)},F=e=>{N(e),e?localStorage.setItem("ds_api_key",e):localStorage.removeItem("ds_api_key"),S(!1)},B=async t=>{try{if(t.name.endsWith(".docx")){let a=(await e.A(58545)).default;return(await a.extractRawText({arrayBuffer:await t.arrayBuffer()})).value}if(!t.name.endsWith(".pdf"))return await t.text();{let a=await e.A(76762);a.GlobalWorkerOptions.workerSrc="https://unpkg.com/pdfjs-dist@5.7.284/build/pdf.worker.min.mjs";let r=new Uint8Array(await t.arrayBuffer()),s=await a.getDocument({data:r}).promise,i="";for(let e=1;e<=s.numPages;e++){let t=await s.getPage(e),a=await t.getTextContent();i+=a.items.map(e=>e.str).join(" ")+"\n"}return i}}catch(t){let e=t instanceof Error?t.message:String(t);return I(`文件解析失败（${e}），请尝试粘贴文本`),null}},z=async e=>{let t=e.target.files?.[0];if(!t)return;if(!v)return void S(!0);D(!0),I("");let a=await B(t);null===a?D(!1):(k(a),await J(a))},J=async e=>{if(!v)return void S(!0);if(!e.trim())return void I("请先粘贴或上传简历");D(!0),I("");try{let t=await (0,m.parseResume)(v,e);if(!t){I("AI 解析失败，请检查 API Key 或重试"),D(!1);return}let a=[t.personal.name,t.education.undergrad?`${t.education.undergrad.schoolName} ${t.education.undergrad.major}`:"",t.education.master?`${t.education.master.schoolName} ${t.education.master.major}`:"",`实习经历: ${t.experiences.length} 段`,`项目经历: ${t.projects.length} 个`,`技能: ${Object.keys(t.skills).join("、")}`].filter(Boolean).join("\n"),r=await (0,m.recommendDirections)(v,a),s=(0,p.initStore)();if(s=(0,p.importParsedResume)(s,t),r&&r.length>0){let e=[...t.experiences,...t.projects,...t.campus,...t.social],a=new Set(t.experiences.map(e=>e.id)),i=new Set(t.projects.map(e=>e.id)),l=new Set(t.campus.map(e=>e.id)),n=new Set(t.social.map(e=>e.id));for(let c of r){let r=c.trim();if(!r)continue;let o=(await (0,m.matchCardsByDirection)(v,r,e)).map(t=>e[t]).filter(Boolean),d={experiences:o.filter(e=>a.has(e.id)),projects:o.filter(e=>i.has(e.id)),campus:o.filter(e=>l.has(e.id)),social:o.filter(e=>n.has(e.id)),skills:t.skills,selfEval:t.selfEval};s=(0,p.importParsedResume)(s,{},[r]),s=(0,p.setDirectionLibrary)(s,r,d)}}(0,p.saveStore)(s),O({name:t.personal.name||"未识别",eduCount:+!!t.education.undergrad+ +!!t.education.master,expCount:t.experiences.length,projCount:t.projects.length,skillCats:Object.keys(t.skills).length}),A(!0)}catch{I("解析过程出错，请重试")}finally{D(!1)}};return(0,t.jsxs)("div",{className:"min-h-screen bg-claude-canvas flex flex-col",children:[(0,t.jsx)("header",{className:"sticky top-0 z-20 bg-claude-canvas/80 backdrop-blur-sm border-b border-claude-hairline",children:(0,t.jsxs)("div",{className:"max-w-[720px] mx-auto px-6 h-14 flex items-center justify-between",children:[(0,t.jsx)("span",{className:"text-[14px] font-medium text-claude-ink tracking-tight",style:{fontFamily:"'Cormorant Garamond', serif"},children:"简历库"}),(0,t.jsx)("button",{onClick:()=>S(!0),className:"w-7 h-7 rounded-md hover:bg-claude-surface-card flex items-center justify-center transition-colors",children:(0,t.jsx)(o.Settings,{size:14,className:"text-claude-muted"})})]})}),(0,t.jsx)("main",{className:"flex-1 flex items-center justify-center px-6 py-12",children:(0,t.jsxs)("div",{className:"w-full max-w-[600px] space-y-10",children:[(0,t.jsxs)("div",{className:"text-center space-y-3",children:[(0,t.jsxs)("h1",{className:"text-[40px] leading-[1.15] text-claude-ink",style:{fontFamily:"'Cormorant Garamond', serif",fontWeight:400,letterSpacing:"-0.5px"},children:[x&&!b?`${x}的`:"","简历库"]}),x&&!b?(0,t.jsxs)("p",{className:"text-[14px] text-claude-muted",children:["你好，",x,(0,t.jsx)("button",{onClick:()=>{g(x),y(!0)},className:"ml-2 text-claude-muted-soft hover:text-claude-ink underline underline-offset-2 transition-colors",children:"修改昵称"})]}):(0,t.jsxs)("div",{className:"flex items-center justify-center gap-2",children:[(0,t.jsx)("input",{value:f,onChange:e=>g(e.target.value),placeholder:"设置你的昵称",className:"text-[14px] text-claude-ink bg-claude-surface-card border border-claude-hairline rounded-[8px] px-3 py-2 w-[200px] placeholder-claude-muted-soft focus:border-claude-primary focus:outline-none transition-colors text-center",onKeyDown:e=>{"Enter"===e.key&&_(f)},autoFocus:!0}),(0,t.jsx)("button",{onClick:()=>_(f),disabled:!f.trim(),className:"text-[13px] font-medium px-4 py-2 rounded-[8px] bg-claude-primary text-claude-on-primary hover:bg-claude-primary-active disabled:opacity-40 transition-colors",children:"确认"})]})]}),(0,t.jsxs)("div",{className:"bg-claude-surface-card rounded-[16px] border border-claude-hairline p-6 space-y-4",children:[(0,t.jsxs)("div",{className:"flex items-center justify-between",children:[(0,t.jsx)("h2",{className:"text-[16px] font-medium text-claude-ink",children:"导入简历"}),$&&(0,t.jsx)("button",{onClick:()=>{k(""),A(!1),O(null),I("")},className:"text-[12px] text-claude-muted hover:text-red-500 transition-colors",children:"一键清空"})]}),(0,t.jsx)("input",{ref:T,type:"file",accept:".docx,.pdf,.txt",onChange:z,className:"hidden"}),(0,t.jsx)("button",{onClick:()=>T.current?.click(),disabled:C,className:"w-full flex items-center justify-center gap-2 py-2.5 text-[14px] font-medium rounded-[10px] bg-claude-primary text-claude-on-primary hover:bg-claude-primary-active disabled:opacity-50 disabled:cursor-not-allowed transition-colors",children:C?(0,t.jsxs)(t.Fragment,{children:[(0,t.jsx)(l.Loader2,{size:16,className:"animate-spin"}),"AI 解析中…"]}):(0,t.jsxs)(t.Fragment,{children:[(0,t.jsx)(n,{size:16}),"上传简历 .docx / .pdf"]})}),(0,t.jsx)("p",{className:"text-center text-[12px] text-claude-muted-soft",children:"上传后 AI 自动解析为结构化简历"}),P&&(0,t.jsx)("p",{className:"text-[13px] text-red-500",children:P})]}),$&&E&&(0,t.jsxs)(r.motion.div,{initial:{opacity:0,y:12},animate:{opacity:1,y:0},className:"bg-claude-surface-card rounded-[16px] border border-claude-hairline p-6 space-y-4",children:[(0,t.jsxs)("div",{className:"flex items-center gap-2",children:[(0,t.jsx)(c.Check,{size:16,className:"text-green-600"}),(0,t.jsx)("h2",{className:"text-[16px] font-medium text-claude-ink",children:"解析完成"})]}),(0,t.jsxs)("div",{className:"grid grid-cols-2 gap-3 text-[14px]",children:[(0,t.jsxs)("div",{className:"bg-claude-canvas rounded-[8px] px-3 py-2",children:[(0,t.jsx)("span",{className:"text-claude-muted-soft",children:"姓名"}),(0,t.jsx)("p",{className:"text-claude-ink font-medium",children:E.name})]}),(0,t.jsxs)("div",{className:"bg-claude-canvas rounded-[8px] px-3 py-2",children:[(0,t.jsx)("span",{className:"text-claude-muted-soft",children:"教育"}),(0,t.jsxs)("p",{className:"text-claude-ink font-medium",children:[E.eduCount," 段"]})]}),(0,t.jsxs)("div",{className:"bg-claude-canvas rounded-[8px] px-3 py-2",children:[(0,t.jsx)("span",{className:"text-claude-muted-soft",children:"实习/工作"}),(0,t.jsxs)("p",{className:"text-claude-ink font-medium",children:[E.expCount," 段"]})]}),(0,t.jsxs)("div",{className:"bg-claude-canvas rounded-[8px] px-3 py-2",children:[(0,t.jsx)("span",{className:"text-claude-muted-soft",children:"项目"}),(0,t.jsxs)("p",{className:"text-claude-ink font-medium",children:[E.projCount," 个"]})]})]}),(0,t.jsxs)("button",{onClick:()=>{s.push("/library")},className:"w-full flex items-center justify-center gap-2 py-2.5 text-[14px] font-medium rounded-[10px] bg-claude-ink text-claude-on-dark hover:bg-claude-surface-dark-elevated transition-colors",children:["进入简历库 ",(0,t.jsx)(i,{size:16})]}),(0,t.jsx)("p",{className:"text-center text-[12px] text-claude-muted-soft",children:"AI 已为你推荐匹配的岗位方向，点击上方进入查看"})]})]})}),(0,t.jsx)("nav",{className:"fixed bottom-0 left-0 right-0 z-30 bg-claude-surface-dark",children:(0,t.jsxs)("div",{className:"w-full max-w-screen-lg mx-auto flex items-center px-6 h-12",children:[(0,t.jsx)("span",{className:"flex-1 flex items-center justify-center gap-1.5 py-2",children:(0,t.jsx)("span",{className:"text-[13px] font-medium text-claude-on-dark",children:"首页"})}),(0,t.jsx)(u.default,{href:"/library",className:"flex-1 flex items-center justify-center gap-1.5 py-2 text-claude-on-dark-soft hover:text-claude-on-dark transition-colors",children:(0,t.jsx)("span",{className:"text-[13px]",children:"简历库"})})]})}),w&&(0,t.jsx)("div",{className:"fixed inset-0 z-50 flex items-center justify-center bg-[#272728]/20 p-5",onClick:()=>S(!1),children:(0,t.jsxs)(r.motion.div,{initial:{opacity:0,scale:.97},animate:{opacity:1,scale:1},className:"bg-claude-surface-card rounded-[16px] border border-claude-hairline p-6 w-full max-w-[380px] shadow-xl space-y-4",onClick:e=>e.stopPropagation(),children:[(0,t.jsx)("h2",{className:"text-[16px] font-medium text-claude-ink",children:"DeepSeek API Key"}),(0,t.jsxs)("p",{className:"text-[13px] text-claude-muted",children:["Key only stored in browser.  ",(0,t.jsx)("a",{href:"https://platform.deepseek.com/api_keys",target:"_blank",className:"text-claude-primary underline",children:"get key →"})]}),(0,t.jsx)("input",{type:"password",value:v,onChange:e=>N(e.target.value),placeholder:"sk-...",className:"w-full text-[14px] text-claude-ink bg-claude-canvas rounded-[8px] px-3 py-2.5 border border-claude-hairline focus:border-claude-primary focus:outline-none",autoFocus:!0}),(0,t.jsxs)("div",{className:"flex gap-2",children:[(0,t.jsx)("button",{onClick:()=>F(""),className:"flex-1 py-2.5 text-[13px] text-claude-muted rounded-[8px] hover:bg-claude-surface transition-colors",children:"清除"}),(0,t.jsx)("button",{onClick:()=>F(v),className:"flex-1 py-2.5 bg-claude-primary text-claude-on-primary text-[13px] font-medium rounded-[8px] hover:bg-claude-primary-active transition-colors",children:"保存"})]})]})})]})}],51134)},76762,e=>{e.v(t=>Promise.all(["static/chunks/0wo2qnq62x22g.js","static/chunks/0-pujyb65tlto.js"].map(t=>e.l(t))).then(()=>t(71890)))},58545,e=>{e.v(t=>Promise.all(["static/chunks/0wo2qnq62x22g.js","static/chunks/0vw-kgub9g5eh.js"].map(t=>e.l(t))).then(()=>t(65918)))}]);