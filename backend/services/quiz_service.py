import asyncio
import json
from typing import List, Dict, Optional


PROMPT_QUIZ = """你是一位教育评估专家。请基于以下学习资料，创建 10 道选择题，用于检验学习者是否真正理解该主题，而不仅仅是死记硬背事实。

学习资料：
{combined_text}

出题规则：
1. **避免纯事实回忆**：不要出"XX的定义是什么"这种题，除非选项需要深度辨析。
2. **强调应用和分析**：多出情境题，让学习者将知识应用于新场景。
3. **包含陷阱选项**：每个错误选项都应看起来合理，代表常见的误解或混淆。
4. **覆盖多个认知层次**：至少包含记忆(2题)、理解(3题)、应用(2题)、分析/评价/创造(3题)。
5. **每题须有详细解释**，说明为什么正确答案对，其他错在哪里。

{doc_count_hint}

返回 JSON 数组（10 个元素），不要 markdown 代码块：
[
  {{
    "question": "题目文本",
    "options": ["A选项", "B选项", "C选项", "D选项"],
    "correct_index": 0-3,
    "dimension": "记忆/理解/应用/分析/评价/创造",
    "bloom_level": "remember/understand/apply/analyze/evaluate/create",
    "explanation": "解释为什么这个答案正确，其他为什么错误",
    "knowledge_points": ["涉及的知识点1", "知识点2"]
  }}
]
"""


