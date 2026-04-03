(()=>{var e={};e.id=985,e.ids=[985],e.modules={7849:e=>{"use strict";e.exports=require("next/dist/client/components/action-async-storage.external")},2934:e=>{"use strict";e.exports=require("next/dist/client/components/action-async-storage.external.js")},5403:e=>{"use strict";e.exports=require("next/dist/client/components/request-async-storage.external")},4580:e=>{"use strict";e.exports=require("next/dist/client/components/request-async-storage.external.js")},4749:e=>{"use strict";e.exports=require("next/dist/client/components/static-generation-async-storage.external")},5869:e=>{"use strict";e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},399:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},9491:e=>{"use strict";e.exports=require("assert")},6113:e=>{"use strict";e.exports=require("crypto")},2361:e=>{"use strict";e.exports=require("events")},7147:e=>{"use strict";e.exports=require("fs")},3685:e=>{"use strict";e.exports=require("http")},5158:e=>{"use strict";e.exports=require("http2")},5687:e=>{"use strict";e.exports=require("https")},2037:e=>{"use strict";e.exports=require("os")},1017:e=>{"use strict";e.exports=require("path")},2781:e=>{"use strict";e.exports=require("stream")},6224:e=>{"use strict";e.exports=require("tty")},7310:e=>{"use strict";e.exports=require("url")},3837:e=>{"use strict";e.exports=require("util")},9796:e=>{"use strict";e.exports=require("zlib")},756:(e,s,t)=>{"use strict";t.r(s),t.d(s,{GlobalError:()=>n.a,__next_app__:()=>m,originalPathname:()=>u,pages:()=>d,routeModule:()=>x,tree:()=>c});var r=t(482),a=t(9108),i=t(2563),n=t.n(i),l=t(8300),o={};for(let e in l)0>["default","tree","pages","GlobalError","originalPathname","__next_app__","routeModule"].indexOf(e)&&(o[e]=()=>l[e]);t.d(s,o);let c=["",{children:["task",{children:["[id]",{children:["__PAGE__",{},{page:[()=>Promise.resolve().then(t.bind(t,511)),"/root/.openclaw/workspace-main/projects/jieyue-securities/frontend/src/app/task/[id]/page.tsx"]}]},{}]},{}]},{layout:[()=>Promise.resolve().then(t.bind(t,8210)),"/root/.openclaw/workspace-main/projects/jieyue-securities/frontend/src/app/layout.tsx"],"not-found":[()=>Promise.resolve().then(t.t.bind(t,9361,23)),"next/dist/client/components/not-found-error"]}],d=["/root/.openclaw/workspace-main/projects/jieyue-securities/frontend/src/app/task/[id]/page.tsx"],u="/task/[id]/page",m={require:t,loadChunk:()=>Promise.resolve()},x=new r.AppPageRouteModule({definition:{kind:a.x.APP_PAGE,page:"/task/[id]/page",pathname:"/task/[id]",bundlePath:"",filename:"",appPaths:[]},userland:{loaderTree:c}})},9246:(e,s,t)=>{Promise.resolve().then(t.t.bind(t,2583,23)),Promise.resolve().then(t.t.bind(t,6840,23)),Promise.resolve().then(t.t.bind(t,8771,23)),Promise.resolve().then(t.t.bind(t,3225,23)),Promise.resolve().then(t.t.bind(t,9295,23)),Promise.resolve().then(t.t.bind(t,3982,23))},4522:()=>{},1508:(e,s,t)=>{Promise.resolve().then(t.bind(t,8626))},8428:(e,s,t)=>{"use strict";var r=t(4767);t.o(r,"useParams")&&t.d(s,{useParams:function(){return r.useParams}}),t.o(r,"useRouter")&&t.d(s,{useRouter:function(){return r.useRouter}})},8626:(e,s,t)=>{"use strict";t.r(s),t.d(s,{default:()=>c});var r=t(5344),a=t(3729),i=t(8428),n=t(637),l=t(6506);let o=process.env.NEXT_PUBLIC_API_URL||"http://localhost:8000/api";function c(){let e=(0,i.useParams)().id,[s,t]=(0,a.useState)(null),[c,d]=(0,a.useState)(!0),[u,m]=(0,a.useState)(!1);(0,a.useEffect)(()=>{x();let e=setInterval(()=>{s&&!["SUCCESS","FAILED"].includes(s.status)&&x(!0)},5e3);return()=>clearInterval(e)},[e]);let x=async(s=!1)=>{s&&m(!0);try{let s=await n.Z.get(`${o}/task/${e}`);t(s.data)}catch(e){console.error("加载任务详情失败:",e)}finally{s&&m(!1),d(!1)}},p=e=>({INIT:"待处理",PARSING:"解析中",ASR_PROCESSING:"语音识别中",SUMMARIZING:"生成摘要中",SUCCESS:"已完成",FAILED:"失败"})[e]||e,h=e=>e.includes("违法")||e.includes("诈骗")?"bg-red-100 text-red-800":e.includes("投资建议")?"bg-yellow-100 text-yellow-800":e.includes("主观判断")?"bg-blue-100 text-blue-800":"bg-gray-100 text-gray-800";return c?r.jsx("div",{className:"min-h-screen p-8 flex items-center justify-center",children:r.jsx("div",{className:"text-xl",children:"加载中..."})}):s?r.jsx("div",{className:"min-h-screen p-8",children:(0,r.jsxs)("div",{className:"max-w-4xl mx-auto",children:[r.jsx("div",{className:"mb-6",children:r.jsx(l.default,{href:"/tasks",className:"text-blue-600 hover:underline",children:"← 返回任务列表"})}),(0,r.jsxs)("div",{className:"bg-white rounded-lg shadow-md p-6 mb-6",children:[(0,r.jsxs)("div",{className:"flex justify-between items-start mb-4",children:[(0,r.jsxs)("h1",{className:"text-2xl font-bold",children:["任务 #",s.id]}),r.jsx("span",{className:`px-3 py-1 rounded-full text-sm font-medium ${{INIT:"bg-gray-200 text-gray-800",PARSING:"bg-blue-200 text-blue-800",ASR_PROCESSING:"bg-yellow-200 text-yellow-800",SUMMARIZING:"bg-purple-200 text-purple-800",SUCCESS:"bg-green-200 text-green-800",FAILED:"bg-red-200 text-red-800"}[s.status]||"bg-gray-200 text-gray-800"}`,children:p(s.status)})]}),(0,r.jsxs)("div",{className:"grid grid-cols-2 gap-4 mb-4",children:[(0,r.jsxs)("div",{children:[r.jsx("p",{className:"text-sm text-gray-500",children:"视频 URL"}),r.jsx("p",{className:"text-sm break-all",children:s.url||"-"})]}),(0,r.jsxs)("div",{children:[r.jsx("p",{className:"text-sm text-gray-500",children:"创建时间"}),r.jsx("p",{className:"text-sm",children:new Date(s.created_at).toLocaleString("zh-CN")})]}),(0,r.jsxs)("div",{children:[r.jsx("p",{className:"text-sm text-gray-500",children:"内容类型"}),r.jsx("p",{className:"text-sm",children:s.content_type||"-"})]}),(0,r.jsxs)("div",{children:[r.jsx("p",{className:"text-sm text-gray-500",children:"视频时长"}),r.jsx("p",{className:"text-sm",children:s.duration?`${s.duration}秒`:"-"})]}),(0,r.jsxs)("div",{children:[r.jsx("p",{className:"text-sm text-gray-500",children:"费用"}),(0,r.jsxs)("p",{className:"text-sm",children:["\xa5",s.cost?.toFixed(2)||"0.00"]})]}),(0,r.jsxs)("div",{children:[r.jsx("p",{className:"text-sm text-gray-500",children:"更新时间"}),r.jsx("p",{className:"text-sm",children:new Date(s.updated_at).toLocaleString("zh-CN")})]})]}),s.error_msg&&(0,r.jsxs)("div",{className:"p-3 bg-red-100 border border-red-400 text-red-700 rounded mb-4",children:[r.jsx("p",{className:"font-medium",children:"错误信息"}),r.jsx("p",{children:s.error_msg})]}),u&&r.jsx("div",{className:"text-sm text-gray-500",children:"正在刷新状态..."})]}),"SUCCESS"===s.status&&s.result&&r.jsx(r.Fragment,{children:(0,r.jsxs)("div",{className:"bg-white rounded-lg shadow-md p-6 mb-6",children:[r.jsx("h2",{className:"text-xl font-semibold mb-4",children:"分析结果"}),(0,r.jsxs)("div",{className:"mb-4",children:[r.jsx("h3",{className:"font-medium mb-2",children:"关键点"}),r.jsx("ul",{className:"list-disc list-inside space-y-1",children:s.result.key_points.map((e,s)=>r.jsx("li",{className:"text-sm text-gray-700",children:e},s))})]}),(0,r.jsxs)("div",{className:"mb-4",children:[r.jsx("h3",{className:"font-medium mb-2",children:"摘要"}),r.jsx("p",{className:"text-sm text-gray-700 leading-relaxed",children:s.result.abstract})]}),s.result.risk_tags&&s.result.risk_tags.length>0&&(0,r.jsxs)("div",{children:[r.jsx("h3",{className:"font-medium mb-2",children:"风险标签"}),r.jsx("div",{className:"flex flex-wrap gap-2",children:s.result.risk_tags.map((e,s)=>r.jsx("span",{className:`px-2 py-1 text-xs rounded-full ${h(e)}`,children:e},s))})]})]})}),["INIT","PARSING","ASR_PROCESSING","SUMMARIZING"].includes(s.status)&&(0,r.jsxs)("div",{className:"bg-white rounded-lg shadow-md p-6 text-center",children:[r.jsx("div",{className:"animate-pulse text-gray-500",children:"任务处理中，请稍候..."}),(0,r.jsxs)("div",{className:"mt-4 text-sm text-gray-400",children:["当前状态：",p(s.status)]})]})]})}):r.jsx("div",{className:"min-h-screen p-8",children:(0,r.jsxs)("div",{className:"max-w-4xl mx-auto text-center",children:[r.jsx("h1",{className:"text-2xl font-bold mb-4",children:"任务不存在"}),r.jsx(l.default,{href:"/tasks",className:"text-blue-600 hover:underline",children:"返回任务列表"})]})})}},8210:(e,s,t)=>{"use strict";t.r(s),t.d(s,{default:()=>u,metadata:()=>o,viewport:()=>c});var r=t(5036),a=t(820),i=t.n(a);t(5023),t(8070);let n={styleLoadTimeout:5e3,probeInterval:100,maxRetries:3},l=`
  (function() {
    if (typeof window === 'undefined') return;
    
    const READINESS_CONFIG = {
      styleLoadTimeout: ${n.styleLoadTimeout},
      probeInterval: ${n.probeInterval},
      maxRetries: ${n.maxRetries},
    };
    
    async function checkReadiness() {
      const status = {
        stylesLoaded: false,
        fontsLoaded: false,
        isReady: false,
      };
      
      try {
        status.stylesLoaded = document.styleSheets.length > 0;
        status.fontsLoaded = true;
        status.isReady = status.stylesLoaded && status.fontsLoaded;
      } catch (e) {
        console.error('Readiness check failed:', e);
      }
      
      return status;
    }
    
    async function readinessGate() {
      const startTime = Date.now();
      let retries = 0;
      
      while (retries < READINESS_CONFIG.maxRetries) {
        const elapsed = Date.now() - startTime;
        if (elapsed > READINESS_CONFIG.styleLoadTimeout) {
          console.warn('Readiness gate timeout');
          break;
        }
        
        const status = await checkReadiness();
        if (status.isReady) {
          document.documentElement.classList.add('readiness-ready');
          return true;
        }
        
        retries++;
        await new Promise(r => setTimeout(r, READINESS_CONFIG.probeInterval));
      }
      
      return false;
    }
    
    // 启动 Readiness Gate
    readinessGate().catch(console.error);
  })();
`,o={title:"捷阅证券信息助手",description:"证券内容智能分析与合规审核平台",icons:{icon:"/favicon.svg"},manifest:"/manifest.json"},c={themeColor:[{media:"(prefers-color-scheme: light)",color:"#6366f1"},{media:"(prefers-color-scheme: dark)",color:"#4f46e5"}]},d=`
  :root {
    --bg-primary: #ffffff;
    --bg-secondary: #f8fafc;
    --text-primary: #0f172a;
  }
  body {
    margin: 0;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: var(--bg-primary);
    color: var(--text-primary);
  }
  .navbar {
    background: white;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }
  .hero {
    background: linear-gradient(to bottom right, #eef2ff, #e0e7ff);
  }
`.replace(/\n/g,"");function u({children:e}){return(0,r.jsxs)("html",{lang:"zh-CN",className:i().variable,children:[(0,r.jsxs)("head",{children:[r.jsx("style",{id:"critical-css",dangerouslySetInnerHTML:{__html:d}}),r.jsx("script",{dangerouslySetInnerHTML:{__html:l}}),r.jsx("link",{rel:"preconnect",href:"https://fonts.googleapis.com"}),r.jsx("link",{rel:"preconnect",href:"https://fonts.gstatic.com",crossOrigin:"anonymous"}),r.jsx("meta",{name:"viewport",content:"width=device-width, initial-scale=1"}),r.jsx("meta",{name:"theme-color",content:"#6366f1"})]}),r.jsx("body",{className:`${i().className} antialiased`,children:r.jsx("div",{id:"readiness-root",className:"readiness-loading",children:e})})]})}},511:(e,s,t)=>{"use strict";t.r(s),t.d(s,{$$typeof:()=>i,__esModule:()=>a,default:()=>n});let r=(0,t(6843).createProxy)(String.raw`/root/.openclaw/workspace-main/projects/jieyue-securities/frontend/src/app/task/[id]/page.tsx`),{__esModule:a,$$typeof:i}=r,n=r.default},5023:()=>{}};var s=require("../../../webpack-runtime.js");s.C(e);var t=e=>s(s.s=e),r=s.X(0,[622,542],()=>t(756));module.exports=r})();