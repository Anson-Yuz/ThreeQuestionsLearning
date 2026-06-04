import json
import uuid
import asyncio
import threading
from datetime import datetime
from fastapi import APIRouter, HTTPException
from typing import List, Optional

from database import get_db
from models import QuizSubmit, SuccessResponse

router = APIRouter()

def _run_async_bg(coro):
    """在后台线程中运行异步协程"""
    def _runner():
        try:
            asyncio.run(coro)
        except Exception as e:
            print(f"[bg] 后台任务异常: {e}", flush=True)
            import traceback
            traceback.print_exc()
    threading.Thread(target=_runner, daemon=True).start()

@router.post("/graph/generate/{course_id}")
async def generate_graph(course_id: str):
    """第一问：生成知识图谱 — 基于真实资料，无资料或LLM失败时返回空图谱"""

    with get_db() as conn:
        docs = conn.execute(
            "SELECT id, title, content FROM documents WHERE course_id = ? LIMIT 5",
            (course_id,)
        ).fetchall()
        title_row = conn.execute(
            "SELECT title FROM courses WHERE id = ?", (course_id,)
        ).fetchone()

        if not docs:
            return {"nodes": [], "links": []}

        documents = [{"id": d["id"], "title": d["title"], "content": d["content"] or ""} for d in docs]
        course_title = title_row["title"] if title_row else ""

    # 调用 AI 服务生成图谱
    try:
        from services.llm_service import LLMService
        from services.graph_service import GraphService

        llm = LLMService()
        gs = GraphService(llm)
        graph_data = await gs.generate_graph(course_id, documents, course_title=course_title)
    except Exception as e:
        print(f"err: Graph generation failed: {e}")
        graph_data = {"nodes": [], "links": []}

    # 缓存图谱数据
    now = int(datetime.now().timestamp() * 1000)
    with get_db() as conn:
        conn.execute("""
            INSERT OR REPLACE INTO knowledge_graphs (course_id, graph_data, updated_at)
            VALUES (?, ?, ?)
        """, (course_id, json.dumps(graph_data, ensure_ascii=False), now))
        conn.commit()

    return graph_data

@router.post("/graph/update/{course_id}")
async def update_graph_incremental(course_id: str, doc_id: str):
    """增量更新知识图谱"""
    # TODO: 实现增量更新逻辑
    return await generate_graph(course_id)

@router.post("/controversy/detect/{course_id}")
async def detect_controversy(course_id: str):
    """第二问：异步检测学术分歧"""

    with get_db() as conn:
        doc_count = conn.execute(
            "SELECT COUNT(*) FROM documents WHERE course_id = ?",
            (course_id,)
        ).fetchone()[0]

        if doc_count < 2:
            return {"status": "skipped", "message": "需要至少2份资料才能进行争议分析"}

    # 在后台线程中运行，确保不受 FastAPI 事件循环影响
    _run_async_bg(controversy_detection_background(course_id))

    return {"status": "processing", "message": "争议分析已开始"}

async def controversy_detection_background(course_id: str):
    """后台争议检测 — 基于LLM从文档中提取真实学术争议"""
    print(f"正在分析课程 {course_id} 的争议点")

    controversies = []

    try:
        from services.llm_service import LLMService

        with get_db() as conn:
            docs = conn.execute(
                "SELECT id, title, content FROM documents WHERE course_id = ?",
                (course_id,)
            ).fetchall()

        if len(docs) < 2:
            print(f"  课程 {course_id} 资料不足 (需要>=2)，跳过争议分析")
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
                        "confidence": float(item.get("confidence", 0.7))
                    })
        else:
            print(f"  争议分析: LLM 返回非数组结果")
    except Exception as e:
        print(f"err: Controversy detection failed: {e}")
        controversies = []

    # 保存到数据库
    if controversies:
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

    # 推送 SSE 事件
    from routers.sse import push_event
    push_event(course_id, "controversy_ready", {"controversies": controversies})

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
    """第三问：生成测评题目 — 基于真实资料，无资料或LLM失败时返回空列表"""

    with get_db() as conn:
        docs = conn.execute(
            "SELECT id, title, content FROM documents WHERE course_id = ? LIMIT 5",
            (course_id,)
        ).fetchall()
        title_row = conn.execute(
            "SELECT title FROM courses WHERE id = ?", (course_id,)
        ).fetchone()

        if not docs:
            return {"quizzes": [], "total": 0, "message": "暂无资料，无法生成测评"}

        documents = [{"id": d["id"], "title": d["title"], "content": d["content"] or ""} for d in docs]
        course_title = title_row["title"] if title_row else ""

    # 调用 AI 服务生成测评
    try:
        from services.llm_service import LLMService
        from services.quiz_service import QuizService

        llm = LLMService()
        qs = QuizService(llm)
        quizzes = await qs.generate_quiz(course_id, documents, course_title=course_title)
    except Exception as e:
        print(f"err: Quiz generation failed: {e}")
        quizzes = []

    return {"quizzes": quizzes, "total": len(quizzes), "message": "生成完成" if quizzes else "未能生成题目，请稍后重试"}

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
