import uuid
import json
from datetime import datetime
# 端点: /api/courses/create /api/courses/list /api/courses/{course_id} /api/courses/{course_id}/status /api/courses/{course_id}/progress
from fastapi import APIRouter, HTTPException, BackgroundTasks
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
        "last_accessed": row.get("updated_at", row["created_at"])
    }

@router.post("/create", response_model=CourseResponse)
async def create_course(
    req: CourseCreate,
    background_tasks: BackgroundTasks
):
    """创建课程：用户提问触发"""

    # 1. 生成课程 ID
    course_id = str(uuid.uuid4())
    now = int(datetime.now().timestamp() * 1000)

    # 2. 从问题中提取标题（简化版，实际可调用 LLM）
    title = req.question[:50] if len(req.question) > 50 else req.question
    if len(title) < 10:
        title = f"课程：{title}"

    # 3. 提取关键词（简化版）
    keywords = json.dumps(["AI", "学习", "自定义"])

    # 4. 保存到数据库
    with get_db() as conn:
        conn.execute("""
            INSERT INTO courses (id, title, keywords, original_question, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (course_id, title, keywords, req.question, "active", now, now))

        # 同时创建学习进度记录
        conn.execute("""
            INSERT INTO learning_progress (id, course_id, created_at, updated_at)
            VALUES (?, ?, ?, ?)
        """, (f"progress_{course_id}", course_id, now, now))

        conn.commit()

        # 获取刚创建的课程
        row = conn.execute("SELECT * FROM courses WHERE id = ?", (course_id,)).fetchone()

    # 5. 后台触发 AI 资料补充（异步）
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

        # 获取每个课程的进度
        courses = []
        for row in rows:
            course = format_course(row)

            # 获取三问进度
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

@router.get("/{course_id}")
async def get_course(course_id: str):
    """获取单个课程详情"""
    with get_db() as conn:
        row = conn.execute("SELECT * FROM courses WHERE id = ?", (course_id,)).fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="课程不存在")

        # 更新最后访问时间
        conn.execute(
            "UPDATE courses SET updated_at = ? WHERE id = ?",
            (int(datetime.now().timestamp() * 1000), course_id)
        )
        conn.commit()

        course = format_course(row)

        # 获取三问进度
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

        # 根据进度推算三问完成度
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
