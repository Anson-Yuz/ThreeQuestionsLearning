---
title: 三问认知引擎
version: 1.0.0
status: active
domain: backend
---

### Requirement: 第一问 MUST 生成知识图谱

#### Scenario: 生成课程知识图谱
GIVEN 课程已有上传资料
WHEN 调用 POST /api/three-ask/graph/generate/{courseId}
THEN 系统 SHALL 提取核心概念和关系
AND 返回 nodes 和 links 数据
AND 缓存到 knowledge_graphs 表

### Requirement: 第二问 MUST 检测学术争议

#### Scenario: 检测资料中的争议点
GIVEN 课程有 ≥2 份资料
WHEN 调用 POST /api/three-ask/controversy/detect/{courseId}
THEN 系统 SHALL 异步分析资料中的矛盾观点
AND 生成正方/反方观点和证据
AND 存入 controversies 表

### Requirement: 第三问 MUST 生成测评题目

#### Scenario: 按 Bloom 层级生成题目
GIVEN 课程已有资料
WHEN 调用 POST /api/three-ask/quiz/generate/{courseId}
THEN 系统 SHALL 按六层 Bloom 认知维度生成题目
AND 每维度 ≥2 题，共 ≥12 题

### Requirement: API 端点 MUST 完整

| 方法 | 路径 | 功能 |
|------|------|------|
| POST | /api/three-ask/graph/generate/{id} | 生成图谱 |
| POST | /api/three-ask/graph/update/{id} | 更新图谱 |
| POST | /api/three-ask/controversy/detect/{id} | 争议检测 |
| GET | /api/three-ask/controversy/{id} | 争议列表 |
| POST | /api/three-ask/quiz/generate/{id} | 生成测评 |
| POST | /api/three-ask/quiz/submit | 提交答案 |
| POST | /api/three-ask/quiz/{id}/complete | 完成测评 |
| GET | /api/three-ask/progress/{id} | 三问进度 |
