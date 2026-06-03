# 任务清单 — OpenSpec 100% 完成

## 阶段 0：基线检测
- [x] 运行 auto-fix.sh 创建目录
- [x] 运行 check-completeness.sh 获取基线（26%）

## 阶段 1：后端基础层
- [x] backend/requirements.txt
- [x] backend/.env.example
- [x] backend/database.py（13 张表）
- [x] backend/models.py
- [x] backend/main.py
- [x] backend/schema.sql
- [x] 门禁：python3 -m compileall backend/

## 阶段 2：后端路由层
- [x] routers/courses.py、knowledge.py、three_ask.py、quiz.py、sse.py

## 阶段 3：后端服务层
- [x] llm_service.py、embedding_service.py、parser_service.py
- [x] chroma_client.py、graph_service.py、quiz_service.py

## 阶段 4：前端 Store + API
- [x] courseStore.ts、learningStore.ts、quizStore.ts
- [x] client.ts、courses.ts、knowledge.ts、threeAsk.ts

## 阶段 5：前端页面 + 路由
- [x] QuizPlay.tsx、QuizReport.tsx、useSSE.ts
- [x] App.tsx 路由补全（/quiz/:courseId/play、/quiz/:courseId/report）

## 阶段 6：配置 + 文档
- [x] README.md、API.md、DEPLOY.md
- [x] docker-compose.yml、Dockerfile × 2
- [x] start.sh、start.bat、install.sh、install.bat

## 阶段 7：测试
- [x] backend/tests/test_courses.py、test_models.py（21 用例）

## 阶段 8：Bug 修复
- [x] 搜索框 IME 冲突 → form onSubmit
- [x] Mock 数据清理 → 接入真实 API
- [x] 测试数据残留 → full-check.sh 自动清理
- [x] Electron 桌面打包 → electron/
- [x] 双击启动 → start.command

## 验证结果
- full-check.sh: 39 pass / 4 warn / 0 fail ✓
- tsc --noEmit: 零错误 ✓
- npm run build: 成功 ✓
- pytest: 21/21 ✓
