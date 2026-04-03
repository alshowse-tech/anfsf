(()=>{var e={};e.id=454,e.ids=[454],e.modules={7849:e=>{"use strict";e.exports=require("next/dist/client/components/action-async-storage.external")},2934:e=>{"use strict";e.exports=require("next/dist/client/components/action-async-storage.external.js")},5403:e=>{"use strict";e.exports=require("next/dist/client/components/request-async-storage.external")},4580:e=>{"use strict";e.exports=require("next/dist/client/components/request-async-storage.external.js")},4749:e=>{"use strict";e.exports=require("next/dist/client/components/static-generation-async-storage.external")},5869:e=>{"use strict";e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},399:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},9944:(e,s,t)=>{"use strict";t.r(s),t.d(s,{GlobalError:()=>n.a,__next_app__:()=>u,originalPathname:()=>m,pages:()=>d,routeModule:()=>p,tree:()=>c});var r=t(482),a=t(9108),o=t(2563),n=t.n(o),i=t(8300),l={};for(let e in i)0>["default","tree","pages","GlobalError","originalPathname","__next_app__","routeModule"].indexOf(e)&&(l[e]=()=>i[e]);t.d(s,l);let c=["",{children:["auth",{children:["register",{children:["__PAGE__",{},{page:[()=>Promise.resolve().then(t.bind(t,6670)),"/root/.openclaw/workspace-main/projects/jieyue-securities/frontend/src/app/auth/register/page.tsx"]}]},{}]},{}]},{layout:[()=>Promise.resolve().then(t.bind(t,8210)),"/root/.openclaw/workspace-main/projects/jieyue-securities/frontend/src/app/layout.tsx"],"not-found":[()=>Promise.resolve().then(t.t.bind(t,9361,23)),"next/dist/client/components/not-found-error"]}],d=["/root/.openclaw/workspace-main/projects/jieyue-securities/frontend/src/app/auth/register/page.tsx"],m="/auth/register/page",u={require:t,loadChunk:()=>Promise.resolve()},p=new r.AppPageRouteModule({definition:{kind:a.x.APP_PAGE,page:"/auth/register/page",pathname:"/auth/register",bundlePath:"",filename:"",appPaths:[]},userland:{loaderTree:c}})},9246:(e,s,t)=>{Promise.resolve().then(t.t.bind(t,2583,23)),Promise.resolve().then(t.t.bind(t,6840,23)),Promise.resolve().then(t.t.bind(t,8771,23)),Promise.resolve().then(t.t.bind(t,3225,23)),Promise.resolve().then(t.t.bind(t,9295,23)),Promise.resolve().then(t.t.bind(t,3982,23))},4522:()=>{},3709:(e,s,t)=>{Promise.resolve().then(t.bind(t,9090))},8428:(e,s,t)=>{"use strict";var r=t(4767);t.o(r,"useParams")&&t.d(s,{useParams:function(){return r.useParams}}),t.o(r,"useRouter")&&t.d(s,{useRouter:function(){return r.useRouter}})},9090:(e,s,t)=>{"use strict";t.r(s),t.d(s,{default:()=>n});var r=t(5344),a=t(3729),o=t(8428);function n({onSuccess:e}){let s=(0,o.useRouter)(),[t,n]=(0,a.useState)({username:"",email:"",password:"",confirmPassword:"",agreeTerms:!1}),[i,l]=(0,a.useState)({}),[c,d]=(0,a.useState)(!1),[m,u]=(0,a.useState)(""),p=()=>{let e={};return t.username?t.username.length<3?e.username="用户名至少需要 3 个字符":t.username.length>50&&(e.username="用户名不能超过 50 个字符"):e.username="请输入用户名",t.email?/\S+@\S+\.\S+/.test(t.email)||(e.email="请输入有效的邮箱地址"):e.email="请输入邮箱地址",t.password?t.password.length<8?e.password="密码至少需要 8 个字符":/[A-Z]/.test(t.password)?/[a-z]/.test(t.password)?/\d/.test(t.password)||(e.password="密码必须包含至少一个数字"):e.password="密码必须包含至少一个小写字母":e.password="密码必须包含至少一个大写字母":e.password="请输入密码",t.confirmPassword?t.confirmPassword!==t.password&&(e.confirmPassword="两次输入的密码不一致"):e.confirmPassword="请确认密码",t.agreeTerms||(e.agreeTerms="必须同意服务条款和隐私政策"),l(e),0===Object.keys(e).length},x=async r=>{if(r.preventDefault(),u(""),p()){d(!0);try{let r=await fetch("/api/auth/register",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:t.username,email:t.email,password:t.password})}),a=await r.json();if(!r.ok)throw Error(a.detail||"注册失败，请稍后重试");localStorage.setItem("access_token",a.access_token),localStorage.setItem("refresh_token",a.refresh_token),localStorage.setItem("token_type",a.token_type),e?e():(s.push("/"),s.refresh())}catch(e){u(e.message||"注册失败，请稍后重试")}finally{d(!1)}}},h=e=>{let{name:s,value:t,type:r,checked:a}=e.target;n(e=>({...e,[s]:"checkbox"===r?a:t})),i[s]&&l(e=>({...e,[s]:""})),m&&u("")};return(0,r.jsxs)("form",{onSubmit:x,className:"space-y-6",children:[m&&r.jsx("div",{className:"bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg",children:m}),(0,r.jsxs)("div",{children:[r.jsx("label",{htmlFor:"username",className:"block text-sm font-medium text-gray-700 mb-2",children:"用户名"}),r.jsx("input",{id:"username",name:"username",type:"text",autoComplete:"username",value:t.username,onChange:h,className:`w-full px-4 py-3 border ${i.username?"border-red-500":"border-gray-300"} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition`,placeholder:"请输入用户名"}),i.username&&r.jsx("p",{className:"mt-1 text-sm text-red-600",children:i.username})]}),(0,r.jsxs)("div",{children:[r.jsx("label",{htmlFor:"email",className:"block text-sm font-medium text-gray-700 mb-2",children:"邮箱地址"}),r.jsx("input",{id:"email",name:"email",type:"email",autoComplete:"email",value:t.email,onChange:h,className:`w-full px-4 py-3 border ${i.email?"border-red-500":"border-gray-300"} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition`,placeholder:"your@email.com"}),i.email&&r.jsx("p",{className:"mt-1 text-sm text-red-600",children:i.email})]}),(0,r.jsxs)("div",{children:[r.jsx("label",{htmlFor:"password",className:"block text-sm font-medium text-gray-700 mb-2",children:"密码"}),r.jsx("input",{id:"password",name:"password",type:"password",autoComplete:"new-password",value:t.password,onChange:h,className:`w-full px-4 py-3 border ${i.password?"border-red-500":"border-gray-300"} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition`,placeholder:"至少 8 位，包含大小写字母和数字"}),i.password&&r.jsx("p",{className:"mt-1 text-sm text-red-600",children:i.password}),r.jsx("p",{className:"mt-1 text-xs text-gray-500",children:"密码必须包含至少一个大写字母、一个小写字母和一个数字"})]}),(0,r.jsxs)("div",{children:[r.jsx("label",{htmlFor:"confirmPassword",className:"block text-sm font-medium text-gray-700 mb-2",children:"确认密码"}),r.jsx("input",{id:"confirmPassword",name:"confirmPassword",type:"password",autoComplete:"new-password",value:t.confirmPassword,onChange:h,className:`w-full px-4 py-3 border ${i.confirmPassword?"border-red-500":"border-gray-300"} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition`,placeholder:"再次输入密码"}),i.confirmPassword&&r.jsx("p",{className:"mt-1 text-sm text-red-600",children:i.confirmPassword})]}),(0,r.jsxs)("div",{className:"flex items-start",children:[r.jsx("div",{className:"flex items-center h-5",children:r.jsx("input",{id:"agreeTerms",name:"agreeTerms",type:"checkbox",checked:t.agreeTerms,onChange:h,className:"h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"})}),(0,r.jsxs)("div",{className:"ml-3 text-sm",children:[(0,r.jsxs)("label",{htmlFor:"agreeTerms",className:"text-gray-700",children:["我已阅读并同意"," ",r.jsx("a",{href:"/docs/terms-of-service",target:"_blank",className:"text-blue-600 hover:text-blue-500",children:"服务条款"})," ","和"," ",r.jsx("a",{href:"/docs/privacy-policy",target:"_blank",className:"text-blue-600 hover:text-blue-500",children:"隐私政策"})]}),i.agreeTerms&&r.jsx("p",{className:"mt-1 text-red-600",children:i.agreeTerms})]})]}),r.jsx("button",{type:"submit",disabled:c,className:`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white 
          ${c?"bg-blue-400 cursor-not-allowed":"bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"} transition`,children:c?(0,r.jsxs)("span",{className:"flex items-center",children:[(0,r.jsxs)("svg",{className:"animate-spin -ml-1 mr-3 h-5 w-5 text-white",xmlns:"http://www.w3.org/2000/svg",fill:"none",viewBox:"0 0 24 24",children:[r.jsx("circle",{className:"opacity-25",cx:"12",cy:"12",r:"10",stroke:"currentColor",strokeWidth:"4"}),r.jsx("path",{className:"opacity-75",fill:"currentColor",d:"M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"})]}),"注册中..."]}):"注册"}),r.jsx("div",{className:"text-center",children:(0,r.jsxs)("p",{className:"text-sm text-gray-600",children:["已有账户？"," ",r.jsx("a",{href:"/auth/login",className:"font-medium text-blue-600 hover:text-blue-500",children:"立即登录"})]})})]})}},6670:(e,s,t)=>{"use strict";t.r(s),t.d(s,{default:()=>l});var r=t(5036);t(2);let a=(0,t(6843).createProxy)(String.raw`/root/.openclaw/workspace-main/projects/jieyue-securities/frontend/src/app/auth/components/RegisterForm.tsx`),{__esModule:o,$$typeof:n}=a,i=a.default;function l(){return(0,r.jsxs)("div",{className:"min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8",children:[(0,r.jsxs)("div",{className:"sm:mx-auto sm:w-full sm:max-w-md",children:[(0,r.jsxs)("div",{className:"text-center",children:[r.jsx("h1",{className:"text-3xl font-bold text-gray-900",children:"捷阅证券信息助手"}),r.jsx("p",{className:"mt-2 text-sm text-gray-600",children:"专业的证券信息服务"})]}),r.jsx("h2",{className:"mt-8 text-center text-2xl font-bold text-gray-900",children:"创建新账户"})]}),(0,r.jsxs)("div",{className:"mt-8 sm:mx-auto sm:w-full sm:max-w-md",children:[r.jsx("div",{className:"bg-white py-8 px-4 shadow-xl rounded-lg sm:px-10",children:r.jsx(i,{})}),(0,r.jsxs)("div",{className:"mt-6 text-center text-xs text-gray-500",children:[r.jsx("p",{children:"注册即表示您同意我们的服务条款和隐私政策"}),r.jsx("p",{className:"mt-1",children:"\xa9 2024 捷阅证券信息助手。All rights reserved."})]})]})]})}},8210:(e,s,t)=>{"use strict";t.r(s),t.d(s,{default:()=>m,metadata:()=>l,viewport:()=>c});var r=t(5036),a=t(820),o=t.n(a);t(5023),t(8070);let n={styleLoadTimeout:5e3,probeInterval:100,maxRetries:3},i=`
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
`.replace(/\n/g,"");function m({children:e}){return(0,r.jsxs)("html",{lang:"zh-CN",className:o().variable,children:[(0,r.jsxs)("head",{children:[r.jsx("style",{id:"critical-css",dangerouslySetInnerHTML:{__html:d}}),r.jsx("script",{dangerouslySetInnerHTML:{__html:i}}),r.jsx("link",{rel:"preconnect",href:"https://fonts.googleapis.com"}),r.jsx("link",{rel:"preconnect",href:"https://fonts.gstatic.com",crossOrigin:"anonymous"}),r.jsx("meta",{name:"viewport",content:"width=device-width, initial-scale=1"}),r.jsx("meta",{name:"theme-color",content:"#6366f1"})]}),r.jsx("body",{className:`${o().className} antialiased`,children:r.jsx("div",{id:"readiness-root",className:"readiness-loading",children:e})})]})}},5023:()=>{}};var s=require("../../../webpack-runtime.js");s.C(e);var t=e=>s(s.s=e),r=s.X(0,[622],()=>t(9944));module.exports=r})();