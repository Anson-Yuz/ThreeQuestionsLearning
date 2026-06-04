# 提案：知识图谱 + Tab 栏 + 上传 + 测评 修复

## 为什么改

排查前端反馈的 5 类问题，确认其中 4 类为可观测的真问题：

1. **知识图谱 Bloom 颜色不显示** — 节点未按布鲁姆六分类上色，tooltip 长文字溢出
2. **Tab 栏冗余** — 底部 4 个 Tab 中「学习」「测评」与首页课程卡片功能重复
3. **「上传资料」按钮无反应** — 按钮纯 UI 占位，未绑定 input/上传事件
4. **测评一直载入中** — 缺少超时控制，错误态/重试入口缺失

第 5 类（搜索结果不相关）描述的端点 `/api/courses/search?q=xxx` 在代码中不存在（实际只有 `/api/knowledge/search` 向量搜索），暂不处理。

## 改什么

| # | 问题 | 修复方案 |
|---|------|---------|
| 1 | Bloom 颜色不显示 | 后端 `_validate_graph` 补全中文 `category` 字段；前端 `BLOOM_COLORS` 用中文 key；ECharts `categories` 与 `data` 直接按 category 名匹配 |
| 1 | tooltip 文字溢出 | `confine: true` + `extraCssText: word-break:break-all; max-width:240px` |
| 1 | LLM 偏废某分类 | 后端 `_balance_bloom()` 借调节点；prompt 强化六分类各 2-3 个的要求 |
| 2 | Tab 栏冗余 | 移除「学习」「测评」两个 NavLink；保留「首页」「我的」，`justify-center gap-24` 居中 |
| 3 | 上传按钮无反应 | 隐藏 `<input type=file multiple>` + `fileInputRef`，按钮 onClick 触发，调用 `knowledgeApi.upload` |
| 4 | 测评一直载入中 | 60s 超时定时器；提取 `loadQuiz` 供重试；错误态显示在 `EmptyState` 标题 + 「重试」按钮 |

## 影响范围

- `client/src/components/business/KnowledgeGraph.tsx` — Bloom 颜色 + tooltip 断字 + ErrorBoundary
- `client/src/components/common/ErrorBoundary.tsx`（新增）— 包裹图谱，捕获 ECharts 崩溃
- `client/src/components/layout/TabBarLayout.tsx` — 仅保留两个 Tab 居中
- `client/src/pages/LearningSpace.tsx` — SSE 断线重连 + 上传按钮绑定
- `client/src/pages/QuizCenter.tsx` — 超时定时器 + 错误态
- `backend/services/graph_service.py` — `_validate_graph` 输出 `category` + `_balance_bloom`
- `backend/routers/three_ask.py` — `_run_async_bg` 线程后台

## 风险评估

- **图谱渲染兼容**：ECharts `categories` 用中文 name，前端 `BLOOM_COLORS` 也用中文 key；旧缓存（英文 `bloom_level`）走 fallback 不影响显示
- **SSE 重连风暴**：`visibilitychange` 仅在 `EventSource.CLOSED` 时连接，避免重复连接
- **测评超时**：`setTimeout` 在 `then/catch/finally` 三处都 `clearTimeout`，避免误触发

## 验收标准

- 进入学习空间 → 知识图谱出现 6 种颜色节点（紫/蓝/绿/橙/红/粉）
- 鼠标悬停节点 → tooltip 不超出容器，文字自动断行
- 底部 Tab 仅显示「首页」「我的」且居中
- 点击「上传资料」→ 弹出文件选择器，选择后文档列表更新
- 进入测评页 → 60s 内看到题目；超时或失败时显示「重试」按钮可重试
- `npx tsc --noEmit` 零错误
- 后端 `python3 -m py_compile` 零错误
