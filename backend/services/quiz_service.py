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
        """生成单道题目 — LLM不可用或失败时返回None"""
        if not self.llm or not context.strip():
            return None

        prompt = f"""基于以下学习资料，为"{dimension}"认知层级生成第{question_num}道测评题目。

要求：
- 难度系数: {difficulty}
- 题型: {self.QUESTION_TYPES[dimension]}

学习资料：
{context[:4000]}

请生成包含以下字段的JSON（不要包含markdown代码块标记）：
{{
  "id": "question_{dimension}_{question_num}",
  "dimension": "{dimension}",
  "bloom_level": "{dimension}",
  "difficulty": {difficulty},
  "question_type": "{self.QUESTION_TYPES[dimension][0]}",
  "question": "题目内容",
  "options": ["A. 选项1", "B. 选项2", "C. 选项3", "D. 选项4"],
  "correct_answer": "A",
  "explanation": "答案解析",
  "knowledge_points": ["知识点1", "知识点2"]
}}"""

        result = await self.llm.chat_json(prompt, temperature=0.3, max_tokens=2048)
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
