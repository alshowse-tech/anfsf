exports.id=368,exports.ids=[368],exports.modules={9246:(e,r,t)=>{Promise.resolve().then(t.t.bind(t,2583,23)),Promise.resolve().then(t.t.bind(t,6840,23)),Promise.resolve().then(t.t.bind(t,8771,23)),Promise.resolve().then(t.t.bind(t,3225,23)),Promise.resolve().then(t.t.bind(t,9295,23)),Promise.resolve().then(t.t.bind(t,3982,23))},4522:()=>{},8930:(e,r,t)=>{"use strict";t.d(r,{zx:()=>n,Zb:()=>d,eW:()=>l,cY:()=>u,Am:()=>g});var s=t(5344),a=t(3729);let i={primary:"bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500 shadow-sm",secondary:"bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-500 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600",outline:"border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 focus:ring-indigo-500 dark:border-indigo-400 dark:text-indigo-400 dark:hover:bg-indigo-950",ghost:"text-gray-600 hover:bg-gray-100 focus:ring-gray-500 dark:text-gray-300 dark:hover:bg-gray-700",danger:"bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-sm"},o={sm:"px-3 py-1.5 text-sm",md:"px-4 py-2 text-base",lg:"px-6 py-3 text-lg"},n=({variant:e="primary",size:r="md",isLoading:t=!1,leftIcon:a,rightIcon:n,fullWidth:d=!1,disabled:l,children:c,className:m="",...g})=>{let h=`
    inline-flex items-center justify-center font-medium rounded-lg
    transition-all duration-200 ease-out
    focus:outline-none focus:ring-2 focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
  `,u=t?"cursor-not-allowed":"";return(0,s.jsxs)("button",{className:`
        ${h}
        ${i[e]}
        ${o[r]}
        ${d?"w-full":""}
        ${u}
        ${m}
      `.trim(),disabled:l||t,...g,children:[t&&(0,s.jsxs)("svg",{className:"animate-spin -ml-1 mr-2 h-4 w-4",xmlns:"http://www.w3.org/2000/svg",fill:"none",viewBox:"0 0 24 24",children:[s.jsx("circle",{className:"opacity-25",cx:"12",cy:"12",r:"10",stroke:"currentColor",strokeWidth:"4"}),s.jsx("path",{className:"opacity-75",fill:"currentColor",d:"M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"})]}),!t&&a&&s.jsx("span",{className:"mr-2",children:a}),c,!t&&n&&s.jsx("span",{className:"ml-2",children:n})]})},d=({children:e,className:r="",hoverable:t=!1,onClick:a})=>s.jsx("div",{className:`
        bg-white rounded-xl shadow-md overflow-hidden
        dark:bg-gray-800
        ${t?"hover:shadow-lg cursor-pointer transition-shadow duration-200":""}
        ${r}
      `.trim(),onClick:a,children:e}),l=({children:e,className:r=""})=>s.jsx("div",{className:`px-6 py-4 ${r}`,children:e});(0,a.forwardRef)(({label:e,error:r,hint:t,leftIcon:a,rightIcon:i,fullWidth:o=!0,className:n="",id:d,disabled:l,...c},m)=>{let g=d||`input-${Math.random().toString(36).substr(2,9)}`,h=`${g}-error`,u=`${g}-hint`,x=r?"border-red-500 focus:ring-red-500":"",f=l?"bg-gray-100 cursor-not-allowed dark:bg-gray-700":"";return(0,s.jsxs)("div",{className:o?"w-full":"",children:[e&&s.jsx("label",{htmlFor:g,className:"block text-sm font-medium text-gray-700 mb-1.5 dark:text-gray-300",children:e}),(0,s.jsxs)("div",{className:"relative",children:[a&&s.jsx("div",{className:"absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400",children:a}),s.jsx("input",{ref:m,id:g,className:`
              px-4 py-2.5 border border-gray-300 rounded-lg
              bg-white text-gray-900 placeholder-gray-400
              transition-all duration-200 ease-out
              focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
              dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-500
              ${a?"pl-10":""}
              ${i?"pr-10":""}
              ${x}
              ${f}
              ${n}
            `.trim(),disabled:l,"aria-invalid":r?"true":"false","aria-describedby":r?h:t?u:void 0,...c}),i&&s.jsx("div",{className:"absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400",children:i})]}),r&&(0,s.jsxs)("p",{id:h,className:"mt-1.5 text-sm text-red-600 flex items-center",children:[s.jsx("svg",{className:"w-4 h-4 mr-1",fill:"currentColor",viewBox:"0 0 20 20",children:s.jsx("path",{fillRule:"evenodd",d:"M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z",clipRule:"evenodd"})}),r]}),t&&!r&&s.jsx("p",{id:u,className:"mt-1.5 text-sm text-gray-500 dark:text-gray-400",children:t})]})}).displayName="Input";let c=0,m=e=>{let r=`toast-${++c}`;return console.log("Toast added:",r,e),r},g={success:(e,r)=>m({message:e,type:"success",duration:r}),error:(e,r)=>m({message:e,type:"error",duration:r}),warning:(e,r)=>m({message:e,type:"warning",duration:r}),info:(e,r)=>m({message:e,type:"info",duration:r})},h=({variant:e="text",width:r,height:t,animation:a="pulse",className:i=""})=>{let o=`
    bg-gray-200 dark:bg-gray-700
    ${"pulse"===a?"animate-pulse":"animate-shimmer"}
  `,n={};return r&&(n.width="number"==typeof r?`${r}px`:r),t&&(n.height="number"==typeof t?`${t}px`:t),s.jsx("div",{className:`${o} ${({text:"rounded",circular:"rounded-full",rectangular:"rounded-none",rounded:"rounded-lg"})[e]} ${i}`.trim(),style:n,"aria-hidden":"true"})},u=({rows:e=5,className:r=""})=>s.jsx("div",{className:`space-y-3 ${r}`,children:Array.from({length:e}).map((e,r)=>(0,s.jsxs)("div",{className:"flex items-center space-x-4",children:[s.jsx(h,{variant:"circular",width:32,height:32}),(0,s.jsxs)("div",{className:"flex-1 space-y-2",children:[s.jsx(h,{variant:"text",width:"40%",height:"1rem"}),s.jsx(h,{variant:"text",width:"60%",height:"0.875rem"})]}),s.jsx(h,{variant:"text",width:"20%",height:"1rem"})]},r))})},8210:(e,r,t)=>{"use strict";t.r(r),t.d(r,{default:()=>m,metadata:()=>d,viewport:()=>l});var s=t(5036),a=t(820),i=t.n(a);t(5023),t(8070);let o={styleLoadTimeout:5e3,probeInterval:100,maxRetries:3},n=`
  (function() {
    if (typeof window === 'undefined') return;
    
    const READINESS_CONFIG = {
      styleLoadTimeout: ${o.styleLoadTimeout},
      probeInterval: ${o.probeInterval},
      maxRetries: ${o.maxRetries},
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
`,d={title:"捷阅证券信息助手",description:"证券内容智能分析与合规审核平台",icons:{icon:"/favicon.svg"},manifest:"/manifest.json"},l={themeColor:[{media:"(prefers-color-scheme: light)",color:"#6366f1"},{media:"(prefers-color-scheme: dark)",color:"#4f46e5"}]},c=`
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
`.replace(/\n/g,"");function m({children:e}){return(0,s.jsxs)("html",{lang:"zh-CN",className:i().variable,children:[(0,s.jsxs)("head",{children:[s.jsx("style",{id:"critical-css",dangerouslySetInnerHTML:{__html:c}}),s.jsx("script",{dangerouslySetInnerHTML:{__html:n}}),s.jsx("link",{rel:"preconnect",href:"https://fonts.googleapis.com"}),s.jsx("link",{rel:"preconnect",href:"https://fonts.gstatic.com",crossOrigin:"anonymous"}),s.jsx("meta",{name:"viewport",content:"width=device-width, initial-scale=1"}),s.jsx("meta",{name:"theme-color",content:"#6366f1"})]}),s.jsx("body",{className:`${i().className} antialiased`,children:s.jsx("div",{id:"readiness-root",className:"readiness-loading",children:e})})]})}},5023:()=>{}};