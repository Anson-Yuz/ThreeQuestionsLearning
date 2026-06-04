# 任务清单 — 测评题库缓存 + 移除顶部进度条 ✅

## 阶段 1：后端缓存表

- [x] `database.py` 新增 `course_quizzes` 表（course_id PK + quizzes_json + updated_at）
- [x] 在 init_db 中与其他表一起创建

## 阶段 2：后端缓存优先端点

- [x] `routers/courses.py` 新增 `GET /api/courses/{id}/quizzes`
- [x] 命中判断：读 `course_quizzes` 表，解析 JSON，题库非空才返回 ready
- [x] 未命中：启动 `threading.Thread(daemon=True)` 跑后台生成
- [x] 后台任务：调 `QuizService.generate_quiz(..., questions_per_level=2)`
- [x] 写入缓存表
- [x] 推送 SSE `quiz_ready` 事件
- [x] 立即返回 `{status: 'generating', data: []}`

## 阶段 3：前端 API 封装

- [x] `coursesApi.getCachedQuizzes()` 返回 `{status, data}`

## 阶段 4：QuizCenter 缓存优先

- [x] 导入 `coursesApi`
- [x] `loadQuiz` 重写为三阶段：
  - 阶段 1：`getCachedQuizzes` 命中即用
  - 阶段 2：generating 状态每 3s 轮询
  - 阶段 3：缓存接口失败降级到 `threeAskApi.generateQuiz`
- [x] overallTimer 60s 超时
- [x] pollTimer 清理逻辑

## 阶段 5：LearningSpace 移除进度条

- [x] 删除 `const [progress, setProgress] = useState(0)` 状态声明
- [x] 删除 `threeAskApi.getProgress(courseId).then(...)` 加载调用
- [x] 删除进度条 JSX 块（含 100% 蓝色渐变 + 百分比文字）

## 阶段 6：归档与推送

- [x] `npx tsc --noEmit` 零错误
- [x] `python3 -m py_compile backend/routers/courses.py backend/database.py` 零错误
- [x] 提交 `50701a7 perf(quiz): 测评题库缓存优先 + LearningSpace 移除顶部进度条`
- [x] 推送到 origin/main
