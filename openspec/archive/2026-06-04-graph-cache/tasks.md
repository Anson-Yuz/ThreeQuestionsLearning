# 任务清单 — 图谱缓存优先 + LLM 提示 top-k 优化 ✅

## 阶段 1：后端 LLM 提示优化

- [x] `graph_service.py` 新增 `_select_top_fragments(documents, top_k=6, fragment_len=500)`
  - 每份文档取首段 500 字
  - 评分：标题 token 在首段中重叠数
  - 按相关度 + 长度降序排序
- [x] `generate_graph()` 改用 top-k 片段拼接 prompt（3000 字以内）
- [x] 原 `combined_text[:4000]` 改为 `_select_top_fragments(...).join(...)`

## 阶段 2：后端缓存优先端点

- [x] 新增 `GET /api/courses/{course_id}/graph` 端点
- [x] 命中判断：读 `knowledge_graphs` 表，解析 JSON，`nodes` 非空才返回 ready
- [x] 未命中：启动 `threading.Thread(daemon=True)` 跑 `asyncio.run(_update_graph_and_controversy(course_id))`
- [x] 立即返回 `{status: 'generating', data: {nodes: [], links: []}}`
- [x] 路由注册位置：在 `/search` 之后、`/{course_id}` 之前

## 阶段 3：前端缓存优先策略

- [x] `coursesApi.getCachedGraph()` API 封装
- [x] `LearningSpace.handleRefreshGraph` 重写：
  - 阶段 1：await `coursesApi.getCachedGraph(courseId)`，ready 即用
  - 阶段 2：`status === 'generating'` 保持 loading，等 SSE `graph_updated` 事件
  - 阶段 3：缓存接口失败 → 降级到 `threeAskApi.generateGraph` 同步生成

## 阶段 4：验证与推送

- [x] `python3 -m py_compile routers/courses.py services/graph_service.py` 零错误
- [x] `npx tsc --noEmit` 零错误
- [x] 实际测试：缓存命中 9-20ms，未命中 30ms 立即返回 + 后台线程
- [x] 提交 `ee148ba perf(graph): 图谱缓存优先返回 + LLM 提示 top-k 片段`
- [x] 推送到 origin/main
