---
title: 前端架构
version: 1.0.0
status: active
domain: frontend
---

### Requirement: 路由 MUST 覆盖所有页面

#### Scenario: 用户导航
GIVEN 前端应用已启动
THEN 路由 SHALL 包含:

| 路由 | 页面 | 说明 |
|------|------|------|
| /home | Home | 首页 |
| /learning/:courseId | LearningSpace | 学习空间 |
| /quiz/:courseId | QuizCenter | 测评中心 |
| /quiz/:courseId/play | QuizPlay | 答题界面 |
| /quiz/:courseId/report | QuizReport | 测评报告 |
| /profile | Profile | 个人中心 |

### Requirement: 前端 MUST 有完整的 API 层

#### Scenario: API 调用
GIVEN 前端需要与后端通信
THEN `client/src/api/` 目录 SHALL 包含:
- client.ts — 基础请求封装（GET/POST/PATCH/DELETE/upload）
- courses.ts — 课程 API
- knowledge.ts — 知识库 API
- threeAsk.ts — 三问引擎 API

### Requirement: 前端 MUST 有 Zustand 状态管理

#### Scenario: 全局状态
GIVEN 应用需要跨页面状态
THEN `client/src/stores/` 目录 SHALL 包含:
- courseStore.ts — 课程列表/创建/删除
- learningStore.ts — 学习资料/上传
- quizStore.ts — 答题/评分/报告

### Requirement: 前端 MUST 支持暗黑模式

#### Scenario: 主题切换
GIVEN 用户点击主题切换按钮
WHEN toggleTheme() 被调用
THEN document.documentElement SHALL 切换 .dark class
AND 所有颜色使用 CSS 变量自动适配
