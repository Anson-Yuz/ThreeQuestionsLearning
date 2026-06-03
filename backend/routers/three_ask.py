import json
import uuid
from datetime import datetime
# 端点: /api/three-ask/graph/generate/{course_id} /api/three-ask/graph/update/{course_id} /api/three-ask/controversy/detect/{course_id} /api/three-ask/controversy/{course_id} /api/three-ask/quiz/generate/{course_id} /api/three-ask/quiz/submit /api/three-ask/quiz/{course_id}/complete /api/three-ask/progress/{course_id}
from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import List, Optional

from database import get_db
from models import KnowledgeGraph, Controversy, QuizQuestion, QuizSubmit, SuccessResponse

router = APIRouter()

@router.post("/graph/generate/{course_id}")
async def generate_graph(course_id: str):
    """第一问：生成知识图谱"""

    with get_db() as conn:
        # 获取课程资料
        docs = conn.execute(
            "SELECT content, title FROM documents WHERE course_id = ? LIMIT 5",
            (course_id,)
        ).fetchall()

        if not docs:
            return KnowledgeGraph(nodes=[], links=[])

    # TODO: 调用 AI 服务生成图谱
    # 临时返回示例数据
    graph_data = {
        "nodes": [
            {"id": "node1", "name": "核心概念", "description": "这是核心概念", "bloom_level": "understand", "difficulty": 0.5, "is_threshold_concept": True},
            {"id": "node2", "name": "相关概念", "description": "这是相关概念", "bloom_level": "remember", "difficulty": 0.3, "is_threshold_concept": False}
        ],
        "links": [
            {"source": "node1", "target": "node2", "relation": "related", "strength": 0.8}
        ]
    }

    # 缓存图谱数据
    with get_db() as conn:
        conn.execute("""
            INSERT OR REPLACE INTO knowledge_graphs (course_id, graph_data, updated_at)
            VALUES (?, ?, ?)
        """, (course_id, json.dumps(graph_data), int(datetime.now().timestamp() * 1000)))
        conn.commit()

    return graph_data

@router.post("/graph/update/{course_id}")
async def update_graph_incremental(course_id: str, doc_id: str):
    """增量更新知识图谱"""
    # TODO: 实现增量更新逻辑
    return await generate_graph(course_id)

@router.post("/controversy/detect/{course_id}")
async def detect_controversy(
    course_id: str,
    background_tasks: BackgroundTasks
):
    """第二问：异步检测学术分歧"""

    with get_db() as conn:
        # 检查资料数量
        doc_count = conn.execute(
            "SELECT COUNT(*) FROM documents WHERE course_id = ?",
            (course_id,)
        ).fetchone()[0]

        if doc_count < 2:
            return {"status": "skipped", "message": "需要至少2份资料才能进行争议分析"}

    # 异步处理
    background_tasks.add_task(controversy_detection_background, course_id)

    return {"status": "processing", "message": "争议分析已开始"}

