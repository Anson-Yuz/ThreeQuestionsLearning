# 提案：移除 LearningSpace 上传方框 + 扩大核心心智模型

## 为什么改

- 复合知识库底部的「上传资料」方框（UploadPanel）与首页「上传」按钮（UploadModal）功能重复
- 用户希望核心心智模型（知识图谱）更突出

## 改什么

### `client/src/pages/LearningSpace.tsx`
- 删除「底部知识库」区块内的 `{courseId && <UploadPanel ... />}` 整段（约 6 行）
- 删除 `import UploadPanel from '../components/business/UploadPanel'`
- 保留「复合知识库」文档列表（KnowledgeBase）正常显示

### `client/src/components/business/KnowledgeGraph.tsx`
- ECharts 容器高度 `420px → 560px`（+33%）
- 让核心心智模型在视觉上更突出

## 影响范围

- `client/src/pages/LearningSpace.tsx`（-7 / +0 行）
- `client/src/components/business/KnowledgeGraph.tsx`（+1 / -1 行）

## 风险评估

- **功能不丢失**：上传功能可通过首页「上传」按钮（UploadModal 弹窗）或课程 Action sheet 访问
- **图谱高度自适应**：560px 仍能适配主流手机屏幕（iPhone SE 667px 宽，可显示完整图谱）
- **没有删除任何后端接口**：纯 UI 调整

## 验收标准

- LearningSpace 底部不再显示上传方框
- 复合知识库列表仍正常显示
- 知识图谱渲染区变高
- 首页「上传」按钮仍可上传文件
- `npx tsc --noEmit` 零错误
