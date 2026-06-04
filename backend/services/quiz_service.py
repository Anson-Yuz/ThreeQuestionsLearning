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


def generate_quick_quiz(course_id: str, db, target_count: int = 10) -> List[Dict]:
    """基于关键词立即生成简单选择题，2 秒内完成（无需 LLM）

    策略：jieba 分词 → 统计高频中文词 → 取前 N 个，每个词构造一道「以下哪项最贴近『XX』？」
    """
    with db() as conn:
        rows = conn.execute(
            "SELECT title, content FROM documents WHERE course_id = ?",
            (course_id,),
        ).fetchall()
    if not rows:
        return []

    docs_text = " ".join(((r["title"] or "") + " " + (r["content"] or "")) for r in rows)
    if not docs_text.strip():
        return []

    try:
        import jieba
        words = jieba.lcut(docs_text)
    except Exception:
        words = list(docs_text)

    word_freq: Dict[str, int] = {}
    for w in words:
        if len(w) >= 2 and "\u4e00" <= w[0] <= "\u9fff":
            word_freq[w] = word_freq.get(w, 0) + 1

    top_words = [w for w, _ in sorted(word_freq.items(), key=lambda x: x[1], reverse=True)[:target_count]]
    if len(top_words) < 4:
        for fb in ["学习", "知识", "方法", "原理", "应用", "概念", "系统", "技术", "设计", "实现"]:
            if fb not in top_words:
                top_words.append(fb)
            if len(top_words) >= target_count:
                break

    def find_sentence_with_word(text: str, word: str, max_len: int = 50) -> str:
        for sent in text.replace("\n", "。").split("。"):
            if word in sent and len(sent.strip()) > 4:
                s = sent.strip()
                return s[:max_len] + ("…" if len(s) > max_len else "")
        return ""

    questions = []
    for i, word in enumerate(top_words[:target_count]):
        correct = find_sentence_with_word(docs_text, word) or f"与「{word}」相关的核心概念"
        distractors = [f"与「{w}」相关的概念" for w in top_words if w != word][:3]
        while len(distractors) < 3:
            distractors.append(f"干扰项 {len(distractors) + 1}")
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
    """后台异步生成高质量题目 + 写缓存 + 推 SSE"""
    try:
        from services.llm_service import LLMService
        from database import get_db

        with get_db() as conn:
            docs = conn.execute(
                "SELECT id, title, content FROM documents WHERE course_id = ? LIMIT 5",
                (course_id,),
            ).fetchall()
            title_row = conn.execute(
                "SELECT title FROM courses WHERE id = ?", (course_id,)
            ).fetchone()
        documents = [
            {"id": d["id"], "title": d["title"], "content": d["content"] or ""} for d in docs
        ]
        if not documents:
            return
        course_title = title_row["title"] if title_row else ""
        llm = LLMService()
        qs = QuizService(llm)
        quizzes = await qs.generate_quiz(course_id, documents, course_title=course_title)
        if not quizzes:
            return

        from datetime import datetime
        now = int(datetime.now().timestamp() * 1000)
        with get_db() as conn:
            conn.execute(
                "INSERT OR REPLACE INTO course_quizzes (course_id, quizzes_json, updated_at) "
                "VALUES (?, ?, ?)",
                (course_id, json.dumps(quizzes, ensure_ascii=False), now),
            )
            conn.commit()
        from routers.sse import push_event
        push_event(
            course_id,
            "quiz_ready",
            {"quizzes": quizzes, "count": len(quizzes), "source": "llm"},
        )
        print(f"[quick-quiz] 课程 {course_id} LLM 升级完成: {len(quizzes)} 道题")
    except Exception as e:
        print(f"[quick-quiz] LLM 升级失败 {course_id}: {e}")
