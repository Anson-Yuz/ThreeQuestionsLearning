import json
from typing import List, Dict, Optional

class QuizService:
    """测评题目生成与评估"""

    DIFFICULTIES = {
        "remember": 0.2,
        "understand": 0.4,
        "apply": 0.6,
        "analyze": 0.75,
        "evaluate": 0.85,
        "create": 0.95
    }

    QUESTION_TYPES = {
        "remember": ["multiple_choice", "fill_blank"],
        "understand": ["short_answer", "explanation"],
        "apply": ["coding", "calculation"],
        "analyze": ["case_study", "analysis"],
        "evaluate": ["essay", "discussion"],
        "create": ["project_design", "innovation"]
    }

    def __init__(self, llm_service=None):
        self.llm = llm_service

    async def generate_quiz(self, course_id: str, documents: List[Dict], questions_per_level: int = 2) -> List[Dict]:
        """生成测评题目"""
        combined_text = "\n\n".join([doc.get("content", "")[:2000] for doc in documents[:5]])

        quizzes = []
        for dimension, difficulty in self.DIFFICULTIES.items():
            for i in range(questions_per_level):
                question = await self._generate_question(dimension, difficulty, combined_text, i + 1)
                if question:
                    quizzes.append(question)

        return quizzes

    async def _generate_question(self, dimension: str, difficulty: float, context: str, question_num: int = 1) -> Optional[Dict]:
        """生成单道题目 — LLM不可用、失败或超时时返回None"""
        if not self.llm or not context.strip():
            return None

        prompt = f"""你是中文出题老师。基于以下学习资料，为"{dimension}"认知层级生成第{question_num}道测评题目。

【必须遵守】
- 必须用中文出题
- 题目、选项、解析、知识点 全部用中文
- 题目中如引用代码或文件名，避免包含半角双引号以免破坏JSON
- 题目长度 ≤ 60 字

字段定义：
- bloom_level: "{dimension}"
- question_type: {self.QUESTION_TYPES[dimension]}

学习资料：
{context[:3500]}

输出JSON（不要markdown代码块）：
{{
  "id": "question_{dimension}_{question_num}",
  "dimension": "{dimension}",
  "bloom_level": "{dimension}",
  "difficulty": {difficulty},
  "question_type": "{self.QUESTION_TYPES[dimension][0]}",
  "question": "中文题目内容",
  "options": ["A. 中文选项1", "B. 中文选项2", "C. 中文选项3", "D. 中文选项4"],
  "correct_answer": "A",
  "explanation": "中文答案解析",
  "knowledge_points": ["知识点1"]
}}"""

        try:
            import asyncio
            result = await asyncio.wait_for(
                self.llm.chat_json(prompt, temperature=0.3, max_tokens=2048),
                timeout=30.0
            )
        except asyncio.TimeoutError:
            print(f"err: Quiz generation timeout for {dimension} #{question_num}")
            return None
        except Exception as e:
            print(f"err: Quiz generation exception for {dimension} #{question_num}: {e}")
            return None

        if result and result.get("question"):
            return result
        print(f"err: Quiz generation failed for {dimension} #{question_num}")
        return None

    async def evaluate_answer(self, question: Dict, user_answer: str) -> Dict:
        """评估答案"""
        correct = question.get("correct_answer", "").strip().upper()
        user = user_answer.strip().upper()

        if question.get("question_type") in ["multiple_choice", "fill_blank"]:
            is_correct = user == correct.upper()
            return {
                "is_correct": is_correct,
                "score": 100 if is_correct else 0,
                "feedback": "回答正确！" if is_correct else f"正确答案：{correct}"
            }
        else:
            if self.llm:
                return await self._llm_evaluate(question, user_answer)
            return {"is_correct": False, "score": 0, "feedback": "评分失败"}

    async def _llm_evaluate(self, question: Dict, user_answer: str) -> Dict:
        """LLM 评估主观题"""
        prompt = f"""评估以下回答：

题目：{question['question']}
正确答案：{question.get('correct_answer', '无标准答案')}
用户回答：{user_answer}

请评估并输出JSON：
{{"score": 85, "is_correct": true, "feedback": "评估反馈"}}"""

        result = await self.llm.chat_json(prompt, temperature=0.3, max_tokens=1024)
        if result:
            return result
        return {"is_correct": False, "score": 0, "feedback": "评分异常"}

    def calculate_ability_scores(self, quiz_results: List[Dict]) -> Dict:
        """计算能力维度得分"""
        scores = {dim: [] for dim in self.DIFFICULTIES.keys()}

        for result in quiz_results:
            dim = result.get("dimension", "remember")
            if dim in scores and result.get("is_correct"):
                scores[dim].append(100)

        ability_scores = {}
        for dim, score_list in scores.items():
            ability_scores[dim] = sum(score_list) / len(score_list) if score_list else 0

        return ability_scores


