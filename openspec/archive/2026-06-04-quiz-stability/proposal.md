# 提案：测评生成稳定性修复

## 为什么改

端到端测试发现测评生成的真实失败模式：

| 失败模式 | 频率 | 现象 |
|----------|------|------|
| LLM 返回空字符串 | 偶发 | MiniMax `chat()` 返回 `""`，下游 `json.loads` 报错 |
| Unterminated string JSON 解析失败 | 偶发 | LLM 中文输出中嵌入半角双引号破坏 JSON 结构 |
| LLM 默认输出英文 | 多数 | 旧 prompt 未明确要求中文 |

导致用户实际能拿到的题目只有 4/6（其它 2 题静默失败），且 LLM 偶发空响应可能让前端长时间"载入中"。

## 改什么

`backend/services/quiz_service.py` 的 `_generate_question` 方法：

1. **加 30s 硬超时**：`asyncio.wait_for(self.llm.chat_json(...), timeout=30.0)`，单题卡死最多 30s
2. **细化异常类型**：`TimeoutError` / `Exception` 分别捕获并打印 `err: Quiz generation timeout/exception for {dimension} #{n}`
3. **强化 prompt**：
   - 第一行明确角色：「你是中文出题老师」
   - 「必须用中文出题」+ 题目/选项/解析/知识点全部中文
   - 针对性：「题目中避免包含半角双引号以免破坏 JSON」
   - 资料截断从 4000 → 3500 字符，腾出 token 给结构化输出

## 影响范围

- `backend/services/quiz_service.py` — `_generate_question` 方法（约 30 行改动）

## 风险评估

- **超时值选择**：单题 30s。6 题串行最多 180s。如需更快可后续改为 `asyncio.gather` 并行生成
- **英文题** 用户：若用户希望英文题目，可调整 prompt。但当前用户群体以中文为主
- **前端** 已具备 60s 超时 + 重试按钮（`a2b6090`），无需改动

## 验收标准

- 单题 LLM 卡死时 30s 内自动放弃该题
- 6 道题中至少 4 道为中文题目
- 端到端测试：调用 `QuizService.generate_quiz`，输出题目 ≥ 4 道且均为中文
- `python3 -m py_compile backend/services/quiz_service.py` 零错误
