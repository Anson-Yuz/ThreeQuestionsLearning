"""
Pydantic 模型验证测试
"""

import pytest
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import models
import json


class TestModelValidation:
    """模型基本验证"""

    def test_course_create_fields_required(self):
        """测试 CourseCreate 需要 question 字段"""
        with pytest.raises(Exception):
            models.CourseCreate()

    def test_course_response_optional_fields(self):
        """测试 CourseResponse 可选字段默认值"""
        import time
        now = int(time.time() * 1000)
        course = models.CourseResponse(
            id="test",
            title="测试",
            status="active",
            created_at=now,
            last_accessed=now
        )
        assert course.keywords == []
        assert course.progress == 0
        assert course.three_ask_progress == {}

    def test_search_request_default_top_k(self):
        """测试 SearchRequest 默认 top_k"""
        req = models.SearchRequest(course_id="c1", query="test")
        assert req.top_k == 5

    def test_radar_data_fields(self):
        """测试 RadarData 模型"""
        radar = models.RadarData(
            dimensions=[{"name": "记忆", "max": 100}],
            values=[85.0],
            average=85.0,
            strongest="记忆",
            weakest="记忆"
        )
        assert radar.average == 85.0
        assert radar.strongest == "记忆"

    def test_progress_response(self):
        """测试 ProgressResponse 模型"""
        progress = models.ProgressResponse(
            course_id="c1",
            overall_progress=66,
            three_ask={"q1": True, "q2": True, "q3": False},
            abilities={"memory": 80, "understanding": 60},
            statistics={"total_time": 3600, "sessions": 5}
        )
        assert progress.overall_progress == 66
        assert progress.three_ask["q1"] is True

    def test_error_response(self):
        """测试 ErrorResponse 模型"""
        err = models.ErrorResponse(error="NOT_FOUND", detail="课程不存在")
        assert err.error == "NOT_FOUND"
        assert "不存在" in err.detail

    def test_learning_event(self):
        """测试 LearningEvent 模型"""
        event = models.LearningEvent(
            course_id="c1",
            event_type="page_view",
            duration=120,
            metadata={"page": "/learning/c1"}
        )
        assert event.event_type == "page_view"
        assert event.duration == 120
