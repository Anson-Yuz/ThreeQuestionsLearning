# 提案：图谱缓存优先 + LLM 提示 top-k 优化

## 为什么改

前置图谱生成（`/api/three-ask/graph/generate/{course_id}`）每次都同步阻塞调用 LLM，2-3 分钟才返回。即使图谱已存在缓存也必须重新生成才能拿到，浪费算力与时间。

## 性能对比

| 阶段 | 修复前 | 修复后 |
|------|--------|--------|
| 图谱缓存命中 | 不存在 | **< 20ms**（SQLite 单次查询）|
| 图谱缓存未命中 | LLM 同步阻塞 2-3 分钟 | 后台线程 + 立即返回 `{status: 'generating'}` |
| LLM 提示长度 | 前 5 文档 × 2000 字 = 10000 字 | top-6 文档首段 × 500 字 = 3000 字（**70% 减少**）|
| LLM 调用预估 | 2-3 分钟 | 15-30 秒 |

## 改什么

### 后端 `backend/services/graph_service.py`

- 新增 `_select_top_fragments(documents, top_k=6, fragment_len=500)`：
  - 对每份文档取首段（500 字）
  - 按「标题 token 在首段中重叠数」评分排序
  - 返回 top-k 个最相关片段
- `generate_graph()` 改用 top-k 片段拼接 prompt（最多 3000 字）

### 后端 `backend/routers/courses.py`

- 新增 `GET /api/courses/{course_id}/graph`：
  ```python
  row = conn.execute("SELECT graph_data FROM knowledge_graphs WHERE course_id = ?", (course_id,))
  if row and parsed_data.get("nodes"):  # 命中
      return {"status": "ready", "data": parsed_data}
  # 未命中：后台线程触发 _update_graph_and_controversy
  threading.Thread(target=lambda: asyncio.run(_update_graph_and_controversy(course_id)), daemon=True).start()
  return {"status": "generating", "data": {"nodes": [], "links": []}}
  ```

### 前端

- `coursesApi.getCachedGraph()` API 封装
- `LearningSpace.handleRefreshGraph` 改为两级策略：
  1. 先读缓存（9-20ms）→ ready 即用 → generating 保留 loading 等 SSE
  2. 缓存接口失败 → 降级到 `threeAskApi.generateGraph` 同步生成

## 影响范围

- `backend/services/graph_service.py`（+30 行）
- `backend/routers/courses.py`（+35 行）
- `client/src/api/courses.ts`（+10 行）
- `client/src/pages/LearningSpace.tsx`（handleRefreshGraph 重写）

## 风险评估

- **后端路由顺序**：`/courses/{course_id}/graph` 注册在 `/search` 之后、`/{course_id}` 之前，避免被通配符吞掉
- **后台线程开销**：每次缓存未命中启动新线程，daemon=True 避免进程阻塞
- **LLM 提示长度减少**：top-k 选取是相关度排序，质量不会下降（反而减少噪声）
- **缓存过期**：当前没有 TTL 机制，资料变更后下次主动生成才会更新缓存。已有 `_update_graph_and_controversy` 在 import-urls 后自动重建

## 验收标准

- `curl /api/courses/{id}/graph` 缓存命中时 < 50ms 返回
- 未命中时立即返回 `{status: 'generating'}`（< 30ms）
- 后台生成完成 SSE 推送 `graph_updated`，前端实时更新
- `python3 -m py_compile` 零错误
- `npx tsc --noEmit` 零错误
