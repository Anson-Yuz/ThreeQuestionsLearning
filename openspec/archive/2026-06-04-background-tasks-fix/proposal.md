# 提案：消灭 threading + asyncio.run，改用 FastAPI BackgroundTasks

## 为什么改

三问引擎的图谱、测评缓存端点原本用 `threading.Thread(target=..., daemon=True).start()` 内调用 `asyncio.run()` 启动后台 LLM 生成：

```python
# 旧实现（有 bug）
def _bg():
    asyncio.run(_update_graph_and_controversy(course_id))
threading.Thread(target=_bg, daemon=True).start()
```

**问题**：FastAPI 本身在 asyncio 事件循环中运行。在事件循环线程内启动新线程跑 `asyncio.run()`，会触发：
- `RuntimeError: Event loop is already running`（若新线程尝试 attach 到主循环）
- 任务静默失败（若 `asyncio.run()` 在新线程中创建独立循环但 LLM 客户端 httpx 已绑定主循环的 connector）

结果：图谱/测评接口缓存未命中时，后台生成 **永远不写缓存，SSE 永远不推送** → 前端永远 `generating`。

## 改什么

### 修复方案

用 FastAPI 原生 `BackgroundTasks` 替代 `threading.Thread + asyncio.run`：
- `background_tasks.add_task()` 把任务挂到**同一个** asyncio 事件循环
- 任务完成后随响应一起 flush，无事件循环冲突

### 改动文件

**`backend/routers/courses.py`**
- 3 个端点签名加 `background_tasks: BackgroundTasks` 参数：
  - `GET /courses/{id}/graph` — `add_task(_update_graph_and_controversy, course_id)`
  - `GET /courses/{id}/quizzes` — 提取 `_async_generate_quiz` 模块级 async 函数
  - `GET /courses/{id}/quick-quiz` — `add_task(_background_generate_llm_quiz, course_id)`
- 删除 `import threading`

**`backend/services/quiz_service.py`**
- `_background_generate_llm_quiz` 从 `def` 改为 `async def`
- `asyncio.run(qs.generate_quiz(...))` → `await qs.generate_quiz(...)`

## 影响范围

- `backend/routers/courses.py`（-24 / +18 行）
- `backend/services/quiz_service.py`（+2 / -2 行）

## 风险评估

- **BackgroundTasks 时机**：FastAPI 在响应发送后执行 BackgroundTasks，已与 `push_event` SSE 推送兼容（_update_graph_and_controversy 内部会推 `graph_updated`）
- **后台异常**：单个任务失败不影响响应（FastAPI 内部 try/except 包装）
- **discover.py 中的 `_update_graph_and_controversy`**：本身已是 `async def`，传入 BackgroundTasks 直接执行

## 验收标准

- 三个 GET 端点都返回 < 300ms（缓存命中/quick）
- 无 `Event loop is already running` 错误
- 后台日志可见 `[import] 后台任务开始` → `[graph] 开始调用 LLM` 顺序执行
- `python3 -m py_compile` 零错误
