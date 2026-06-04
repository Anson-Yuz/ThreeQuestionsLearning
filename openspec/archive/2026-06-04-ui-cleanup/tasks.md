# 任务清单 — 移除上传方框 + 扩大图谱 ✅

## 阶段 1：移除 LearningSpace 上传方框

- [x] 删除「复合知识库」区块内的 `<UploadPanel>` JSX
- [x] 删除 `import UploadPanel` 语句
- [x] 保留 `KnowledgeBase` 文档列表

## 阶段 2：扩大图谱高度

- [x] `KnowledgeGraph.tsx` ECharts 容器高度 `420px → 560px`

## 阶段 3：验证

- [x] `npx tsc --noEmit` 零错误
- [x] 提交 `0c90a48 ui: 移除 LearningSpace 底部上传方框,扩大知识图谱高度 420→560`
- [x] 推送到 origin/main
