from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from database import get_db
import json
import io
import time
import datetime

router = APIRouter(prefix="/user", tags=["用户"])


@router.get("/weekly-trend")
async def get_weekly_trend():
    """获取最近7天每日学习时长（秒）→ 用于周趋势柱状图"""
    now = int(time.time() * 1000)
    one_day_ms = 24 * 3600 * 1000
    week_ago = now - 7 * one_day_ms

    from datetime import datetime as dt, timedelta

    with get_db() as conn:
        # 1. 优先从 learning_events 获取数据
        rows = conn.execute("""
            SELECT
                date(created_at / 1000, 'unixepoch', 'localtime') AS day,
                SUM(COALESCE(duration, 0)) AS total_seconds
            FROM learning_events
            WHERE created_at >= ?
            GROUP BY day
            ORDER BY day
        """, (week_ago,)).fetchall()

        # 2. 如果 learning_events 无数据，回退到 quiz_records 统计每日答题数
        use_quiz_fallback = len(rows) == 0
        if use_quiz_fallback:
            rows = conn.execute("""
                SELECT
                    date(created_at / 1000, 'unixepoch', 'localtime') AS day,
                    COUNT(*) AS quiz_count
                FROM quiz_records
                WHERE created_at >= ?
                GROUP BY day
                ORDER BY day
            """, (week_ago,)).fetchall()

    # 补全7天（即使没有数据也要返回7个条目，value=0）
    today = dt.now().date()
    result = {}
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        result[day.isoformat()] = 0

    for row in rows:
        result[row["day"]] = row["total_seconds"]

    day_names = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]
    trend_data = []

    if use_quiz_fallback:
        # 基于答题数：最大值归一化
        max_count = max(result.values()) if result.values() else 1
        for idx, (day_str, count) in enumerate(result.items()):
            value = round(count / max_count, 2) if max_count > 0 else 0
            trend_data.append({
                "day": day_names[idx],
                "value": value,
                "seconds": count,
            })
    else:
        # 基于学习时长：按每日最大4小时归一化
        max_hours = 4.0
        for idx, (day_str, seconds) in enumerate(result.items()):
            hours = seconds / 3600
            value = min(hours / max_hours, 1.0) if max_hours > 0 else 0
            trend_data.append({
                "day": day_names[idx],
                "value": round(value, 2),
                "seconds": seconds,
            })

    return {"trend": trend_data}


@router.get("/export")
async def export_user_data():
    """导出全部学习数据为 JSON 文件"""
    with get_db() as conn:
        courses = conn.execute("""
            SELECT id, title, created_at, updated_at, status
            FROM courses WHERE status != 'deleted'
        """).fetchall()

        progress = conn.execute("SELECT * FROM learning_progress").fetchall()
        events = conn.execute("SELECT * FROM learning_events ORDER BY created_at DESC").fetchall()
        quiz = conn.execute("SELECT * FROM quiz_records ORDER BY created_at DESC").fetchall()

    data = {
        "exported_at": datetime.datetime.now().isoformat(),
        "courses": [dict(row) for row in courses],
        "learning_progress": [dict(row) for row in progress],
        "learning_events": [dict(row) for row in events],
        "quiz_records": [dict(row) for row in quiz],
    }

    json_bytes = json.dumps(data, ensure_ascii=False, indent=2).encode("utf-8")
    return StreamingResponse(
        io.BytesIO(json_bytes),
        media_type="application/json",
        headers={"Content-Disposition": "attachment; filename=learning_data.json"},
    )


@router.get("/uploads")
async def get_upload_history(limit: int = 50):
    """获取用户上传文档历史"""
    with get_db() as conn:
        rows = conn.execute("""
            SELECT d.id, d.title, d.file_path, d.created_at, c.title as course_title
            FROM documents d
            JOIN courses c ON d.course_id = c.id
            WHERE c.status != 'deleted'
            ORDER BY d.created_at DESC
            LIMIT ?
        """, (limit,)).fetchall()
    return {"uploads": [dict(row) for row in rows]}