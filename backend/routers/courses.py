import uuid
import json
import re
from datetime import datetime
# 端点: /api/courses/create /api/courses/list /api/courses/search /api/courses/{course_id} /api/courses/{course_id}/status /api/courses/{course_id}/progress
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


@router.get("/search")
async def search_courses(
    q: str = Query(..., min_length=1, description="搜索关键词"),
    top_k: int = Query(10, ge=1, le=50),
    prefer_chinese: bool = Query(True, description="中文资料优先")
):
    """
    课程搜索：标题匹配 + 文档内容相关性 + 中文资料加权
    综合分 = 0.55 * 内容相关 + 0.30 * 标题匹配 + 0.15 * 中文加权
    """
    if not q.strip():
        return {"results": [], "total": 0, "query": q}

    q_tokens = _tokenize(q)
    is_zh_query = _has_chinese(q)

    with get_db() as conn:
        courses = conn.execute(
            "SELECT id, title, keywords, original_question, status, created_at, updated_at "
            "FROM courses WHERE status != 'deleted'"
        ).fetchall()

    results = []
    for c in courses:
        title = c["title"] or ""
        title_lower = title.lower()
        course_id = c["id"]

        # 标题匹配分
        if q.lower() in title_lower:
            title_score = 1.0
        elif any(tk in title_lower for tk in q_tokens):
            title_score = 0.6
        else:
            title_score = 0.0

        with get_db() as conn:
            docs = conn.execute(
                "SELECT title, content, source_type FROM documents WHERE course_id = ?",
                (course_id,)
            ).fetchall()

        all_text = " ".join((d["title"] or "") + " " + (d["content"] or "") for d in docs)
        if not all_text.strip():
            content_score = 0.0
            best_snippet = ""
            chinese_ratio = 0.0
        else:
            text_lower = all_text.lower()
            token_hits = sum(1 for tk in q_tokens if tk in text_lower)
            content_score = min(1.0, token_hits / max(1, len(q_tokens)))

            if prefer_chinese:
                chinese_chars = len(_CHINESE_RE.findall(all_text))
                chinese_ratio = chinese_chars / max(1, len(all_text))
            else:
                chinese_ratio = 0.5

            best_snippet = _make_snippet(docs[0]["content"] or docs[0]["title"] or "", q)

        if is_zh_query:
            chinese_bonus = chinese_ratio
        else:
            chinese_bonus = 0.5 if chinese_ratio < 0.3 else 0.0

        final_score = (
            0.55 * content_score
            + 0.30 * title_score
            + 0.15 * chinese_bonus
        )

        if final_score < 0.25:
            continue

        results.append({
            "id": c["id"],
            "title": title,
            "keywords": json.loads(c["keywords"]) if c["keywords"] else [],
            "original_question": c["original_question"],
            "status": c["status"],
            "created_at": c["created_at"],
            "updated_at": c["updated_at"],
            "doc_count": len(docs),
            "score": round(final_score, 4),
            "snippet": best_snippet,
            "chinese_ratio": round(chinese_ratio, 3),
        })

    results.sort(key=lambda x: x["score"], reverse=True)
    results = results[:top_k]

    print(f"[search] q={q!r} 命中 {len(results)} 条 (中文查询={is_zh_query})")
    for r in results[:5]:
        print(f"  - {r['title']} (score={r['score']}, zh={r['chinese_ratio']}, docs={r['doc_count']})")

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
