(()=>{var e={};e.id=47,e.ids=[47],e.modules={7849:e=>{"use strict";e.exports=require("next/dist/client/components/action-async-storage.external")},2934:e=>{"use strict";e.exports=require("next/dist/client/components/action-async-storage.external.js")},5403:e=>{"use strict";e.exports=require("next/dist/client/components/request-async-storage.external")},4580:e=>{"use strict";e.exports=require("next/dist/client/components/request-async-storage.external.js")},4749:e=>{"use strict";e.exports=require("next/dist/client/components/static-generation-async-storage.external")},5869:e=>{"use strict";e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},399:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},3951:(e,t,s)=>{"use strict";s.r(t),s.d(t,{GlobalError:()=>n.a,__next_app__:()=>u,originalPathname:()=>m,pages:()=>d,routeModule:()=>x,tree:()=>c});var r=s(482),a=s(9108),o=s(2563),n=s.n(o),i=s(8300),l={};for(let e in i)0>["default","tree","pages","GlobalError","originalPathname","__next_app__","routeModule"].indexOf(e)&&(l[e]=()=>i[e]);s.d(t,l);let c=["",{children:["auth",{children:["forgot-password",{children:["__PAGE__",{},{page:[()=>Promise.resolve().then(s.bind(s,4140)),"/root/.openclaw/workspace-main/projects/jieyue-securities/frontend/src/app/auth/forgot-password/page.tsx"]}]},{}]},{}]},{layout:[()=>Promise.resolve().then(s.bind(s,8210)),"/root/.openclaw/workspace-main/projects/jieyue-securities/frontend/src/app/layout.tsx"],"not-found":[()=>Promise.resolve().then(s.t.bind(s,9361,23)),"next/dist/client/components/not-found-error"]}],d=["/root/.openclaw/workspace-main/projects/jieyue-securities/frontend/src/app/auth/forgot-password/page.tsx"],m="/auth/forgot-password/page",u={require:s,loadChunk:()=>Promise.resolve()},x=new r.AppPageRouteModule({definition:{kind:a.x.APP_PAGE,page:"/auth/forgot-password/page",pathname:"/auth/forgot-password",bundlePath:"",filename:"",appPaths:[]},userland:{loaderTree:c}})},9246:(e,t,s)=>{Promise.resolve().then(s.t.bind(s,2583,23)),Promise.resolve().then(s.t.bind(s,6840,23)),Promise.resolve().then(s.t.bind(s,8771,23)),Promise.resolve().then(s.t.bind(s,3225,23)),Promise.resolve().then(s.t.bind(s,9295,23)),Promise.resolve().then(s.t.bind(s,3982,23))},4522:()=>{},3511:(e,t,s)=>{Promise.resolve().then(s.bind(s,8864))},8428:(e,t,s)=>{"use strict";var r=s(4767);s.o(r,"useParams")&&s.d(t,{useParams:function(){return r.useParams}}),s.o(r,"useRouter")&&s.d(t,{useRouter:function(){return r.useRouter}})},8864:(e,t,s)=>{"use strict";s.r(t),s.d(t,{default:()=>n});var r=s(5344),a=s(3729),o=s(8428);function n(){let e=(0,o.useRouter)(),[t,s]=(0,a.useState)(""),[n,i]=(0,a.useState)({}),[l,c]=(0,a.useState)(!1),[d,m]=(0,a.useState)(""),[u,x]=(0,a.useState)(!1),p=()=>{let e={};return t?/\S+@\S+\.\S+/.test(t)||(e.email="请输入有效的邮箱地址"):e.email="请输入邮箱地址",i(e),0===Object.keys(e).length},h=async e=>{if(e.preventDefault(),m(""),p()){c(!0);try{let e=await fetch("/api/auth/forgot-password",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:t})}),s=await e.json();if(!e.ok)throw Error(s.detail||"请求失败，请稍后重试");x(!0)}catch(e){m(e.message||"请求失败，请稍后重试")}finally{c(!1)}}};return u?r.jsx("div",{className:"min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8",children:(0,r.jsxs)("div",{className:"sm:mx-auto sm:w-full sm:max-w-md",children:[r.jsx("div",{className:"text-center",children:r.jsx("h1",{className:"text-3xl font-bold text-gray-900",children:"捷阅证券信息助手"})}),r.jsx("div",{className:"mt-8 bg-white py-8 px-4 shadow-xl rounded-lg sm:px-10",children:(0,r.jsxs)("div",{className:"text-center",children:[r.jsx("svg",{className:"mx-auto h-12 w-12 text-green-500",fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",children:r.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M5 13l4 4L19 7"})}),r.jsx("h3",{className:"mt-4 text-lg font-medium text-gray-900",children:"邮件已发送"}),r.jsx("p",{className:"mt-2 text-sm text-gray-600",children:"如果该邮箱已注册，您将收到一封重置密码的邮件。"}),r.jsx("p",{className:"mt-4 text-sm text-gray-500",children:"请检查您的邮箱（包括垃圾邮件箱）"}),r.jsx("button",{onClick:()=>e.push("/auth/login"),className:"mt-6 w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700",children:"返回登录"})]})})]})}):(0,r.jsxs)("div",{className:"min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8",children:[(0,r.jsxs)("div",{className:"sm:mx-auto sm:w-full sm:max-w-md",children:[r.jsx("div",{className:"text-center",children:r.jsx("h1",{className:"text-3xl font-bold text-gray-900",children:"捷阅证券信息助手"})}),r.jsx("h2",{className:"mt-8 text-center text-2xl font-bold text-gray-900",children:"重置密码"}),r.jsx("p",{className:"mt-2 text-center text-sm text-gray-600",children:"输入您的邮箱地址，我们将发送重置密码的链接"})]}),r.jsx("div",{className:"mt-8 sm:mx-auto sm:w-full sm:max-w-md",children:(0,r.jsxs)("div",{className:"bg-white py-8 px-4 shadow-xl rounded-lg sm:px-10",children:[d&&r.jsx("div",{className:"bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6",children:d}),(0,r.jsxs)("form",{onSubmit:h,className:"space-y-6",children:[(0,r.jsxs)("div",{children:[r.jsx("label",{htmlFor:"email",className:"block text-sm font-medium text-gray-700 mb-2",children:"邮箱地址"}),r.jsx("input",{id:"email",name:"email",type:"email",autoComplete:"email",value:t,onChange:e=>{s(e.target.value),n.email&&i({...n,email:""}),d&&m("")},className:`w-full px-4 py-3 border ${n.email?"border-red-500":"border-gray-300"} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition`,placeholder:"your@email.com"}),n.email&&r.jsx("p",{className:"mt-1 text-sm text-red-600",children:n.email})]}),r.jsx("button",{type:"submit",disabled:l,className:`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white 
                ${l?"bg-blue-400 cursor-not-allowed":"bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"} transition`,children:l?(0,r.jsxs)("span",{className:"flex items-center",children:[(0,r.jsxs)("svg",{className:"animate-spin -ml-1 mr-3 h-5 w-5 text-white",xmlns:"http://www.w3.org/2000/svg",fill:"none",viewBox:"0 0 24 24",children:[r.jsx("circle",{className:"opacity-25",cx:"12",cy:"12",r:"10",stroke:"currentColor",strokeWidth:"4"}),r.jsx("path",{className:"opacity-75",fill:"currentColor",d:"M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"})]}),"发送中..."]}):"发送重置链接"}),r.jsx("div",{className:"text-center",children:r.jsx("a",{href:"/auth/login",className:"font-medium text-blue-600 hover:text-blue-500 text-sm",children:"返回登录"})})]})]})})]})}},4140:(e,t,s)=>{"use strict";s.r(t),s.d(t,{$$typeof:()=>o,__esModule:()=>a,default:()=>n});let r=(0,s(6843).createProxy)(String.raw`/root/.openclaw/workspace-main/projects/jieyue-securities/frontend/src/app/auth/forgot-password/page.tsx`),{__esModule:a,$$typeof:o}=r,n=r.default},8210:(e,t,s)=>{"use strict";s.r(t),s.d(t,{default:()=>m,metadata:()=>l,viewport:()=>c});var r=s(5036),a=s(820),o=s.n(a);s(5023),s(8070);let n={styleLoadTimeout:5e3,probeInterval:100,maxRetries:3},i=`
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
`,l={title:"捷阅证券信息助手",description:"证券内容智能分析与合规审核平台",icons:{icon:"/favicon.svg"},manifest:"/manifest.json"},c={themeColor:[{media:"(prefers-color-scheme: light)",color:"#6366f1"},{media:"(prefers-color-scheme: dark)",color:"#4f46e5"}]},d=`
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
`.replace(/\n/g,"");function m({children:e}){return(0,r.jsxs)("html",{lang:"zh-CN",className:o().variable,children:[(0,r.jsxs)("head",{children:[r.jsx("style",{id:"critical-css",dangerouslySetInnerHTML:{__html:d}}),r.jsx("script",{dangerouslySetInnerHTML:{__html:i}}),r.jsx("link",{rel:"preconnect",href:"https://fonts.googleapis.com"}),r.jsx("link",{rel:"preconnect",href:"https://fonts.gstatic.com",crossOrigin:"anonymous"}),r.jsx("meta",{name:"viewport",content:"width=device-width, initial-scale=1"}),r.jsx("meta",{name:"theme-color",content:"#6366f1"})]}),r.jsx("body",{className:`${o().className} antialiased`,children:r.jsx("div",{id:"readiness-root",className:"readiness-loading",children:e})})]})}},5023:()=>{}};var t=require("../../../webpack-runtime.js");t.C(e);var s=e=>t(t.s=e),r=t.X(0,[622],()=>s(3951));module.exports=r})();