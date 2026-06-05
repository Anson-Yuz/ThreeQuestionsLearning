import uuid
import json
from datetime import datetime
from fastapi import APIRouter, HTTPException
from typing import List, Optional

from database import get_db
from models import QuizQuestion, QuizSubmit, QuizComplete, SuccessResponse

router = APIRouter()

@router.get("/{course_id}/questions")
async def get_questions(course_id: str):
    """获取测评题目列表 — 基于真实生成的题目，无记录时返回空"""
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM quiz_records WHERE course_id = ? GROUP BY question_id",
            (course_id,)
        ).fetchall()

        if rows:
            questions = []
            for row in rows:
                questions.append({
                    "id": row["question_id"],
                    "dimension": row["dimension"],
                    "user_answer": row["user_answer"],
                    "is_correct": bool(row["is_correct"])
                })
            return {"questions": questions}

        # 无题目记录，返回空（前端需先调用 /three-ask/quiz/generate 生成题目）
        return {"questions": [], "message": "暂无题目，请先生成测评"}

@router.get("/{course_id}/list")
async def list_questions(course_id: str):
    """按认知层级分组获取题目列表"""
    return {"grouped_questions": {}, "total": 0, "message": "请通过 /three-ask/quiz/generate 生成题目"}

@router.post("/submit")
async def submit_answer(req: QuizSubmit):
    """提交单题答案"""

    # 保存记录
    now = int(datetime.now().timestamp() * 1000)
    with get_db() as conn:
        conn.execute("""
            INSERT OR REPLACE INTO quiz_records
            (id, course_id, question_id, user_answer, is_correct, score, dimension, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (f"{req.course_id}_{req.question_id}", req.course_id,
              req.question_id, req.user_answer, 0,
              0, "", now))
        conn.commit()

    return {
        "is_correct": False,
        "score": 0,
        "feedback": "答案已保存"
    }

@router.post("/{course_id}/complete")
async def complete_quiz(course_id: str, req: QuizComplete):
    """完成测评，生成报告"""

    # 计算统计数据（兼容 is_correct / isCorrect 两种字段名）
    total = len(req.answers)
    correct = sum(1 for a in req.answers if a.get("is_correct", False) or a.get("isCorrect", False))
    accuracy = (correct / total * 100) if total > 0 else 0

    # 计算各维度得分（动态计算，每维度题目数不固定）
    dim_questions = {}
    dim_correct = {}
    for a in req.answers:
        dim = a.get("dimension", "未分类")
        dim_questions[dim] = dim_questions.get(dim, 0) + 1
        if a.get("is_correct", False) or a.get("isCorrect", False):
            dim_correct[dim] = dim_correct.get(dim, 0) + 1
    ability_scores = {
        dim: (dim_correct.get(dim, 0) / dim_questions[dim] * 100) if dim_questions.get(dim, 0) > 0 else 0
        for dim in dim_questions
    }

    # 保存测评记录
    now = int(datetime.now().timestamp() * 1000)
    with get_db() as conn:
        conn.execute("""
            UPDATE learning_progress
            SET q3_completed = 1, q3_score = ?,
                ability_remember = ?, ability_understand = ?, ability_apply = ?,
                ability_analyze = ?, ability_evaluate = ?, ability_create = ?,
                overall_progress = 100, updated_at = ?
            WHERE course_id = ?
        """, (accuracy, ability_scores.get("remember", 0), ability_scores.get("understand", 0),
              ability_scores.get("apply", 0), ability_scores.get("analyze", 0),
              ability_scores.get("evaluate", 0), ability_scores.get("create", 0), now, course_id))
        conn.commit()

    # 收集错题（兼容 content/question 两种字段名）
    mistakes = []
    for answer in req.answers:
        is_correct = answer.get("is_correct", False) or answer.get("isCorrect", False)
        if not is_correct:
            mistakes.append({
                "question": answer.get("content") or answer.get("question", ""),
                "user_answer": answer.get("user_answer", ""),
                "correct_answer": answer.get("correct_answer", ""),
                "explanation": answer.get("explanation", "")
            })

    # 找出薄弱环节
    weak_areas = [dim for dim, score in ability_scores.items() if score < 60]

    # 维度名称映射
    dim_names = {
        "remember": "记忆", "understand": "理解", "apply": "应用",
        "analyze": "分析", "evaluate": "评价", "create": "创造"
    }
    weak_names = [dim_names.get(w, w) for w in weak_areas]

    return {
        "accuracy": accuracy,
        "totalQuestions": total,
        "correctCount": correct,
        "abilityScores": ability_scores,
        "mistakes": mistakes,
        "suggestions": {
            "weakAreas": weak_names,
            "studyTips": f"建议加强{', '.join(weak_names)}维度的学习" if weak_names else "整体表现良好，继续保持"
        },
        "totalTime": sum(a.get("timeSpent", 0) for a in req.answers),
        "averageTime": sum(a.get("timeSpent", 0) for a in req.answers) / total if total > 0 else 0
    }

@router.get("/{course_id}/report")
async def get_report(course_id: str):
    """获取测评报告"""
    with get_db() as conn:
        # 获取进度数据
        progress = conn.execute(
            "SELECT * FROM learning_progress WHERE course_id = ?",
            (course_id,)
        ).fetchone()

        if not progress:
            raise HTTPException(404, "暂无测评报告")

        # 获取题目总数和错题记录
        all_rows = conn.execute(
            "SELECT * FROM quiz_records WHERE course_id = ?",
            (course_id,)
        ).fetchall()
        total_questions = len(all_rows)

        mistakes_rows = [r for r in all_rows if not r["is_correct"]]

        mistakes = []
        for row in mistakes_rows:
            mistakes.append({
                "question": row["question_id"],
                "user_answer": row["user_answer"],
                "correct_answer": "",
                "explanation": ""
            })

        ability_scores = {
            "remember": progress["ability_remember"] or 0,
            "understand": progress["ability_understand"] or 0,
            "apply": progress["ability_apply"] or 0,
            "analyze": progress["ability_analyze"] or 0,
            "evaluate": progress["ability_evaluate"] or 0,
            "create": progress["ability_create"] or 0
        }

        weak_areas = [dim for dim, score in ability_scores.items() if score < 60]
        dim_names = {
            "remember": "记忆", "understand": "理解", "apply": "应用",
            "analyze": "分析", "evaluate": "评价", "create": "创造"
        }

        correct_count = int((progress["q3_score"] or 0) / 100 * total_questions) if total_questions > 0 else 0

        return {
            "accuracy": progress["q3_score"] or 0,
            "totalQuestions": total_questions,
            "correctCount": correct_count,
            "abilityScores": ability_scores,
            "mistakes": mistakes,
            "suggestions": {
                "weakAreas": [dim_names.get(w, w) for w in weak_areas],
                "studyTips": f"建议加强{', '.join([dim_names.get(w, w) for w in weak_areas])}维度的学习" if weak_areas else "整体表现良好，继续保持"
            }
        }

@router.post("/mark")
async def mark_question(question_id: str, course_id: str, marked: bool = True):
    """标记/取消标记题目"""
    return SuccessResponse(success=True, message=f"题目已{'标记' if marked else '取消标记'}")
