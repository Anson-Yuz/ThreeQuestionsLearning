# 三问高效学习机

> AI驱动的个性化学习工具 — 以用户提问为核心触发机制的智能学习系统

## 如何打开程序

**注意：不能直接双击 index.html 打开。** 这是一个前后端分离的 Web 应用，需要启动服务。

### 首次使用（3步）

**第1步：安装依赖**

| 系统 | 操作 |
|------|------|
| Mac | 打开终端，进入项目目录，运行 `bash install.sh` |
| Windows | 双击 `install.bat` |

**第2步：配置 API Key**

打开 `backend/.env`，将 `MINIMAX_API_KEY` 替换为你的真实 API Key（从 https://platform.minimaxi.com 获取）

**第3步：启动程序**

| 系统 | 操作 |
|------|------|
| Mac | **双击 `start.command`** 即可启动（首次可能需右键 → 打开） |
| Windows | 双击 `start.bat` |

启动后浏览器自动打开 **http://localhost:5173**。

### 后续使用

第二次使用只需执行第3步（启动程序）即可。

---

## 快速开始（命令行）

### 环境要求
- Node.js 18+、Python 3.10+
- MiniMax API Key

### 安装

```bash
bash install.sh       # Mac/Linux
install.bat           # Windows
```

### 配置

编辑 `backend/.env`，设置 `MINIMAX_API_KEY` 为真实值。

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