async def controversy_detection_background(course_id: str):
    """后台争议检测"""
    print(f"正在分析课程 {course_id} 的争议点")

    # 示例争议数据
    controversies = [
        {
            "id": str(uuid.uuid4()),
            "topic": "示例争议主题",
            "pro_view": "正方观点示例",
            "pro_evidence": "正方证据示例",
            "con_view": "反方观点示例",
            "con_evidence": "反方证据示例",
            "confidence": 0.85
        }
    ]

    # 保存到数据库
    now = int(datetime.now().timestamp() * 1000)
    with get_db() as conn:
        for c in controversies:
            conn.execute("""
                INSERT OR REPLACE INTO controversies
                (id, course_id, topic, pro_view, pro_evidence, con_view, con_evidence, confidence, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (c["id"], course_id, c["topic"], c["pro_view"], c["pro_evidence"],
                  c["con_view"], c["con_evidence"], c["confidence"], now))
        conn.commit()

    # 更新学习进度
    with get_db() as conn:
        conn.execute(
            "UPDATE learning_progress SET q2_completed = 1, updated_at = ? WHERE course_id = ?",
            (now, course_id)
        )
        conn.commit()

@router.get("/controversy/{course_id}")
async def get_controversies(course_id: str):
    """获取课程的争议点列表"""
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM controversies WHERE course_id = ? ORDER BY created_at DESC",
            (course_id,)
        ).fetchall()

        controversies = []
        for row in rows:
            controversies.append({
                "id": row["id"],
                "topic": row["topic"],
                "pro_view": row["pro_view"],
                "pro_evidence": row["pro_evidence"],
                "con_view": row["con_view"],
                "con_evidence": row["con_evidence"],
                "confidence": row["confidence"]
            })

        return {"controversies": controversies}

@router.post("/quiz/generate/{course_id}")
async def generate_quiz(course_id: str):
    """第三问：生成测评题目"""

    with get_db() as conn:
        # 获取课程资料
        docs = conn.execute(
            "SELECT content, title FROM documents WHERE course_id = ? LIMIT 5",
            (course_id,)
        ).fetchall()

        if not docs:
            return {"quizzes": [], "message": "暂无资料，无法生成测评"}

    # TODO: 调用 AI 服务生成测评
    quizzes = [
        {
            "id": f"quiz_{course_id}_1",
            "dimension": "记忆",
            "bloom_level": "remember",
            "difficulty": 0.2,
            "question_type": "single",
            "question": "这是示例题目，请基于课程内容回答。",
            "options": ["选项A", "选项B", "选项C", "选项D"],
            "correct_answer": "A",
            "explanation": "这是答案解析",
            "knowledge_points": ["知识点1"]
        }
    ]

    return {"quizzes": quizzes, "total": len(quizzes)}

@router.post("/quiz/submit")
async def submit_quiz(req: QuizSubmit):
    """提交测评答案"""

    evaluation = {
        "is_correct": True,
        "score": 100,
        "feedback": "回答正确！"
    }

    # 保存答题记录
    now = int(datetime.now().timestamp() * 1000)
    with get_db() as conn:
        conn.execute("""
            INSERT INTO quiz_records (id, course_id, question_id, user_answer, is_correct, score, dimension, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (f"record_{req.course_id}_{req.question_id}", req.course_id,
              req.question_id, req.user_answer, 1 if evaluation["is_correct"] else 0,
              evaluation["score"], "", now))
        conn.commit()

    return evaluation

@router.post("/quiz/{course_id}/complete")
async def complete_quiz(course_id: str):
    """完成测评，更新进度"""

    now = int(datetime.now().timestamp() * 1000)
    with get_db() as conn:
        # 计算正确率
        rows = conn.execute(
            "SELECT COUNT(*) as total, SUM(is_correct) as correct FROM quiz_records WHERE course_id = ?",
            (course_id,)
        ).fetchone()

        total = rows["total"] or 0
        correct = rows["correct"] or 0
        accuracy = (correct / total * 100) if total > 0 else 0

        # 更新进度
        conn.execute("""
            UPDATE learning_progress
            SET q3_completed = 1, q3_score = ?, overall_progress = 100, updated_at = ?
            WHERE course_id = ?
        """, (accuracy, now, course_id))
        conn.commit()

    return SuccessResponse(success=True, message="测评完成", data={"accuracy": accuracy})

@router.get("/progress/{course_id}")
async def get_progress(course_id: str):
    """获取三问完成进度"""
    with get_db() as conn:
        row = conn.execute(
            "SELECT q1_completed, q2_completed, q3_completed, overall_progress FROM learning_progress WHERE course_id = ?",
            (course_id,)
        ).fetchone()

        if not row:
            return {
                "question1": False,
                "question2": False,
                "question3": False,
                "overall_progress": 0
            }

        return {
            "question1": bool(row["q1_completed"]),
            "question2": bool(row["q2_completed"]),
            "question3": bool(row["q3_completed"]),
            "overall_progress": row["overall_progress"] or 0
        }
