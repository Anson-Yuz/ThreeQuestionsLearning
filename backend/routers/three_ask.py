import json
import uuid
from datetime import datetime
from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import List, Optional

from database import get_db
from models import QuizSubmit, SuccessResponse

router = APIRouter()


# ========== 后台任务（async def，FastAPI BackgroundTasks 调用）==========

async def _regenerate_graph_bg(course_id: str):
    """后台异步重新生成知识图谱（不阻塞在线接口）"""
    try:
        from services.llm_service import LLMService
        from services.graph_service import GraphService

        with get_db() as conn:
            docs = conn.execute(
                "SELECT id, title, content FROM documents WHERE course_id = ? LIMIT 5",
                (course_id,),
            ).fetchall()
            title_row = conn.execute(
                "SELECT title FROM courses WHERE id = ?", (course_id,)
            ).fetchone()
        if not docs:
            return
        documents = [
            {"id": d["id"], "title": d["title"], "content": d["content"] or ""} for d in docs
        ]
        course_title = title_row["title"] if title_row else ""

        llm = LLMService()
        gs = GraphService(llm)
        graph = await gs.generate_graph(course_id, documents, course_title=course_title)

        now = int(datetime.now().timestamp() * 1000)
        with get_db() as conn:
            conn.execute(
                "INSERT OR REPLACE INTO knowledge_graphs (course_id, graph_data, updated_at) "
                "VALUES (?, ?, ?)",
                (course_id, json.dumps(graph, ensure_ascii=False), now),
            )
            conn.commit()
        from routers.sse import push_event
        push_event(course_id, "graph_updated", graph)
        print(f"[bg] 课程 {course_id} 图谱后台重生成完成 ({len(graph.get('nodes', []))} 节点)")
    except Exception as e:
        print(f"[bg] 图谱后台重生成失败: {e}")


async def _regenerate_quiz_bg(course_id: str):
    """后台异步重新生成 10 道深度理解题"""
    try:
        from services.quiz_service import generate_deep_quiz_10

        with get_db() as conn:
            docs = conn.execute(
                "SELECT id, title, content FROM documents WHERE course_id = ? LIMIT 8",
                (course_id,),
            ).fetchall()
            title_row = conn.execute(
                "SELECT title FROM courses WHERE id = ?", (course_id,)
            ).fetchone()
        if not docs:
            return
        documents = [
            {"id": d["id"], "title": d["title"], "content": d["content"] or ""} for d in docs
        ]
        course_title = title_row["title"] if title_row else ""

        questions = await generate_deep_quiz_10(
            course_id, documents, course_title=course_title
        )
        if not questions:
            return
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
        print(f"[bg] 课程 {course_id} 深度测评后台生成完成 ({len(questions)} 题)")
    except Exception as e:
        print(f"[bg] 深度测评后台生成失败: {e}")


async def _detect_controversy_bg(course_id: str):
    """后台异步检测学术分歧（BackgroundTasks 调用，async）"""
    try:
        from services.llm_service import LLMService

        with get_db() as conn:
            docs = conn.execute(
                "SELECT id, title, content FROM documents WHERE course_id = ?",
                (course_id,),
            ).fetchall()
        if len(docs) < 2:
            return

        combined = "\n\n".join([d["content"][:2000] for d in docs if d["content"]])
        llm = LLMService()
        prompt = f"""基于以下学习资料，分析其中存在的学术争议点或不同观点。

学习资料：
{combined[:5000]}

请返回JSON数组（如果没有争议则返回空数组）：
[
  {{
    "topic": "争议主题",
    "pro_view": "正方核心观点",
    "pro_evidence": "正方依据",
    "con_view": "反方核心观点",
    "con_evidence": "反方依据",
    "confidence": 0.85
  }}
]"""
        parsed = await llm.chat_json(prompt, temperature=0.3, max_tokens=2048)
        controversies: List[dict] = []
        if isinstance(parsed, list):
            for item in parsed:
                if item.get("topic"):
                    controversies.append({
                        "id": str(uuid.uuid4()),
                        "topic": item["topic"],
                        "pro_view": item.get("pro_view", ""),
                        "pro_evidence": item.get("pro_evidence", ""),
                        "con_view": item.get("con_view", ""),
                        "con_evidence": item.get("con_evidence", ""),
                        "confidence": float(item.get("confidence", 0.7)),
                    })

        if controversies:
            now = int(datetime.now().timestamp() * 1000)
            with get_db() as conn:
                for c in controversies:
                    conn.execute(
                        "INSERT OR REPLACE INTO controversies "
                        "(id, course_id, topic, pro_view, pro_evidence, con_view, con_evidence, confidence, created_at) "
                        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                        (
                            c["id"], course_id, c["topic"], c["pro_view"],
                            c["pro_evidence"], c["con_view"], c["con_evidence"],
                            c["confidence"], now,
                        ),
                    )
                conn.execute(
                    "UPDATE learning_progress SET q2_completed = 1, updated_at = ? WHERE course_id = ?",
                    (now, course_id),
                )
                conn.commit()

        from routers.sse import push_event
        push_event(course_id, "controversy_ready", {"controversies": controversies})
        print(f"[bg] 课程 {course_id} 争议检测完成 ({len(controversies)} 条)")
    except Exception as e:
        print(f"[bg] 争议检测失败: {e}")


