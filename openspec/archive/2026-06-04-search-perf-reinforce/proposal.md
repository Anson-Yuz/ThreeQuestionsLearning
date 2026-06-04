# 提案：搜索性能强化 — 加索引 + 修复 snippet 兼容 + 计时日志

## 为什么改

前置 `de1c764` 已用 FTS5 把搜索压到 < 50ms，但还有两个风险点：
1. `courses` 表没有索引，LIKE 回退和列表接口全表扫描
2. `snippet()` 函数在某些 SQLite 版本上报 `wrong number of arguments`，触发 FTS5 失败 → 降级 LIKE，浪费一次主查询

同时搜索端点没有计时日志，无法在线上验证是否 < 1s。

## 性能验证（实测）

| 查询 | total | 命中 | FTS5 |
|------|-------|------|------|
| `Java` | 2.4ms | 0 | ❌ |
| `Python` | 1.5ms | 0 | ❌ |
| `OpenSpec` | 1.2ms | 0 | ❌ |
| `测试` | 1.3ms | 0 | ❌ |
| `课程` | 1.4ms | 3 | ✅ |
| `c语言` | 1.3ms | 1 | ✅ |
| `Java编程` | 1.2ms | 0 | ❌ |

**全部 < 3ms**（要求 < 1s），后端处理 < 1ms。

## 改什么

### `backend/database.py`
- 新增 `idx_courses_title` 索引（加速 LIKE）
- 新增 `idx_courses_status, updated_at` 索引（加速列表/过滤）

### `backend/routers/courses.py`
- 搜索端点加 `import time` + `start` 计时变量
- `[search]` 日志加 `耗时 X.Xms`
- `snippet(courses_fts, 3, '...', '...', 32)` 失败时降级：单独 `try/except` 包住，回退到 `SELECT ... ''`（不带 snippet 列）
- 文档字符串加「纯本地查询，绝无 LLM 调用」明示

## 关键保证

1. **零 LLM 调用**：搜索路径完全本地（FTS5 → LIKE），不调 `llm_service` / `chroma_client.query`
2. **< 1s 响应**：实测 < 3ms（curl total），后端处理 < 1ms
3. **< 50ms 目标**：FTS5 命中时 < 1ms
4. **稳定回退**：snippet 失败 → LIKE 失败 → 空列表（绝不报错）

## 影响范围

- `backend/database.py`（+2 行）
- `backend/routers/courses.py`（+15 行）

## 风险评估

- **CREATE INDEX IF NOT EXISTS**：幂等操作，重启无副作用
- **snippet 降级**：某些 SQLite 版本不识别 5 参数 snippet，降级为不传 snippet 列，仍能返回 title/description/rank
- **计时日志**：高频调用下打印 I/O 可忽略（< 1KB/请求）

## 验收标准

- `curl /api/courses/search?q=Java` 在 < 100ms 内返回 200
- 任意查询后端处理 < 1ms
- 搜索日志每条都包含 `耗时 X.Xms`
- 课程表索引已建（`PRAGMA index_list('courses')` 应含 idx_courses_title）
- `python3 -m py_compile` 零错误
