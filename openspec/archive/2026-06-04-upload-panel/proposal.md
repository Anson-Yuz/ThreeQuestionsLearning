# 提案：完整上传模块 UploadPanel

## 为什么改

前置 commit (`a2b6090`) 仅给「上传资料」按钮绑定了基础的文件选择器，缺少：
- 拖拽上传体验
- 文件大小/类型校验反馈
- 已选文件列表预览
- 错误提示
- 后端多文件批量支持
- 上传后自动触发图谱/争议重新生成

`backend/routers/knowledge.py` 原有 `/upload` 仅支持单文件（`file: UploadFile`），与新 UploadPanel 的「拖拽多选」不匹配。

## 改什么

### 前端 `client/src/components/business/UploadPanel.tsx`（新增）

| 功能 | 实现 |
|------|------|
| 文件选择 | `<input type="file" multiple accept=".pdf,.doc,.docx,.md,.txt">` |
| 拖拽 | `onDrop` / `onDragOver` / `onDragLeave` + `setDragOver` 高亮 |
| 类型校验 | MIME + 后缀名双校验，错误即时显示在 panel 下方 |
| 大小校验 | ≤20MB，超限报错并跳过该文件 |
| 文件预览 | 列表显示名称 + 大小 + 单个移除按钮 |
| 上传状态 | `uploading` 控制按钮文案「上传中…」「上传 N 个文件」 |
| 回调 | `onUploaded?: () => void` 通知父组件刷新 |

### 后端 `POST /api/knowledge/upload-files`（新增）

- `course_id: str`（query 参数）+ `files: List[UploadFile]`
- 单文件失败不中断整体（静默跳过）
- 成功上传后**异步触发** `_update_graph_and_controversy`（在 `threading.Thread` 中跑 `asyncio.run`），无需用户手动点刷新

### `LearningSpace.tsx` 清理

- 删除 30 行内联上传代码（`fileInputRef` / `handleFileChange` / `handleUploadClick`）
- 用 `<UploadPanel courseId={courseId} onUploaded={() => setRefreshKey(k+1)} />` 替代

## 影响范围

- `client/src/components/business/UploadPanel.tsx`（新增 137 行）
- `client/src/pages/LearningSpace.tsx`（-30 行）
- `backend/routers/knowledge.py`（+67 行）

## 风险评估

- **后端 ImportError**：`upload-files` 中 `from routers.discover import _update_graph_and_controversy` 是延迟导入，避免循环依赖
- **后端线程**：复用之前 fix 后的 `threading.Thread + asyncio.run` 模式，背景知识图生成不阻塞响应
- **前端重复触发**：UploadPanel `onUploaded` 调用 `setRefreshKey(k+1)`，与 `refreshKey` 依赖 `KnowledgeBase` 文档列表的 useEffect 配合，确保 UI 实时更新

## 验收标准

- 拖拽 PDF 到学习空间底部 → 蓝色高亮 → 松手进入文件列表
- 选超 20MB 文件 → 红色错误「文件过大」
- 选 .zip 文件 → 红色错误「不支持的格式」
- 上传完成后文档立即出现在「复合知识库」列表
- 后端日志可见 `[upload] 启动后台任务` 和图谱生成输出
- `npx tsc --noEmit` 零错误
- `python3 -m py_compile backend/routers/knowledge.py` 零错误
