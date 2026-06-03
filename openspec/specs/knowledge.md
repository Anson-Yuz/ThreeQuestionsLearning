---
title: 知识库
version: 1.0.0
status: active
domain: backend
---

### Requirement: 知识库 MUST 支持文件上传和向量化

#### Scenario: 用户上传资料
GIVEN 用户在课程学习空间
WHEN 用户选择 PDF/Word/MD/TXT 文件上传
THEN 系统 SHALL 验证文件类型和大小
AND 保存到本地 data/uploads/
AND 解析提取文本内容
AND 后台异步向量化存入 ChromaDB

### Requirement: 知识库 MUST 支持 AI 智能补充

#### Scenario: 系统自动补充资料
GIVEN 课程已创建
WHEN 后台任务触发
THEN 系统 SHALL 使用课程关键词联网检索
AND 将 AI 补充资料存入知识库

### Requirement: API 端点 MUST 完整

| 方法 | 路径 | 功能 |
|------|------|------|
| POST | /api/knowledge/upload | 上传资料 |
| POST | /api/knowledge/ai-fetch/{id} | AI补充 |
| GET | /api/knowledge/documents | 资料列表 |
| GET | /api/knowledge/documents/{id} | 资料详情 |
| DELETE | /api/knowledge/documents/{id} | 删除资料 |
| POST | /api/knowledge/search | 语义检索 |
