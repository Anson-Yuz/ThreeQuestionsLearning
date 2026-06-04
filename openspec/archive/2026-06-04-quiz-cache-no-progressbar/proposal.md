# 提案：测评题库缓存 + 移除顶部进度条

## 为什么改

- 测评生成（`/api/three-ask/quiz/generate/{id}`）每次同步阻塞调用 LLM，6 道题 30-60s。即使题库已生成也必须重新生成才能拿到。
- 用户反馈「课程里顶部进度条不需要」——进度条展示的是三问完成度（0%/33%/66%/100%），与课程内容无关，视觉上占空间且无意义。

## 改什么

### 后端 — 测评缓存表 + 缓存优先端点

`backend/database.py` 新增表：
```sql
CREATE TABLE IF NOT EXISTS course_quizzes (
    course_id TEXT PRIMARY KEY,
    quizzes_json TEXT NOT NULL,
    updated_at INTEGER
)
```

`backend/routers/courses.py` 新增 `GET /api/courses/{id}/quizzes`：
- 读 `course_quizzes` 表，命中即返回（`< 50ms`）
- 未命中：启动 `threading.Thread(daemon=True)` 跑 `asyncio.run(QuizService.generate_quiz(..., questions_per_level=2))`
- 生成完成：写入缓存 + `push_event(course_id, 'quiz_ready', ...)` 推 SSE
- 立即返回 `{status: 'generating', data: []}`

### 前端 — QuizCenter 缓存优先 + 轮询

- `coursesApi.getCachedQuizzes()` API 封装
- `QuizCenter.loadQuiz` 重写为三阶段：
  1. 调 `getCachedQuizzes`，ready 即用
  2. status === 'generating'：每 3s 轮询一次，最多 60s
  3. 缓存接口失败：降级到 `threeAskApi.generateQuiz` 同步生成

### 前端 — LearningSpace 移除进度条

删除 3 处：
- `const [progress, setProgress] = useState(0)` 状态
- `threeAskApi.getProgress(courseId).then(p => setProgress(...))` 加载调用
- `<div className="bg-white ..."> 进度条 JSX 块</div>` 渲染

## 影响范围

- `backend/database.py`（+10 行）
- `backend/routers/courses.py`（+50 行）
- `client/src/api/courses.ts`（+10 行）
- `client/src/pages/QuizCenter.tsx`（重写 loadQuiz）
- `client/src/pages/LearningSpace.tsx`（-25 行）

## 风险评估

- **轮询开销**：3s/次 60s 上限，最多 20 次请求；轻量 GET，无副作用
- **缓存一致性**：资料变更后下次 `getCachedQuizzes` 不会自动失效（与图谱一致，需要主动触发更新）。当前仅在 import-urls / upload-files 触发图谱/争议生成，测评缓存需要单独触发更新（未来可拓展）
- **题库 size**：~12 道题 JSON 约 10KB，单课程可接受
- **进度条移除**：纯粹 UI 清理，无功能丢失（数据仍可从其他位置获取）

## 验收标准

- `curl /api/courses/{id}/quizzes` 命中 < 50ms 返回
- 未命中立即返回 `{status: 'generating'}`（< 30ms）
- 后台生成完成推送 SSE `quiz_ready`
- 前端 QuizCenter 缓存命中直接显示题目，无需等待
- 未命中场景：3s 轮询直到 ready 或 60s 超时
- LearningSpace 顶部不再显示进度条
- `npx tsc --noEmit` 零错误
- `python3 -m py_compile` 零错误
