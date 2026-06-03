# API 接口文档

## 基础信息
- 基础URL: `http://localhost:8000/api`
- 响应格式: JSON
- 实时推送: SSE

## 系统

### 健康检查
`GET /api/health`
```json
{"status": "ok", "message": "三问高效学习机后端运行中"}
```

## 课程管理 `/api/courses`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/create` | 创建课程 |
| GET | `/list` | 课程列表 |
| GET | `/{course_id}` | 课程详情 |
| PATCH | `/{course_id}/status` | 更新状态 |
| PATCH | `/{course_id}/progress` | 更新进度 |
| DELETE | `/{course_id}` | 删除课程 |

### 创建课程
`POST /api/courses/create`
```json
{"question": "如何学习机器学习？"}
```

### 课程列表
`GET /api/courses/list?status=active&limit=50&offset=0`

## 知识库 `/api/knowledge`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/upload` | 上传资料 |
| POST | `/ai-fetch/{course_id}` | AI补充资料 |
| GET | `/documents` | 资料列表 |
| GET | `/documents/{doc_id}` | 资料详情 |
| DELETE | `/documents/{doc_id}` | 删除资料 |
| POST | `/search` | 语义检索 |

### 上传资料
`POST /api/knowledge/upload` (multipart/form-data)
- `course_id`: 课程ID
- `file`: 文件 (PDF/Word/MD/TXT)

## 三问引擎 `/api/three-ask`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/graph/generate/{course_id}` | 生成知识图谱 |
| POST | `/graph/update/{course_id}` | 增量更新图谱 |
| POST | `/controversy/detect/{course_id}` | 争议检测 |
| GET | `/controversy/{course_id}` | 争议列表 |
| POST | `/quiz/generate/{course_id}` | 生成测评 |
| POST | `/quiz/submit` | 提交答案 |
| POST | `/quiz/{course_id}/complete` | 完成测评 |
| GET | `/progress/{course_id}` | 三问进度 |

## 测评中心 `/api/quiz`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/{course_id}/questions` | 题目列表 |
| GET | `/{course_id}/list` | 分组题目 |
| POST | `/submit` | 提交答案 |
| POST | `/{course_id}/complete` | 完成测评 |
| GET | `/{course_id}/report` | 测评报告 |
| POST | `/mark` | 标记题目 |

## SSE 实时推送 `/api/sse`

`GET /api/sse/stream/{course_id}` — EventSource 连接

事件类型: `graph_updated`, `controversy_ready`, `quiz_ready`, `progress`, `notification`
