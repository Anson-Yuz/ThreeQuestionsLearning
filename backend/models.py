from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

# ============================================
# 课程相关模型
# ============================================

class CourseBase(BaseModel):
    title: str
    keywords: Optional[str] = None
    original_question: Optional[str] = None
    status: str = "active"

class CourseCreate(BaseModel):
    question: str

class CourseResponse(BaseModel):
    id: str
    title: str
    keywords: List[str] = []
    original_question: Optional[str] = None
    status: str
    progress: int = 0
    three_ask_progress: dict = {}
    created_at: int
    last_accessed: int

class CourseUpdateStatus(BaseModel):
    status: str

class CourseUpdateProgress(BaseModel):
    progress: int

# ============================================
# 知识库相关模型
# ============================================

class DocumentUpload(BaseModel):
    course_id: str
    title: str
    content: str
    source: str = "user"

class DocumentResponse(BaseModel):
    id: str
    course_id: str
    title: str
    content: Optional[str] = None
    file_path: Optional[str] = None
    file_type: Optional[str] = None
    source: str
    created_at: int

class SearchRequest(BaseModel):
    course_id: str
    query: str
    top_k: int = 5

class SearchResult(BaseModel):
    content: str
    score: float
    metadata: dict

# ============================================
# 三问引擎相关模型
# ============================================

class GraphNode(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    bloom_level: str = "understand"
    difficulty: float = 0.5
    is_threshold_concept: bool = False
    x: Optional[float] = None
    y: Optional[float] = None

class GraphLink(BaseModel):
    source: str
    target: str
    relation: str = "related"
    strength: float = 0.5

class KnowledgeGraph(BaseModel):
    nodes: List[GraphNode]
    links: List[GraphLink]

class Controversy(BaseModel):
    id: str
    topic: str
    pro_view: str
    pro_evidence: str
    con_view: str
    con_evidence: str
    confidence: float

class QuizQuestion(BaseModel):
    id: str
    dimension: str
    bloom_level: str
    difficulty: float
    question_type: str
    question: str
    options: Optional[List[str]] = None
    correct_answer: str
    explanation: Optional[str] = None
    knowledge_points: List[str] = []

class QuizSubmit(BaseModel):
    course_id: str
    question_id: str
    user_answer: str
    time_spent: int = 0

class QuizComplete(BaseModel):
    answers: List[dict]

# ============================================
# 进度追踪相关模型
# ============================================

class LearningEvent(BaseModel):
    course_id: str
    event_type: str
    duration: int = 0
    metadata: Optional[dict] = None

class ProgressResponse(BaseModel):
    course_id: str
    overall_progress: int
    three_ask: dict
    abilities: dict
    statistics: dict

class RadarData(BaseModel):
    dimensions: List[dict]
    values: List[float]
    average: float
    strongest: str
    weakest: str

# ============================================
# 通用响应模型
# ============================================

class SuccessResponse(BaseModel):
    success: bool
    message: Optional[str] = None
    data: Optional[dict] = None

class ErrorResponse(BaseModel):
    error: str
    detail: Optional[str] = None

# ============================================
# 发现资料相关模型
# ============================================

class SearchDiscoverRequest(BaseModel):
    query: str

class ImportRequest(BaseModel):
    urls: List[str]
    course_id: Optional[str] = None
    query: Optional[str] = None
