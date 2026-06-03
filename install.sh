#!/bin/bash
echo "📦 安装三问高效学习机依赖..."

# 后端依赖
echo "安装后端依赖..."
cd backend
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "  ⚠️  已生成 .env，请编辑设置 MINIMAX_API_KEY"
fi
pip3 install -r requirements.txt
cd ..

# 前端依赖
echo "安装前端依赖..."
cd client
npm install
cd ..

# 创建数据目录
mkdir -p data/uploads data/chroma data/exports

# 设置脚本权限
chmod +x start.sh install.sh scripts/*.sh

echo ""
echo "✅ 安装完成！"
echo "   1. 编辑 backend/.env 设置 MINIMAX_API_KEY"
echo "   2. 运行 bash start.sh 启动"
