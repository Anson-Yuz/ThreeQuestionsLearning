"""
课程管理 API 测试
"""

import pytest
import sys
import os

# 确保 backend 在 sys.path 中
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from database import init_db, get_db
import models


class TestCourseModels:
    """课程模型测试"""

    def test_course_create_model(self):
        """测试 CourseCreate 模型"""
        course = models.CourseCreate(question="如何学习Python？")
        assert course.question == "如何学习Python？"

    def test_course_response_model(self):
        """测试 CourseResponse 模型"""
        import time
        course = models.CourseResponse(
            id="test_id",
            title="测试课程",
            keywords=["Python", "编程"],
            original_question="如何学习Python？",
            status="active",
            progress=50,
            three_ask_progress={"q1": True, "q2": False, "q3": False},
            created_at=int(time.time() * 1000),
            last_accessed=int(time.time() * 1000)
        )
        assert course.id == "test_id"
        assert course.title == "测试课程"
        assert course.status == "active"

    def test_course_update_status_model(self):
        """测试 CourseUpdateStatus 模型"""
        update = models.CourseUpdateStatus(status="completed")
        assert update.status == "completed"

    def test_success_response_model(self):
        """测试 SuccessResponse 模型"""
        resp = models.SuccessResponse(success=True, message="操作成功")
        assert resp.success is True
        assert resp.message == "操作成功"


class TestKnowledgeModels:
    """知识库模型测试"""

    def test_document_upload_model(self):
        """测试 DocumentUpload 模型"""
        doc = models.DocumentUpload(
            course_id="course_1",
            title="测试文档",
            content="这是文档内容"
        )
        assert doc.course_id == "course_1"
        assert doc.title == "测试文档"
        assert doc.source == "user"

    def test_search_request_model(self):
        """测试 SearchRequest 模型"""
        req = models.SearchRequest(
            course_id="course_1",
            query="Python",
            top_k=5
        )
        assert req.query == "Python"
        assert req.top_k == 5


class TestThreeAskModels:
    """三问引擎模型测试"""

    def test_graph_node_model(self):
        """测试 GraphNode 模型"""
        node = models.GraphNode(
            id="node1",
            name="核心概念",
            bloom_level="understand",
            difficulty=0.5
        )
        assert node.id == "node1"
        assert node.name == "核心概念"
        assert node.is_threshold_concept is False

    def test_graph_link_model(self):
        """测试 GraphLink 模型"""
        link = models.GraphLink(
            source="node1",
            target="node2",
            relation="prerequisite",
            strength=0.9
        )
        assert link.source == "node1"
        assert link.target == "node2"

    def test_knowledge_graph_model(self):
        """测试 KnowledgeGraph 模型"""
        graph = models.KnowledgeGraph(
            nodes=[models.GraphNode(id="n1", name="概念1")],
            links=[models.GraphLink(source="n1", target="n2")]
        )
        assert len(graph.nodes) == 1
        assert len(graph.links) == 1

    def test_controversy_model(self):
        """测试 Controversy 模型"""
        c = models.Controversy(
            id="c1",
            topic="AI安全性",
            pro_view="AI是安全的",
            pro_evidence="多项研究表明",
            con_view="AI有风险",
            con_evidence="存在不可控因素",
            confidence=0.8
        )
        assert c.topic == "AI安全性"
        assert c.confidence == 0.8

    def test_quiz_question_model(self):
        """测试 QuizQuestion 模型"""
        q = models.QuizQuestion(
            id="q1",
            dimension="记忆",
            bloom_level="remember",
            difficulty=0.2,
            question_type="single",
            question="测试题目",
            options=["A", "B", "C", "D"],
            correct_answer="A"
        )
        assert q.id == "q1"
        assert len(q.options) == 4

    def test_quiz_submit_model(self):
        """测试 QuizSubmit 模型"""
        submit = models.QuizSubmit(
            course_id="c1",
            question_id="q1",
            user_answer="A",
            time_spent=30
        )
        assert submit.course_id == "c1"
        assert submit.user_answer == "A"


class TestDatabaseInit:
    """数据库初始化测试"""

    def test_init_db(self):
        """测试数据库初始化不报错"""
        try:
            init_db()
            assert True
        except Exception as e:
            pytest.fail(f"数据库初始化失败: {e}")

    def test_required_tables_exist(self):
        """测试所有必需的表都已创建"""
        init_db()
        with get_db() as conn:
            tables = conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table'"
            ).fetchall()
            table_names = [row["name"] for row in tables]

        required = [
            "courses", "documents", "learning_progress",
            "learning_events", "quiz_records", "controversies",
            "discussion_posts", "discussion_replies", "reminders",
            "knowledge_graphs"
        ]
        for table in required:
            assert table in table_names, f"表 {table} 未创建"
