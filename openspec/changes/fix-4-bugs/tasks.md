# 任务清单 — 修复 4 个核心 Bug ✅

## 阶段 1：修复刷新崩溃 + 白屏（问题 1 & 4）

### 1.1 LearningSpace 三态渲染
- [x] 添加 `initialLoading` 加载态（spinner + "加载课程中..."）
- [x] 添加 `pageError` 错误态（友好提示 + 重试按钮）
- [x] 正常渲染态（数据就绪后显示）
- [x] courseId 无效时显示"无效的课程地址"
- [x] 图谱/争议加载独立错误状态 + 重试

### 1.2 KnowledgeGraph 空数据防御
- [x] `!data || !data.nodes` 时显示"暂无知识图谱数据"
- [x] 空数组时显示引导提示

### 1.3 SSE 清理
- [x] useEffect return 中已正确 close EventSource（无需修改）

## 阶段 2：修复搜索功能（问题 3）

### 2.1 后端 /api/knowledge/search
- [x] 实现 ChromaDB 向量检索（带 fallback）
- [x] ChromaDB 不可用时回退到 SQLite LIKE 关键词匹配
- [x] 返回匹配片段（含上下文截取）
- [x] 无结果时返回空数组 + "未找到相关资料，尝试换个关键词吧"

### 2.2 前端 search API
- [x] knowledgeApi.search 路径和参数格式已正确

## 阶段 3：优化错误提示和空状态（问题 2）

### 3.1 全局错误拦截
- [x] ApiClient 拦截 "Failed to fetch" → "网络连接不稳定，请稍后重试"
- [x] LearningSpace 中 friendlyMsg() 统一转换所有错误

### 3.2 空状态文案
- [x] Home 空课程："还没有课程，在上方搜索框输入你想学习的问题"
- [x] LearningSpace 图谱空："暂无知识图谱数据，上传学习资料后点击刷新生成知识图谱"
- [x] 搜索无结果："未找到相关资料，尝试换个关键词吧"
- [x] ErrorBlock / EmptyBlock 统一组件

## 验证
- [x] `npx tsc --noEmit` 零错误
- [x] `npm run build` 成功
- [x] `bash scripts/full-check.sh` 通过（39 pass / 0 fail）
- [x] python compileall 零错误
