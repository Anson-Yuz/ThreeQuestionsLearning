# 提案：修复 4 个核心 Bug

## 为什么改

4 个 Bug 影响基本使用体验，3 个标记为 🔴 高优先级。

## 改什么

| # | 问题 | 修复方案 |
|---|------|---------|
| 1 | 刷新学习空间白屏/崩溃 | LearningSpace 添加 loading → 数据就绪 → 渲染三态；SSE cleanup |
| 2 | 空状态提示不友好 + 暴露 "Failed to fetch" | 全局错误拦截 → 友好文案；空状态组件统一 |
| 3 | 搜索功能完全失效 | 修复 /api/knowledge/search 端点实现语义检索 |
| 4 | 学习空间白屏原因不明 | KnowledgeGraph 空数据防御；Error Boundary 降级 UI |

## 影响范围

- `client/src/pages/LearningSpace.tsx` — 三态渲染 + Error Boundary
- `client/src/pages/Home.tsx` — 空状态文案优化
- `client/src/api/client.ts` — 全局错误拦截、友好提示
- `client/src/api/knowledge.ts` — search 路径修复
- `client/src/components/business/KnowledgeGraph.tsx` — 空数据防御
- `backend/routers/knowledge.py` — /search 端点实现向量检索

## 验收标准

- 刷新学习空间不白屏、不崩溃
- 搜索框输入关键词能返回结果（或无结果友好提示）
- 所有错误提示替换为用户友好语言
- `npx tsc --noEmit` 零错误
- `bash scripts/full-check.sh` 通过
