---
title: 课程管理
version: 1.0.0
status: active
domain: backend
---

### Requirement: 课程 MUST 支持 CRUD 操作

#### Scenario: 用户创建课程
GIVEN 用户在首页搜索框输入问题
WHEN 用户提交搜索表单
THEN 系统调用 POST /api/courses/create
AND 返回课程 ID、标题、关键词
AND 后台异步触发 AI 资料补充
AND 页面跳转到 /learning/:courseId

#### Scenario: 获取课程列表
GIVEN 系统中有课程数据
WHEN 调用 GET /api/courses/list
THEN 返回按更新时间倒序排列的课程列表
AND 每个课程包含三问进度信息

### Requirement: API 端点 MUST 完整

| 方法 | 路径 | 功能 |
|------|------|------|
| POST | /api/courses/create | 创建课程 |
| GET | /api/courses/list | 课程列表 |
| GET | /api/courses/{id} | 课程详情 |
| PATCH | /api/courses/{id}/status | 更新状态 |
| PATCH | /api/courses/{id}/progress | 更新进度 |
| DELETE | /api/courses/{id} | 删除课程 |
