(()=>{var e={};e.id=716,e.ids=[716],e.modules={7849:e=>{"use strict";e.exports=require("next/dist/client/components/action-async-storage.external")},2934:e=>{"use strict";e.exports=require("next/dist/client/components/action-async-storage.external.js")},5403:e=>{"use strict";e.exports=require("next/dist/client/components/request-async-storage.external")},4580:e=>{"use strict";e.exports=require("next/dist/client/components/request-async-storage.external.js")},4749:e=>{"use strict";e.exports=require("next/dist/client/components/static-generation-async-storage.external")},5869:e=>{"use strict";e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},399:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},417:(e,t,s)=>{"use strict";s.r(t),s.d(t,{GlobalError:()=>n.a,__next_app__:()=>u,originalPathname:()=>m,pages:()=>d,routeModule:()=>p,tree:()=>c});var r=s(482),a=s(9108),o=s(2563),n=s.n(o),i=s(8300),l={};for(let e in i)0>["default","tree","pages","GlobalError","originalPathname","__next_app__","routeModule"].indexOf(e)&&(l[e]=()=>i[e]);s.d(t,l);let c=["",{children:["auth",{children:["login",{children:["__PAGE__",{},{page:[()=>Promise.resolve().then(s.bind(s,7495)),"/root/.openclaw/workspace-main/projects/jieyue-securities/frontend/src/app/auth/login/page.tsx"]}]},{}]},{}]},{layout:[()=>Promise.resolve().then(s.bind(s,8210)),"/root/.openclaw/workspace-main/projects/jieyue-securities/frontend/src/app/layout.tsx"],"not-found":[()=>Promise.resolve().then(s.t.bind(s,9361,23)),"next/dist/client/components/not-found-error"]}],d=["/root/.openclaw/workspace-main/projects/jieyue-securities/frontend/src/app/auth/login/page.tsx"],m="/auth/login/page",u={require:s,loadChunk:()=>Promise.resolve()},p=new r.AppPageRouteModule({definition:{kind:a.x.APP_PAGE,page:"/auth/login/page",pathname:"/auth/login",bundlePath:"",filename:"",appPaths:[]},userland:{loaderTree:c}})},9246:(e,t,s)=>{Promise.resolve().then(s.t.bind(s,2583,23)),Promise.resolve().then(s.t.bind(s,6840,23)),Promise.resolve().then(s.t.bind(s,8771,23)),Promise.resolve().then(s.t.bind(s,3225,23)),Promise.resolve().then(s.t.bind(s,9295,23)),Promise.resolve().then(s.t.bind(s,3982,23))},4522:()=>{},9181:(e,t,s)=>{Promise.resolve().then(s.bind(s,5014))},8428:(e,t,s)=>{"use strict";var r=s(4767);s.o(r,"useParams")&&s.d(t,{useParams:function(){return r.useParams}}),s.o(r,"useRouter")&&s.d(t,{useRouter:function(){return r.useRouter}})},5014:(e,t,s)=>{"use strict";s.r(t),s.d(t,{default:()=>n});var r=s(5344),a=s(3729),o=s(8428);function n({onSuccess:e}){let t=(0,o.useRouter)(),[s,n]=(0,a.useState)({email:"",password:"",rememberMe:!1}),[i,l]=(0,a.useState)({}),[c,d]=(0,a.useState)(!1),[m,u]=(0,a.useState)(""),p=()=>{let e={};return s.email?/\S+@\S+\.\S+/.test(s.email)||(e.email="请输入有效的邮箱地址"):e.email="请输入邮箱地址",s.password?s.password.length<8&&(e.password="密码至少需要 8 个字符"):e.password="请输入密码",l(e),0===Object.keys(e).length},x=async r=>{if(r.preventDefault(),u(""),p()){d(!0);try{let r=await fetch("/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:s.email,password:s.password,remember_me:s.rememberMe})}),a=await r.json();if(!r.ok)throw Error(a.detail||"登录失败，请检查邮箱和密码");localStorage.setItem("access_token",a.access_token),localStorage.setItem("refresh_token",a.refresh_token),localStorage.setItem("token_type",a.token_type),e?e():(t.push("/"),t.refresh())}catch(e){u(e.message||"登录失败，请稍后重试")}finally{d(!1)}}},h=e=>{let{name:t,value:s,type:r,checked:a}=e.target;n(e=>({...e,[t]:"checkbox"===r?a:s})),i[t]&&l(e=>({...e,[t]:""})),m&&u("")};return(0,r.jsxs)("form",{onSubmit:x,className:"space-y-6",children:[m&&r.jsx("div",{className:"bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg",children:m}),(0,r.jsxs)("div",{children:[r.jsx("label",{htmlFor:"email",className:"block text-sm font-medium text-gray-700 mb-2",children:"邮箱地址"}),r.jsx("input",{id:"email",name:"email",type:"email",autoComplete:"email",value:s.email,onChange:h,className:`w-full px-4 py-3 border ${i.email?"border-red-500":"border-gray-300"} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition`,placeholder:"your@email.com"}),i.email&&r.jsx("p",{className:"mt-1 text-sm text-red-600",children:i.email})]}),(0,r.jsxs)("div",{children:[r.jsx("label",{htmlFor:"password",className:"block text-sm font-medium text-gray-700 mb-2",children:"密码"}),r.jsx("input",{id:"password",name:"password",type:"password",autoComplete:"current-password",value:s.password,onChange:h,className:`w-full px-4 py-3 border ${i.password?"border-red-500":"border-gray-300"} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition`,placeholder:"••••••••"}),i.password&&r.jsx("p",{className:"mt-1 text-sm text-red-600",children:i.password})]}),(0,r.jsxs)("div",{className:"flex items-center justify-between",children:[(0,r.jsxs)("div",{className:"flex items-center",children:[r.jsx("input",{id:"rememberMe",name:"rememberMe",type:"checkbox",checked:s.rememberMe,onChange:h,className:"h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"}),r.jsx("label",{htmlFor:"rememberMe",className:"ml-2 block text-sm text-gray-700",children:"记住我"})]}),r.jsx("a",{href:"/auth/forgot-password",className:"text-sm font-medium text-blue-600 hover:text-blue-500",children:"忘记密码？"})]}),r.jsx("button",{type:"submit",disabled:c,className:`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white 
          ${c?"bg-blue-400 cursor-not-allowed":"bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"} transition`,children:c?(0,r.jsxs)("span",{className:"flex items-center",children:[(0,r.jsxs)("svg",{className:"animate-spin -ml-1 mr-3 h-5 w-5 text-white",xmlns:"http://www.w3.org/2000/svg",fill:"none",viewBox:"0 0 24 24",children:[r.jsx("circle",{className:"opacity-25",cx:"12",cy:"12",r:"10",stroke:"currentColor",strokeWidth:"4"}),r.jsx("path",{className:"opacity-75",fill:"currentColor",d:"M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"})]}),"登录中..."]}):"登录"}),r.jsx("div",{className:"text-center",children:(0,r.jsxs)("p",{className:"text-sm text-gray-600",children:["还没有账户？"," ",r.jsx("a",{href:"/auth/register",className:"font-medium text-blue-600 hover:text-blue-500",children:"立即注册"})]})})]})}},7495:(e,t,s)=>{"use strict";s.r(t),s.d(t,{default:()=>l});var r=s(5036);s(2);let a=(0,s(6843).createProxy)(String.raw`/root/.openclaw/workspace-main/projects/jieyue-securities/frontend/src/app/auth/components/LoginForm.tsx`),{__esModule:o,$$typeof:n}=a,i=a.default;function l(){return(0,r.jsxs)("div",{className:"min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8",children:[(0,r.jsxs)("div",{className:"sm:mx-auto sm:w-full sm:max-w-md",children:[(0,r.jsxs)("div",{className:"text-center",children:[r.jsx("h1",{className:"text-3xl font-bold text-gray-900",children:"捷阅证券信息助手"}),r.jsx("p",{className:"mt-2 text-sm text-gray-600",children:"专业的证券信息服务"})]}),r.jsx("h2",{className:"mt-8 text-center text-2xl font-bold text-gray-900",children:"登录您的账户"})]}),(0,r.jsxs)("div",{className:"mt-8 sm:mx-auto sm:w-full sm:max-w-md",children:[r.jsx("div",{className:"bg-white py-8 px-4 shadow-xl rounded-lg sm:px-10",children:r.jsx(i,{})}),(0,r.jsxs)("div",{className:"mt-6 text-center text-xs text-gray-500",children:[r.jsx("p",{children:"保护您的账户安全，请勿与他人共享登录信息"}),r.jsx("p",{className:"mt-1",children:"\xa9 2024 捷阅证券信息助手。All rights reserved."})]})]})]})}},8210:(e,t,s)=>{"use strict";s.r(t),s.d(t,{default:()=>m,metadata:()=>l,viewport:()=>c});var r=s(5036),a=s(820),o=s.n(a);s(5023),s(8070);let n={styleLoadTimeout:5e3,probeInterval:100,maxRetries:3},i=`
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
`.replace(/\n/g,"");function m({children:e}){return(0,r.jsxs)("html",{lang:"zh-CN",className:o().variable,children:[(0,r.jsxs)("head",{children:[r.jsx("style",{id:"critical-css",dangerouslySetInnerHTML:{__html:d}}),r.jsx("script",{dangerouslySetInnerHTML:{__html:i}}),r.jsx("link",{rel:"preconnect",href:"https://fonts.googleapis.com"}),r.jsx("link",{rel:"preconnect",href:"https://fonts.gstatic.com",crossOrigin:"anonymous"}),r.jsx("meta",{name:"viewport",content:"width=device-width, initial-scale=1"}),r.jsx("meta",{name:"theme-color",content:"#6366f1"})]}),r.jsx("body",{className:`${o().className} antialiased`,children:r.jsx("div",{id:"readiness-root",className:"readiness-loading",children:e})})]})}},5023:()=>{}};var t=require("../../../webpack-runtime.js");t.C(e);var s=e=>t(t.s=e),r=t.X(0,[622],()=>s(417));module.exports=r})();