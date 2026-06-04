# 提案：课程搜索多因素排序

## 为什么改

当前课程发现路径：
- `/api/courses/list` 按 updated_at DESC 倒序返回所有课程
- `/api/knowledge/search` 只在单课程内部做向量检索

用户在前端搜索时无法对「全部课程」做关键词匹配，标题相近但内容无关的课程会与真正相关的课程并列出现（如 "Java下载" 与 "Java 编程思想" 排序相同）。

## 改什么

新增 `GET /api/courses/search?q=...&top_k=10&prefer_chinese=true` 端点，多因素排序：

| 维度 | 权重 | 计算方式 |
|------|------|----------|
| 内容相关 | 0.55 | 查询 token 在课程文档聚合文本中的命中率（归一化到 0-1）|
| 标题匹配 | 0.30 | 完全包含 → 1.0；token 部分匹配 → 0.6；无匹配 → 0 |
| 中文加权 | 0.15 | 中文查询按内容中文占比加分；英文查询时中文内容反而降权 |

附加功能：
- 中英混合分词：中文用 jieba，英文按标点/空白切分
- 返回 `snippet`：query 首次出现位置前后 30+90 字符片段
- 分数阈值 0.25 过滤低相关结果
- 控制台日志输出 top-5 分数便于调试

## 影响范围

- `backend/routers/courses.py` — 新增 `/search` 端点 + 辅助函数 `_tokenize` / `_make_snippet` / `_has_chinese`

## 风险评估

- **路由顺序**：FastAPI 按注册顺序匹配。`/{course_id}` 是通配符路由，必须在 `/search` 之后注册，否则 "search" 会被当成 course_id 匹配 `/{course_id}` 返回 404
- **性能**：当前实现对每个课程 N+1 查询（先查 courses 再循环查 documents）。单次请求约 N 次 SQLite 查询。当课程数 < 1000 时在 100ms 内完成；超过 1000 课程需改用 JOIN
- **分词依赖**：`jieba` 已在 requirements.txt；如未安装会回退到正则中文字符切分

## 验收标准

- `GET /api/courses/search?q=Java` 返回 200 + JSON，results 按 score 降序
- 中文查询 "Java编程" 触发中文加权，Chinese ratio > 0.5 的课程优先
- 英文查询 "Python" 中文资料被降权或过滤
- 路由 `/search` 不再返回 404 "课程不存在"
- 控制台打印 `[search] q=... 命中 N 条` 日志
- `python3 -m py_compile backend/routers/courses.py` 零错误