def generate_quick_quiz(course_id: str, db, target_count: int = 10) -> List[Dict]:
    """基于关键词立即生成简单选择题，2 秒内完成（无需 LLM）

    策略：jieba 分词 → 统计高频中文词 → 取前 N 个，每个词构造一道「以下哪项最贴近『XX』？」
    """
    # 收集所有文档文本
    with db() as conn:
        rows = conn.execute(
            "SELECT title, content FROM documents WHERE course_id = ?",
            (course_id,)
        ).fetchall()
    if not rows:
        return []

    docs_text = " ".join(((r["title"] or "") + " " + (r["content"] or "")) for r in rows)
    if not docs_text.strip():
        return []

    # jieba 提取高频中文词
    try:
        import jieba
        words = jieba.lcut(docs_text)
    except Exception:
        words = list(docs_text)

    word_freq: Dict[str, int] = {}
    for w in words:
        if len(w) >= 2 and '\u4e00' <= w[0] <= '\u9fff':
            word_freq[w] = word_freq.get(w, 0) + 1

    top_words = [w for w, _ in sorted(word_freq.items(), key=lambda x: x[1], reverse=True)[:target_count]]
    if len(top_words) < 4:
        for fb in ['学习', '知识', '方法', '原理', '应用', '概念', '系统', '技术', '设计', '实现']:
            if fb not in top_words:
                top_words.append(fb)
            if len(top_words) >= target_count:
                break

    def find_sentence_with_word(text: str, word: str, max_len: int = 50) -> str:
        for sent in text.replace('\n', '。').split('。'):
            if word in sent and len(sent.strip()) > 4:
                s = sent.strip()
                return s[:max_len] + ('…' if len(s) > max_len else '')
        return ""

    questions = []
    for i, word in enumerate(top_words[:target_count]):
        correct = find_sentence_with_word(docs_text, word) or f"与「{word}」相关的核心概念"
        distractors = [
            f"与「{w}」相关的概念"
            for w in top_words if w != word
        ][:3]
        while len(distractors) < 3:
            distractors.append(f"干扰项 {len(distractors) + 1}")
        # 随机打乱，正确答案固定在 0
        options = [correct] + distractors
        questions.append({
            "id": f"quick_q{i}",
            "dimension": "记忆",
            "bloom_level": "remember",
            "difficulty": 0.2,
            "question_type": "multiple_choice",
            "question": f"以下哪项最贴近「{word}」？",
            "options": options,
            "correct_answer": 0,
            "explanation": f"「{word}」是资料中提及的核心概念。",
            "knowledge_points": [word],
        })
    return questions


async def _background_generate_llm_quiz(course_id: str):
    """后台异步生成高质量题目 + 写缓存 + 推 SSE（与请求同事件循环）"""
    try:
        from services.llm_service import LLMService
        from database import get_db
        with get_db() as conn:
            docs = conn.execute(
                "SELECT id, title, content FROM documents WHERE course_id = ? LIMIT 5",
                (course_id,)
            ).fetchall()
        documents = [{"id": d["id"], "title": d["title"], "content": d["content"] or ""} for d in docs]
        if not documents:
            return
        llm = LLMService()
        qs = QuizService(llm)
        quizzes = await qs.generate_quiz(course_id, documents, questions_per_level=2)
        if not quizzes:
            return
        import json
        from datetime import datetime
        now = int(datetime.now().timestamp() * 1000)
        with get_db() as conn:
            conn.execute(
                "INSERT OR REPLACE INTO course_quizzes (course_id, quizzes_json, updated_at) VALUES (?, ?, ?)",
                (course_id, json.dumps(quizzes, ensure_ascii=False), now)
            )
            conn.commit()
        from routers.sse import push_event
        push_event(course_id, "quiz_ready", {"quizzes": quizzes, "count": len(quizzes), "source": "llm"})
        print(f"[quick-quiz] 课程 {course_id} LLM 升级完成: {len(quizzes)} 道题")
    except Exception as e:
        print(f"[quick-quiz] LLM 升级失败 {course_id}: {e}")
        """计算能力维度得分"""
        scores = {dim: [] for dim in self.DIFFICULTIES.keys()}

        for result in quiz_results:
            dim = result.get("dimension", "remember")
            if dim in scores and result.get("is_correct"):
                scores[dim].append(100)

        ability_scores = {}
        for dim, score_list in scores.items():
            ability_scores[dim] = sum(score_list) / len(score_list) if score_list else 0

        return ability_scores
