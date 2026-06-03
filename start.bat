@echo off
echo 🚀 启动三问高效学习机...

echo 启动后端服务 (port 8000)...
cd backend
start "Backend" python main.py
cd ..

echo 等待后端就绪...
timeout /t 5 /nobreak > nul

echo 启动前端开发服务器 (port 5173)...
cd client
start "Frontend" npm run dev
cd ..

echo.
echo ✅ 三问高效学习机已启动！
echo    前端: http://localhost:5173
echo    后端: http://localhost:8000/docs
pause
