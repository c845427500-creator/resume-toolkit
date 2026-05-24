(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,31177,65711,16,e=>{"use strict";let t=(0,e.i(3983).default)("settings",[["path",{d:"M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915",key:"1i5ecw"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]]);async function r(e,t,i,s=.3,n=4e3){try{let r=await fetch("https://api.deepseek.com/chat/completions",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${e}`},body:JSON.stringify({model:"deepseek-chat",messages:[{role:"system",content:t},{role:"user",content:i}],temperature:s,max_tokens:n,stream:!1})});if(!r.ok)return null;let l=await r.json();return l.choices?.[0]?.message?.content?.trim()||null}catch{return null}}e.s(["Settings",0,t],31177);let i=0;async function s(e,t){let s=`你是一位专业的简历解析专家。用户会给你一份简历文本，你需要将其解析为结构化的 JSON 数据。

要求：
1. 严格保留原文中的所有事实信息（姓名、日期、学校名称、公司名称、数据等），不要编造或修改。
2. 对经历（实习/工作/项目/校园/社会实践）的每一条要点，提取为独立的 bullet，并给每条 bullet 打上标签（2-3个标签，如：金融、AI、分析、运营、产品、技术、设计、管理、内容、数据、用户研究等）。
3. 每段经历整体也打上 2-4 个标签。
4. 技能按类别归类（如：金融工具、办公软件、编程语言、AI工具、语言等）。
5. 直接输出 JSON，不要任何解释或标记。`,n=`请解析以下简历文本，输出结构化 JSON：

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
}`,l=await r(e,s,n,.1,8e3);if(!l)return null;try{let e,t=JSON.parse(((e=l.trim()).startsWith("```json")&&(e=e.slice(7)),e.startsWith("```")&&(e=e.slice(3)),e.endsWith("```")&&(e=e.slice(0,-3)),e.trim())),r={};for(let e of t.education||[]){let t={schoolName:e.school||"",degree:e.degree||"",college:e.college||"",major:e.major||"",period:e.period||"",notes:e.notes||"",honors:e.honors||"",gpa:e.gpa||"",relevantCourses:e.relevantCourses||""},i=e.degree||"";(i.includes("硕士")||i.includes("研究生"))&&!r.master?r.master=t:(i.includes("本科")||i.includes("学士"))&&!r.undergrad&&(r.undergrad=t)}let s=(e,t)=>(e||[]).map(e=>({id:(i++,`${t}-${Date.now()}-${i}`),name:e.company||e.name||e.org||"",department:e.department||void 0,role:e.role||"",period:e.period||"",tags:e.tags||[],bullets:(e.bullets||[]).map(e=>({text:e.text||"",tags:e.tags||[]}))}));return{personal:{name:t.personal?.name||"",phone:t.personal?.phone||"",email:t.personal?.email||"",gender:t.personal?.gender||"",birthDate:t.personal?.birthDate||"",highestDegree:t.personal?.highestDegree||""},education:r,experiences:s(t.experiences,"exp"),projects:s(t.projects,"proj"),campus:s(t.campus,"campus"),social:s(t.social,"social"),skills:t.skills||{},selfEval:t.selfEval||""}}catch{return null}}async function n(e,t){let i=`你是一位职业规划专家。用户给你一份简历的摘要信息，你需要根据简历中的经历、技能和专业背景，推荐 3-5 个最适合的岗位方向。

要求：
1. 方向名称简洁（2-4个字），如：金融、AI、产品、技术、运营、咨询、市场、数据
2. 方向应与简历中的实际经历强相关，不要推荐不相关的方向
3. 按匹配度从高到低排列
4. 直接输出方向列表，每行一个方向，以 - 开头，不要任何解释`,s=`简历摘要：
${t}

请推荐 3-5 个岗位方向：`,n=await r(e,i,s,.3,500);return n?n.split("\n").map(e=>e.trim()).filter(e=>e.startsWith("-")||e.startsWith("•")).map(e=>e.replace(/^[-•]\s*/,"").trim()).filter(Boolean):null}async function l(e,t,i){if(0===i.length)return[];let s=i.map((e,t)=>`[${t}] ${e.name} \xb7 ${e.role} (${e.period})
${e.bullets.map(e=>`  - ${e.text}`).join("\n")}`).join("\n\n"),n=`你是一位简历筛选专家。用户选择一个岗位方向，你需要从所有经历卡片中筛选出与该方向相关的卡片。

要求：
1. 仔细分析方向"${t}"的含义和所需能力
2. 逐一审查每张卡片的经历内容，判断是否与该方向相关
3. 只要卡片内容与方向有一定关联（技能、行业、工作性质等），就应纳入
4. 直接输出匹配的卡片序号列表，如：[0, 2, 5, 7]
5. 不要输出任何解释`,l=`方向：${t}

所有经历卡片：
${s}

请输出与该方向匹配的卡片序号列表（JSON数组格式）：`,o=await r(e,n,l,.2,1e3);if(!o)return i.map((e,t)=>t);try{let e=o.match(/\[[\d,\s]+\]/);if(e)return JSON.parse(e[0]).filter(e=>e>=0&&e<i.length)}catch{}return i.map((e,t)=>t)}e.s(["matchCardsByDirection",0,l,"parseResume",0,s,"recommendDirections",0,n],65711);let o=["综合","产品","AI","技术","金融"];o.map(e=>({key:e,label:e}));let a="resume_library_v2",u={name:"",phone:"",email:"",idType:"身份证",gender:"",birthDate:"",highestDegree:"",idNumber:"",ethnicity:"",nativePlace:"",hukouLocation:"",hukouAddress:"",currentAddress:"",politicalStatus:"",maritalStatus:"",height:"",weight:"",emergencyContact:"",emergencyRelation:"",emergencyPhone:"",healthStatus:"",photo:""};function c(e){return{experiences:[],projects:[],campus:[],social:[],skills:{},selfEval:""}}function d(e,t){return e.customDirections.includes(t)?e:{...e,customDirections:[...e.customDirections,t],libraries:{...e.libraries,[t]:c(t)}}}e.s(["DEFAULT_JOB_TYPES",0,o,"addCustomDirection",0,d,"deleteCard",0,function(e,t,r,i){let s=e.libraries[t];return{...e,libraries:{...e.libraries,[t]:{...s,[r]:s[r].filter(e=>e.id!==i)}}}},"getLibrary",0,function(e,t){return e.libraries[t]||c(t)},"importParsedResume",0,function(e,t,r){let i={...e};if(t.personal&&(i.shared={...i.shared,personal:{...i.shared.personal,...t.personal}}),t.education){let e=i.shared.education;i.shared={...i.shared,education:{highSchool:e.highSchool,undergrad:t.education.undergrad?{...e.undergrad,...t.education.undergrad}:e.undergrad,master:t.education.master?{...e.master,...t.education.master}:e.master}}}let s=i.libraries["综合"]||c("综合"),n={experiences:[...s.experiences,...t.experiences||[]],projects:[...s.projects,...t.projects||[]],campus:[...s.campus,...t.campus||[]],social:[...s.social,...t.social||[]],skills:{...s.skills,...t.skills||{}},selfEval:t.selfEval||s.selfEval};if(i.libraries={...i.libraries,综合:n},r)for(let e of r)i.customDirections.includes(e)||(i.customDirections=[...i.customDirections,e]);return i},"initStore",0,function(){try{let e=localStorage.getItem(a);if(e){let t=JSON.parse(e);if(t?.version===6&&t?.shared&&t?.libraries){for(let e of(t.shared.customFields||(t.shared.customFields={}),o))t.libraries[e]||(t.libraries[e]=c(e));return t}}}catch{}let e={};for(let t of o)e[t]=c(t);return{version:6,shared:{personal:{...u},education:{},family:[],customFields:{}},libraries:e,customDirections:[]}},"removeCustomDirection",0,function(e,t){let{[t]:r,...i}=e.libraries;return{...e,customDirections:e.customDirections.filter(e=>e!==t),libraries:i}},"reorderCards",0,function(e,t,r,i,s){let n=e.libraries[t],l=[...n[r]],[o]=l.splice(i,1);return l.splice(s,0,o),{...e,libraries:{...e.libraries,[t]:{...n,[r]:l}}}},"resetLibrary",0,function(e,t){return{...e,libraries:{...e.libraries,[t]:c(t)}}},"saveStore",0,function(e){try{localStorage.setItem(a,JSON.stringify(e))}catch{}},"setDirectionLibrary",0,function(e,t,r){return e.libraries[t]||e.customDirections.includes(t)||(e=d(e,t)),{...e,libraries:{...e.libraries,[t]:r}}},"undoAiPolish",0,function(e,t,r,i,s){let n=e.libraries[t],l=n[r],o=l.findIndex(e=>e.id===i);if(-1===o)return e;let a=l[o],u=a.bullets[s];if(!u?.originalText)return e;let c=[...a.bullets];c[s]={text:u.originalText,tags:u.tags};let d=[...l];return d[o]={...a,bullets:c},{...e,libraries:{...e.libraries,[t]:{...n,[r]:d}}}},"updateCard",0,function(e,t,r,i,s){let n=e.libraries[t],l=n[r],o=l.findIndex(e=>e.id===i);if(-1===o)return e;let a=[...l];return a[o]={...a[o],...s},{...e,libraries:{...e.libraries,[t]:{...n,[r]:a}}}},"updateCustomFields",0,function(e,t,r){return{...e,shared:{...e.shared,customFields:{...e.shared.customFields,[t]:r}}}},"updateEducation",0,function(e,t){return{...e,shared:{...e.shared,education:t}}},"updateFamily",0,function(e,t){return{...e,shared:{...e.shared,family:t}}},"updatePersonal",0,function(e,t){return{...e,shared:{...e.shared,personal:t}}},"updateSelfEval",0,function(e,t,r){return{...e,libraries:{...e.libraries,[t]:{...e.libraries[t],selfEval:r}}}},"updateSkills",0,function(e,t,r){return{...e,libraries:{...e.libraries,[t]:{...e.libraries[t],skills:r}}}}],16)},23921,e=>{"use strict";let t=(0,e.i(3983).default)("copy",[["rect",{width:"14",height:"14",x:"8",y:"8",rx:"2",ry:"2",key:"17jyea"}],["path",{d:"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2",key:"zix9uf"}]]);e.s(["Copy",0,t],23921)},61697,e=>{"use strict";let t=(0,e.i(3983).default)("sparkles",[["path",{d:"M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z",key:"1s2grr"}],["path",{d:"M20 2v4",key:"1rf3ol"}],["path",{d:"M22 4h-4",key:"gwowj6"}],["circle",{cx:"4",cy:"20",r:"2",key:"6kqj1y"}]]);e.s(["Sparkles",0,t],61697)},89319,e=>{"use strict";let t=(0,e.i(3983).default)("rotate-ccw",[["path",{d:"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8",key:"1357e3"}],["path",{d:"M3 3v5h5",key:"1xhq8a"}]]);e.s(["RotateCcw",0,t],89319)},41478,e=>{"use strict";e.i(56428);var t=e.i(32640),r=e.i(42220),i=e.i(91137),s=e.i(63081),n=e.i(81098),l=e.i(22495),o=e.i(23169),a=r,u=e.i(31371);function c(e,t){if("function"==typeof e)return e(t);null!=e&&(e.current=t)}class d extends a.Component{getSnapshotBeforeUpdate(e){let t=this.props.childRef.current;if((0,o.isHTMLElement)(t)&&e.isPresent&&!this.props.isPresent&&!1!==this.props.pop){let e=t.offsetParent,r=(0,o.isHTMLElement)(e)&&e.offsetWidth||0,i=(0,o.isHTMLElement)(e)&&e.offsetHeight||0,s=getComputedStyle(t),n=this.props.sizeRef.current;n.height=parseFloat(s.height),n.width=parseFloat(s.width),n.top=t.offsetTop,n.left=t.offsetLeft,n.right=r-n.width-n.left,n.bottom=i-n.height-n.top,n.direction=s.direction}return null}componentDidUpdate(){}render(){return this.props.children}}function p({children:e,isPresent:i,anchorX:s,anchorY:n,root:l,pop:o}){let h=(0,a.useId)(),m=(0,a.useRef)(null),f=(0,a.useRef)({width:0,height:0,top:0,left:0,right:0,bottom:0,direction:"ltr"}),{nonce:g}=(0,a.useContext)(u.MotionConfigContext),y=function(...e){return r.useCallback(function(...e){return t=>{let r=!1,i=e.map(e=>{let i=c(e,t);return r||"function"!=typeof i||(r=!0),i});if(r)return()=>{for(let t=0;t<i.length;t++){let r=i[t];"function"==typeof r?r():c(e[t],null)}}}}(...e),e)}(m,e.props?.ref??e?.ref);return(0,a.useInsertionEffect)(()=>{let{width:e,height:t,top:r,left:a,right:u,bottom:c,direction:d}=f.current;if(i||!1===o||!m.current||!e||!t)return;let p="rtl"===d,y="left"===s?p?`right: ${u}`:`left: ${a}`:p?`left: ${a}`:`right: ${u}`,b="bottom"===n?`bottom: ${c}`:`top: ${r}`;m.current.dataset.motionPopId=h;let x=document.createElement("style");g&&(x.nonce=g);let S=l??document.head;return S.appendChild(x),x.sheet&&x.sheet.insertRule(`
          [data-motion-pop-id="${h}"] {
            position: absolute !important;
            width: ${e}px !important;
            height: ${t}px !important;
            ${y}px !important;
            ${b}px !important;
          }
        `),()=>{m.current?.removeAttribute("data-motion-pop-id"),S.contains(x)&&S.removeChild(x)}},[i]),(0,t.jsx)(d,{isPresent:i,childRef:m,sizeRef:f,pop:o,children:!1===o?e:a.cloneElement(e,{ref:y})})}let h=({children:e,initial:i,isPresent:n,onExitComplete:o,custom:a,presenceAffectsLayout:u,mode:c,anchorX:d,anchorY:h,root:f})=>{let g=(0,s.useConstant)(m),y=(0,r.useId)(),b=!0,x=(0,r.useMemo)(()=>(b=!1,{id:y,initial:i,isPresent:n,custom:a,onExitComplete:e=>{for(let t of(g.set(e,!0),g.values()))if(!t)return;o&&o()},register:e=>(g.set(e,!1),()=>g.delete(e))}),[n,g,o]);return u&&b&&(x={...x}),(0,r.useMemo)(()=>{g.forEach((e,t)=>g.set(t,!1))},[n]),r.useEffect(()=>{n||g.size||!o||o()},[n]),e=(0,t.jsx)(p,{pop:"popLayout"===c,isPresent:n,anchorX:d,anchorY:h,root:f,children:e}),(0,t.jsx)(l.PresenceContext.Provider,{value:x,children:e})};function m(){return new Map}var f=e.i(99726);let g=e=>e.key||"";function y(e){let t=[];return r.Children.forEach(e,e=>{(0,r.isValidElement)(e)&&t.push(e)}),t}e.s(["AnimatePresence",0,({children:e,custom:l,initial:o=!0,onExitComplete:a,presenceAffectsLayout:u=!0,mode:c="sync",propagate:d=!1,anchorX:p="left",anchorY:m="top",root:b})=>{let[x,S]=(0,f.usePresence)(d),k=(0,r.useMemo)(()=>y(e),[e]),v=d&&!x?[]:k.map(g),C=(0,r.useRef)(!0),$=(0,r.useRef)(k),j=(0,s.useConstant)(()=>new Map),w=(0,r.useRef)(new Set),[P,E]=(0,r.useState)(k),[A,D]=(0,r.useState)(k);(0,n.useIsomorphicLayoutEffect)(()=>{C.current=!1,$.current=k;for(let e=0;e<A.length;e++){let t=g(A[e]);v.includes(t)?(j.delete(t),w.current.delete(t)):!0!==j.get(t)&&j.set(t,!1)}},[A,v.length,v.join("-")]);let T=[];if(k!==P){let e=[...k];for(let t=0;t<A.length;t++){let r=A[t],i=g(r);v.includes(i)||(e.splice(t,0,r),T.push(r))}return"wait"===c&&T.length&&(e=T),D(y(e)),E(k),null}let{forceRender:O}=(0,r.useContext)(i.LayoutGroupContext);return(0,t.jsx)(t.Fragment,{children:A.map(e=>{let r=g(e),i=(!d||!!x)&&(k===A||v.includes(r));return(0,t.jsx)(h,{isPresent:i,initial:(!C.current||!!o)&&void 0,custom:l,presenceAffectsLayout:u,mode:c,root:b,onExitComplete:i?void 0:()=>{if(w.current.has(r)||!j.has(r))return;w.current.add(r),j.set(r,!0);let e=!0;j.forEach(t=>{t||(e=!1)}),e&&(O?.(),D($.current),d&&S?.(),a&&a())},anchorX:p,anchorY:m,children:e},r)})})}],41478)},53813,72100,2900,e=>{"use strict";var t=e.i(3983);let r=(0,t.default)("chevron-right",[["path",{d:"m9 18 6-6-6-6",key:"mthhwq"}]]);e.s(["ChevronRight",0,r],53813);let i=(0,t.default)("chevron-left",[["path",{d:"m15 18-6-6 6-6",key:"1wnfg3"}]]);function s(e){return{systemPrompt:`你是简历优化专家，精通 STAR 方法论（Situation-Task-Action-Result）和 X-Y-Z 公式（"Achieved [X] as measured by [Y] by doing [Z]"）。

## 核心原则
- 每条要点必须有至少一个量化指标。找不到精确数字时，用保守估计（~、+、范围）、频次推算、前后对比来表达
- 用强力动词开头（主导/搭建/设计/推动/优化/重构/驱动），避免"负责""参与""协助"等弱动词
- 每条要点展示的是成就（achievement），不是职责（duty）
- 保持 30-60 字，中文

## 量化策略
当原文缺少数字时，从以下角度挖掘：
- 规模：团队人数、用户量、数据量、预算金额
- 变化：before → after 对比（"从 X 提升到 Y"）
- 频次：每天/每周/每月处理量
- 比较：排名、超额百分比（"超过团队平均 15%"）
- 估算：~、+、X-Y 范围

## 输出要求
返回严格 JSON 数组，每个元素对应一条原文 bullet：

\`\`\`json
[
  {
    "original": "原文",
    "issues": "这条原文的弱点（如：被动语态、缺少量化、动词弱、太模糊）",
    "quantify": "发现的量化机会（如：可估算团队规模、可加 before/after 对比、可推算频次）",
    "rewritten": "改写后的 bullet",
    "reason": "改了什么及为什么（如：用'主导'替换'参与'、加入 STAR 框架、添加 3 个量化指标、缩短到 45 字）"
  }
]
\`\`\`

只输出 JSON 数组，不要任何额外文字。`,userPrompt:`请逐条分析并优化以下简历 bullet points：

${e}`}}async function n(e,t,r,i=.3,s=4e3){try{let n=await fetch("https://api.deepseek.com/chat/completions",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${e}`},body:JSON.stringify({model:"deepseek-chat",messages:[{role:"system",content:t},{role:"user",content:r}],temperature:i,max_tokens:s,stream:!1})});if(!n.ok)return null;let l=await n.json();return l.choices?.[0]?.message?.content?.trim()||null}catch{return null}}async function l(e,t){let{systemPrompt:r,userPrompt:i}={systemPrompt:`你是简历写作专家。用户用口语描述了ta的一段经历（按照STAR四要素），你需要把它提炼成一条专业的简历bullet。

要求：
1. 一条 bullet，35-65字，中文
2. 用强有力的动词开头（如：主导/搭建/设计/推动/优化）
3. 包含量化数据（如果用户提供了）
4. 突出用户的具体动作和实际成果
5. 使用专业但不夸张的措辞
6. 直接输出这条 bullet，不需要任何解释、引号或标记`,userPrompt:`背景：${t.situation}
任务：${t.task}
行动：${t.action}
结果：${t.result}

请输出一条简历 bullet：`};return n(e,r,i,.7,500)}async function o(e,t){let{systemPrompt:r,userPrompt:i}=s(t),l=await n(e,r,i,.3,4e3);if(!l)return null;try{let e=l.match(/```(?:json)?\s*([\s\S]*?)```/),t=e?e[1].trim():l.trim(),r=JSON.parse(t);if(Array.isArray(r))return r;return null}catch{return null}}async function a(e,t){let{systemPrompt:r,userPrompt:i}=s(t),l=await n(e,r,i,.3,2e3);if(!l)return null;try{let e=l.match(/```(?:json)?\s*([\s\S]*?)```/),t=e?e[1].trim():l.trim(),r=JSON.parse(t);if(Array.isArray(r)&&r.length>0)return r[0];return null}catch{return null}}async function u(e,t,r){let{systemPrompt:i,userPrompt:s}={systemPrompt:`你是顶级简历优化专家。用户给你一段简历文本和具体的润色要求，请严格按要求改写。

## 改写原则

1. **严格遵循用户要求**，不能偏离用户指定的润色方向
2. **保持事实不变**，不编造经历或数据
3. **优先使用 X-Y-Z 公式**："通过 [Z]，实现 [X]，衡量标准为 [Y]"
4. **替换弱动词**："负责/参与/协助/帮助" → 强力动词（主导/搭建/推动/优化/设计/重构）
5. **寻找量化机会**：用保守估算（~、范围、+）注入数字，找不到则量化活动
6. **成就 > 职责**：不是"做了什么"而是"做成了什么"

## 量化工具箱

金钱/时间/百分比/规模/质量/对比 — 6 类指标至少选 1 个
没有精确数字 → 保守估算 ~ / 范围 X-Y / 下限 X+ / 频次推算 / 比例拆分

## 输出格式

返回严格 JSON，不要任何额外文字：

\`\`\`json
{
  "rewritten": "优化后的文本",
  "reason": "改了什么及为什么（50字以内）"
}
\`\`\``,userPrompt:`原文：
${t}

润色要求：
${r}

请输出 JSON：`},l=await n(e,i,s,.3,4e3);if(!l)return null;try{let e=l.match(/```(?:json)?\s*([\s\S]*?)```/),t=e?e[1].trim():l.trim(),r=JSON.parse(t);if(r&&"string"==typeof r.rewritten)return r;return null}catch{return null}}e.s(["ChevronLeft",0,i],72100),e.s(["generateExperience",0,l,"optimizeCard",0,o,"optimizeSingleBullet",0,a,"polishTextWithReason",0,u],2900)}]);