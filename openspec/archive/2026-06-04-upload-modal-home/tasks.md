# 任务清单 — 首页上传模态框 ✅

## 阶段 1：创建 UploadModal 组件

- [x] `client/src/components/business/UploadModal.tsx` 新建
- [x] Props: `courseId, courseTitle?, onClose, onUploaded?`
- [x] 模态遮罩 + 居中卡片布局
- [x] 头部：标题「上传资料」+ 课程名副标题 + X 关闭
- [x] 拖拽高亮（蓝色边框 + 浅蓝背景）
- [x] MIME + 后缀名双校验
- [x] 大小校验 ≤20MB
- [x] 文件列表滚动 + 单个移除
- [x] 底部取消 + 「上传 N 个文件」按钮
- [x] 复用 `/api/knowledge/upload-files` 端点
- [x] 上传成功 onUploaded + onClose

## 阶段 2：Home 页接入

- [x] 导入 `UploadModal`
- [x] 新增 `showUpload: boolean` 状态
- [x] 右上角上传按钮 onClick：
  - `courses.length > 0` → `setSelectedCourseId(courses[0].id); setShowUpload(true)`
  - 否则 `alert('请先创建课程')`
- [x] Action sheet「上传资料」：`setShowMenu(false); setShowUpload(true)`
- [x] 渲染 `<UploadModal courseTitle={...} onUploaded={() => fetchCourses()} />`

## 阶段 3：验证

- [x] `npx tsc --noEmit` 零错误
- [x] 提交 `daad709 feat(home): 新增 UploadModal 弹窗组件，绑定首页上传按钮`
- [x] 推送到 origin/main
