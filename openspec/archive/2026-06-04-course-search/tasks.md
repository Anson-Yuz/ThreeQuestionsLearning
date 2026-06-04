# 任务清单 — 课程搜索多因素排序 ✅

## 阶段 1：实现搜索端点

- [x] 在 `backend/routers/courses.py` 新增辅助函数：
  - `_CHINESE_RE` 中文字符正则
  - `_has_chinese(text)` 判断中文字符存在
  - `_tokenize(text)` 中英混合分词（jieba + 标点切分）
  - `_make_snippet(text, query, max_len=120)` 提取命中位置片段
- [x] 新增 `@router.get("/search")` 端点，签名：`q, top_k=10, prefer_chinese=True`
- [x] 实现多因素排序算法：内容相关 0.55 + 标题 0.30 + 中文 0.15
- [x] 添加分数阈值过滤（< 0.25 排除）
- [x] 返回字段：`id, title, keywords, original_question, status, doc_count, score, snippet, chinese_ratio`

## 阶段 2：路由顺序修复

- [x] 将 `/search` 端点注册位置前移到 `/{course_id}` 之前
- [x] 注释说明路由顺序依赖

## 阶段 3：验证

- [x] `python3 -m py_compile` 通过
- [x] 端到端测试：q=Java 返回 200，results 排序正确
- [x] 端到端测试：q=Java编程 触发中文加权
- [x] 控制台日志输出 `[search] q=... 命中 N 条` + top-5 分数

## 阶段 4：归档与推送

- [x] 提交 `620bf3b feat(courses): 新增 /api/courses/search 多因素排序搜索`
- [x] 推送到 origin/main
