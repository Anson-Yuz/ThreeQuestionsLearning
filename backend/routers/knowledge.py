import uuid
import os
import shutil
import json
from datetime import datetime
# 端点: /api/knowledge/upload /api/knowledge/ai-fetch/{course_id} /api/knowledge/documents /api/knowledge/documents/{doc_id} /api/knowledge/search
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, BackgroundTasks
from typing import Optional, List
from pathlib import Path

from database import get_db
from models import SearchRequest, SuccessResponse

router = APIRouter()

# 上传目录配置
UPLOAD_DIR = Path("./data/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# 支持的文件类型
ALLOWED_TYPES = {
    "application/pdf": ".pdf",
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "text/markdown": ".md",
    "text/plain": ".txt"
}

MAX_FILE_SIZES = {
    "application/pdf": 20 * 1024 * 1024,
    "application/msword": 10 * 1024 * 1024,
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": 10 * 1024 * 1024,
    "text/markdown": 5 * 1024 * 1024,
    "text/plain": 5 * 1024 * 1024
}

@router.post("/upload")
async def upload_document(
    course_id: str = Form(...),
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None
):
    """用户上传资料（PDF/Word/Markdown）"""

    # 1. 验证文件类型
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, f"不支持的文件类型: {file.content_type}")

    # 2. 验证文件大小
    file_size = 0
    content = await file.read()
    file_size = len(content)
    await file.seek(0)  # 重置指针

    if file_size > MAX_FILE_SIZES[file.content_type]:
        raise HTTPException(413, f"文件过大，最大 {MAX_FILE_SIZES[file.content_type] // (1024*1024)}MB")

    # 3. 保存文件
    ext = ALLOWED_TYPES[file.content_type]
    file_name = f"{uuid.uuid4().hex}{ext}"
    course_upload_dir = UPLOAD_DIR / course_id
    course_upload_dir.mkdir(parents=True, exist_ok=True)
    file_path = course_upload_dir / file_name

    with open(file_path, "wb") as f:
        f.write(content)

    # 4. 提取文本内容（简化版，实际需要调用解析服务）
    content_text = f"文件内容：{file.filename}\n请使用解析服务提取完整文本。"

    # 5. 保存到数据库
    doc_id = str(uuid.uuid4())
    now = int(datetime.now().timestamp() * 1000)

    with get_db() as conn:
        conn.execute("""
            INSERT INTO documents (id, course_id, title, content, file_path, file_type, source, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (doc_id, course_id, file.filename, content_text, str(file_path), file.content_type, "user", now))
        conn.commit()

    # 6. 后台触发向量化和融合
    if background_tasks:
        background_tasks.add_task(vectorize_document, course_id, doc_id, content_text)

    # 7. 同步 FTS 索引
    try:
        from database import rebuild_course_fts
        rebuild_course_fts(course_id)
    except Exception:
        pass

    return SuccessResponse(success=True, message="文件上传成功", data={"doc_id": doc_id})


@router.post("/upload-files")
async def upload_multiple_files(
    course_id: str,
    files: List[UploadFile] = File(...),
    background_tasks: BackgroundTasks = None
):
    """批量上传资料（多文件）"""
    if not files:
        raise HTTPException(400, "未选择文件")

    doc_ids = []
    now = int(datetime.now().timestamp() * 1000)
    with get_db() as conn:
        for file in files:
            content = await file.read()
            ext = ALLOWED_TYPES.get(file.content_type)
            if not ext:
                ext = Path(file.filename or "").suffix.lower() or ".txt"
            if ext not in {".pdf", ".doc", ".docx", ".md", ".txt"}:
                continue
            if len(content) > MAX_FILE_SIZES.get(file.content_type, 20 * 1024 * 1024):
                continue
            file_name = f"{uuid.uuid4().hex}{ext}"
            course_upload_dir = UPLOAD_DIR / course_id
            course_upload_dir.mkdir(parents=True, exist_ok=True)
            file_path = course_upload_dir / file_name
            with open(file_path, "wb") as f:
                f.write(content)
            doc_id = str(uuid.uuid4())
            content_text = f"文件内容：{file.filename}\n请使用解析服务提取完整文本。"
            conn.execute("""
                INSERT INTO documents (id, course_id, title, content, file_path, file_type, source, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (doc_id, course_id, file.filename, content_text, str(file_path), file.content_type, "user", now))
            doc_ids.append(doc_id)
        conn.commit()

    # 同步 FTS 索引
    if doc_ids:
        try:
            from database import rebuild_course_fts
            rebuild_course_fts(course_id)
        except Exception:
            pass

    # 触发后台图谱+测评+争议生成（FastAPI BackgroundTasks，零 threading 冲突）
    if doc_ids and background_tasks:
        try:
            from routers.three_ask import (
                _regenerate_graph_bg,
                _regenerate_quiz_bg,
                _detect_controversy_bg,
            )
            background_tasks.add_task(_regenerate_graph_bg, course_id)
            background_tasks.add_task(_regenerate_quiz_bg, course_id)
            if len(doc_ids) >= 2:
                background_tasks.add_task(_detect_controversy_bg, course_id)
        except Exception as e:
            print(f"[upload] 注册后台任务失败: {e}")

    return SuccessResponse(
        success=True,
        message=f"已上传 {len(doc_ids)} 个文件",
        data={"doc_ids": doc_ids, "count": len(doc_ids)}
    )

async def vectorize_document(course_id: str, doc_id: str, content: str):
    """后台向量化文档"""
    print(f"正在向量化文档 {doc_id}，内容长度: {len(content)}")

@router.post("/ai-fetch/{course_id}")
async def ai_fetch_documents(
    course_id: str,
    background_tasks: BackgroundTasks
):
    """AI 自动联网检索权威资料"""

    # 获取课程关键词
    with get_db() as conn:
        row = conn.execute("SELECT title, keywords FROM courses WHERE id = ?", (course_id,)).fetchone()
        if not row:
            raise HTTPException(404, "课程不存在")

        keywords = json.loads(row["keywords"]) if row["keywords"] else [row["title"]]

    # 后台触发 AI 搜索
    background_tasks.add_task(ai_search_background, course_id, keywords)

    return SuccessResponse(success=True, message="AI 资料补充已启动")

async def ai_search_background(course_id: str, keywords: List[str]):
    """后台 AI 搜索"""
    print(f"正在为课程 {course_id} 搜索关键词: {keywords}")

@router.get("/documents")
async def list_documents(
    course_id: str,
    source: Optional[str] = None
):
    """获取课程资料列表"""
    with get_db() as conn:
        query = "SELECT id, title, content, source_type, source_url, file_type, source, file_path, created_at FROM documents WHERE course_id = ?"
        params = [course_id]

        if source:
            query += " AND source_type = ?"
            params.append(source)

        query += " ORDER BY created_at DESC"

        rows = conn.execute(query, params).fetchall()

        documents = []
        for row in rows:
            documents.append({
                "id": row["id"],
                "title": row["title"],
                "content_preview": row["content"][:200] if row["content"] else "",
                "source_type": row["source_type"] or "user_upload",
                "source_url": row["source_url"] or "",
                "file_type": row["file_type"],
                "source": row["source"],
                "created_at": row["created_at"]
            })

        return {"documents": documents}

@router.get("/documents/{doc_id}")
async def get_document(doc_id: str):
    """获取单个资料详情"""
    with get_db() as conn:
        row = conn.execute("SELECT * FROM documents WHERE id = ?", (doc_id,)).fetchone()

        if not row:
            raise HTTPException(404, "资料不存在")

        return {
            "id": row["id"],
            "title": row["title"],
            "content": row["content"],
            "file_path": row["file_path"],
            "file_type": row["file_type"],
            "source": row["source"],
            "created_at": row["created_at"]
        }

@router.delete("/documents/{doc_id}")
async def delete_document(doc_id: str):
    """删除资料"""
    with get_db() as conn:
        row = conn.execute("SELECT * FROM documents WHERE id = ?", (doc_id,)).fetchone()
        if not row:
            raise HTTPException(404, "资料不存在")

        # 删除本地文件
        if row["file_path"] and Path(row["file_path"]).exists():
            Path(row["file_path"]).unlink()

        # 删除数据库记录
        conn.execute("DELETE FROM documents WHERE id = ?", (doc_id,))
        conn.commit()

    return SuccessResponse(success=True, message="资料已删除")

@router.post("/search")
async def semantic_search(req: SearchRequest):
    """知识库检索 — 纯 SQLite LIKE 查询（毫秒级返回，零 LLM / 零向量化）"""
    q = (req.query or "").strip()
    if len(q) < 2:
        return {"results": [], "total": 0, "message": "关键词至少 2 个字符"}

    with get_db() as conn:
        like_q = f"%{q}%"
        rows = conn.execute(
            "SELECT content, title, source FROM documents "
            "WHERE course_id = ? AND content LIKE ? LIMIT ?",
            (req.course_id, like_q, req.top_k),
        ).fetchall()

        results = []
        for row in rows:
            content = row["content"] or ""
            idx = content.find(q)
            if idx < 0:
                snippet = content[:200]
            else:
                start = max(0, idx - 40)
                end = min(len(content), idx + len(q) + 40)
                snippet = content[start:end]
                if start > 0:
                    snippet = "..." + snippet
                if end < len(content):
                    snippet = snippet + "..."
            results.append({
                "content": snippet or content[:200],
                "score": 0.5,
                "metadata": {"source": row["source"], "title": row["title"]},
            })

    if not results:
        return {"results": [], "total": 0, "message": "未找到相关资料，尝试换个关键词吧"}
    return {"results": results, "total": len(results)}
