import asyncio
import json
from fastapi import APIRouter
from typing import Dict, Any

router = APIRouter()

# 存储每个课程的 SSE 事件队列
event_queues: Dict[str, asyncio.Queue] = {}

def get_queue(course_id: str) -> asyncio.Queue:
    """获取或创建课程的事件队列"""
    if course_id not in event_queues:
        event_queues[course_id] = asyncio.Queue()
    return event_queues[course_id]

def push_event(course_id: str, event_type: str, data: Any):
    """向指定课程推送 SSE 事件"""
    queue = get_queue(course_id)
    queue.put_nowait({
        "event": event_type,
        "data": json.dumps(data, ensure_ascii=False)
    })

@router.get("/stream/{course_id}")
async def sse_stream(course_id: str):
    """
    SSE 实时推送流
    事件类型：
    - graph_updated: 知识图谱更新
    - controversy_ready: 争议分析完成
    - quiz_ready: 测评生成完成
    - progress: 进度更新
    - notification: 一般通知
    """

    from sse_starlette.sse import EventSourceResponse

    queue = get_queue(course_id)

    async def event_generator():
        try:
            while True:
                # 等待新事件
                event = await queue.get()
                yield event
        except asyncio.CancelledError:
            # 连接断开，清理队列
            if course_id in event_queues:
                del event_queues[course_id]

    return EventSourceResponse(event_generator())

@router.post("/push/{course_id}")
async def push_test_event(course_id: str, event_type: str, message: str):
    """测试推送事件（开发用）"""
    push_event(course_id, event_type, {"message": message})
    return {"status": "ok", "message": f"事件已推送到课程 {course_id}"}
