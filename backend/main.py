import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

# 初始化数据库
from database import init_db
init_db()

# 创建 FastAPI 应用
app = FastAPI(
    title="三问高效学习机 API",
    description="AI驱动的个性化学习工具后端",
    version="1.0.0"
)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        os.getenv("FRONTEND_URL", "http://localhost:5173")
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================
# 导入路由
# ============================================

from routers import courses, knowledge, three_ask, quiz, sse, discover, user_router

app.include_router(courses.router, prefix="/api/courses", tags=["课程管理"])
app.include_router(knowledge.router, prefix="/api/knowledge", tags=["知识库"])
app.include_router(three_ask.router, prefix="/api/three-ask", tags=["三问引擎"])
app.include_router(quiz.router, prefix="/api/quiz", tags=["测评中心"])
app.include_router(sse.router, prefix="/api/sse", tags=["实时推送"])
app.include_router(discover.router, prefix="/api/search", tags=["发现资料"])
app.include_router(user_router.router, prefix="/api/user", tags=["用户"])

# ============================================
# 健康检查
# ============================================

@app.get("/api/health", tags=["系统"])
async def health_check():
    return {"status": "ok", "message": "三问高效学习机后端运行中"}

@app.get("/", tags=["系统"])
async def root():
    return {
        "name": "三问高效学习机 API",
        "version": "1.0.0",
        "docs": "/docs"
    }

# ============================================
# 启动入口
# ============================================

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("BACKEND_PORT", 8000))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True
    )