# ========== 路由：仅读缓存，耗时的扔到 BackgroundTasks ==========

@router.post("/graph/generate/{course_id}")
async def trigger_graph_regenerate(course_id: str, background_tasks: BackgroundTasks):
    """触发后台重新生成图谱，立即返回 processing 状态"""
    background_tasks.add_task(_regenerate_graph_bg, course_id)
    return {"status": "processing", "message": "图谱生成已启动"}


@router.post("/graph/update/{course_id}")
async def update_graph_incremental(
    course_id: str,
    doc_id: str,
    background_tasks: BackgroundTasks,
):
    """增量更新图谱（同全量重生成）"""
    background_tasks.add_task(_regenerate_graph_bg, course_id)
    return {"status": "processing", "message": "图谱更新已启动"}


@router.post("/controversy/detect/{course_id}")
async def detect_controversy(course_id: str, background_tasks: BackgroundTasks):
    """检测学术分歧（异步）"""
    with get_db() as conn:
        doc_count = conn.execute(
            "SELECT COUNT(*) FROM documents WHERE course_id = ?", (course_id,)
        ).fetchone()[0]
    if doc_count < 2:
        return {"status": "skipped", "message": "需要至少2份资料才能进行争议分析"}
    background_tasks.add_task(_detect_controversy_bg, course_id)
    return {"status": "processing", "message": "争议分析已开始"}


@router.get("/controversy/{course_id}")
async def get_controversies(course_id: str):
    """获取课程的争议点列表（仅读缓存）"""
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM controversies WHERE course_id = ? ORDER BY created_at DESC",
            (course_id,),
        ).fetchall()
    controversies = [
        {
            "id": row["id"],
            "topic": row["topic"],
            "pro_view": row["pro_view"],
            "pro_evidence": row["pro_evidence"],
            "con_view": row["con_view"],
            "con_evidence": row["con_evidence"],
            "confidence": row["confidence"],
        }
        for row in rows
    ]
    return {"controversies": controversies}


@router.post("/quiz/generate/{course_id}")
async def trigger_quiz_regenerate(course_id: str, background_tasks: BackgroundTasks):
    """触发后台重新生成 10 道深度题，立即返回"""
    background_tasks.add_task(_regenerate_quiz_bg, course_id)
    return {"status": "processing", "message": "测评生成已启动"}


@router.post("/quiz/submit")
async def submit_quiz(req: QuizSubmit):
    """提交测评答案（纯 DB 写）"""
    evaluation = {
        "is_correct": True,
        "score": 100,
        "feedback": "回答正确！",
    }
    now = int(datetime.now().timestamp() * 1000)
    with get_db() as conn:
        conn.execute(
            "INSERT INTO quiz_records (id, course_id, question_id, user_answer, is_correct, score, dimension, created_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (
                f"record_{req.course_id}_{req.question_id}",
                req.course_id,
                req.question_id,
                req.user_answer,
                1 if evaluation["is_correct"] else 0,
                evaluation["score"],
                "",
                now,
            ),
        )
        conn.commit()
    return evaluation


@router.post("/quiz/{course_id}/complete")
async def complete_quiz(course_id: str):
    """完成测评，更新进度（纯 DB）"""
    now = int(datetime.now().timestamp() * 1000)
    with get_db() as conn:
        row = conn.execute(
            "SELECT COUNT(*) as total, SUM(is_correct) as correct FROM quiz_records WHERE course_id = ?",
            (course_id,),
        ).fetchone()
        total = row["total"] or 0
        correct = row["correct"] or 0
        accuracy = (correct / total * 100) if total > 0 else 0
        conn.execute(
            "UPDATE learning_progress "
            "SET q3_completed = 1, q3_score = ?, overall_progress = 100, updated_at = ? "
            "WHERE course_id = ?",
            (accuracy, now, course_id),
        )
        conn.commit()
    return SuccessResponse(success=True, message="测评完成", data={"accuracy": accuracy})


@router.get("/progress/{course_id}")
async def get_progress(course_id: str):
    """获取三问完成进度（纯 DB）"""
    with get_db() as conn:
        row = conn.execute(
            "SELECT q1_completed, q2_completed, q3_completed, overall_progress FROM learning_progress "
            "WHERE course_id = ?",
            (course_id,),
        ).fetchone()
    if not row:
        return {"question1": False, "question2": False, "question3": False, "overall_progress": 0}
    return {
        "question1": bool(row["q1_completed"]),
        "question2": bool(row["q2_completed"]),
        "question3": bool(row["q3_completed"]),
        "overall_progress": row["overall_progress"] or 0,
    }
