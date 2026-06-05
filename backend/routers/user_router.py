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

    with get_db() as conn:
        rows = conn.execute("""
            SELECT
                date(created_at / 1000, 'unixepoch', 'localtime') AS day,
                SUM(COALESCE(duration, 0)) AS total_seconds
            FROM learning_events
            WHERE created_at >= ?
            GROUP BY day
            ORDER BY day
        """, (week_ago,)).fetchall()

    from datetime import datetime as dt, timedelta

    today = dt.now().date()
    result = {}
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        result[day.isoformat()] = 0

    for row in rows:
        result[row["day"]] = row["total_seconds"]

    day_names = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]
    trend_data = []
    for idx, (day_str, seconds) in enumerate(result.items()):
        hours = seconds / 3600
        max_hours = 4.0
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