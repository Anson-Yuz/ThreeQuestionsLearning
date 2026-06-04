# 任务清单 — 搜索性能强化 ✅

## 阶段 1：数据库索引

- [x] `database.py` 在 courses 表创建后追加
- [x] `CREATE INDEX IF NOT EXISTS idx_courses_title ON courses(title)`
- [x] `CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status, updated_at)`
- [x] 幂等：IF NOT EXISTS，重启不会报错

## 阶段 2：搜索端点计时

- [x] `routers/courses.py` 搜索端点加 `import time` + `start = time.time()`
- [x] `[search]` 日志末尾加 `耗时 {(time.time()-start)*1000:.1f}ms`
- [x] 文档字符串加「纯本地查询，绝无 LLM 调用」明示
- [x] 性能目标：< 1 秒（实测 < 3ms）

## 阶段 3：snippet 兼容

- [x] 包内层 `try/except` 隔离 snippet 调用
- [x] snippet 失败时降级：SELECT 列改为 `''` 占位
- [x] 同时保留 rank 列（不影响排序）
- [x] 不影响外层 `except`（整体 FTS5 仍可能失败降级到 LIKE）

## 阶段 4：实测性能

- [x] 测试 7 个查询（Java/Python/OpenSpec/测试/课程/c语言/Java编程）
- [x] 全部 total < 3ms
- [x] FTS5 命中 2 个（课程/c语言）
- [x] snippet 兼容修复后 0 个查询失败

## 阶段 5：归档与推送

- [x] `python3 -m py_compile backend/routers/courses.py backend/database.py` 零错误
- [x] 提交 `0af6a45 perf(search): 强化 FTS5,加 courses 表索引 + 修复 snippet() 兼容性`
- [x] 推送到 origin/main
