# 任务清单 — 完整 UploadPanel 上传模块 ✅

## 阶段 1：前端 UploadPanel 组件

- [x] `client/src/components/business/UploadPanel.tsx` 新建
- [x] 接受 `courseId: string` + 可选 `onUploaded?: () => void`
- [x] `<input ref type="file" multiple accept=".pdf,.doc,.docx,.md,.txt">` 隐藏 input
- [x] `onDrop` / `onDragOver` / `onDragLeave` 拖拽事件，drag 状态高亮
- [x] MIME + 后缀名双校验类型，错误信息显示
- [x] 大小校验 ≤20MB，超限跳过
- [x] `validateAndAdd` 累积已选文件
- [x] 文件列表 + 单个 `removeFile` 移除按钮
- [x] 上传按钮文案 `uploading ? "上传中…" : "上传 N 个文件"`
- [x] 上传成功后清空 + `onUploaded` 回调
- [x] 使用现有 `UploadIcon`（不存在 `UploadCloudIcon`）

## 阶段 2：后端批量上传端点

- [x] `POST /api/knowledge/upload-files` 新建
- [x] `course_id` 通过 query 参数接收
- [x] `files: List[UploadFile] = File(...)`
- [x] 遍历每个文件：校验类型 → 校验大小 → 保存磁盘 → 插入 documents 表
- [x] 失败文件静默跳过，整体响应成功数
- [x] 上传完成后用 `threading.Thread + asyncio.run` 触发 `_update_graph_and_controversy`
- [x] 延迟导入 `from routers.discover import _update_graph_and_controversy` 避免循环依赖

## 阶段 3：LearningSpace 集成

- [x] 导入 `UploadPanel` 组件
- [x] 删除内联 `fileInputRef` / `handleFileChange` / `handleUploadClick`（约 30 行）
- [x] JSX 中替换为 `<UploadPanel courseId={courseId} onUploaded={() => setRefreshKey(k+1)} />`
- [x] `onUploaded` 触发后 `setRefreshKey` 让 `KnowledgeBase` 列表 useEffect 重新拉数据

## 阶段 4：归档与推送

- [x] `npx tsc --noEmit` 零错误
- [x] `python3 -m py_compile backend/routers/knowledge.py` 零错误
- [x] 提交 `c94423b feat(upload): 完整 UploadPanel 组件 + 多文件后端接口`
- [x] 推送到 origin/main