class QuizService:
    """测评题目生成与评估"""

    DIFFICULTIES = {
        "remember": 0.2,
        "understand": 0.4,
        "apply": 0.6,
        "analyze": 0.75,
        "evaluate": 0.85,
        "create": 0.95,
    }

    QUESTION_TYPES = {
        "remember": "multiple_choice",
        "understand": "multiple_choice",
        "apply": "multiple_choice",
        "analyze": "multiple_choice",
        "evaluate": "multiple_choice",
        "create": "multiple_choice",
    }

    BLOOM_TO_CATEGORY = {
        "remember": "记忆",
        "understand": "理解",
        "apply": "应用",
        "analyze": "分析",
        "evaluate": "评价",
        "创造": "创造",
    }

    DIMENSION_TO_BLOOM = {
        "记忆": "remember",
        "理解": "understand",
        "应用": "apply",
        "分析": "analyze",
        "评价": "evaluate",
        "创造": "create",
    }

    def __init__(self, llm_service=None):
        self.llm = llm_service

    async def generate_quiz(
        self,
        course_id: str,
        documents: List[Dict],
        questions_per_level: int = 2,
        course_title: str = "",
    ) -> List[Dict]:
        """一次性生成 10 道题（按 Bloom 分类分布），无资料/LLM 不可用/超时返回空列表"""
        if not self.llm:
            print(f"[quiz] 课程 {course_id}: LLM 不可用")
            return []
        if not documents:
            print(f"[quiz] 课程 {course_id}: 无资料")
            return []

        query_terms = " ".join(filter(None, [course_title, "核心框架", "底层逻辑"]))
        top_fragments = self._select_top_fragments(
            documents, top_k=5, fragment_len=800, query=query_terms
        )
        combined_text = "\n\n---\n\n".join(top_fragments)
        if not combined_text.strip():
            print(f"[quiz] 课程 {course_id}: 资料内容为空")
            return []

        doc_count_hint = ""
        if len(documents) < 3:
            doc_count_hint = "注：现有资料较少（<3份），请基于现有资料尽力出题，不必硬凑数量。"

        prompt = PROMPT_QUIZ.format(
            combined_text=combined_text[:4000],
            doc_count_hint=doc_count_hint,
        )
        print(
            f"[quiz] 课程 {course_id}: 调用 LLM 生成 10 道题，"
            f"资料长度={len(combined_text)}，文档数={len(documents)}"
        )

        try:
            result = await asyncio.wait_for(
                self.llm.chat_json(prompt, temperature=0.4, max_tokens=4096),
                timeout=60.0,
            )
        except asyncio.TimeoutError:
            print(f"[quiz] 课程 {course_id}: LLM 调用超时")
            return []
        except Exception as e:
            print(f"[quiz] 课程 {course_id}: LLM 调用失败: {e}")
            return []

        if not isinstance(result, list) or not result:
            print(f"[quiz] 课程 {course_id}: LLM 返回非数组或空")
            return []

        quizzes = []
        for i, q in enumerate(result):
            normalized = self._normalize_question(q, course_id, i)
            if normalized:
                quizzes.append(normalized)

        print(
            f"[quiz] 课程 {course_id}: 解析得到 {len(quizzes)} 道题，"
            f"分布: {self._distribution(quizzes)}"
        )
        return quizzes

    def _normalize_question(self, q: Dict, course_id: str, idx: int) -> Optional[Dict]:
        """将 LLM 返回的题目统一为 QuizQuestion 模型格式"""
        if not isinstance(q, dict):
            return None
        question_text = str(q.get("question", "")).strip()
        if not question_text:
            return None

        options = q.get("options", [])
        if not isinstance(options, list):
            return None
        options = [str(o).strip() for o in options if str(o).strip()][:6]
        if len(options) < 2:
            return None

        correct_idx = q.get("correct_index", 0)
        if not isinstance(correct_idx, int) or correct_idx < 0 or correct_idx >= len(options):
            correct_idx = 0

        bloom_cn = str(q.get("bloom_level", "")).strip().lower()
        if bloom_cn not in self.DIFFICULTIES:
            dim_cn = str(q.get("dimension", "理解")).strip()
            bloom_cn = self.DIMENSION_TO_BLOOM.get(dim_cn, "understand")

        return {
            "id": f"q_{course_id}_{idx + 1}",
            "dimension": self.BLOOM_TO_CATEGORY.get(bloom_cn, "理解"),
            "bloom_level": bloom_cn,
            "difficulty": self.DIFFICULTIES.get(bloom_cn, 0.5),
            "question_type": self.QUESTION_TYPES.get(bloom_cn, "multiple_choice"),
            "question": question_text[:300],
            "options": [o[:200] for o in options],
            "correct_answer": chr(ord("A") + correct_idx),
            "explanation": str(q.get("explanation", "")).strip()[:500],
            "knowledge_points": [str(kp) for kp in (q.get("knowledge_points") or [])][:5],
        }

    def _distribution(self, quizzes: List[Dict]) -> Dict[str, int]:
        from collections import Counter
        return dict(Counter(q["bloom_level"] for q in quizzes))

    async def evaluate_answer(self, question: Dict, user_answer: str) -> Dict:
        """评估答案"""
        correct = str(question.get("correct_answer", "")).strip().upper()
        user = str(user_answer or "").strip().upper()

        is_correct = user == correct
        return {
            "is_correct": is_correct,
            "score": 100 if is_correct else 0,
            "feedback": "回答正确！" if is_correct else f"正确答案：{correct}",
        }

    def calculate_ability_scores(self, quiz_results: List[Dict]) -> Dict:
        """计算能力维度得分"""
        scores: Dict[str, List[int]] = {dim: [] for dim in self.DIFFICULTIES.keys()}

        for result in quiz_results:
            dim = result.get("dimension") or result.get("bloom_level", "remember")
            if dim in scores and result.get("is_correct"):
                scores[dim].append(100)

        ability_scores = {}
        for dim, score_list in scores.items():
            ability_scores[dim] = (
                sum(score_list) / len(score_list) if score_list else 0
            )
        return ability_scores

    def _select_top_fragments(
        self,
        documents: List[Dict],
        top_k: int = 5,
        fragment_len: int = 800,
        query: str = "",
    ) -> List[str]:
        """选取 top-k 最相关片段（query 命中权重更高）"""
        if not documents:
            return []

        def _tokens(text: str) -> List[str]:
            return [t for t in (text or "") if len(t) > 1] or ([text] if text else [])

        query_tokens = _tokens(query)
        candidates = []
        for doc in documents:
            content = (doc.get("content") or "").strip()
            if not content:
                continue
            title = (doc.get("title") or "").strip()
            head = content[:fragment_len]
            title_tokens = _tokens(title)
            score = sum(1 for t in title_tokens if t in head)
            score += sum(1 for t in query_tokens if t in head) * 2
            candidates.append((score, len(head), head))

        candidates.sort(key=lambda x: (-x[0], -x[1]))
        return [c[2] for c in candidates[:top_k]]


import random
import re

