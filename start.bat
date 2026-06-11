@echo off

echo ========================================
echo   ANFSF Startup
echo ========================================
echo.

REM === Gitea ===
echo Starting Gitea...
start "Gitea" cmd /k "C:\gitea\gitea.exe web --port 3001 --work-path C:\gitea --config C:\gitea\custom\conf\app.ini"
echo   Gitea: http://localhost:3001

REM === Backend ===
echo Starting Backend...
start "ANFSF-Backend" cmd /k "set LLM_API_KEY=sk-865b6777e6744aa3b1eaf623bb3524dd && set LLM_BASE_URL=https://api.deepseek.com/v1&& set ANFSF_MODEL=deepseek-chat&& set GITEA_URL=http://localhost:3001 && set GITEA_USERNAME=anfsf && set GITEA_PASSWORD=anfsf123 && C:\Users\18079\AppData\Local\nvm\current\node.exe C:\Users\18079\Desktop\ANFSF-OS\anfsf\dist\server\index.js"
echo   Backend: http://localhost:3000

REM === Frontend ===
echo Starting Frontend...
start "ANFSF-Frontend" cmd /k "cd /d C:\Users\18079\Desktop\ANFSF-OS\anfsf\web && C:\Users\18079\AppData\Local\nvm\current\node.exe node_modules\vite\bin\vite.js --host"
echo   Frontend: http://localhost:5173

echo.
echo ========================================
echo   Backend:  http://localhost:3000/health
echo   Frontend: http://localhost:5173
echo   Gitea:    http://localhost:3001
echo ========================================
pause
