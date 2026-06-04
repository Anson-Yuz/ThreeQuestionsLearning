# 提案：FTS5 全文索引 — 课程搜索 < 50ms

## 为什么改

前置 commit `620bf3b` 的搜索实现是 N+1 查询（每门课单独查 documents 表聚合文本），当课程数 > 50 时响应时间超过 1 分钟。用户反馈「搜索响应慢」。

## 性能对比

| 指标 | 修复前 | 修复后 |
|------|--------|--------|
| `q=Java` 响应 | 1 分钟+ | **18ms** |
| 查询次数 | N+1 (1 课程 1 次) | 1 次 FTS5 + 1 次 IN 元数据 |
| LLM/抓取 | 无 | 无（纯索引查询） |
| 资料变更同步 | 不刷新 | 文档创建/上传/导入后自动重建索引 |

## 改什么

### 后端 — FTS5 索引
`backend/database.py`：

```sql
CREATE VIRTUAL TABLE IF NOT EXISTS courses_fts USING fts5(
  course_id UNINDEXED, title, description, content, tokenize='unicode61'
);
```

辅助函数：
- `update_fts(course_id, title, description, full_text)` — 同步单门课
- `remove_fts(course_id)` — 软删除后移除
- `backfill_fts()` — 启动时全量回填已有课程
- `rebuild_course_fts(course_id)` — 文档变更后重建单门

启动时自动 `backfill_fts()`。

### 后端 — 搜索端点重写
`backend/routers/courses.py` `GET /api/courses/search`：

```python
# 1. FTS5 主查（< 50ms）
rows = conn.execute(
    "SELECT course_id, title, description, snippet(courses_fts, 3, '...', '...', 32), rank "
    "FROM courses_fts WHERE courses_fts MATCH ? ORDER BY rank LIMIT ?",
    (fts_query, top_k * 2)
)

# 2. LIKE 回退（FTS5 不可用时）
# 3. 批量 IN 查询取元数据（避免 N+1）
```

FTS 同步 Hook 位置：
- `courses.create_course` — 课程创建后立即索引
- `knowledge.upload` / `knowledge.upload-files` — 文档上传后
- `discover.import-urls` — URL 导入后

### 前端 — 课程库搜索
- `coursesApi.search(q, topK)` API 封装
- Home 页新增「在课程库中搜索」输入框 + 结果列表
- 300ms 防抖避免每键触发请求
- 结果卡片点击跳转 `/learning/:id`

## 影响范围

- `backend/database.py`（+40 行）
- `backend/routers/courses.py`（重写 `/search`，~80 行）
- `backend/routers/knowledge.py`（2 处 FTS hook）
- `backend/routers/discover.py`（1 处 FTS hook）
- `client/src/api/courses.ts`（+30 行 search API）
- `client/src/pages/Home.tsx`（+60 行搜索输入和结果）

## 风险评估

- **FTS5 不可用**：若 SQLite 未启用 FTS5 编译选项，捕获异常回退到 LIKE 搜索
- **首次启动慢**：`backfill_fts()` 在启动时全量回填，课程数 > 1000 时可能延迟数秒
- **同步失败**：`update_fts` / `rebuild_course_fts` 失败仅打印警告，不影响主流程
- **CJK 分词**：FTS5 `unicode61` tokenizer 是按 Unicode 切分（不完美但能匹配大部分中文）。如需更精准分词可改用 `tokenize='trigram'` 或外部 jieba

## 验收标准

- `curl "/api/courses/search?q=Java"` 在 < 50ms 内返回 200
- 创建/上传/导入文档后立即可被搜索到（无需手动重建）
- FTS5 异常时自动回退 LIKE 搜索
- 启动时打印 `✅ FTS 回填完成: N 门课程`
- 前端输入 300ms 后触发查询，结果列表实时更新
- `npx tsc --noEmit` 零错误
- `python3 -m py_compile` 零错误
