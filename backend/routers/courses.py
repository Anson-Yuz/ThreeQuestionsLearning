import uuid
import json
import re
import time
import asyncio
import threading
from datetime import datetime
# 端点: /api/courses/create /api/courses/list /api/courses/search /api/courses/{course_id}/graph /api/courses/{course_id} /api/courses/{course_id}/status /api/courses/{course_id}/progress
from fastapi import APIRouter, HTTPException, BackgroundTasks, Query
from typing import Optional, List

from database import get_db
from models import CourseCreate, CourseResponse, CourseUpdateStatus, CourseUpdateProgress, SuccessResponse

router = APIRouter()

# 辅助函数：格式化课程响应
def format_course(row) -> dict:
    """将数据库行转换为响应格式"""
    return {
        "id": row["id"],
        "title": row["title"],
        "keywords": json.loads(row["keywords"]) if row["keywords"] else [],
        "original_question": row["original_question"],
        "status": row["status"],
        "progress": 0,
        "three_ask_progress": {
            "question1": False,
            "question2": False,
            "question3": False
        },
        "created_at": row["created_at"],
        "last_accessed": row["updated_at"] or row["created_at"]
    }

@router.post("/create", response_model=CourseResponse)
async def create_course(
    req: CourseCreate,
    background_tasks: BackgroundTasks
):
    """创建课程：用户提问触发"""

    course_id = str(uuid.uuid4())
    now = int(datetime.now().timestamp() * 1000)

    title = req.question[:50] if len(req.question) > 50 else req.question
    if len(title) < 10:
        title = f"课程：{title}"

    keywords = json.dumps(["AI", "学习", "自定义"])

    with get_db() as conn:
        conn.execute("""
            INSERT INTO courses (id, title, keywords, original_question, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (course_id, title, keywords, req.question, "active", now, now))

        conn.execute("""
            INSERT INTO learning_progress (id, course_id, created_at, updated_at)
            VALUES (?, ?, ?, ?)
        """, (f"progress_{course_id}", course_id, now, now))

        conn.commit()

        row = conn.execute("SELECT * FROM courses WHERE id = ?", (course_id,)).fetchone()

    background_tasks.add_task(ai_supplement_background, course_id, req.question)

    # 同步 FTS 索引
    try:
        from database import update_fts
        update_fts(course_id, title, req.question, "")
    except Exception:
        pass

    return format_course(row)

async def ai_supplement_background(course_id: str, question: str):
    """后台异步补充 AI 资料"""
    print(f"正在为课程 {course_id} 补充 AI 资料，问题：{question}")

@router.get("/list")
async def list_courses(
    status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0
):
    """获取课程列表"""
    with get_db() as conn:
        query = "SELECT * FROM courses"
        params = []

        if status:
            query += " WHERE status = ?"
            params.append(status)

        query += " ORDER BY updated_at DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])

        rows = conn.execute(query, params).fetchall()

        courses = []
        for row in rows:
            course = format_course(row)
            progress_row = conn.execute(
                "SELECT q1_completed, q2_completed, q3_completed, overall_progress FROM learning_progress WHERE course_id = ?",
                (row["id"],)
            ).fetchone()
            if progress_row:
                course["progress"] = progress_row["overall_progress"] or 0
                course["three_ask_progress"] = {
                    "question1": bool(progress_row["q1_completed"]),
                    "question2": bool(progress_row["q2_completed"]),
                    "question3": bool(progress_row["q3_completed"])
                }
            courses.append(course)

        return {"courses": courses, "total": len(courses)}


# ========== 课程搜索（必须在 /{course_id} 之前注册，否则被通配符路由吞掉）==========

_CHINESE_RE = re.compile(r'[一-鿿]')


def _has_chinese(text: str) -> bool:
    return bool(_CHINESE_RE.search(text or ""))


def _tokenize(text: str) -> List[str]:
    """中英混合分词：中文用 jieba，英文按空白/标点切分"""
    text = (text or "").lower()
    if not text:
        return []
    if _has_chinese(text):
        try:
            import jieba
            return [t for t in jieba.lcut(text) if len(t) > 1]
        except Exception:
            return _CHINESE_RE.findall(text)
    return [t for t in re.split(r'[\s,.;:!?()\[\]{}<>\'"`/\\|+\-]+', text) if len(t) > 1]


def _make_snippet(text: str, query: str, max_len: int = 120) -> str:
    """在文本中查找 query 首次出现位置，返回带省略号的片段"""
    if not text or not query:
        return (text or "")[:max_len]
    lower = text.lower()
    q_lower = query.lower()
    idx = lower.find(q_lower)
    if idx < 0:
        tokens = _tokenize(query)
        for tk in tokens:
            j = lower.find(tk)
            if j >= 0:
                idx = j
                break
    if idx < 0:
        return text[:max_len]
    start = max(0, idx - 30)
    end = min(len(text), idx + max_len - 30)
    snippet = text[start:end]
    if start > 0:
        snippet = "..." + snippet
    if end < len(text):
        snippet = snippet + "..."
    return snippet


@router.get("/{course_id}/graph")
async def get_cached_graph(course_id: str):
    """
    课程图谱缓存接口 — 优先返回 SQLite 缓存
    命中：直接返回 JSON，< 50ms
    未命中：触发后台线程生成，返回 {status: 'generating', nodes: [], links: []}
    """
    with get_db() as conn:
        row = conn.execute(
            "SELECT graph_data FROM knowledge_graphs WHERE course_id = ?",
            (course_id,)
        ).fetchone()

    if row and row["graph_data"]:
        try:
            data = json.loads(row["graph_data"])
            if data.get("nodes") and len(data["nodes"]) > 0:
                return {"status": "ready", "data": data}
        except (json.JSONDecodeError, TypeError):
            pass

    # 未命中，触发后台生成（用 threading 启动独立事件循环）
    try:
        from services.llm_service import LLMService
        from services.graph_service import GraphService
        from routers.discover import _update_graph_and_controversy

        def _bg():
            try:
                asyncio.run(_update_graph_and_controversy(course_id))
            except Exception as e:
                print(f"[graph-cache] 后台生成失败 {course_id}: {e}")
        threading.Thread(target=_bg, daemon=True).start()
    except Exception as e:
        print(f"[graph-cache] 启动后台任务失败: {e}")

    return {"status": "generating", "data": {"nodes": [], "links": []}}


@router.get("/{course_id}/quizzes")
async def get_cached_quizzes(course_id: str):
    """
    课程测评缓存接口 — 优先返回 SQLite 缓存
    命中：< 50ms 返回题库
    未命中：触发后台线程生成（每维度 2 道，共 ~12 道），返回 {status: 'generating'}
    """
    with get_db() as conn:
        row = conn.execute(
            "SELECT quizzes_json FROM course_quizzes WHERE course_id = ?",
            (course_id,)
        ).fetchone()

    if row and row["quizzes_json"]:
        try:
            quizzes = json.loads(row["quizzes_json"])
            if isinstance(quizzes, list) and len(quizzes) > 0:
                return {"status": "ready", "data": quizzes}
        except (json.JSONDecodeError, TypeError):
            pass

    # 未命中，触发后台生成
    def _bg():
        try:
            from services.llm_service import LLMService
            from services.quiz_service import QuizService
            with get_db() as conn:
                docs = conn.execute(
                    "SELECT id, title, content FROM documents WHERE course_id = ? LIMIT 5",
                    (course_id,)
                ).fetchall()
            documents = [{"id": d["id"], "title": d["title"], "content": d["content"] or ""} for d in docs]
            if not documents:
                print(f"[quiz-cache] 课程 {course_id} 无资料，跳过生成")
                return
            llm = LLMService()
            qs = QuizService(llm)
            quizzes = asyncio.run(qs.generate_quiz(course_id, documents, questions_per_level=2))
            if not quizzes:
                print(f"[quiz-cache] 课程 {course_id} LLM 未能生成题目")
                return
            now = int(datetime.now().timestamp() * 1000)
            with get_db() as conn:
                conn.execute(
                    "INSERT OR REPLACE INTO course_quizzes (course_id, quizzes_json, updated_at) VALUES (?, ?, ?)",
                    (course_id, json.dumps(quizzes, ensure_ascii=False), now)
                )
                conn.commit()
            from routers.sse import push_event
            push_event(course_id, "quiz_ready", {"quizzes": quizzes, "count": len(quizzes)})
            print(f"[quiz-cache] 课程 {course_id} 生成 {len(quizzes)} 道题已缓存")
        except Exception as e:
            print(f"[quiz-cache] 后台生成失败 {course_id}: {e}")

    threading.Thread(target=_bg, daemon=True).start()
    return {"status": "generating", "data": []}


@router.get("/{course_id}/quick-quiz")
async def get_quick_quiz(course_id: str):
    """
    快速测评接口：< 100ms 返回 10 道基于关键词的简单题
    同时后台启动 LLM 生成高质量题目，完成后通过 SSE `quiz_ready` 推送
    """
    start = time.time()

    # 1. 同步：基于关键词立即生成 10 道题
    try:
        from services.quiz_service import generate_quick_quiz
        quick_questions = generate_quick_quiz(course_id, get_db, target_count=10)
    except Exception as e:
        print(f"[quick-quiz] 关键词生成失败: {e}")
        quick_questions = []

    # 2. 后台：用 LLM 生成高质量题目，完成后写缓存 + 推 SSE
    try:
        from services.quiz_service import _background_generate_llm_quiz

        def _bg():
            try:
                _background_generate_llm_quiz(course_id)
            except Exception as e:
                print(f"[quick-quiz] 后台任务异常: {e}")
        threading.Thread(target=_bg, daemon=True).start()
    except Exception as e:
        print(f"[quick-quiz] 启动后台任务失败: {e}")

    elapsed = (time.time() - start) * 1000
    print(f"[quick-quiz] 课程 {course_id} 返回 {len(quick_questions)} 道关键词题，耗时 {elapsed:.1f}ms")

    return {
        "questions": quick_questions,
        "source": "quick",
        "count": len(quick_questions),
        "elapsed_ms": round(elapsed, 1),
    }


@router.get("/search")
async def search_courses(
    q: str = Query(..., min_length=1, description="搜索关键词"),
    top_k: int = Query(10, ge=1, le=50),
):
    """
    课程搜索：FTS5 全文索引（< 50ms）— 纯本地查询，绝无 LLM 调用
    性能目标：单次响应 < 1 秒（实测 < 50ms）。
    """
    import time
    start = time.time()
    q = q.strip()
    if len(q) < 1:
        return {"results": [], "total": 0, "query": q}

    is_zh = _has_chinese(q)
    results = []

    # 1. 优先用 FTS5（速度 < 50ms）
    try:
        with get_db() as conn:
            fts_query = f'"{q}"' if not is_zh else q
            # 先尝试带 snippet，若版本不支持则降级
            try:
                rows = conn.execute(
                    "SELECT course_id, title, description, snippet(courses_fts, 3, '...', '...', 32), rank "
                    "FROM courses_fts WHERE courses_fts MATCH ? ORDER BY rank LIMIT ?",
                    (fts_query, top_k * 2)
                ).fetchall()
                use_snippet = True
            except Exception:
                rows = conn.execute(
                    "SELECT course_id, title, description, '', rank "
                    "FROM courses_fts WHERE courses_fts MATCH ? ORDER BY rank LIMIT ?",
                    (fts_query, top_k * 2)
                ).fetchall()
                use_snippet = False
        for r in rows:
            results.append({
                "id": r["course_id"],
                "title": r["title"] or "",
                "description": r["description"] or "",
                "snippet": r[3] or "",
                "score": round(1.0 / (1 + max(0, r["rank"])), 4),
            })
    except Exception as e:
        print(f"[search] FTS5 查询失败: {e}, 回退 LIKE")
        results = []

    # 2. 回退：标题 LIKE + 文档数
    if not results:
        with get_db() as conn:
            like_q = f"%{q}%"
            rows = conn.execute(
                "SELECT id, title, original_question FROM courses "
                "WHERE status != 'deleted' AND title LIKE ? LIMIT ?",
                (like_q, top_k)
            ).fetchall()
        for r in rows:
            results.append({
                "id": r["id"],
                "title": r["title"] or "",
                "description": r["original_question"] or "",
                "snippet": "",
                "score": 0.5,
            })

    # 3. 合并课程元数据（keywords、status、doc_count）
    if results:
        ids = tuple(r["id"] for r in results)
        placeholders = ",".join("?" * len(ids))
        with get_db() as conn:
            meta_rows = conn.execute(
                f"SELECT id, keywords, original_question, status, created_at, updated_at "
                f"FROM courses WHERE id IN ({placeholders})",
                ids
            ).fetchall()
            meta_map = {r["id"]: dict(r) for r in meta_rows}

            doc_count_rows = conn.execute(
                f"SELECT course_id, COUNT(*) AS cnt FROM documents "
                f"WHERE course_id IN ({placeholders}) GROUP BY course_id",
                ids
            ).fetchall()
            doc_count_map = {r["course_id"]: r["cnt"] for r in doc_count_rows}

        for r in results:
            m = meta_map.get(r["id"], {})
            r["keywords"] = json.loads(m.get("keywords") or "[]") if m.get("keywords") else []
            r["original_question"] = m.get("original_question", "")
            r["status"] = m.get("status", "active")
            r["created_at"] = m.get("created_at", 0)
            r["updated_at"] = m.get("updated_at", 0)
            r["doc_count"] = doc_count_map.get(r["id"], 0)

    # 中文查询时含中文资料的微加权
    if is_zh:
        for r in results:
            chinese_ratio = len(_CHINESE_RE.findall(r["title"])) / max(1, len(r["title"]))
            r["score"] = round(r["score"] * (1 + 0.1 * chinese_ratio), 4)
            r["chinese_ratio"] = round(chinese_ratio, 3)

    results.sort(key=lambda x: x["score"], reverse=True)
    results = results[:top_k]

    print(f"[search] q={q!r} 命中 {len(results)} 条 (FTS5={bool(results)}) 耗时 {(time.time()-start)*1000:.1f}ms")
    for r in results[:3]:
        print(f"  - {r['title']} (score={r['score']}, docs={r.get('doc_count', 0)})")

    return {"results": results, "total": len(results), "query": q}


# ========== 课程详情（通配符路由，必须在 /search 之后）==========

@router.get("/{course_id}")
async def get_course(course_id: str):
    """获取单个课程详情"""
    with get_db() as conn:
        row = conn.execute("SELECT * FROM courses WHERE id = ?", (course_id,)).fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="课程不存在")

        conn.execute(
            "UPDATE courses SET updated_at = ? WHERE id = ?",
            (int(datetime.now().timestamp() * 1000), course_id)
        )
        conn.commit()

        course = format_course(row)

        progress_row = conn.execute(
            "SELECT q1_completed, q2_completed, q3_completed, overall_progress FROM learning_progress WHERE course_id = ?",
            (course_id,)
        ).fetchone()

        if progress_row:
            course["progress"] = progress_row["overall_progress"] or 0
            course["three_ask_progress"] = {
                "question1": bool(progress_row["q1_completed"]),
                "question2": bool(progress_row["q2_completed"]),
                "question3": bool(progress_row["q3_completed"])
            }

        return course

@router.patch("/{course_id}/status")
async def update_course_status(course_id: str, req: CourseUpdateStatus):
    """更新课程状态"""
    with get_db() as conn:
        row = conn.execute("SELECT * FROM courses WHERE id = ?", (course_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="课程不存在")

        conn.execute(
            "UPDATE courses SET status = ?, updated_at = ? WHERE id = ?",
            (req.status, int(datetime.now().timestamp() * 1000), course_id)
        )
        conn.commit()

    return SuccessResponse(success=True, message=f"课程状态已更新为 {req.status}")

@router.patch("/{course_id}/progress")
async def update_course_progress(course_id: str, req: CourseUpdateProgress):
    """更新课程进度"""
    with get_db() as conn:
        row = conn.execute("SELECT * FROM learning_progress WHERE course_id = ?", (course_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="课程进度记录不存在")

        q1 = 1 if req.progress >= 33 else 0
        q2 = 1 if req.progress >= 66 else 0
        q3 = 1 if req.progress >= 100 else 0

        conn.execute("""
            UPDATE learning_progress
            SET overall_progress = ?, q1_completed = ?, q2_completed = ?, q3_completed = ?, updated_at = ?
            WHERE course_id = ?
        """, (req.progress, q1, q2, q3, int(datetime.now().timestamp() * 1000), course_id))
        conn.commit()

    return SuccessResponse(success=True, message="进度已更新")

@router.delete("/{course_id}")
async def delete_course(course_id: str):
    """删除课程（软删除，标记为 deleted）"""
    with get_db() as conn:
        row = conn.execute("SELECT * FROM courses WHERE id = ?", (course_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="课程不存在")

        conn.execute(
            "UPDATE courses SET status = 'deleted', updated_at = ? WHERE id = ?",
            (int(datetime.now().timestamp() * 1000), course_id)
        )
        conn.commit()

    return SuccessResponse(success=True, message="课程已删除")
