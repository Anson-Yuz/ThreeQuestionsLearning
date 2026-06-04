# 任务清单 — 消灭 threading+asyncio.run，改用 FastAPI BackgroundTasks ✅

## 阶段 1：图谱端点修复

- [x] `routers/courses.py` `GET /courses/{id}/graph` 加 `background_tasks: BackgroundTasks` 参数
- [x] 删除 `threading.Thread(target=_bg, daemon=True).start()` 块
- [x] 改用 `background_tasks.add_task(_update_graph_and_controversy, course_id)`
- [x] `_update_graph_and_controversy` 本身已是 `async def`（无需修改）

## 阶段 2：测评缓存端点修复

- [x] 提取 `_async_generate_quiz(course_id: str)` 为模块级 async 函数
- [x] 内部用 `await qs.generate_quiz(...)`（不再 `asyncio.run`）
- [x] 端点加 `background_tasks: BackgroundTasks` 参数
- [x] 删除内嵌 `_bg()` 函数 + `threading.Thread` 块
- [x] 改用 `background_tasks.add_task(_async_generate_quiz, course_id)`

## 阶段 3：quick-quiz 端点修复

- [x] 端点加 `background_tasks: BackgroundTasks` 参数
- [x] 删除内嵌 `_bg()` 函数 + `threading.Thread` 块
- [x] 改用 `background_tasks.add_task(_background_generate_llm_quiz, course_id)`

## 阶段 4：服务层函数改造

- [x] `quiz_service.py` `_background_generate_llm_quiz`：`def` → `async def`
- [x] `asyncio.run(qs.generate_quiz(...))` → `await qs.generate_quiz(...)`

## 阶段 5：清理

- [x] 删除 `import threading`（不再使用）
- [x] 验证无 `threading.Thread` 残留调用（grep 确认仅注释提及）

## 阶段 6：实测与推送

- [x] `python3 -m py_compile routers/courses.py services/quiz_service.py` 零错误
- [x] 启动后端，访问三个端点：
  - `/graph` 返回 14ms，BackgroundTasks 触发
  - `/quizzes` 返回 19ms（缓存命中）
  - `/quick-quiz` 返回 247ms（同步生成 10 题 + BackgroundTasks 触发）
- [x] 日志显示 `[import] 后台任务开始` + `[graph] 开始调用 LLM` —— 任务真正执行
- [x] 提交 `25d43c3 fix: 改用 FastAPI BackgroundTasks 取代 threading+asyncio.run`
- [x] 推送到 origin/main
