# 三问高效学习机

> AI驱动的个性化学习工具 — 以用户提问为核心触发机制的智能学习系统

## 快速开始

### 环境要求
- Node.js 18+、Python 3.10+
- MiniMax API Key

### 安装

```bash
# 自动安装
bash install.sh       # Mac/Linux
install.bat           # Windows

# 或手动安装
cd client && npm install
cd ../backend && pip install -r requirements.txt
```

### 配置

```bash
# 后端环境变量
cp backend/.env.example backend/.env
# 编辑 backend/.env，设置 MINIMAX_API_KEY
```

### 启动

```bash
bash start.sh         # Mac/Linux
start.bat             # Windows
```

- 前端: http://localhost:5173
- 后端 API 文档: http://localhost:8000/docs

## 技术栈

| 模块 | 技术 |
|------|------|
| 前端 | React 18 + TypeScript + Vite + Tailwind CSS |
| 后端 | Python FastAPI |
| 数据库 | SQLite + ChromaDB |
| AI | MiniMax-M2.7 / BAAI/bge-large-zh |
| 实时推送 | SSE (Server-Sent Events) |

## 核心功能

- **柔性课程生成**: 用户提问触发，AI自动构建学习路径
- **三问认知引擎**: 知识图谱 → 争议分析 → 测评验证
- **智能知识库**: 用户上传 + AI自动补充复合资料库
- **能力雷达**: Bloom认知层级六维评估

## 项目结构

```
├── client/           # React 前端
│   └── src/
│       ├── pages/    # 页面组件
│       ├── components/ # UI/业务组件
│       ├── stores/   # Zustand 状态管理
│       └── api/      # API 调用层
├── backend/          # Python FastAPI 后端
│   ├── routers/      # API 路由
│   ├── services/     # 业务服务
│   └── database.py   # 数据库层
├── scripts/          # 检测/修复脚本
├── data/             # 本地数据存储
└── OpenSpec.md       # 完整规格文档
```
