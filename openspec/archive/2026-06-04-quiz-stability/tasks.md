# 任务清单 — 测评生成稳定性 ✅

## 阶段 1：端到端诊断

- [x] 直接调用 `QuizService.generate_quiz(cid, documents, questions_per_level=1)` 验证
- [x] 发现真实失败原因（不是 SSE/前端问题）：
  - LLM 返回空内容（MiniMax 偶发）
  - Unterminated string JSON 解析失败
  - 4/6 题通过，2/6 题静默失败

## 阶段 2：单题超时机制

- [x] `_generate_question` 加 `asyncio.wait_for(timeout=30.0)` 包裹 LLM 调用
- [x] 单独捕获 `asyncio.TimeoutError` 并打印 `[err] Quiz generation timeout for {dimension} #{n}`
- [x] 单独捕获 `Exception` 打印详细堆栈
- [x] 返回 None 让 `generate_quiz` 继续收集其他维度题目

## 阶段 3：Prompt 强化

- [x] 添加中文角色指令：`你是中文出题老师`
- [x] 强制中文输出（题目/选项/解析/知识点）
- [x] 长度限制 ≤ 60 字
- [x] 针对性约束：`题目中避免半角双引号以免破坏JSON`
- [x] 资料截断从 4000 → 3500 字符

## 阶段 4：归档与推送

- [x] `python3 -m py_compile backend/services/quiz_service.py` 零错误
- [x] 提交 `c5b24ba fix(quiz): 单题 30s 超时 + 强化 prompt 强制中文输出`
- [x] 推送到 origin/main
