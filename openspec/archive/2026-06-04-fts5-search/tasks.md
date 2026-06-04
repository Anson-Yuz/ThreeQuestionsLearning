# 任务清单 — FTS5 全文索引优化 ✅

## 阶段 1：后端 FTS5 基础设施

- [x] `database.py` 新增 `courses_fts` 虚拟表（`tokenize='unicode61'`）
- [x] `try/except` 包裹 CREATE，捕获 FTS5 不可用情况
- [x] `update_fts(course_id, title, description, full_text)` 辅助函数
- [x] `remove_fts(course_id)` 删除辅助
- [x] `backfill_fts()` 启动时全量回填（用 `GROUP_CONCAT` 聚合文档）
- [x] `rebuild_course_fts(course_id)` 单门课重建

## 阶段 2：FTS 同步 Hook

- [x] `courses.create_course` — 课程创建后 `update_fts`
- [x] `knowledge.upload`（单文件）— 文档入库后 `rebuild_course_fts`
- [x] `knowledge.upload-files`（多文件）— 循环结束后 `rebuild_course_fts`
- [x] `discover.import-urls` — 成功导入后 `rebuild_course_fts`
- [x] 所有 hook 用 `try/except` 包裹，失败仅打印警告

## 阶段 3：搜索端点重写

- [x] 移除原 N+1 查询（每门课查 docs）
- [x] 改用 FTS5 `MATCH` 单次查询
- [x] FTS5 异常时回退 LIKE + Python 排序
- [x] 一次 `IN (?,?,?)` 查询批量取元数据
- [x] `snippet()` 函数返回高亮片段
- [x] 中文查询时按 chinese_ratio 微加权
- [x] 打印 `[search] q=... 命中 N 条` 日志

## 阶段 4：前端集成

- [x] `coursesApi.search(q, topK)` API 封装
- [x] `CourseSearchResult` / `CourseSearchResponse` 类型定义
- [x] Home 页新增「在课程库中搜索」输入框
- [x] `useEffect` + 300ms 防抖触发查询
- [x] 搜索结果列表实时显示
- [x] 点击结果卡片 `navigate('/learning/:id')`

## 阶段 5：验证

- [x] `curl "/api/courses/search?q=Java"` 18ms 返回
- [x] `npx tsc --noEmit` 零错误
- [x] `python3 -m py_compile` 零错误
- [x] 提交 `de1c764 perf(search): FTS5 全文索引 + 前端防抖,搜索 < 50ms`
- [x] 推送到 origin/main