def generate_quick_quiz(course_id, db_func, target_count=10):
    """
    生成基于文档内容的理解选择题，避免噪声。
    每个题目问"根据资料，以下哪项描述是正确的？",
    选项来自资料中的真实句子，过滤掉明显非内容的行。
    """
    with db_func() as conn:
        rows = conn.execute(
            "SELECT title, content FROM documents WHERE course_id = ?",
            (course_id,)
        ).fetchall()

    if not rows:
        return []

    # 提取所有有效句子
    sentences = []
    for r in rows:
        text = (r["content"] or "").replace('\n', '。').replace('\r', ' ')
        raw = re.split(r'[。；！？\n]', text)
        for s in raw:
            s = s.strip()
            if 15 < len(s) < 100 and any('\u4e00' <= ch <= '\u9fff' for ch in s):
                if not any(noise in s for noise in ['作者', '版权', '扫码', '关注', 'http', 'www.', '版权所有']):
                    sentences.append(s)

    sentences = list(set(sentences))

    if len(sentences) < 6:
        return []

    random.shuffle(sentences)

    questions = []
    for i in range(min(target_count, len(sentences) // 2)):
        correct = sentences[i]
        distractors = [s for s in sentences if s != correct][:3]
        while len(distractors) < 3:
            distractors.append("此选项为无关描述")
        options = [correct] + distractors[:3]
        random.shuffle(options)
        correct_index = options.index(correct)

        questions.append({
            "id": f"quick_{i}",
            "question": "根据学习资料，以下哪项描述是正确的？",
            "options": options,
            "correct_answer": chr(ord("A") + correct_index),
            "dimension": "理解",
            "bloom_level": "understand",
            "difficulty": 0.4,
            "question_type": "multiple_choice",
            "explanation": f"资料原文：{correct}",
            "knowledge_points": []
        })

    return questions


async def _background_generate_llm_quiz(course_id: str):
    """后台异步生成 10 道深度理解题 → 写缓存 → 推 quiz_ready SSE"""
    try:
        from database import get_db

        with get_db() as conn:
            docs = conn.execute(
                "SELECT id, title, content FROM documents WHERE course_id = ? LIMIT 8",
                (course_id,),
            ).fetchall()
            title_row = conn.execute(
                "SELECT title FROM courses WHERE id = ?", (course_id,)
            ).fetchone()
        documents = [
            {"id": d["id"], "title": d["title"], "content": d["content"] or ""} for d in docs
        ]
        if len(documents) < 2:
            print(f"[deep-quiz] 课程 {course_id} 文档不足 (需≥2)，跳过生成")
            return
        course_title = title_row["title"] if title_row else ""

        questions = await generate_deep_quiz_10(
            course_id, documents, course_title=course_title
        )
        if not questions:
            print(f"[deep-quiz] 课程 {course_id} 深度题生成失败，不推送任何内容")
            return

        from datetime import datetime
        now = int(datetime.now().timestamp() * 1000)
        with get_db() as conn:
            conn.execute(
                "INSERT OR REPLACE INTO course_quizzes (course_id, quizzes_json, updated_at) "
                "VALUES (?, ?, ?)",
                (course_id, json.dumps(questions, ensure_ascii=False), now),
            )
            conn.commit()
        from routers.sse import push_event
        push_event(
            course_id,
            "quiz_ready",
            {"quizzes": questions, "count": len(questions), "source": "deep"},
        )
        print(f"[deep-quiz] 课程 {course_id} 成功推送 {len(questions)} 道深度题目")
    except Exception as e:
        print(f"[deep-quiz] 课程 {course_id} 后台生成异常: {e}")


async def generate_deep_quiz_10(
    course_id: str,
    documents: List[Dict],
    course_title: str = "",
) -> List[Dict]:
    if not documents:
        return []

    # 精选前3篇文档，每篇截取 600 字
    texts = [doc["content"][:600] for doc in documents[:3] if doc.get("content")]
    combined = "\n\n---\n\n".join(texts)

    prompt = f"""你是一位教育评估专家。请基于以下学习资料，创建 10 道高质量选择题，用于检验学习者是否真正理解了该主题，而不仅仅是死记硬背事实。

学习资料：
{combined}

出题规则：
- 至少 5 道题要求学习者将知识应用于新情境、分析案例、评价观点或比较概念。
- 避免直接问"XX的定义是什么"，多采用"如果……那么……"或"为什么……"的形式。
- 每个错误选项都应代表一个常见的误解或混淆点。
- 每题必须包含 explanation 字段，详细解释正确答案的理由以及错误选项的误导之处。

返回格式（纯 JSON 数组，10 个元素）：
[
  {{
    "question": "题目文字",
    "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
    "correct_index": 0,
    "dimension": "应用/分析/评价...",
    "bloom_level": "apply/analyze/evaluate...",
    "explanation": "详细解释...",
    "knowledge_points": ["相关知识点"]
  }}
]"""

    from services.llm_service import LLMService
    import random
    llm = LLMService()
    result = await llm.chat_json(prompt, temperature=0.4, max_tokens=4096)
    if isinstance(result, list) and len(result) >= 8:
        for q in result:
            options = q.get("options", [])
            if options and isinstance(options, list):
                idx = int(q.get("correct_index", 0))
                if 0 <= idx < len(options):
                    correct_text = options[idx]
                    random.shuffle(options)
                    q["options"] = options
                    q["correct_index"] = options.index(correct_text)
                    q["correct_answer"] = chr(ord("A") + q["correct_index"])
        while len(result) < 10:
            result.append(result[-1])
        return result[:10]
    return []
