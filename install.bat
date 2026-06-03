@echo off
echo 📦 安装三问高效学习机依赖...

echo 安装后端依赖...
cd backend
if not exist ".env" (
    copy .env.example .env
    echo   ⚠️  已生成 .env，请编辑设置 MINIMAX_API_KEY
)
pip install -r requirements.txt
cd ..

echo 安装前端依赖...
cd client
call npm install
cd ..

echo 创建数据目录...
mkdir data\uploads data\chroma data\exports 2>nul

echo.
echo ✅ 安装完成！
echo    1. 编辑 backend\.env 设置 MINIMAX_API_KEY
echo    2. 双击 start.bat 启动
pause
