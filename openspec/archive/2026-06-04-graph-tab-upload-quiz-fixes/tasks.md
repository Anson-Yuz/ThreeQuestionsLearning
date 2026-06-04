# 任务清单 — 图谱 / Tab / 上传 / 测评 修复 ✅

## 阶段 1：知识图谱 Bloom 颜色分类

### 1.1 后端图谱数据补全
- [x] `graph_service.py` 新增 `BLOOM_TO_CATEGORY` 映射（en → zh）
- [x] `_validate_graph()` 每个节点补 `category` 字段（中文：记忆/理解/应用/分析/评价/创造）
- [x] `_balance_bloom()` 当 LLM 偏废某分类时从数量多的分类借调
- [x] prompt 强化：六种分类各 2-3 个节点，描述具体含义

### 1.2 前端 KnowledgeGraph
- [x] 新增 `BLOOM_COLORS`（中文 key）+ `EN_TO_CATEGORY` + `CATEGORY_ORDER` + `VALID_CATEGORIES`
- [x] ECharts `categories` 与 `data.category` 都用中文名匹配
- [x] tooltip `extraCssText: word-break:break-all; max-width:240px` + `confine: true`
- [x] 右下角图例改用 `CATEGORY_ORDER` 顺序渲染，色块与节点一致
- [x] `VALID_CATEGORIES` 二次校验非合法 category → 回退「理解」

### 1.3 ErrorBoundary（新增）
- [x] `client/src/components/common/ErrorBoundary.tsx` 包裹图谱
- [x] ECharts 崩溃时显示「图谱渲染异常」+ 重试按钮

## 阶段 2：Tab 栏简化

- [x] 移除「学习」「测评」两个 NavLink 与对应图标
- [x] 容器改为 `justify-center gap-24 max-w-[400px] mx-auto`
- [x] 删除 `BrainIcon` / `ClipboardIcon` 引用

## 阶段 3：上传按钮绑定

- [x] `LearningSpace` 新增 `fileInputRef` + `uploading` 状态
- [x] 隐藏 `<input type="file" multiple accept=".pdf,.doc,.docx,.md,.txt">`
- [x] 「上传资料」按钮 onClick → `fileInputRef.current?.click()`
- [x] `handleFileChange` 循环调用 `knowledgeApi.upload(courseId, file)`，完成后 `setRefreshKey(k+1)` 刷新列表
- [x] 上传中按钮文案变「上传中…」，完成后清空 input

## 阶段 4：测评超时与重试

- [x] `QuizCenter` 提取 `loadQuiz` 为 `useCallback`
- [x] 60s 超时定时器，在 then/catch/finally 三处都 `clearTimeout`
- [x] 新增 `errorMsg` 状态
- [x] `EmptyState` 标题改用 `errorMsg` 或默认「暂无测评」
- [x] `action="重试" onAction={loadQuiz}`

## 阶段 5：归档与推送

- [x] 所有 commit 已通过 OpenSpec pre-push 钩子
- [x] `cf37734` KnowledgeGraph 校验与断字
- [x] `a2b6090` Tab 简化 + 上传 + 测评超时
- [x] `b1ab3fa` Bloom 中文 category + tooltip
- [x] `ea3b4b3` Bloom 均衡 + tooltip 溢出
- [x] `d7af12d` 图谱稳定性 + SSE 重连
- [x] `d1bf2e4` 后台任务 threading
- [x] `73d7ad0` SSE 依赖 + Vite 代理
- [x] `43156ee` LLM chat_json
- [x] 推送到 origin/main
