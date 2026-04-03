2:I[7831,[],""]
3:I[1909,["47","static/chunks/app/auth/forgot-password/page-fb9dd8b4fba61568.js"],""]
4:I[5613,[],""]
5:I[1778,[],""]
6:T57e,
  (function() {
    if (typeof window === 'undefined') return;
    
    const READINESS_CONFIG = {
      styleLoadTimeout: 5000,
      probeInterval: 100,
      maxRetries: 3,
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
0:["GVd_ZRwmvHzbWxx1OhoIS",[[["",{"children":["auth",{"children":["forgot-password",{"children":["__PAGE__",{}]}]}]},"$undefined","$undefined",true],["",{"children":["auth",{"children":["forgot-password",{"children":["__PAGE__",{},["$L1",["$","$L2",null,{"propsForComponent":{"params":{}},"Component":"$3","isStaticGeneration":true}],null]]},["$","$L4",null,{"parallelRouterKey":"children","segmentPath":["children","auth","children","forgot-password","children"],"loading":"$undefined","loadingStyles":"$undefined","loadingScripts":"$undefined","hasLoading":false,"error":"$undefined","errorStyles":"$undefined","errorScripts":"$undefined","template":["$","$L5",null,{}],"templateStyles":"$undefined","templateScripts":"$undefined","notFound":"$undefined","notFoundStyles":"$undefined","styles":null}]]},["$","$L4",null,{"parallelRouterKey":"children","segmentPath":["children","auth","children"],"loading":"$undefined","loadingStyles":"$undefined","loadingScripts":"$undefined","hasLoading":false,"error":"$undefined","errorStyles":"$undefined","errorScripts":"$undefined","template":["$","$L5",null,{}],"templateStyles":"$undefined","templateScripts":"$undefined","notFound":"$undefined","notFoundStyles":"$undefined","styles":null}]]},[null,["$","html",null,{"lang":"zh-CN","className":"__variable_f367f3","children":[["$","head",null,{"children":[["$","style",null,{"id":"critical-css","dangerouslySetInnerHTML":{"__html":"  :root {    --bg-primary: #ffffff;    --bg-secondary: #f8fafc;    --text-primary: #0f172a;  }  body {    margin: 0;    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;    background: var(--bg-primary);    color: var(--text-primary);  }  .navbar {    background: white;    box-shadow: 0 1px 3px rgba(0,0,0,0.1);  }  .hero {    background: linear-gradient(to bottom right, #eef2ff, #e0e7ff);  }"}}],["$","script",null,{"dangerouslySetInnerHTML":{"__html":"$6"}}],["$","link",null,{"rel":"preconnect","href":"https://fonts.googleapis.com"}],["$","link",null,{"rel":"preconnect","href":"https://fonts.gstatic.com","crossOrigin":"anonymous"}],["$","meta",null,{"name":"viewport","content":"width=device-width, initial-scale=1"}],["$","meta",null,{"name":"theme-color","content":"#6366f1"}]]}],["$","body",null,{"className":"__className_f367f3 antialiased","children":["$","div",null,{"id":"readiness-root","className":"readiness-loading","children":["$","$L4",null,{"parallelRouterKey":"children","segmentPath":["children"],"loading":"$undefined","loadingStyles":"$undefined","loadingScripts":"$undefined","hasLoading":false,"error":"$undefined","errorStyles":"$undefined","errorScripts":"$undefined","template":["$","$L5",null,{}],"templateStyles":"$undefined","templateScripts":"$undefined","notFound":[["$","title",null,{"children":"404: This page could not be found."}],["$","div",null,{"style":{"fontFamily":"system-ui,\"Segoe UI\",Roboto,Helvetica,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\"","height":"100vh","textAlign":"center","display":"flex","flexDirection":"column","alignItems":"center","justifyContent":"center"},"children":["$","div",null,{"children":[["$","style",null,{"dangerouslySetInnerHTML":{"__html":"body{color:#000;background:#fff;margin:0}.next-error-h1{border-right:1px solid rgba(0,0,0,.3)}@media (prefers-color-scheme:dark){body{color:#fff;background:#000}.next-error-h1{border-right:1px solid rgba(255,255,255,.3)}}"}}],["$","h1",null,{"className":"next-error-h1","style":{"display":"inline-block","margin":"0 20px 0 0","padding":"0 23px 0 0","fontSize":24,"fontWeight":500,"verticalAlign":"top","lineHeight":"49px"},"children":"404"}],["$","div",null,{"style":{"display":"inline-block"},"children":["$","h2",null,{"style":{"fontSize":14,"fontWeight":400,"lineHeight":"49px","margin":0},"children":"This page could not be found."}]}]]}]}]],"notFoundStyles":[],"styles":null}]}]}]]}],null]],[[["$","link","0",{"rel":"stylesheet","href":"/_next/static/css/03805e993130888c.css","precedence":"next","crossOrigin":""}]],"$L7"]]]]
7:[["$","meta","0",{"name":"viewport","content":"width=device-width, initial-scale=1"}],["$","meta","1",{"name":"theme-color","media":"(prefers-color-scheme: light)","content":"#6366f1"}],["$","meta","2",{"name":"theme-color","media":"(prefers-color-scheme: dark)","content":"#4f46e5"}],["$","meta","3",{"charSet":"utf-8"}],["$","title","4",{"children":"捷阅证券信息助手"}],["$","meta","5",{"name":"description","content":"证券内容智能分析与合规审核平台"}],["$","link","6",{"rel":"manifest","href":"/manifest.json"}],["$","link","7",{"rel":"icon","href":"/favicon.svg"}],["$","meta","8",{"name":"next-size-adjust"}]]
1:null
