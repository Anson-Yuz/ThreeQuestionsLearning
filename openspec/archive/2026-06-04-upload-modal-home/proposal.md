# 提案：首页上传模态框

## 为什么改

`Home.tsx` 有两处上传 UI 占位无功能：
1. **右上角圆形上传按钮**（行 102-104）—— `<button>` 无 onClick
2. **课程 Action sheet「上传资料」**（行 195）—— `action: () => {}`

两个入口都看似有入口，但点了无反应。`LearningSpace` 内已有 `UploadPanel`（commit `c94423b`），但 home 页没有可复用的模态版。

## 改什么

### 新增 `client/src/components/business/UploadModal.tsx`

模态形态的上传组件，与 `UploadPanel` 共享校验逻辑但作为弹窗展示：

| 元素 | 实现 |
|------|------|
| 遮罩 | `fixed inset-0 bg-black/40 z-50` |
| 卡片 | `bg-white dark:bg-gray-800 rounded-2xl max-w-md` |
| 头部 | 标题「上传资料」+ 副标题（目标课程名）+ 关闭 X |
| 拖拽区 | `onDrop` / `onDragOver` / `onDragLeave` + 蓝色高亮 |
| 文件列表 | 滚动容器 + 单个移除按钮 |
| 底部 | 取消 + 「上传 N 个文件」按钮 |

### 接入 `Home.tsx`

- 新增 `showUpload: boolean` 状态
- **右上角按钮**：onClick 校验 `courses.length > 0`，有课程则用 `courses[0].id`（最近一个）打开模态，无课程则 `alert('请先创建课程')`
- **Action sheet「上传资料」**：`setShowMenu(false); setShowUpload(true)` 使用已选中的 `selectedCourseId`
- 模态渲染：`<UploadModal courseId courseTitle onClose onUploaded={() => fetchCourses()} />`
- `onUploaded` 回调刷新课程列表

## 影响范围

- `client/src/components/business/UploadModal.tsx`（新增 178 行）
- `client/src/pages/Home.tsx`（+18 行 / -2 行）

## 风险评估

- **课程选择 UX**：右上角按钮默认用 `courses[0].id`，多个课程时不能选择。简化方案是「如果多门课就弹个选择列表再上传模态」。当前实现选择简单方案以减少复杂度
- **后端兼容**：复用 `/api/knowledge/upload-files`（commit `c94423b`），无需新增
- **内存泄漏**：模态关闭后 `setShowUpload(false)` 自动卸载组件，无 useEffect 残留

## 验收标准

- 点击首页右上角上传按钮 → 弹出 UploadModal 模态
- 拖拽 PDF/Word/MD/TXT → 高亮 + 进入文件列表
- 选择超 20MB 文件 → 红色错误
- 上传成功 → 模态自动关闭 + 课程列表刷新
- Action sheet「上传资料」点击 → 同样弹出 UploadModal（针对该课程）
- 无课程时点击右上角 → `alert('请先创建课程')`
- `npx tsc --noEmit` 零错误
