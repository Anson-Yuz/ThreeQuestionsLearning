#!/bin/bash
echo "🚀 启动三问高效学习机..."

# 启动后端
echo "启动后端服务 (port 8000)..."
cd backend
python3 main.py &
BACKEND_PID=$!
cd ..

# 等待后端就绪
echo "等待后端就绪..."
for i in $(seq 1 30); do
  if curl -s http://localhost:8000/api/health > /dev/null 2>&1; then
    echo "✅ 后端已就绪"
    break
  fi
  sleep 1
done

# 启动前端
echo "启动前端开发服务器 (port 5173)..."
cd client
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ 三问高效学习机已启动！"
echo "   前端: http://localhost:5173"
echo "   后端: http://localhost:8000/docs"
echo ""
echo "按 Ctrl+C 停止"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
