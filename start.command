#!/bin/bash
cd "$(dirname "$0")"

echo "========================================"
echo "  三问高效学习机 - 启动中..."
echo "========================================"

# 检查 Node.js
if ! command -v node &> /dev/null; then
  echo "❌ 未安装 Node.js，请先安装: https://nodejs.org"
  read -p "按回车退出..."
  exit 1
fi

# 检查 Python
if ! command -v python3 &> /dev/null; then
  echo "❌ 未安装 Python3，请先安装: https://python.org"
  read -p "按回车退出..."
  exit 1
fi

# 安装前端依赖（如需要）
if [ ! -d "client/node_modules" ]; then
  echo "📦 首次运行，安装前端依赖..."
  cd client && npm install && cd ..
fi

# 安装后端依赖（如需要）
if ! python3 -c "import fastapi" 2>/dev/null; then
  echo "📦 安装后端依赖..."
  pip3 install fastapi uvicorn python-dotenv pydantic python-multipart
fi

# 检查 .env
if [ ! -f "backend/.env" ]; then
  cp backend/.env.example backend/.env
  echo "⚠️  已创建 backend/.env，如需使用 AI 功能请配置 MINIMAX_API_KEY"
fi

# 启动后端
echo "🔧 启动后端 (端口 8000)..."
cd backend
python3 main.py &
BACKEND_PID=$!
cd ..

# 等待后端就绪
echo "⏳ 等待后端就绪..."
for i in $(seq 1 30); do
  if curl -s http://localhost:8000/api/health > /dev/null 2>&1; then
    echo "✅ 后端已就绪"
    break
  fi
  sleep 1
done

# 启动前端
echo "🎨 启动前端 (端口 5173)..."
cd client
npx vite --host --port 5173 &
FRONTEND_PID=$!
cd ..

sleep 2

# 打开浏览器
echo "🌐 打开浏览器..."
open http://localhost:5173

echo ""
echo "========================================"
echo "  ✅ 已启动！"
echo "  浏览器访问: http://localhost:5173"
echo "  按 Ctrl+C 或关闭此窗口停止"
echo "========================================"

# 等待用户关闭
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
