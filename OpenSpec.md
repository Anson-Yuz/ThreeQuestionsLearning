# 三问高效学习机 - OpenSpec 规格文档

> 基于需求书《三问高效学习机产品需求书》
> 版本：v1.0
> 日期：2026-05-21

---

## 一、项目概述

### 1.1 产品定位
"三问高效学习机"是一款以用户提问为核心触发机制的智能学习工具，通过"柔性课程生成+三问认知引擎"，帮助用户按需构建个性化学习路径，实现从问题提出到深度理解的认知闭环。

### 1.2 核心价值
- **按需学习**：课程内容由用户提问触发生成，杜绝信息过载
- **认知加速**：通过"三问法"快速建立学科框架、挖掘核心争议、验证理解深度
- **个性化适配**：AI智能资料补充 + 用户自主资料 = 专属复合知识库
- **进度可控**：课程状态随学习行为动态变化，界面简洁

---

## 二、技术架构

### 2.1 整体架构（已变更）

```
┌─────────────────────────────────────────────────────────────┐
│                     前端 (React+TS)                        │
│   Port 5173 (dev) / 80 (prod)                              │
│   首页 | 学习空间(ECharts图谱) | 测评中心 | 个人中心          │
└─────────────────────────────────────────────────────────────┘
                              ↓ HTTP/SSE
┌─────────────────────────────────────────────────────────────┐
│                    后端 (Python FastAPI)                   │
│   Port 8000                                                 │
│   REST API + SSE 统一端口                                   │
│   三问引擎 | 知识库引擎 | MiniMax AI层                      │
└─────────────────────────────────────────────────────────────┘
                              ↓
          ┌───────────────────┴───────────────────┐
          ↓                                       ↓
┌─────────────────────┐                 ┌─────────────────────┐
│   MiniMax 2.7 API   │                 │   ChromaDB          │
│   - 模型: MiniMax-2.7B                 │   - 向量维度: 1536   │
│   - Embedding: embo-01                 │   - 本地持久化       │
│   - 最大Token: 4096                    │                      │
└─────────────────────┘                 └─────────────────────┘
```

### 2.2 技术栈确认表

| 模块 | 最终选择 | 版本 |
|------|---------|------|
| 前端框架 | React + TypeScript | 18.2+ |
| 前端构建 | Vite | 5.x |
| UI组件 | Naive UI / Ant Design Mobile | 最新 |
| 图谱可视化 | ECharts (vue-echarts) | 5.x |
| **后端框架** | **Python FastAPI** | 0.100+ |
| 数据库 | SQLite | 3.x |
| 向量数据库 | ChromaDB | 本地持久化 |
| 向量化模型 | BAAI/bge-large-zh | 1.5 |
| LLM | MiniMax-M2.7 | API |
| 文件存储 | 本地文件夹 | ./data/uploads |
| 实时推送 | SSE | FastAPI原生 |

### 2.3 变更说明

| 原方案 | 变更原因 |
|--------|---------|
| Node.js/Express | Python 生态更成熟（PDF解析/向量化模型/LLM调用） |
| D3.js 图谱 | ECharts 开发效率更高，15-30节点场景完全够用 |
| 未指定SQL DB | SQLite 零配置，单用户场景最优 |

### 2.4 端口分配

| 环境 | 前端 | 后端(SSE+REST) |
|------|------|----------------|
| 开发 | 5173 | 8000 |
| 生产 | 80 | 8000 |

---

## 三、功能模块

### 3.0 前端架构方案（已确认）

#### 3.0.1 整体架构：底部Tab Bar主导航

| Tab | 图标 | 页面 |
|-----|------|------|
| 1 | house.fill | 首页 Home |
| 2 | brain.head.profile | 学习空间 LearningSpace |
| 3 | clipboard.fill | 测评中心 QuizCenter |
| 4 | person.circle.fill | 个人中心 Profile |

图标来源：Apple SF Symbols，备选 React Icons / Heroicons / Phosphor Icons

#### 3.0.2 页面详细布局（ASCII线框图）

**首页 (Home)**
```
┌─────────────────────────────────────────────┐
│  [状态栏] 9:41                      🔋 100%  │
├─────────────────────────────────────────────┤
│  标题栏                                     │
│  [你好，继续学习]          [上传资料按钮]    │
│                                             │
│  搜索区域                                   │
│  ┌─────────────────────────────────────┐   │
│  │  [放大镜图标]  输入你想学的问题...    │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  课程标题栏                                 │
│  我的课程                        [查看全部] │
│                                             │
│  课程卡片（纵向列表）                        │
│  ┌─────────────────────────────────────┐   │
│  │ [书籍图标] JavaScript精通之路       │   │
│  │          [标签] [标签] [标签]        │   │
│  │          ● ● ○ (三问进度)          │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  归档课程（可折叠）                         │
│  ┌─────────────────────────────────────┐   │
│  │  [归档图标] 已学课程 (3)         ▼   │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```
交互说明：
- 点击搜索框 → 弹出键盘，输入问题 → 2秒内生成课程
- 点击上传资料按钮 → 打开上传资料弹窗
- 课程卡片：纵向列表，长按弹出菜单（归档/删除/导出）
- 三问进度：三个圆点显示（绿=完成，灰=未完成），无进度条

图标说明：放大镜(search) / 书籍(book.closed) / 上传资料(arrow.up.doc) / 归档(archivebox)

**学习空间 (LearningSpace) - 三段式**
```
┌─────────────────────────────────────────────┐
│  [状态栏] 9:41                              │
├─────────────────────────────────────────────┤
│  导航栏                                     │
│  [返回箭头]  课程：JavaScript精通之路   [更多]│
│  进度条: ████░░░░░░░░ 30%                   │
├─────────────────────────────────────────────┤
│  第一问：核心心智模型                        │
│  ┌─────────────────────────────────────┐   │
│  │                                     │   │
│  │         [知识图谱区域]               │   │
│  │      节点为圆点，连线为曲线           │   │
│  │      支持点击/拖拽/缩放               │   │
│  │                                     │   │
│  └─────────────────────────────────────┘   │
│  [刷新图标] 重新生成图谱                    │
├─────────────────────────────────────────────┤
│  第二问：学术分歧挖掘                        │
│  ┌──────────────┬──────────────────────┐   │
│  │  正方观点     │  反方观点             │   │
│  │  • 闭包是核心  │  • 闭包导致内存泄漏   │   │
│  │  • 证据:MDN   │  • 证据:StackOverflow│   │
│  │  [向上箭头]   │  [向上箭头]          │   │
│  └──────────────┴──────────────────────┘   │
│  [聊天气泡] 参与讨论 (3)                    │
├─────────────────────────────────────────────┤
│  第三问：知识检验                            │
│  [检查标记图标] 开始测评 →                   │
├─────────────────────────────────────────────┤
│  复合知识库                                  │
│  [地球图标] AI补充 (3篇)                    │
│  [文档图标] 我的上传 (2个)                  │
│  [+] 上传资料                               │
└─────────────────────────────────────────────┘
```
图标说明：返回箭头(chevron.left) / 更多(ellipsis) / 刷新(arrow.clockwise) / 向上箭头(arrow.up.circle) / 聊天气泡(bubble.left.and.bubble.right) / 检查标记(checkmark.circle) / 地球(globe) / 文档(doc)

**测评中心 (QuizCenter)**
```
┌─────────────────────────────────────────────┐
│  [状态栏] 9:41                              │
├─────────────────────────────────────────────┤
│  导航栏                                     │
│  [返回箭头]  测评中心           [历史记录]   │
├─────────────────────────────────────────────┤
│  能力雷达图                                 │
│  ┌─────────────────────────────────────┐   │
│  │         [雷达图区域]                 │   │
│  │   记忆 / 理解 / 应用 / 分析 / 评价   │   │
│  └─────────────────────────────────────┘   │
├─────────────────────────────────────────────┤
│  认知层级测评                                │
│                                             │
│  记忆层级 ────────────────── 正确率 85%     │
│  ┌─────────────────────────────────────┐   │
│  │ 题目：闭包的定义是什么？              │   │
│  │ [A] [B] [C] [D]           [答案解析] │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  理解层级 ────────────────── 正确率 60%     │
│  ┌─────────────────────────────────────┐   │
│  │ 题目：解释JavaScript原型链           │   │
│  │ [填空题区域]                [提交]   │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  应用层级 ────────────────── 未开始         │
│  ┌─────────────────────────────────────┐   │
│  │ [代码编辑器区域]                      │   │
│  │ // 实现防抖函数                       │   │
│  └─────────────────────────────────────┘   │
├─────────────────────────────────────────────┤
│  [导出图标] 导出测评报告                     │
└─────────────────────────────────────────────┘
```
图标说明：历史记录(clock.arrow.circlepath) / 导出(square.and.arrow.up)
答题模式：记忆/理解层级-选择题填空题 / 应用/分析层级-代码题案例分析 / 评价/创造层级-开放题项目设计

**个人中心 (Profile)**
```
┌─────────────────────────────────────────────┐
│  [状态栏] 9:41                              │
├─────────────────────────────────────────────┤
│  头部                                       │
│  [头像占位]          用户名                 │
│  [大圆圈]            邮箱                   │
│                      [编辑图标]             │
├─────────────────────────────────────────────┤
│  学习数据                                    │
│  ┌─────────────────────────────────────┐   │
│  │  本周学习 8.5小时  ↑12%             │   │
│  │  [折线图 - 周学习时长变化]           │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  功能列表（分组圆角卡片）                    │
│  ┌─────────────────────────────────────┐   │
│  │  [归档图标]  课程归档          >    │   │
│  ├─────────────────────────────────────┤   │
│  │  [上传图标]  资料上传历史        >    │   │
│  ├─────────────────────────────────────┤   │
│  │  [下载图标]  数据导出           >    │   │
│  ├─────────────────────────────────────┤   │
│  │  [设置图标]  设置               >    │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  能力对比                                    │
│  ┌─────────────────────────────────────┐   │
│  │  概念理解  ████████░░  80%          │   │
│  │  批判思维  ██████░░░░  60%          │   │
│  │  实践迁移  ████░░░░░░  40%          │   │
│  │  [柱状图 - 各学科能力对比]          │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```
图标说明：编辑(pencil.circle) / 归档(archivebox) / 上传(icloud.and.arrow.up) / 下载(square.and.arrow.down) / 设置(gear)

#### 3.0.3 图标资源指南

| 图标名称 | SF Symbol | 备选免费图标库 |
|---------|-----------|---------------|
| 首页 | house.fill | Heroicons: Home |
| 学习 | brain.head.profile | Phosphor: Brain |
| 测评 | clipboard.fill | Heroicons: Clipboard |
| 我的 | person.circle.fill | Heroicons: User |
| 搜索 | magnifyingglass | Feather: Search |
| 返回 | chevron.left | Feather: ChevronLeft |
| 更多 | ellipsis | Feather: MoreVertical |
| 刷新 | arrow.clockwise | Feather: RefreshCw |
| 上传 | icloud.and.arrow.up | Feather: Upload |
| 下载 | square.and.arrow.down | Feather: Download |
| 设置 | gear | Feather: Settings |
| 文档 | doc | Feather: File |
| 地球 | globe | Feather: Globe |

图标资源链接：
- SF Symbols（Apple官方）：developer.apple.com/sf-symbols/
- React Icons：react-icons.github.io/react-icons/
- Heroicons：heroicons.com
- Phosphor Icons：phosphoricons.com

#### 3.0.4 iOS设计规范

| 设计要素 | 规范值 | 已实现值 |
|---------|--------|---------|
| 状态栏高度 | 44pt | 44pt |
| 导航栏高度 | 44pt | 44pt |
| Tab栏高度 | 49pt | 49pt |
| 左右边距 | 16-20pt | **145pt** |
| 卡片圆角 | 12-18pt | 16pt |
| 卡片间距 | 12-16pt | 16pt |
| 大标题字号 | 34pt Bold | 32pt (2xl) |
| 正文字号 | 17pt Regular | 16px |
| 副文字号 | 15pt Regular | 14px (sm) |
| 系统字体 | SF Pro | -apple-system, SF Pro |
| 毛玻璃背景 | rgba(255,255,255,0.8) + backdrop-filter | 已实现 |
| 暗黑模式 | prefers-color-scheme | 自动适配 |
| 内容最大宽度 | 640px | **无限制** |

> ⚠️ 设计变更记录：
> - 左右边距从规范 16-20pt 改为 145pt（用户要求更宽的留白）
> - 移除内容区 max-width 限制（之前为 640px，导致 145pt 边距时内容太窄）
> - 顶部栏（状态栏、标题栏）使用 page-container 边距，与内容区域保持一致

#### 3.0.5 配色方案（iOS系统色）

| 颜色用途 | 亮色模式 | 暗色模式 |
|---------|---------|---------|
| 系统蓝(链接/按钮) | #007AFF | #0A84FF |
| 系统绿(成功/完成) | #34C759 | #30D158 |
| 系统橙(警告) | #FF9500 | #FF9F0A |
| 系统红(错误) | #FF3B30 | #FF453A |
| 系统灰(辅助文字) | #8E8E93 | #98989D |
| 背景色 | #FFFFFF | #000000 |
| 二级背景 | #F2F2F7 | #1C1C1E |
| 分割线 | #C6C6C8 | #38383A |

#### 3.0.6 目录结构

```
src/pages/
├── Home/                    # Tab 1
│   ├── index.tsx
│   ├── SearchBar.tsx
│   └── CourseCard.tsx
├── LearningSpace/           # Tab 2
│   ├── index.tsx
│   ├── KnowledgeGraph.tsx
│   ├── ControversyPanel.tsx
│   ├── KnowledgeBase.tsx
│   └── QuizEntrance.tsx
├── QuizCenter/              # Tab 3
│   ├── index.tsx
│   ├── RadarChart.tsx
│   ├── QuestionList.tsx
│   └── ReportExport.tsx
└── Profile/                 # Tab 4
    ├── index.tsx
    ├── LearningStats.tsx
    ├── FunctionList.tsx
    └── AbilityCompare.tsx
```

#### 3.0.7 路由方案（已确认）

**前端路由结构**
```
/                              # 根路由 → 重定向到/home
├── /home                      # Tab 1: 首页
├── /learning/:courseId        # Tab 2: 学习空间（全屏，无Tab栏）
├── /quiz/:courseId            # Tab 3: 测评中心（全屏，无Tab栏）
├── /profile                   # Tab 4: 个人中心
├── /course/:courseId/export   # 课程导出（新窗口）
└── /settings                  # 设置页面
```

**实现方式**：React Router v6 `createBrowserRouter` + 嵌套路由

```typescript
// TabBarLayout 布局组件
const TabBarLayout = () => (
  <div className="app-container">
    <div className="main-content"><Outlet /></div>
    <div className="tab-bar">
      <NavLink to="/home">首页</NavLink>
      <NavLink to="/profile">我的</NavLink>
    </div>
  </div>
);
```

**后端路由结构**
```
/api
├── /courses/*          # 课程管理（7个端点）
├── /knowledge/*        # 知识库（6个端点）
├── /three-ask/*       # 三问引擎（5个端点）
└── /sse/stream/*      # SSE实时推送
```

**API调用封装**：`src/services/api.ts` + `src/services/sse.ts`

#### 3.0.8 状态管理方案（已确认）

**选择**：Zustand

**对比维度**
| 对比维度 | Context | Zustand | Redux |
|---------|---------|---------|-------|
| 代码量 | 中等 | 最少 | 最多 |
| 性能 | 需手动优化 | 自动优化 | 需手动优化 |
| TypeScript | 一般 | 极好 | 一般 |
| 学习成本 | 低 | 极低 | 高 |
| 中间件 | 无 | 有 | 有 |
| 适用场景 | 够用 | 最佳 | 过度 |

**为什么 Zustand 比 Context 更好？**

1. **性能**：Context 任何状态变化都触发所有消费者重渲染；Zustand 选择性订阅，只重渲染用到该状态的组件
2. **代码简洁**：Context 约50行代码创建+使用时包Provider；Zustand 约20行，无需Provider
3. **适用场景**：课程列表（频繁变化）+ 知识图谱（大数据对象）+ 上传进度（实时更新）= Zustand 完胜

**Store划分**：
| Store | 职责 | 持久化 |
|-------|------|--------|
| courseStore | 课程列表、当前课程、CRUD操作 | courses本地缓存 |
| learningStore | 知识图谱、争议点、测评题目 | 不持久化 |
| knowledgeStore | 资料列表、上传进度、搜索 | 不持久化 |

**core优势**：
- 选择性订阅：只订阅用到的状态，避免不必要重渲染
- 无Provider：直接`useStore()`调用，无需包裹组件
- 中间件支持：`persist`实现localStorage持久化

**courseStore 接口**
```typescript
interface Course {
  id: string;
  title: string;
  keywords: string;
  status: 'active' | 'completed' | 'archived';
  q1_done: boolean;
  q2_done: boolean;
  q3_done: boolean;
  progress: number;
  last_accessed: string;
}

interface CourseStore {
  courses: Course[];
  currentCourse: Course | null;
  loading: boolean;
  fetchCourses: () => Promise<void>;
  setCurrentCourse: (course: Course | null) => void;
  createCourse: (question: string) => Promise<string>;
  updateCourseStatus: (id: string, status: Course['status']) => Promise<void>;
  deleteCourse: (id: string) => Promise<void>;
  updateProgress: (courseId: string, progress: number) => void;
}
```

**learningStore 接口**
```typescript
interface GraphNode { id: string; name: string; category: string; importance: number; }
interface GraphLink { source: string; target: string; relation: string; }
interface Controversy { id: string; topic: string; proView: string; proEvidence: string; conView: string; conEvidence: string; }
interface QuizQuestion {
  id: string;
  dimension: '记忆' | '理解' | '应用' | '分析' | '评价' | '创造';
  question: string;
  options?: string[];
  answer: string;
  userAnswer?: string;
  isCorrect?: boolean;
}

interface LearningStore {
  graphData: { nodes: GraphNode[]; links: GraphLink[] } | null;
  graphLoading: boolean;
  generateGraph: (courseId: string) => Promise<void>;
  controversies: Controversy[];
  controversiesLoading: boolean;
  generateControversies: (courseId: string) => Promise<void>;
  quizzes: QuizQuestion[];
  quizLoading: boolean;
  quizResults: { score: number; correctCount: number; totalCount: number } | null;
  generateQuizzes: (courseId: string) => Promise<void>;
  submitAnswer: (questionId: string, answer: string) => void;
  resetQuiz: () => void;
}
```

**knowledgeStore 接口**
```typescript
interface Document {
  id: string;
  title: string;
  content: string;
  source: 'user' | 'ai';
  file_type: string;
  created_at: string;
}

interface KnowledgeStore {
  documents: Document[];
  documentsLoading: boolean;
  uploadProgress: number;
  searchResults: any[];
  fetchDocuments: (courseId: string) => Promise<void>;
  uploadDocument: (courseId: string, file: File) => Promise<void>;
  deleteDocument: (docId: string) => Promise<void>;
  searchDocuments: (courseId: string, query: string) => Promise<void>;
  aiFetch: (courseId: string) => Promise<void>;
  setUploadProgress: (progress: number) => void;
}
```

**目录结构**：
```
src/stores/
├── courseStore.ts     # 课程Store
├── learningStore.ts   # 三问引擎Store
└── knowledgeStore.ts   # 知识库Store
```

| 决策项 | 选项 | 状态 |
|--------|------|------|
| 路由方案 | React Router 嵌套路由 | ✅ 已确认 |
| 状态管理 | Zustand | ✅ 已确认 |
| 图谱可视化 | ECharts | ✅ 已确认（技术栈变更） |

#### 3.0.9 组件复用策略（已确认）

**策略**：混合策略 - 基础UI 100%复用 + 业务组件按需复用 + 页面特有独立实现

**分层架构**
| 层级 | 目录 | 复用级别 | 示例 |
|------|------|---------|------|
| 基础UI组件 | `src/components/ui/` | 100%复用 | Button, Card, Modal, Toast, TabBar |
| 业务组件 | `src/components/business/` | 按需复用 | CourseCard, DocumentList, ControversyCard |
| 布局组件 | `src/components/layout/` | 100%复用 | NavBar, Container, SafeArea |
| 交互反馈 | `src/components/feedback/` | 性能优化用 | Haptic, Animation, Skeleton |

**组件复用决策表**
| 组件 | 复用级别 | 位置 | 使用页面 |
|------|---------|------|---------|
| Button | 100%复用 | ui/Button | 所有页面 |
| Card | 100%复用 | ui/Card | 所有页面 |
| Modal | 100%复用 | ui/Modal | 全局 |
| Toast | 100%复用 | ui/Toast | 全局 |
| TabBar | 100%复用 | ui/TabBar | 全局布局 |
| NavBar | 100%复用 | layout/NavBar | 所有二级页面 |
| CourseCard | 按需复用 | business/CourseCard | 首页、个人中心 |
| DocumentList | 按需复用 | business/DocumentList | 学习空间、个人中心 |
| KnowledgeGraph | 不复用 | pages/LearningSpace/ | 仅学习空间 |
| RadarChart | 不复用 | pages/QuizCenter/ | 仅测评中心 |

**性能优化策略**
1. **组件懒加载**：`lazy()` + `Suspense` 页面级代码分割
2. **虚拟滚动**：`@tanstack/react-virtual` 列表超20项时启用
3. **图片懒加载**：`IntersectionObserver` 延迟加载
4. **GPU加速动画**：`transform` 代替 `top/left` 触发复合图层
5. **状态节流**：`useThrottledCallback` 进度条更新限频100ms

**性能指标目标**
| 指标 | 目标值 |
|------|--------|
| 首屏加载 | <1.5s |
| 页面切换 | <200ms |
| 图谱渲染(30节点) | <500ms |
| 滚动帧率 | 60fps |
| 内存占用 | <100MB |

---

### 3.1 柔性课程生成模块

#### 3.1.1 用户体验流程（iOS风格）

```
用户输入问题（如"如何快速掌握JavaScript编程开发？"）
         │
         ▼
┌───────────────────────────────┐
│  实时反馈阶段（<100ms）        │
│  • 输入框震动反馈（轻触）      │
│  • 按钮高亮动画               │
│  • 骨架屏占位                 │
└───────────────────────────────┘
         │
         ▼
┌───────────────────────────────┐
│  AI处理阶段（<2秒）           │
│  • 进度条平滑动画             │
│  • "正在创建课程..." 状态提示  │
│  • 可取消操作                 │
└───────────────────────────────┘
         │
         ▼
┌───────────────────────────────┐
│  课程生成完成                 │
│  • 成功触感反馈               │
│  • 自动跳转到学习空间         │
│  • 后台触发AI资料补充（不阻塞）│
└───────────────────────────────┘
```

**动画时序**
```
用户 → 前端界面：输入问题
前端界面 → 前端界面：触觉反馈(light) + 按钮高亮动画
用户 → 前端界面：点击"开始学习"
前端界面 → 后端API：POST /api/courses/create
前端界面 → 前端界面：显示进度条(0% → 90%)
后端API → AI服务：提取课程信息
AI服务 → 后端API：标题 + 关键词
后端API → 数据库：保存课程
数据库 → 后端API：课程ID
后端API → 前端界面：返回课程信息
前端界面 → 前端界面：触觉反馈(success)
前端界面 → 用户：跳转到学习空间
前端界面 → 后端API：后台触发AI补充资料
```

#### 3.1.2 课程状态管理

**课程状态枚举**
| 状态 | 值 | 说明 |
|------|-----|------|
| DRAFT | draft | 未创建（不显示） |
| ACTIVE | active | 活跃（学习中） |
| COMPLETED | completed | 已完成（置灰） |
| ARCHIVED | archived | 归档 |

**三问完成状态**
```typescript
interface ThreeAskProgress {
  question1: boolean;  // 知识图谱
  question2: boolean;  // 争议挖掘
  question3: boolean;  // 测评
}
```

**课程数据结构**
```typescript
interface Course {
  id: string;
  title: string;
  keywords: string[];
  originalQuestion: string;
  status: CourseStatus;
  progress: number;           // 0-100
  threeAskProgress: ThreeAskProgress;
  lastAccessedAt: number;     // 时间戳，用于排序
  createdAt: number;
  materialCount: number;      // 资料数量
  quizScore?: number;          // 测评分数
}
```

**总体进度计算**
```typescript
function calculateOverallProgress(threeAsk: ThreeAskProgress): number {
  let completed = 0;
  if (threeAsk.question1) completed += 33;
  if (threeAsk.question2) completed += 33;
  if (threeAsk.question3) completed += 34;
  return completed;
}
```

#### 3.1.3 API设计（RESTful）

**后端路由**
```
/api/courses/
├── POST /create          # 创建课程（<500ms响应）
├── GET /list             # 获取列表（支持分页+筛选）
├── GET /{course_id}      # 获取单个课程
├── PATCH /{course_id}/status    # 更新状态
├── PATCH /{course_id}/progress  # 更新进度
└── DELETE /{course_id}  # 删除课程
```

**创建课程请求/响应**
```typescript
// Request
{ question: string }

// Response
{
  id: string;
  title: string;
  keywords: string[];
  originalQuestion: string;
  status: "active";
  progress: number;
  threeAskProgress: { question1, question2, question3 };
  createdAt: number;
}
```

**性能要求**
| 操作 | 响应时间 |
|------|---------|
| 创建课程 | <500ms |
| 获取列表 | <50ms |
| 更新进度 | <100ms |

#### 3.1.4 前端组件

**SearchBar 组件**
- 状态：`isFocused` / `isCreating` / `createProgress`
- 交互：回车提交 / 进度动画 / 触觉反馈
- 样式：圆角2xl / 毛玻璃背景 / iOS系统蓝

**CourseCard 组件**
- 变体：`default`（完整信息）/ `compact`（简洁列表）
- 状态：正常 / 已完成（置灰60%）/ 已归档（置灰40%）
- 交互：点击跳转 / 长按菜单
- 样式：毛玻璃卡片 / 无进度条 / 三问进度指示点（三个圆点，绿=完成，灰=未完成）

#### 3.0.7 页面布局规范（统一边距）

```
┌─────────────────────────────────────────────┐
│  [状态栏 - 全宽]                   9:41 100% │
├─────────────────────────────────────────────┤
│  [标题栏 - 使用 page-container]             │
│  │ 你好，继续学习    [上传资料按钮] │        │
│  │ [搜索框]                                │        │
├─────────────────────────────────────────────┤
│  [内容区 - 使用 page-container]             │
│  │ 我的课程                    [查看全部] │  │
│  │                                       │  │
│  │ [课程卡片]                             │  │
│  │ [课程卡片]                             │  │
│  │ [课程卡片]                             │  │
└─────────────────────────────────────────────┘
```

> 注意：状态栏保持全宽，标题栏和内容区统一使用 page-container（145pt 左右边距）

#### 3.0.8 组件样式规范

| 组件 | 样式说明 | 状态 |
|------|---------|------|
| CourseCard | 毛玻璃卡片，无进度条，三问进度用三个圆点显示 | ✅ 已定稿 |
| 上传资料按钮 | 蓝色圆形背景(blue-500)，白色上传图标 | ✅ 已定稿 |
| 搜索框 | 圆角2xl，灰色背景(gray-100)，左侧搜索图标 | ✅ 已定稿 |
| TabBar | 底部固定，毛玻璃背景，全局显示（非仅首页）| ✅ 已定稿 |
| 页面容器 | padding: 145pt 左右，无 max-width 限制 | ✅ 已定稿 |

#### 3.0.9 图标清单

| 图标名称 | 用途 | 样式 |
|---------|------|------|
| HomeIcon | TabBar首页 | w-6 h-6 |
| BrainIcon | TabBar学习 | w-6 h-6 |
| ClipboardIcon | TabBar测评 | w-6 h-6 |
| PersonIcon | TabBar我的/Profile头像 | w-6 h-6 / w-8 h-8 |
| SearchIcon | 搜索框 | w-5 h-5 |
| UploadIcon | 上传资料按钮 | w-5 h-5 |
| BookIcon | 课程卡片图标 | w-6 h-6 |
| ChevronRightIcon | 列表箭头 | w-5 h-5 |
| ArchiveIcon | 归档 | w-5 h-5 |
| UploadIcon | 上传历史 | w-5 h-5 |
| DownloadIcon | 数据导出 | w-5 h-5 |
| GearIcon | 设置 | w-5 h-5 |

#### 3.1.5 性能优化策略

| 优化点 | 实现方式 | 效果 |
|--------|---------|------|
| 乐观更新 | 创建课程立即添加到列表 | 感知速度提升100% |
| 进度反馈 | 平滑进度条动画 | 用户不焦虑等待 |
| 触觉反馈 | 关键操作navigator.vibrate | 苹果原生体验 |
| 骨架屏 | 加载时占位 | 减少白屏感 |
| 状态节流 | 进度更新限流100ms | 减少重渲染 |
| 懒加载 | 路由级代码分割 | 首屏<1.5s |
| 缓存策略 | localStorage持久化 | 二次打开秒开 |

#### 验收标准

- [ ] 课程创建响应 < 2秒
- [ ] 创建进度平滑动画
- [ ] 触觉反馈（轻触/成功/错误）
- [ ] 乐观更新列表
- [ ] 后台AI补充不阻塞
- [ ] 状态持久化到localStorage
- [ ] 课程按最后访问时间排序
- [ ] 三问进度自动计算
- [ ] 归档/删除功能

---

### 3.2 复合知识库构建模块（核心）

#### 3.2.1 AI智能资料补充

**核心流程**
```
课程创建 → LLM提取关键词(3-5个) → 并行联网检索 → 智能筛选(去重+权威性评分) → 入库
```

**搜索服务架构**
```python
class AISearchService:
    # 权威来源白名单（权重高）
    authority_sources = {
        "arxiv.org": 0.9, "scholar.google.com": 0.9,
        "docs.python.org": 0.95, "developer.mozilla.org": 0.95,
        "react.dev": 0.95, "vuejs.org": 0.95,
        "ieeexplore.ieee.org": 0.9, "acm.org": 0.9,
    }
    # SearXNG元搜索引擎
    searxng_url = "http://localhost:8888/search"
```

**并行搜索流程**
| 来源类型 | 搜索引擎 | 权重 |
|---------|---------|------|
| 学术论文 | arXiv / Google Scholar | 0.9 |
| 官方文档 | MDN / Microsoft | 0.95 |
| 行业报告 | 政府/机构网站 | 0.8 |

**权威性评分算法**
```python
def _score_by_authority(self, results):
    for r in results:
        score = 0.5  # 基础分
        # 白名单匹配
        for domain, weight in self.authority_sources.items():
            if domain in url: score = weight; break
        # URL结构加分
        if '/pdf/' in url: score += 0.1
        r['score'] = min(score, 1.0)
```

**后端API**
```
/api/knowledge/
├── POST /ai-fetch/{course_id}      # 触发AI搜索（后台）
├── GET /ai-progress/{course_id}    # SSE进度推送
├── POST /upload                    # 用户上传资料
├── GET /documents                  # 获取资料列表
├── GET /documents/{doc_id}         # 获取单个资料
├── DELETE /documents/{doc_id}      # 删除资料
└── POST /search                    # 语义检索
```

**数据接口**
```typescript
interface KnowledgeSource {
  id: string;
  courseId: string;
  sourceType: 'paper' | 'docs' | 'report';
  title: string;
  url?: string;
  content: string;
  authority_score: number;  // 权威性评分
  createdAt: number;
}
```

**验收标准**
- [ ] AI补充资料入库ChromaDB
- [ ] 资料来源可追溯
- [ ] 支持按来源筛选
- [ ] 搜索进度可视化（SSE推送）
- [ ] 触觉反馈（成功/失败）

#### 3.2.2 自主资料上传

**文件处理流程**
```
用户选择文件 → 前端验证 → 分片上传 → 后端解析 → 向量化 → 入库
```

**文件限制配置**
| 文件类型 | 大小限制 | 解析方式 | 向量化时机 |
|---------|---------|---------|-----------|
| PDF | 20MB | PyPDF2/pdfplumber | 异步<5秒 |
| Word | 10MB | python-docx | 异步<5秒 |
| Markdown | 5MB | 原生解析 | 实时 |
| TXT | 5MB | 原生解析 | 实时 |

**前端上传组件**
```typescript
interface UploadFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
}

// 拖拽验证
- 类型验证：白名单检查
- 大小验证：MAX_FILE_SIZE[type]
- 错误反馈：触觉反馈 + alert
```

**上传进度实现**
```typescript
const xhr = new XMLHttpRequest();
xhr.upload.onprogress = (e) => {
  if (e.lengthComputable) {
    const progress = Math.round((e.loaded / e.total) * 100);
    // 实时更新UI进度条
  }
};
xhr.open('POST', '/api/knowledge/upload');
xhr.send(formData);
```

**验收标准**
- [ ] 支持拖拽上传
- [ ] 文件类型/大小校验
- [ ] 上传进度显示
- [ ] 异步解析不阻塞UI
- [ ] 批量上传支持
- [ ] 触觉反馈

#### 3.2.3 资料动态融合

**双层级融合架构**
```
新资料入库
    ↓
┌────────────────────────────────────┐
│ 第1层：实时增量融合（<2秒）          │
│ • 内容分块 (500字/块,重叠50字)       │
│ • 向量化 (BAAI/bge-large-zh)        │
│ • 存入ChromaDB + SQLite            │
│ • 触发知识图谱增量更新               │
│ • SSE推送: knowledge_updated       │
└────────────────────────────────────┘
    ↓
┌────────────────────────────────────┐
│ 第2层：异步深度融合（后台,5-30秒）    │
│ • 语义聚类（关联资料发现）           │
│ • 跨文档关系挖掘                     │
│ • 争议点检测（>3份资料时）           │
│ • SSE推送: controversy_ready       │
└────────────────────────────────────┘
```

**语义分块算法**
```python
def _semantic_chunk(self, text: str):
    # 按段落分割
    paragraphs = text.split('\n\n')
    chunks = []
    current_chunk = ""
    
    for para in paragraphs:
        if len(current_chunk) + len(para) <= self.chunk_size:
            current_chunk += "\n\n" + para
        else:
            chunks.append(current_chunk)
            current_chunk = para
    
    return chunks
```

**争议点检测**
```python
async def _detect_controversies(self, clusters):
    prompt = f"""
    分析以下文本片段中的观点分歧：
    {cluster}
    
    输出JSON：{{"topic": "争议主题", "pro_view": "正方", "con_view": "反方"}}
    """
    result = await llm.chat(prompt)
```

**验收标准**
- [ ] 实时融合响应≤2秒
- [ ] 异步融合后台处理不阻塞
- [ ] 完成时融合质量最优
- [ ] 支持关键词搜索和分类筛选
- [ ] SSE实时推送更新

---

#### 3.2.4 数据库表结构

**AI补充资料记录表**
```sql
CREATE TABLE ai_supplements (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL,
    title TEXT NOT NULL,
    url TEXT,
    content TEXT,
    authority_score REAL DEFAULT 0.5,
    status TEXT DEFAULT 'pending',
    created_at INTEGER
);
```

**争议点表**
```sql
CREATE TABLE controversies (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL,
    topic TEXT NOT NULL,
    pro_view TEXT,
    con_view TEXT,
    evidence TEXT,
    created_at INTEGER
);
```

#### 3.2.5 性能指标

| 指标 | 目标值 | 实现方式 |
|------|--------|---------|
| AI搜索响应 | <3秒 | 并行搜索+缓存 |
| 文件上传解析 | <5秒（20MB PDF） | 异步处理 |
| 实时融合 | <2秒 | 增量更新+哈希检测 |
| 深度融合 | 5-30秒（后台） | 异步任务队列 |
| 语义检索 | <200ms | ChromaDB HNSW索引 |

### 3.3 三问认知引擎模块

#### 3.3.0 整体架构

```
┌─────────────────────────────────────────────────────────┐
│                  三问认知引擎模块                        │
├─────────────────────────────────────────────────────────┤
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐
│  │   第一问       │  │   第二问       │  │   第三问       │
│  │  知识图谱      │  │  争议挖掘      │  │  深度测评      │
│  │  (实时/增量)   │  │  (异步/全量)   │  │  (课程完成时)  │
│  └───────┬────────┘  └───────┬────────┘  └───────┬────────┘
│          └────────────────────┼────────────────────┘
│                               ▼
│                    ┌─────────────────────┐
│                    │    复合知识库        │
│                    │  (向量检索 + 语义)   │
│                    └─────────────────────┘
└─────────────────────────────────────────────────────────┘
```

**核心设计原则**：
- 第一问：实时响应（<2秒），增量更新，基于Bloom理论和门槛概念
- 第二问：异步处理，使用NLI模型进行冲突检测
- 第三问：课程完成时生成，基于Bloom六维度认知层级

#### 3.3.1 第一问：核心心智模型提取

**GraphNode扩展接口**
```typescript
interface GraphNode {
  id: string;
  name: string;
  description: string;
  bloomLevel: 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create';
  difficulty: number;        // 0-1，难度系数
  isThresholdConcept: boolean; // 是否为"门槛概念"
  estimatedMinutes: number;   // 预估学习时间
  prerequisites: string[];    // 前置依赖节点ID
  tags: string[];
}

interface GraphLink {
  source: string;
  target: string;
  relation: 'prerequisite' | 'related' | 'contradicts' | 'supports';
  strength: number;  // 关系强度 0-1
}
```

**后端GraphService完整实现**
```python
import json
import asyncio
from typing import List, Dict
from sentence_transformers import SentenceTransformer
from services.llm_service import LLMService

class GraphService:
    """知识图谱生成服务"""
    
    def __init__(self):
        self.llm = LLMService()
        self.embedder = SentenceTransformer('BAAI/bge-large-zh-v1.5')
        
    async def generate_graph(self, course_id: str, documents: List[Dict]) -> Dict:
        """基于课程资料生成知识图谱"""
        
        # 1. 合并所有资料文本
        combined_text = "\n\n".join([doc['content'][:3000] for doc in documents[:5]])
        
        # 2. 调用LLM提取核心概念和关系
        prompt = f"""
        你是学习科学专家。基于以下学习资料，提取核心概念和逻辑关系。
        
        要求：
        1. 识别5-8个核心概念节点
        2. 每个节点标注Bloom认知层级(remember/understand/apply/analyze/evaluate/create)
        3. 识别概念间的依赖关系(prerequisite)
        4. 标记是否为"门槛概念"(isThresholdConcept)
        5. 评估难度系数(difficulty 0-1)
        
        资料：
        {combined_text[:8000]}
        
        输出JSON格式：
        {{
          "nodes": [
            {{
              "id": "concept_id",
              "name": "概念名称",
              "description": "简要描述",
              "bloomLevel": "understand",
              "difficulty": 0.5,
              "isThresholdConcept": false,
              "estimatedMinutes": 30,
              "prerequisites": []
            }}
          ],
          "links": [
            {{
              "source": "source_id",
              "target": "target_id",
              "relation": "prerequisite",
              "strength": 0.8
            }}
          ]
        }}
        """
        
        result = await self.llm.chat(prompt)
        graph_data = json.loads(result)
        
        # 3. 验证图谱完整性（确保有起始节点）
        graph_data = self._validate_graph(graph_data)
        
        # 4. 计算布局坐标（力导向算法预处理）
        graph_data = self._calculate_layout(graph_data)
        
        return graph_data
    
    async def incremental_update(self, course_id: str, new_doc: Dict, existing_graph: Dict) -> Dict:
        """增量更新知识图谱（新资料上传时）"""
        
        # 1. 从新资料中提取概念
        prompt = f"""
        基于以下新资料，提取新的概念节点和关系。
        如果新概念与已有概念相关，请标注关系。
        
        已有概念：{[n['name'] for n in existing_graph.get('nodes', [])]}
        
        新资料：
        {new_doc['content'][:3000]}
        
        输出JSON格式（只输出新增部分）：
        {{
          "new_nodes": [...],
          "new_links": [...],
          "merge_suggestions": [{{"existing": "已有节点", "new": "新节点", "action": "merge"}}]
        }}
        """
        
        result = await self.llm.chat(prompt)
        update_data = json.loads(result)
        
        # 2. 合并到现有图谱
        merged_graph = self._merge_graph(existing_graph, update_data)
        
        return merged_graph
    
    def _validate_graph(self, graph: Dict) -> Dict:
        """验证图谱完整性"""
        nodes = graph.get('nodes', [])
        links = graph.get('links', [])
        
        # 确保每个link的source和target都存在
        node_ids = {n['id'] for n in nodes}
        valid_links = [
            l for l in links 
            if l['source'] in node_ids and l['target'] in node_ids
        ]
        
        # 如果没有节点，返回默认结构
        if not nodes:
            nodes = [{
                'id': 'root',
                'name': '核心概念',
                'description': '学习内容概述',
                'bloomLevel': 'understand',
                'difficulty': 0.3,
                'isThresholdConcept': False,
                'estimatedMinutes': 30,
                'prerequisites': []
            }]
            valid_links = []
        
        graph['nodes'] = nodes
        graph['links'] = valid_links
        
        return graph
    
    def _calculate_layout(self, graph: Dict) -> Dict:
        """计算力导向布局的初始位置"""
        import math
        nodes = graph['nodes']
        n = len(nodes)
        
        # 简单的圆形布局
        for i, node in enumerate(nodes):
            angle = 2 * math.pi * i / n
            node['x'] = math.cos(angle) * 200
            node['y'] = math.sin(angle) * 200
        
        return graph
    
    def _merge_graph(self, existing: Dict, update: Dict) -> Dict:
        """合并图谱"""
        # 合并节点
        existing_nodes = {n['id']: n for n in existing.get('nodes', [])}
        for new_node in update.get('new_nodes', []):
            if new_node['id'] not in existing_nodes:
                existing_nodes[new_node['id']] = new_node
        
        # 合并链接
        existing_links = {(l['source'], l['target']): l for l in existing.get('links', [])}
        for new_link in update.get('new_links', []):
            key = (new_link['source'], new_link['target'])
            if key not in existing_links:
                existing_links[key] = new_link
        
        # 处理合并建议
        for suggestion in update.get('merge_suggestions', []):
            if suggestion['action'] == 'merge':
                if suggestion['new'] in existing_nodes:
                    existing_nodes[suggestion['existing']]['description'] += f"\n\n另见：{existing_nodes[suggestion['new']]['description']}"
                    del existing_nodes[suggestion['new']]
        
        return {
            'nodes': list(existing_nodes.values()),
            'links': list(existing_links.values())
        }
```

**API端点**
```
/api/three-ask/
├── POST /graph/generate/{course_id}      # 生成知识图谱
├── POST /graph/update/{course_id}        # 增量更新图谱
├── POST /controversy/detect/{course_id}  # 异步检测争议
├── POST /quiz/generate/{course_id}       # 生成测评题目
└── POST /quiz/submit                     # 提交答案
```

**KnowledgeGraph React组件完整实现**
```typescript
import React, { memo, useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { Haptic } from '@/utils/haptic';

interface GraphNode {
  id: string;
  name: string;
  description: string;
  bloomLevel: string;
  difficulty: number;
  isThresholdConcept: boolean;
  x?: number;
  y?: number;
}

interface GraphLink {
  source: string;
  target: string;
  relation: string;
  strength: number;
}

interface KnowledgeGraphProps {
  data: { nodes: GraphNode[]; links: GraphLink[] };
  onNodeClick?: (node: GraphNode) => void;
  loading?: boolean;
}

export const KnowledgeGraph = memo(({ data, onNodeClick, loading }: KnowledgeGraphProps) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  // Bloom认知层级对应的颜色
  const bloomColors: Record<string, string> = {
    remember: '#8B5CF6',   // 紫色
    understand: '#3B82F6',  // 蓝色
    apply: '#10B981',       // 绿色
    analyze: '#F59E0B',     // 橙色
    evaluate: '#EF4444',    // 红色
    create: '#EC4899',      // 粉色
  };

  // 节点大小：门槛概念更大，根据Bloom层级调整
  const getNodeSize = (node: GraphNode) => {
    let size = 30;
    if (node.isThresholdConcept) size = 45;
    switch (node.bloomLevel) {
      case 'remember': size += 0; break;
      case 'understand': size += 5; break;
      case 'apply': size += 10; break;
      case 'analyze': size += 15; break;
      case 'evaluate': size += 20; break;
      case 'create': size += 25; break;
    }
    return size;
  };

  useEffect(() => {
    if (!chartRef.current || loading) return;

    // 初始化图表
    chartInstance.current = echarts.init(chartRef.current);

    // 配置ECharts力导向图
    const option: echarts.EChartsOption = {
      title: { show: false },
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          if (params.dataType === 'node') {
            return `
              <div class="p-2 max-w-xs">
                <div class="font-semibold">${params.data.name}</div>
                <div class="text-xs text-gray-500 mt-1">${params.data.description || ''}</div>
                <div class="flex gap-2 mt-2 text-xs">
                  <span class="px-1.5 py-0.5 rounded-full bg-gray-100">${params.data.bloomLevel}</span>
                  <span class="px-1.5 py-0.5 rounded-full bg-gray-100">难度: ${params.data.difficulty}</span>
                  ${params.data.isThresholdConcept ? '<span class="px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-600">门槛概念</span>' : ''}
                </div>
              </div>
            `;
          }
          return '';
        },
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        borderRadius: 12,
        padding: 8,
        extraCssText: 'box-shadow: 0 4px 12px rgba(0,0,0,0.1);'
      },
      series: [{
        type: 'graph',
        layout: 'force',
        force: {
          repulsion: 500,
          edgeLength: 150,
          gravity: 0.1,
          friction: 0.1,
          layoutAnimation: true
        },
        roam: true,
        draggable: true,
        data: data.nodes.map(node => ({
          id: node.id,
          name: node.name,
          description: node.description,
          bloomLevel: node.bloomLevel,
          difficulty: node.difficulty,
          isThresholdConcept: node.isThresholdConcept,
          symbolSize: getNodeSize(node),
          itemStyle: {
            color: bloomColors[node.bloomLevel] || '#6B7280',
            borderColor: '#fff',
            borderWidth: 2,
            shadowBlur: 10,
            shadowColor: 'rgba(0,0,0,0.1)'
          },
          label: {
            show: true,
            position: 'right',
            fontSize: 12,
            fontWeight: node.isThresholdConcept ? 'bold' : 'normal',
            offset: [5, 0]
          },
          x: node.x,
          y: node.y
        })),
        links: data.links.map(link => ({
          source: link.source,
          target: link.target,
          lineStyle: {
            color: link.relation === 'prerequisite' ? '#3B82F6' : '#9CA3AF',
            width: link.strength * 3,
            curveness: 0.3,
            type: link.relation === 'contradicts' ? 'dashed' : 'solid'
          },
          label: {
            show: link.relation !== 'related',
            formatter: link.relation === 'prerequisite' ? '依赖' : link.relation,
            fontSize: 10
          }
        })),
        emphasis: {
          focus: 'adjacency',
          lineStyle: { width: 4 }
        },
        lineStyle: { color: '#9CA3AF', curveness: 0.3 },
        label: { show: true, position: 'right', fontSize: 12 },
        roamZoom: true,
        roamPan: true,
        animation: true,
        animationDuration: 500,
        animationEasing: 'cubicOut'
      }]
    };

    chartInstance.current.setOption(option);

    // 节点点击事件
    chartInstance.current.on('click', (params: any) => {
      if (params.dataType === 'node') {
        Haptic.light();
        const node = data.nodes.find(n => n.id === params.data.id);
        if (node && onNodeClick) {
          setSelectedNode(node);
          onNodeClick(node);
        }
      }
    });

    const handleResize = () => chartInstance.current?.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chartInstance.current?.dispose();
    };
  }, [data, loading]);

  if (loading) {
    return <GraphSkeleton />;
  }

  if (!data.nodes.length) {
    return <EmptyGraph onGenerate={() => {}} />;
  }

  return (
    <div className="relative w-full h-full min-h-[400px] rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-900">
      <div ref={chartRef} className="w-full h-full" style={{ minHeight: 400 }} />

      {/* 图例 */}
      <div className="absolute bottom-3 right-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg px-3 py-2 text-xs shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#8B5CF6]"></span>记忆</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#3B82F6]"></span>理解</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#10B981]"></span>应用</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#F59E0B]"></span>分析</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#EF4444]"></span>评价</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#EC4899]"></span>创造</span>
        </div>
      </div>

      {selectedNode && (
        <NodeDetailModal node={selectedNode} onClose={() => setSelectedNode(null)} />
      )}
    </div>
  );
});

const GraphSkeleton = () => (
  <div className="w-full h-full min-h-[400px] bg-gray-50 dark:bg-gray-900 rounded-xl flex items-center justify-center">
    <div className="text-center">
      <div className="w-12 h-12 border-3 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
      <p className="text-gray-500">正在分析知识结构...</p>
    </div>
  </div>
);

const EmptyGraph = ({ onGenerate }: { onGenerate: () => void }) => (
  <div className="w-full h-full min-h-[400px] bg-gray-50 dark:bg-gray-900 rounded-xl flex flex-col items-center justify-center">
    <BookOpenIcon className="w-12 h-12 text-gray-400 mb-3" />
    <p className="text-gray-500 mb-4">暂无知识图谱</p>
    <button onClick={onGenerate} className="px-4 py-2 bg-blue-500 text-white rounded-xl text-sm">
      生成知识图谱
    </button>
  </div>
);

KnowledgeGraph.displayName = 'KnowledgeGraph';

// 节点详情弹窗
interface NodeDetailModalProps {
  node: GraphNode;
  onClose: () => void;
}

export const NodeDetailModal = memo(({ node, onClose }: NodeDetailModalProps) => {
  const bloomLabels: Record<string, string> = {
    remember: '记忆：回忆基本事实',
    understand: '理解：解释概念含义',
    apply: '应用：在新情境中使用知识',
    analyze: '分析：分解信息，识别关系',
    evaluate: '评价：基于标准做出判断',
    create: '创造：整合元素形成新产物'
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-[320px] max-w-[90%] shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-lg">{node.name}</h3>
            <button onClick={onClose} className="p-1 text-gray-400">
              <XIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-gray-600 dark:text-gray-400 text-sm">{node.description || '暂无描述'}</p>
          <div className="flex flex-wrap gap-2">
            <span className="px-2 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-700">
              {bloomLabels[node.bloomLevel] || node.bloomLevel}
            </span>
            <span className="px-2 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-700">
              难度: {'⭐'.repeat(Math.ceil(node.difficulty * 5))}
            </span>
            {node.isThresholdConcept && (
              <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-600">门槛概念</span>
            )}
          </div>
        </div>
        <div className="p-4 border-t border-gray-100 dark:border-gray-700">
          <button onClick={onClose} className="w-full py-2 bg-blue-500 text-white rounded-xl text-sm">
            查看相关资料
          </button>
        </div>
      </div>
    </div>
  );
});

NodeDetailModal.displayName = 'NodeDetailModal';
```

**Bloom认知层级说明**
| 层级 | 颜色 | 节点大小加成 |
|------|------|------------|
| 记忆 | 紫色 | +0 |
| 理解 | 蓝色 | +5 |
| 应用 | 绿色 | +10 |
| 分析 | 橙色 | +15 |
| 评价 | 红色 | +20 |
| 创造 | 粉色 | +25 |

**验收标准**
- [ ] 知识图谱正确渲染（ECharts力导向图）
- [ ] 支持节点展开/折叠
- [ ] 支持拖拽调整布局 + 缩放
- [ ] 点击节点显示关联资料（NodeDetailModal）
- [ ] Bloom层级颜色区分
- [ ] 门槛概念特殊标识（更大节点+紫色边框）
- [ ] 增量更新<2秒

#### 3.3.2 第二问：学术分歧挖掘

**核心流程**
```
观点提取 → NLI推理 → 聚类分组 → 证据溯源
```

**NLI模型集成**
```python
import json
import asyncio
from typing import List, Dict
from sentence_transformers import SentenceTransformer
from transformers import pipeline

class ControversyService:
    """学术分歧挖掘服务"""
    
    def __init__(self):
        self.llm = LLMService()
        self.embedder = SentenceTransformer('BAAI/bge-large-zh-v1.5')
        # cross-encoder/nli-deberta-v3-base 用于NLI推理
        self.nli_pipeline = pipeline(
            "text-classification", 
            model="cross-encoder/nli-deberta-v3-base",
            top_k=None
        )
    
    async def detect_controversies(self, course_id: str, documents: List[Dict]) -> List[Dict]:
        """检测学术争议点"""
        
        if len(documents) < 2:
            return []
        
        # 1. 从每个文档中提取核心观点
        views = await self._extract_views_from_documents(documents)
        
        # 2. 使用NLI模型检测观点矛盾
        contradiction_pairs = await self._detect_contradictions(views)
        
        # 3. 按主题聚类
        clusters = self._cluster_by_topic(views, contradiction_pairs)
        
        # 4. 生成争议点
        controversies = []
        for cluster in clusters:
            controversy = await self._generate_controversy(cluster, documents)
            if controversy:
                controversies.append(controversy)
        
        return controversies
    
    async def _extract_views_from_documents(self, documents: List[Dict]) -> List[Dict]:
        """从文档中提取核心观点"""
        views = []
        
        for doc in documents:
            prompt = f"""
从以下文档中提取核心观点和主张。

文档内容：
{doc.get('content', '')[:2000]}

请提取：
1. 核心观点（1-2句话）
2. 支持的证据或理由
3. 观点的局限性（如果有）

输出JSON格式：
{{
  "view": "核心观点内容",
  "evidence": "支持证据",
  "limitation": "局限性（可为空）",
  "source": "{doc.get('title', 'Unknown')}"
}}
"""
            try:
                result = await self.llm.chat(prompt)
                view_data = json.loads(result)
                view_data['source_id'] = doc.get('id', '')
                views.append(view_data)
            except Exception as e:
                continue
        
        return views
    
    async def _detect_contradictions(self, views: List[Dict]) -> List[Dict]:
        """使用NLI模型检测观点间的矛盾关系"""
        contradiction_pairs = []
        
        # 比较每对观点
        for i in range(len(views)):
            for j in range(i + 1, len(views)):
                view1 = views[i]['view']
                view2 = views[j]['view']
                
                # NLI推理
                try:
                    result = self.nli_pipeline(f"{view1} [SEP] {view2}")
                    
                    # 检查矛盾关系 (contradiction)
                    for item in result:
                        if item['label'] == 'contradiction':
                            contradiction_pairs.append({
                                'view1_idx': i,
                                'view2_idx': j,
                                'confidence': item['score']
                            })
                except Exception:
                    continue
        
        return contradiction_pairs
    
    def _cluster_by_topic(self, views: List[Dict], contradiction_pairs: List[Dict]) -> List[Dict]:
        """将观点按主题聚类"""
        # 使用简单规则：矛盾的观点在同一集群
        clusters = {}
        
        for pair in contradiction_pairs:
            idx1, idx2 = pair['view1_idx'], pair['view2_idx']
            cluster_key = f"cluster_{idx1}_{idx2}"
            
            if cluster_key not in clusters:
                clusters[cluster_key] = {
                    'pro_views': [],
                    'con_views': [],
                    'contradiction_pairs': []
                }
            
            clusters[cluster_key]['pro_views'].append(views[idx1])
            clusters[cluster_key]['con_views'].append(views[idx2])
            clusters[cluster_key]['contradiction_pairs'].append(pair)
        
        return list(clusters.values())
    
    async def _generate_controversy(self, cluster: Dict, documents: List[Dict]) -> Dict:
        """生成争议点结构"""
        prompt = f"""
分析以下一组观点，生成一个学术争议点。

正方观点：
{json.dumps(cluster['pro_views'], ensure_ascii=False, indent=2)}

反方观点：
{json.dumps(cluster['con_views'], ensure_ascii=False, indent=2)}

请生成：
1. 争议主题（简洁的争议焦点描述）
2. 正方核心观点
3. 正方证据
4. 反方核心观点
5. 反方证据
6. 置信度评分（0-1）

输出JSON格式：
{{
  "topic": "争议主题",
  "pro_view": "正方核心观点",
  "pro_evidence": "正方证据",
  "con_view": "反方核心观点",
  "con_evidence": "反方证据",
  "confidence": 0.85
}}
"""
        try:
            result = await self.llm.chat(prompt)
            controversy = json.loads(result)
            
            # 计算平均置信度
            confidences = [p['confidence'] for p in cluster['contradiction_pairs']]
            controversy['confidence'] = sum(confidences) / len(confidences) if confidences else 0.5
            
            return controversy
        except Exception:
            return None
    
    async def get_controversy_stream(self, course_id: str):
        """SSE流式返回争议检测进度"""
        yield {"status": "extracting", "progress": 0.2}
        
        documents = await self._get_course_documents(course_id)
        
        yield {"status": "analyzing", "progress": 0.5}
        views = await self._extract_views_from_documents(documents)
        
        yield {"status": "detecting", "progress": 0.7}
        contradictions = await self._detect_contradictions(views)
        
        yield {"status": "generating", "progress": 0.9}
        clusters = self._cluster_by_topic(views, contradictions)
        controversies = []
        for cluster in clusters:
            c = await self._generate_controversy(cluster, documents)
            if c:
                controversies.append(c)
        
        yield {"status": "done", "controversies": controversies, "progress": 1.0}
    
    async def _get_course_documents(self, course_id: str) -> List[Dict]:
        """获取课程相关文档"""
        # 从ChromaDB获取文档
        pass
```

**争议数据结构**
```typescript
interface Controversy {
  topic: string;
  pro_view: string;
  pro_evidence: string;
  con_view: string;
  con_evidence: string;
  confidence: number;
}
```

**ControversyPanel React组件完整实现**
```typescript
import React, { memo, useState } from 'react';
import { Haptic } from '@/utils/haptic';
import { ChevronDownIcon, ChevronUpIcon, MessageIcon } from '@/components/ui/Icons';

interface Controversy {
  id: string;
  topic: string;
  pro_view: string;
  pro_evidence: string;
  con_view: string;
  con_evidence: string;
  confidence: number;
}

interface ControversyPanelProps {
  controversies: Controversy[];
  loading?: boolean;
  onDiscussionClick?: (controversy: Controversy) => void;
}

export const ControversyPanel = memo(({ 
  controversies, 
  loading, 
  onDiscussionClick 
}: ControversyPanelProps) => {
  const [activeTab, setActiveTab] = useState<string>('all');
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  // 按主题筛选
  const filteredControversies = activeTab === 'all' 
    ? controversies 
    : controversies.filter(c => c.topic.includes(activeTab));

  // 获取唯一主题标签
  const topics = [...new Set(controversies.map(c => c.topic))];

  if (loading) {
    return <ControversySkeleton />;
  }

  if (!controversies.length) {
    return <EmptyControversy />;
  }

  return (
    <div className="space-y-4">
      {/* 主题标签筛选 */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
            activeTab === 'all' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
          }`}
        >
          全部
        </button>
        {topics.slice(0, 5).map(topic => (
          <button
            key={topic}
            onClick={() => setActiveTab(topic)}
            className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
              activeTab === topic 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
            }`}
          >
            {topic.length > 10 ? topic.slice(0, 10) + '...' : topic}
          </button>
        ))}
      </div>

      {/* 争议点列表 */}
      <div className="space-y-4">
        {filteredControversies.map((controversy) => (
          <div 
            key={controversy.id}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden"
          >
            {/* 争议主题头部 */}
            <div className="p-4 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {controversy.topic}
                </h3>
                <div className="flex items-center gap-2">
                  <ConfidenceBadge confidence={controversy.confidence} />
                  <button
                    onClick={() => setExpandedItem(
                      expandedItem === controversy.id ? null : controversy.id
                    )}
                    className="p-1 text-gray-400 hover:text-gray-600"
                  >
                    {expandedItem === controversy.id ? (
                      <ChevronUpIcon className="w-5 h-5" />
                    ) : (
                      <ChevronDownIcon className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* 正反方观点对比 */}
            <div className="grid grid-cols-2 divide-x divide-gray-100 dark:divide-gray-700">
              {/* 正方观点 */}
              <div className="p-4 bg-green-50/50 dark:bg-green-900/10">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-sm font-medium text-green-700 dark:text-green-400">
                    正方观点
                  </span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                  {controversy.pro_view}
                </p>
                {expandedItem === controversy.id && controversy.pro_evidence && (
                  <div className="mt-2 p-2 bg-green-100/50 dark:bg-green-900/20 rounded-lg">
                    <p className="text-xs text-green-800 dark:text-green-300">
                      证据：{controversy.pro_evidence}
                    </p>
                  </div>
                )}
              </div>

              {/* 反方观点 */}
              <div className="p-4 bg-red-50/50 dark:bg-red-900/10">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-sm font-medium text-red-700 dark:text-red-400">
                    反方观点
                  </span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                  {controversy.con_view}
                </p>
                {expandedItem === controversy.id && controversy.con_evidence && (
                  <div className="mt-2 p-2 bg-red-100/50 dark:bg-red-900/20 rounded-lg">
                    <p className="text-xs text-red-800 dark:text-red-300">
                      证据：{controversy.con_evidence}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* 讨论按钮 */}
            {onDiscussionClick && (
              <div className="p-3 border-t border-gray-100 dark:border-gray-700">
                <button
                  onClick={() => {
                    Haptic.light();
                    onDiscussionClick(controversy);
                  }}
                  className="w-full py-2 flex items-center justify-center gap-2 text-sm text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                >
                  <MessageIcon className="w-4 h-4" />
                  参与讨论 ({controversy.confidence.toFixed(0)}% 关注度)
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
});

// 置信度徽章
interface ConfidenceBadgeProps {
  confidence: number;
}

const ConfidenceBadge = memo(({ confidence }: ConfidenceBadgeProps) => {
  const getColor = () => {
    if (confidence >= 0.8) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    if (confidence >= 0.5) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
    return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
  };

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getColor()}`}>
      {(confidence * 100).toFixed(0)}% 置信
    </span>
  );
});

ConfidenceBadge.displayName = 'ConfidenceBadge';

// 加载骨架屏
const ControversySkeleton = () => (
  <div className="space-y-4">
    {[1, 2, 3].map(i => (
      <div key={i} className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 animate-pulse">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    ))}
  </div>
);

// 空状态
const EmptyControversy = () => (
  <div className="text-center py-12">
    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
      <MessageIcon className="w-8 h-8 text-gray-400" />
    </div>
    <p className="text-gray-500 dark:text-gray-400 mb-2">暂无学术争议</p>
    <p className="text-sm text-gray-400 dark:text-gray-500">
      上传更多资料后，AI将自动分析学术分歧点
    </p>
  </div>
);

ControversyPanel.displayName = 'ControversyPanel';
```

**验收标准**
- [ ] 争议点正确标注（正方/反方）
- [ ] 证据来源可追溯（原文引用）
- [ ] 支持切换不同争议主题（标签页）
- [ ] NLI模型 + LLM双重检测
- [ ] 异步处理不阻塞UI
- [ ] SSE推送完成通知

#### 3.3.3 第三问：深度测评生成

**布鲁姆六维度设计**
| 认知层级 | 题型 | 考察能力 |
|---------|------|---------|
| 记忆(Remember) | 选择题/填空题 | 识别、回忆基本事实 |
| 理解(Understand) | 简答题 | 解释概念、总结要点 |
| 应用(Apply) | 编程题/计算题 | 在新情境中使用知识 |
| 分析(Analyze) | 案例分析题 | 分解信息、识别关系 |
| 评价(Evaluate) | 论述题 | 基于标准做出判断 |
| 创造(Create) | 项目设计题 | 整合元素形成新方案 |

**难度系数**
```python
difficulties = {
    'remember': 0.2,
    'understand': 0.4,
    'apply': 0.6,
    'analyze': 0.75,
    'evaluate': 0.85,
    'create': 0.95
}
```

**QuizService完整实现**
```python
import json
import asyncio
from typing import List, Dict
from services.llm_service import LLMService

# Bloom难度系数
DIFFICULTIES = {
    'remember': 0.2,
    'understand': 0.4,
    'apply': 0.6,
    'analyze': 0.75,
    'evaluate': 0.85,
    'create': 0.95
}

# 各维度题型配置
QUESTION_TYPES = {
    'remember': ['multiple_choice', 'fill_blank'],
    'understand': ['short_answer', 'explanation'],
    'apply': ['coding', 'calculation'],
    'analyze': ['case_study', 'analysis'],
    'evaluate': ['essay', 'discussion'],
    'create': ['project_design', 'innovation']
}

class QuizService:
    """测评服务"""
    
    def __init__(self):
        self.llm = LLMService()
    
    async def generate_full_quiz(self, course_id: str, documents: List[Dict]) -> Dict:
        """为课程生成完整测评（6个维度各1题）"""
        
        # 1. 合并课程资料
        combined_text = "\n\n".join([doc.get('content', '')[:2000] for doc in documents[:5]])
        
        # 2. 为每个Bloom维度生成题目
        quizzes = []
        
        for dimension, difficulty in DIFFICULTIES.items():
            question = await self._generate_question(
                dimension, difficulty, combined_text
            )
            if question:
                quizzes.append(question)
        
        return {
            'course_id': course_id,
            'questions': quizzes,
            'total_count': len(quizzes),
            'created_at': asyncio.get_event_loop().time()
        }
    
    async def _generate_question(
        self, 
        dimension: str, 
        difficulty: float, 
        context: str
    ) -> Dict:
        """为指定维度生成一道题目"""
        
        prompt = f"""
基于以下学习资料，为"{dimension}"认知层级生成一道测评题目。

要求：
- 难度系数: {difficulty} (0.2最简单，0.95最难)
- 题型: {QUESTION_TYPES[dimension]}
- 考察{dimension}级别能力

学习资料：
{context[:4000]}

输出JSON格式：
{{
  "id": "question_001",
  "dimension": "{dimension}",
  "bloom_level": "{dimension}",
  "difficulty": {difficulty},
  "question_type": "{QUESTION_TYPES[dimension][0]}",
  "question": "题目内容",
  "options": ["A. 选项1", "B. 选项2", "C. 选项3", "D. 选项4"],
  "correct_answer": "A",
  "explanation": "答案解析",
  "common_mistakes": ["常见错误1", "常见错误2"],
  "related_concepts": ["相关概念1", "相关概念2"]
}}
"""
        
        try:
            result = await self.llm.chat(prompt)
            question = json.loads(result)
            return question
        except Exception:
            return None
    
    async def evaluate_answer(
        self, 
        question: Dict, 
        user_answer: str
    ) -> Dict:
        """评测用户答案"""
        
        if question.get('question_type') in ['multiple_choice', 'fill_blank']:
            # 客观题自动判分
            is_correct = user_answer.strip().upper() == question['correct_answer'].strip().upper()
            return {
                'is_correct': is_correct,
                'score': 100 if is_correct else 0,
                'feedback': '回答正确' if is_correct else f"正确答案: {question['correct_answer']}"
            }
        else:
            # 主观题LLM评分
            result = await self._llm_evaluate_subjective(question, user_answer)
            return result
    
    async def _llm_evaluate_subjective(
        self, 
        question: Dict, 
        user_answer: str
    ) -> Dict:
        """LLM评分主观题"""
        
        prompt = f"""
你是一位学习评估专家。请评估以下回答。

题目：{question['question']}
正确答案：{question.get('correct_answer', '无标准答案')}
用户回答：{user_answer}

评估标准：
- 准确性（是否正确）
- 完整性（是否全面）
- 深度（是否有独到见解）

请输出JSON：
{{
  "score": 85,
  "is_correct": true,
  "feedback": "评估反馈",
  "suggestions": ["改进建议1", "改进建议2"]
}}
"""
        
        try:
            result = await self.llm.chat(prompt)
            evaluation = json.loads(result)
            return evaluation
        except Exception:
            return {
                'is_correct': False,
                'score': 0,
                'feedback': '评分失败，请稍后重试'
            }
    
    async def calculate_ability_radar(
        self, 
        quiz_results: List[Dict]
    ) -> Dict:
        """计算能力雷达图数据"""
        
        # 按维度分组计算平均分
        dimension_scores = {
            'remember': [],
            'understand': [],
            'apply': [],
            'analyze': [],
            'evaluate': [],
            'create': []
        }
        
        for result in quiz_results:
            dimension = result.get('dimension', 'remember')
            score = result.get('score', 0)
            dimension_scores[dimension].append(score)
        
        # 计算各维度平均分
        radar_data = {
            'dimensions': [],
            'values': []
        }
        
        for dimension, scores in dimension_scores.items():
            avg_score = sum(scores) / len(scores) if scores else 0
            radar_data['dimensions'].append({
                'name': self._get_dimension_name(dimension),
                'max': 100
            })
            radar_data['values'].append(round(avg_score, 1))
        
        # 计算最强/最弱维度
        radar_data['average'] = round(
            sum(radar_data['values']) / len(radar_data['values']), 1
        )
        radar_data['strongest'] = self._get_dimension_name(
            max(dimension_scores, key=lambda k: sum(dimension_scores[k]) / len(dimension_scores[k]) if dimension_scores[k] else 0)
        )
        radar_data['weakest'] = self._get_dimension_name(
            min(dimension_scores, key=lambda k: sum(dimension_scores[k]) / len(dimension_scores[k]) if dimension_scores[k] else 0)
        )
        
        return radar_data
    
    def _get_dimension_name(self, dimension: str) -> str:
        """获取维度中文名称"""
        names = {
            'remember': '记忆',
            'understand': '理解',
            'apply': '应用',
            'analyze': '分析',
            'evaluate': '评价',
            'create': '创造'
        }
        return names.get(dimension, dimension)
    
    async def generate_report(
        self, 
        course_id: str, 
        quiz_results: List[Dict]
    ) -> Dict:
        """生成测评报告"""
        
        radar_data = await self.calculate_ability_radar(quiz_results)
        
        # 统计正确率
        total = len(quiz_results)
        correct = sum(1 for r in quiz_results if r.get('is_correct'))
        
        # 各维度正确率
        dimension_accuracy = {}
        for result in quiz_results:
            dim = result.get('dimension', 'remember')
            if dim not in dimension_accuracy:
                dimension_accuracy[dim] = {'correct': 0, 'total': 0}
            dimension_accuracy[dim]['total'] += 1
            if result.get('is_correct'):
                dimension_accuracy[dim]['correct'] += 1
        
        return {
            'course_id': course_id,
            'overall': {
                'total_questions': total,
                'correct_count': correct,
                'accuracy': round(correct / total * 100, 1) if total > 0 else 0
            },
            'radar': radar_data,
            'dimension_accuracy': {
                dim: round(data['correct'] / data['total'] * 100, 1) if data['total'] > 0 else 0
                for dim, data in dimension_accuracy.items()
            },
            'suggestions': self._generate_suggestions(dimension_accuracy)
        }
    
    def _generate_suggestions(self, dimension_accuracy: Dict) -> List[str]:
        """根据错题情况生成学习建议"""
        suggestions = []
        
        for dim, data in dimension_accuracy.items():
            if data['total'] > 0:
                accuracy = data['correct'] / data['total']
                if accuracy < 0.6:
                    suggestions.append(
                        f"建议加强{dim}维度的学习，正确率仅{accuracy*100:.0f}%"
                    )
        
        if not suggestions:
            suggestions.append("整体表现良好，建议继续深化学习")
        
        return suggestions
```

**QuizPlayer React组件完整实现**
```typescript
import React, { memo, useState, useCallback } from 'react';
import { Haptic } from '@/utils/haptic';
import { ProgressBar } from '@/components/ui/ProgressBar';

interface QuizQuestion {
  id: string;
  dimension: string;
  bloom_level: string;
  difficulty: number;
  question_type: string;
  question: string;
  options?: string[];
  correct_answer: string;
  explanation?: string;
}

interface QuizPlayerProps {
  questions: QuizQuestion[];
  onSubmit: (results: QuizResult[]) => void;
  onNext?: () => void;
}

interface QuizResult {
  question_id: string;
  user_answer: string;
  is_correct: boolean;
  score: number;
}

export const QuizPlayer = memo(({ questions, onSubmit }: QuizPlayerProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<QuizResult[]>([]);

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  // 难度标签
  const difficultyLabels = ['入门', '简单', '中等', '困难', '挑战'];

  // 维度颜色
  const dimensionColors: Record<string, string> = {
    remember: 'bg-purple-500',
    understand: 'bg-blue-500',
    apply: 'bg-green-500',
    analyze: 'bg-orange-500',
    evaluate: 'bg-red-500',
    create: 'bg-pink-500'
  };

  const handleSelectAnswer = useCallback((answer: string) => {
    if (submitted) return;
    Haptic.light();
    setUserAnswers(prev => ({ ...prev, [currentQuestion.id]: answer }));
  }, [currentQuestion.id, submitted]);

  const handleNext = useCallback(() => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      // 提交所有答案
      const allResults: QuizResult[] = questions.map(q => ({
        question_id: q.id,
        user_answer: userAnswers[q.id] || '',
        is_correct: (userAnswers[q.id] || '').toUpperCase() === q.correct_answer.toUpperCase(),
        score: (userAnswers[q.id] || '').toUpperCase() === q.correct_answer.toUpperCase() ? 100 : 0
      }));
      setResults(allResults);
      setSubmitted(true);
      Haptic.success();
      onSubmit(allResults);
    }
  }, [currentIndex, questions, userAnswers, onSubmit]);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex]);

  if (!currentQuestion) {
    return <div className="p-4 text-center text-gray-500">暂无测评题目</div>;
  }

  return (
    <div className="max-w-lg mx-auto p-4">
      {/* 进度条 */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-500 mb-2">
          <span>题目 {currentIndex + 1} / {questions.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <ProgressBar progress={progress} className="h-2" />
      </div>

      {/* 维度标签 */}
      <div className="flex items-center gap-2 mb-4">
        <span className={`${dimensionColors[currentQuestion.bloom_level]} text-white text-xs px-2 py-1 rounded`}>
          {currentQuestion.dimension}
        </span>
        <span className="text-xs text-gray-400">
          难度: {difficultyLabels[Math.round(currentQuestion.difficulty * 4)]}
        </span>
      </div>

      {/* 题目卡片 */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 mb-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          {currentQuestion.question}
        </h3>

        {/* 选择题选项 */}
        {currentQuestion.options && (
          <div className="space-y-3">
            {currentQuestion.options.map((option, index) => {
              const isSelected = userAnswers[currentQuestion.id] === option;
              const showResult = submitted && option === currentQuestion.correct_answer;
              
              return (
                <button
                  key={index}
                  onClick={() => handleSelectAnswer(option)}
                  disabled={submitted}
                  className={`w-full p-4 rounded-xl text-left transition-all ${
                    showResult 
                      ? 'bg-green-100 border-2 border-green-500 dark:bg-green-900/30' 
                      : isSelected 
                        ? 'bg-blue-100 border-2 border-blue-500 dark:bg-blue-900/30' 
                        : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600'
                  } ${submitted ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      showResult 
                        ? 'bg-green-500 text-white' 
                        : isSelected 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                    }`}>
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span className="text-gray-700 dark:text-gray-200">{option}</span>
                    {showResult && (
                      <span className="ml-auto text-green-500">✓ 正确答案</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* 填空题输入 */}
        {!currentQuestion.options && (
          <div>
            <textarea
              value={userAnswers[currentQuestion.id] || ''}
              onChange={(e) => handleSelectAnswer(e.target.value)}
              disabled={submitted}
              placeholder="请输入你的答案..."
              className="w-full p-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 resize-none focus:border-blue-500 focus:outline-none"
              rows={4}
            />
          </div>
        )}
      </div>

      {/* 答案解析（提交后显示） */}
      {submitted && currentQuestion.explanation && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-2xl p-4 mb-6">
          <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
            📖 答案解析
          </h4>
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            {currentQuestion.explanation}
          </p>
        </div>
      )}

      {/* 导航按钮 */}
      <div className="flex gap-3">
        <button
          onClick={handlePrevious}
          disabled={currentIndex === 0}
          className="flex-1 py-3 px-6 rounded-xl border-2 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          上一题
        </button>
        <button
          onClick={handleNext}
          className="flex-1 py-3 px-6 rounded-xl bg-blue-500 text-white hover:bg-blue-600 transition-colors"
        >
          {currentIndex === questions.length - 1 ? '提交测评' : '下一题'}
        </button>
      </div>
    </div>
  );
});

QuizPlayer.displayName = 'QuizPlayer';
```

**能力雷达图数据**
```typescript
radar_data = {
  dimensions: ['记忆', '理解', '应用', '分析', '评价', '创造'],
  scores: [85, 60, 75, 45, 30, 20]  // 各维度得分
}
```

**验收标准**
- [ ] 每维度1题，共6题
- [ ] 题目难度递进（0.2→0.95）
- [ ] 选择题自动判分 + 主观题LLM评分
- [ ] 能力雷达图生成
- [ ] 错题溯源
- [ ] 测评报告生成

#### 3.3.4 SSE实时集成

**事件类型**
| 事件 | 触发时机 | 数据内容 |
|------|---------|---------|
| graph_updated | 知识图谱增量更新 | {nodes, links} |
| controversy_ready | 争议分析完成 | {controversies[]} |
| quiz_ready | 测评生成完成 | {quizzes[]} |

**LearningSpace页面SSE集成**
```typescript
useSSE(courseId, {
  onGraphUpdated: (newGraph) => updateGraph(newGraph),
  onControversyReady: (data) => {
    setControversies(data.controversies);
    Haptic.success();
  }
});
```

---

### 3.4 学习进度追踪模块

#### 3.4.0 整体架构

```
┌─────────────────────────────────────────────────────────┐
│                  学习进度追踪模块                          │
├─────────────────────────────────────────────────────────┤
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐
│  │  进度可视化    │  │  能力雷达图    │  │  个性化提醒    │
│  │  (实时更新)    │  │  (多维分析)    │  │  (智能推送)    │
│  └───────┬────────┘  └───────┬────────┘  └───────┬────────┘
│          └────────────────────┼────────────────────┘
│                               ▼
│                    ┌─────────────────────┐
│                    │   学习行为数据库     │
│                    │  (SQLite + 时序)    │
│                    └─────────────────────┘
└─────────────────────────────────────────────────────────┘
```

**核心设计原则**：
- 进度追踪：基于三问完成度和学习时长双维度
- 能力雷达：基于布鲁姆六维度的能力评估模型
- 智能提醒：基于学习行为数据的个性化推送

#### 3.4.1 数据库模型

**learning_progress表**
```sql
CREATE TABLE learning_progress (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL,
    user_id TEXT DEFAULT 'local',
    
    -- 三问完成状态
    q1_completed INTEGER DEFAULT 0,
    q2_completed INTEGER DEFAULT 0,
    q3_completed INTEGER DEFAULT 0,
    q3_score REAL,
    
    -- 能力维度分数 (0-100)
    ability_remember REAL DEFAULT 0,
    ability_understand REAL DEFAULT 0,
    ability_apply REAL DEFAULT 0,
    ability_analyze REAL DEFAULT 0,
    ability_evaluate REAL DEFAULT 0,
    ability_create REAL DEFAULT 0,
    
    -- 学习行为
    total_minutes INTEGER DEFAULT 0,
    session_count INTEGER DEFAULT 0,
    last_activity INTEGER,
    
    -- 课程级
    overall_progress INTEGER DEFAULT 0,
    created_at INTEGER,
    updated_at INTEGER
);
```

**learning_events表（时序数据）**
```sql
CREATE TABLE learning_events (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL,
    event_type TEXT,        -- view/upload/generate/quiz
    duration INTEGER,       -- 事件耗时(秒)
    metadata TEXT,          -- JSON元数据
    created_at INTEGER,
    INDEX idx_course_time (course_id, created_at)
);
```

**reminders表**
```sql
CREATE TABLE reminders (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL,
    type TEXT,               -- progress/deep_dive/review
    title TEXT,
    content TEXT,
    is_read INTEGER DEFAULT 0,
    created_at INTEGER
);
```

#### 3.4.2 进度计算服务

**ProgressService完整实现**
```python
import json
import sqlite3
from datetime import datetime
from typing import Dict, List, Optional
from services.llm_service import LLMService

class ProgressService:
    """学习进度服务"""
    
    # 三问各占基础进度的25%
    BASE_WEIGHT = 25
    # 学习时长最多加成20%
    TIME_BONUS_MAX = 20
    # 120分钟 = 获得最大时长加成
    TIME_BONUS_THRESHOLD = 120
    
    def __init__(self, db_path: str = './data/learning.db'):
        self.db_path = db_path
        self.llm = LLMService()
    
    def get_progress(self, course_id: str) -> Dict:
        """获取课程学习进度"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        
        row = conn.execute(
            'SELECT * FROM learning_progress WHERE course_id = ?',
            (course_id,)
        ).fetchone()
        
        if not row:
            return self._get_default_progress(course_id)
        
        progress = dict(row)
        progress['overall_progress'] = self._calculate_overall_progress(course_id, conn)
        
        conn.close()
        return progress
    
    def _get_default_progress(self, course_id: str) -> Dict:
        """获取默认进度"""
        return {
            'course_id': course_id,
            'q1_completed': False,
            'q2_completed': False,
            'q3_completed': False,
            'q3_score': None,
            'ability_remember': 0,
            'ability_understand': 0,
            'ability_apply': 0,
            'ability_analyze': 0,
            'ability_evaluate': 0,
            'ability_create': 0,
            'total_minutes': 0,
            'session_count': 0,
            'last_activity': None,
            'overall_progress': 0
        }
    
    def _calculate_overall_progress(self, course_id: str, conn: sqlite3.Connection) -> int:
        """计算总体进度（基于三问完成度和学习时长）"""
        row = conn.execute(
            'SELECT q1_completed, q2_completed, q3_completed, total_minutes FROM learning_progress WHERE course_id = ?',
            (course_id,)
        ).fetchone()
        
        if not row:
            return 0
        
        q1 = 1 if row['q1_completed'] else 0
        q2 = 1 if row['q2_completed'] else 0
        q3 = 1 if row['q3_completed'] else 0
        
        # 基础进度：三问各占25%
        base_progress = (q1 + q2 + q3) * self.BASE_WEIGHT
        
        # 学习时长加成：最多20%
        minutes = row['total_minutes'] or 0
        time_bonus = min(minutes / self.TIME_BONUS_THRESHOLD, 1.0) * self.TIME_BONUS_MAX
        
        return min(int(base_progress + time_bonus), 100)
    
    def update_question_completion(self, course_id: str, question_num: int, completed: bool) -> Dict:
        """更新问题完成状态"""
        conn = sqlite3.connect(self.db_path)
        
        column = f'q{question_num}_completed'
        conn.execute(
            f'''INSERT INTO learning_progress (course_id, {column}, updated_at)
               VALUES (?, ?, ?)
               ON CONFLICT(course_id) DO UPDATE SET {column} = ?, updated_at = ?''',
            (course_id, 1 if completed else 0, int(datetime.now().timestamp()),
             1 if completed else 0, int(datetime.now().timestamp()))
        )
        
        conn.commit()
        progress = self.get_progress(course_id)
        conn.close()
        
        return progress
    
    def update_quiz_score(self, course_id: str, score: float) -> Dict:
        """更新测评分数"""
        conn = sqlite3.connect(self.db_path)
        conn.execute(
            '''INSERT INTO learning_progress (course_id, q3_completed, q3_score, updated_at)
               VALUES (?, 1, ?, ?)
               ON CONFLICT(course_id) DO UPDATE SET q3_completed = 1, q3_score = ?, updated_at = ?''',
            (course_id, score, int(datetime.now().timestamp()),
             score, int(datetime.now().timestamp()))
        )
        conn.commit()
        
        progress = self.get_progress(course_id)
        conn.close()
        
        return progress
    
    def record_learning_event(
        self, 
        course_id: str, 
        event_type: str, 
        duration: int = 0,
        metadata: Optional[Dict] = None
    ) -> None:
        """记录学习事件"""
        conn = sqlite3.connect(self.db_path)
        event_id = f"{course_id}_{event_type}_{int(datetime.now().timestamp() * 1000)}"
        
        conn.execute(
            '''INSERT INTO learning_events (id, course_id, event_type, duration, metadata, created_at)
               VALUES (?, ?, ?, ?, ?, ?)''',
            (event_id, course_id, event_type, duration, json.dumps(metadata or {}), int(datetime.now().timestamp()))
        )
        
        # 更新学习时长
        if duration > 0:
            conn.execute(
                '''UPDATE learning_progress SET total_minutes = total_minutes + ? WHERE course_id = ?''',
                (duration // 60, course_id)
            )
        
        conn.commit()
        conn.close()
    
    def get_ability_scores(self, course_id: str) -> Dict:
        """获取能力维度分数"""
        progress = self.get_progress(course_id)
        
        return {
            'dimensions': [
                {'name': '记忆', 'max': 100, 'value': progress.get('ability_remember', 0)},
                {'name': '理解', 'max': 100, 'value': progress.get('ability_understand', 0)},
                {'name': '应用', 'max': 100, 'value': progress.get('ability_apply', 0)},
                {'name': '分析', 'max': 100, 'value': progress.get('ability_analyze', 0)},
                {'name': '评价', 'max': 100, 'value': progress.get('ability_evaluate', 0)},
                {'name': '创造', 'max': 100, 'value': progress.get('ability_create', 0)}
            ],
            'average': sum([
                progress.get('ability_remember', 0),
                progress.get('ability_understand', 0),
                progress.get('ability_apply', 0),
                progress.get('ability_analyze', 0),
                progress.get('ability_evaluate', 0),
                progress.get('ability_create', 0)
            ]) / 6
        }
    
    def generate_reminders(self, course_id: str) -> List[Dict]:
        """生成学习提醒"""
        progress = self.get_progress(course_id)
        reminders = []
        overall = progress.get('overall_progress', 0)
        
        if overall == 0:
            reminders.append({
                'type': 'progress',
                'title': '开始学习之旅',
                'content': '上传学习资料，AI将自动生成知识图谱'
            })
        elif overall < 30:
            reminders.append({
                'type': 'progress',
                'title': '继续加油',
                'content': '完成第一问知识图谱，开启深度学习'
            })
        
        if progress.get('q1_completed') and not progress.get('q2_completed'):
            reminders.append({
                'type': 'deep_dive',
                'title': '深度分析可用',
                'content': '资料充足，可以开始学术分歧挖掘'
            })
        
        if progress.get('q3_completed'):
            reminders.append({
                'type': 'review',
                'title': '测评回顾',
                'content': '建议重新测试巩固知识'
            })
        
        return reminders
```

**提醒生成规则**
| 条件 | 提醒类型 | 标题 | 内容 |
|------|---------|------|------|
| overall_progress == 0 | progress | 开始学习之旅 | 上传学习资料，AI生成知识图谱 |
| 0<progress<30 | progress | 继续加油 | 完成第一问知识图谱 |
| question1完成且question2未开始 | deep_dive | 深度分析可用 | 资料充足，可以开始学术分歧挖掘 |
| question3完成 | review | 测评回顾 | 建议重新测试巩固知识 |

#### 3.4.3 能力雷达图服务

**RadarService完整实现**
```python
import json
import sqlite3
from typing import Dict, List
from services.llm_service import LLMService

# Bloom权重配置
BLOOM_WEIGHTS = {
    'remember': 0.1,
    'understand': 0.15,
    'apply': 0.2,
    'analyze': 0.2,
    'evaluate': 0.15,
    'create': 0.2
}

# 难度系数
DIFFICULTIES = {
    'remember': 0.2,
    'understand': 0.4,
    'apply': 0.6,
    'analyze': 0.75,
    'evaluate': 0.85,
    'create': 0.95
}

class RadarService:
    """能力雷达图服务"""
    
    def __init__(self, db_path: str = './data/learning.db'):
        self.db_path = db_path
        self.llm = LLMService()
    
    def get_radar_data(self, course_id: str) -> Dict:
        """获取能力雷达图数据"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        
        row = conn.execute(
            '''SELECT ability_remember, ability_understand, ability_apply,
                      ability_analyze, ability_evaluate, ability_create
               FROM learning_progress WHERE course_id = ?''',
            (course_id,)
        ).fetchone()
        
        conn.close()
        
        if not row:
            return self._get_default_radar()
        
        values = [
            row['ability_remember'] or 0,
            row['ability_understand'] or 0,
            row['ability_apply'] or 0,
            row['ability_analyze'] or 0,
            row['ability_evaluate'] or 0,
            row['ability_create'] or 0
        ]
        
        return self._build_radar_data(values)
    
    def _get_default_radar(self) -> Dict:
        """获取默认雷达图数据"""
        return self._build_radar_data([0, 0, 0, 0, 0, 0])
    
    def _build_radar_data(self, values: List[float]) -> Dict:
        """构建雷达图数据"""
        dimension_names = ['记忆', '理解', '应用', '分析', '评价', '创造']
        dimensions = [{'name': name, 'max': 100} for name in dimension_names]
        
        # 计算最强/最弱维度
        max_idx = values.index(max(values)) if max(values) > 0 else 0
        min_idx = values.index(min(values)) if min(values) > 0 else 0
        
        return {
            'dimensions': dimensions,
            'values': [round(v, 1) for v in values],
            'average': round(sum(values) / len(values), 1),
            'strongest': dimension_names[max_idx],
            'weakest': dimension_names[min_idx]
        }
    
    def update_ability_from_quiz(
        self, 
        course_id: str, 
        quiz_results: List[Dict]
    ) -> Dict:
        """根据测评结果更新能力分数"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        
        # 获取当前分数
        row = conn.execute(
            'SELECT * FROM learning_progress WHERE course_id = ?',
            (course_id,)
        ).fetchone()
        
        current_scores = {
            'ability_remember': row['ability_remember'] if row else 0,
            'ability_understand': row['ability_understand'] if row else 0,
            'ability_apply': row['ability_apply'] if row else 0,
            'ability_analyze': row['ability_analyze'] if row else 0,
            'ability_evaluate': row['ability_evaluate'] if row else 0,
            'ability_create': row['ability_create'] if row else 0
        }
        
        # 按维度统计正确率
        dimension_results: Dict[str, List[bool]] = {
            'remember': [], 'understand': [], 'apply': [],
            'analyze': [], 'evaluate': [], 'create': []
        }
        
        for result in quiz_results:
            dim = result.get('dimension', 'remember')
            if dim in dimension_results:
                dimension_results[dim].append(result.get('is_correct', False))
        
        # 计算新分数（使用指数移动平均）
        alpha = 0.3  # 平滑系数
        new_scores = {}
        
        for dim, results in dimension_results.items():
            if results:
                accuracy = sum(results) / len(results)
                # 正确率转100分制
                new_score = accuracy * 100
                # 难度加权
                difficulty = DIFFICULTIES.get(dim, 0.5)
                new_score = new_score * (1 + difficulty) / 2
            else:
                new_score = current_scores.get(f'ability_{dim}', 0)
            
            # 平滑更新
            old_score = current_scores.get(f'ability_{dim}', 0)
            new_scores[f'ability_{dim}'] = round(old_score * (1 - alpha) + new_score * alpha, 1)
        
        # 更新数据库
        conn.execute(
            '''INSERT INTO learning_progress 
               (course_id, ability_remember, ability_understand, ability_apply,
                ability_analyze, ability_evaluate, ability_create, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(course_id) DO UPDATE SET
               ability_remember = ?, ability_understand = ?, ability_apply = ?,
               ability_analyze = ?, ability_evaluate = ?, ability_create = ?,
               updated_at = ?''',
            (course_id, 
             new_scores['ability_remember'], new_scores['ability_understand'], new_scores['ability_apply'],
             new_scores['ability_analyze'], new_scores['ability_evaluate'], new_scores['ability_create'],
             int(__import__('time').time()),
             new_scores['ability_remember'], new_scores['ability_understand'], new_scores['ability_apply'],
             new_scores['ability_analyze'], new_scores['ability_evaluate'], new_scores['ability_create'],
             int(__import__('time').time()))
        )
        conn.commit()
        conn.close()
        
        return self._build_radar_data([
            new_scores['ability_remember'],
            new_scores['ability_understand'],
            new_scores['ability_apply'],
            new_scores['ability_analyze'],
            new_scores['ability_evaluate'],
            new_scores['ability_create']
        ])
    
    def get_dimension_legend(self) -> List[Dict]:
        """获取维度图例说明"""
        return [
            {'name': '记忆', 'color': '#8B5CF6', 'desc': '回忆基本事实和概念'},
            {'name': '理解', 'color': '#3B82F6', 'desc': '解释和总结知识'},
            {'name': '应用', 'color': '#10B981', 'desc': '在新情境中使用知识'},
            {'name': '分析', 'color': '#F59E0B', 'desc': '分解信息识别关系'},
            {'name': '评价', 'color': '#EF4444', 'desc': '基于标准做出判断'},
            {'name': '创造', 'color': '#EC4899', 'desc': '整合形成新方案'}
        ]
```

**难度系数**
| 层级 | 难度 | 权重 |
|------|------|------|
| 记忆 | 0.2 | 10% |
| 理解 | 0.4 | 15% |
| 应用 | 0.6 | 20% |
| 分析 | 0.75 | 20% |
| 评价 | 0.85 | 15% |
| 创造 | 0.95 | 20% |

**能力雷达图数据格式**
```typescript
radarData = {
  dimensions: [
    { name: '记忆', max: 100 },
    { name: '理解', max: 100 },
    { name: '应用', max: 100 },
    { name: '分析', max: 100 },
    { name: '评价', max: 100 },
    { name: '创造', max: 100 }
  ],
  values: [85, 60, 75, 45, 30, 20],
  average: 52.5,
  strongest: '记忆',
  weakest: '创造'
}
```

#### 3.4.4 API端点

```
/api/progress/
├── GET /{course_id}                 # 获取进度详情
├── POST /{course_id}/event          # 记录学习事件
├── GET /{course_id}/radar            # 获取能力雷达图数据
├── GET /{course_id}/reminders        # 获取提醒列表
├── POST /reminders/{reminder_id}/read   # 标记提醒已读
└── POST /{course_id}/quiz/update    # 更新测评结果
```

#### 3.4.5 前端组件

**CourseCard React组件完整实现**
```typescript
import React, { memo, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Haptic } from '@/utils/haptic';

interface CourseCardProps {
  id: string;
  title: string;
  keywords: string[];
  progress: number;
  status: 'active' | 'completed' | 'archived';
  threeAskProgress: {
    question1: boolean;
    question2: boolean;
    question3: boolean;
  };
  lastAccessedAt: number;
  onArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export const CourseCard = memo(({
  id,
  title,
  keywords,
  progress,
  status,
  threeAskProgress,
  lastAccessedAt,
  onArchive,
  onDelete
}: CourseCardProps) => {
  const navigate = useNavigate();

  // 相对时间显示
  const relativeTime = useMemo(() => {
    const now = Date.now();
    const diff = now - lastAccessedAt;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 30) return `${days}天前`;
    return new Date(lastAccessedAt).toLocaleDateString('zh-CN');
  }, [lastAccessedAt]);

  // 状态样式
  const isCompleted = status === 'completed';
  const isArchived = status === 'archived';
  const opacity = isCompleted ? 0.6 : isArchived ? 0.4 : 1;

  const handleClick = () => {
    Haptic.light();
    navigate(`/learning/${id}`);
  };

  const handleLongPress = (e: React.MouseEvent) => {
    e.preventDefault();
    Haptic.medium();
    // 显示操作菜单（实现略）
  };

  return (
    <div
      onClick={handleClick}
      onContextMenu={handleLongPress}
      className="relative bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      style={{ opacity }}
    >
      {/* 环形进度 */}
      <div className="absolute top-3 right-3">
        <CircularProgress progress={progress} size={44} strokeWidth={3} />
      </div>

      {/* 标题 */}
      <h3 className="pr-12 font-semibold text-gray-900 dark:text-white text-base mb-2 line-clamp-2">
        {title}
      </h3>

      {/* 关键词标签 */}
      <div className="flex flex-wrap gap-1 mb-3">
        {keywords.slice(0, 3).map((kw, idx) => (
          <span
            key={idx}
            className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full"
          >
            {kw}
          </span>
        ))}
      </div>

      {/* 线性进度条 */}
      <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mb-3">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* 底部信息栏 */}
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>{relativeTime}</span>
        <div className="flex items-center gap-2">
          {isCompleted && (
            <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full">
              已完成
            </span>
          )}
          {isArchived && (
            <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 rounded-full">
              已归档
            </span>
          )}
        </div>
      </div>

      {/* 三问完成状态指示 */}
      <div className="flex items-center gap-1 mt-2">
        <QuestionIndicator done={threeAskProgress.question1} label="图谱" />
        <QuestionIndicator done={threeAskProgress.question2} label="争议" />
        <QuestionIndicator done={threeAskProgress.question3} label="测评" />
      </div>
    </div>
  );
});

// 环形进度组件
interface CircularProgressProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
}

const CircularProgress = memo(({ progress, size = 44, strokeWidth = 3 }: CircularProgressProps) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      {/* 背景圆 */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#E5E7EB"
        strokeWidth={strokeWidth}
      />
      {/* 进度圆 */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#3B82F6"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-500"
      />
      {/* 中心文字 */}
      <text
        x={size / 2}
        y={size / 2 + 4}
        textAnchor="middle"
        className="text-[10px] fill-gray-600 dark:fill-gray-400 font-medium"
      >
        {progress}%
      </text>
    </svg>
  );
});

// 单个问题完成指示器
interface QuestionIndicatorProps {
  done: boolean;
  label: string;
}

const QuestionIndicator = memo(({ done, label }: QuestionIndicatorProps) => (
  <div className="flex items-center gap-0.5">
    <div className={`w-1.5 h-1.5 rounded-full ${done ? 'bg-green-500' : 'bg-gray-300'}`} />
    <span className={`text-[10px] ${done ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
      {label}
    </span>
  </div>
));

CourseCard.displayName = 'CourseCard';
```

**RadarChart React组件完整实现**
```typescript
import React, { memo, useEffect, useRef } from 'react';
import * as echarts from 'echarts';

interface RadarChartProps {
  data: {
    dimensions: { name: string; max: number }[];
    values: number[];
    average?: number;
    strongest?: string;
    weakest?: string;
  };
  size?: 'small' | 'large';
}

export const RadarChart = memo(({ data, size = 'large' }: RadarChartProps) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  const isSmall = size === 'small';
  const chartHeight = isSmall ? 200 : 300;

  useEffect(() => {
    if (!chartRef.current) return;

    chartInstance.current = echarts.init(chartRef.current);

    const option: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
        textStyle: { color: '#374151' }
      },
      radar: {
        indicator: data.dimensions.map(d => ({
          name: d.name,
          max: d.max
        })),
        shape: 'polygon',
        splitNumber: 4,
        axisName: {
          color: '#6B7280',
          fontSize: isSmall ? 10 : 12,
          padding: [3, 5]
        },
        splitLine: {
          lineStyle: {
            color: '#E5E7EB',
            type: 'dashed'
          }
        },
        splitArea: {
          areaStyle: {
            color: ['rgba(59, 130, 246, 0.02)', 'rgba(59, 130, 246, 0.05)']
          }
        },
        axisLine: {
          lineStyle: { color: '#D1D5DB' }
        },
        radius: isSmall ? '60%' : '70%'
      },
      series: [{
        type: 'radar',
        data: [{
          value: data.values,
          name: '能力雷达',
          lineStyle: {
            color: '#3B82F6',
            width: 2
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(59, 130, 246, 0.4)' },
              { offset: 1, color: 'rgba(59, 130, 246, 0.1)' }
            ])
          },
          symbol: 'circle',
          symbolSize: isSmall ? 4 : 6,
          itemStyle: {
            color: '#3B82F6',
            borderColor: '#fff',
            borderWidth: 2,
            shadowBlur: 10,
            shadowColor: 'rgba(59, 130, 246, 0.3)'
          }
        }]
      }]
    };

    chartInstance.current.setOption(option);

    const handleResize = () => chartInstance.current?.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chartInstance.current?.dispose();
    };
  }, [data, isSmall]);

  if (isSmall) {
    return (
      <div className="flex gap-4">
        <div ref={chartRef} style={{ width: 120, height: chartHeight }} />
        <div className="flex flex-col justify-center text-xs text-gray-500">
          <div>平均: {data.average?.toFixed(1) || 0}</div>
          {data.strongest && <div className="text-green-600">最强: {data.strongest}</div>}
          {data.weakest && <div className="text-orange-500">最弱: {data.weakest}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div ref={chartRef} style={{ width: '100%', height: chartHeight }} />
      
      {/* 底部统计信息 */}
      <div className="flex justify-center gap-6 mt-4 text-sm">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{data.average?.toFixed(1) || 0}</div>
          <div className="text-gray-500">综合能力</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{data.strongest || '-'}</div>
          <div className="text-gray-500">最强维度</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-500">{data.weakest || '-'}</div>
          <div className="text-gray-500">最弱维度</div>
        </div>
      </div>
    </div>
  );
});

RadarChart.displayName = 'RadarChart';
```

**LearningStats React组件完整实现**
```typescript
import React, { memo, useEffect, useRef } from 'react';
import * as echarts from 'echarts';

interface LearningStatsProps {
  totalMinutes: number;
  sessionCount: number;
  weeklyData?: { day: string; minutes: number }[];
}

export const LearningStats = memo(({ totalMinutes, sessionCount, weeklyData }: LearningStatsProps) => {
  const barChartRef = useRef<HTMLDivElement>(null);

  // 格式化学习时长
  const formattedTime = useMemo(() => {
    if (totalMinutes < 60) return `${totalMinutes}分钟`;
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return mins > 0 ? `${hours}小时${mins}分钟` : `${hours}小时`;
  }, [totalMinutes]);

  // 周数据默认
  const defaultWeeklyData = [
    { day: '周一', minutes: 45 },
    { day: '周二', minutes: 60 },
    { day: '周三', minutes: 30 },
    { day: '周四', minutes: 90 },
    { day: '周五', minutes: 40 },
    { day: '周六', minutes: 75 },
    { day: '周日', minutes: 55 }
  ];

  const chartData = weeklyData || defaultWeeklyData;

  useEffect(() => {
    if (!barChartRef.current) return;

    const chart = echarts.init(barChartRef.current);

    const option: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      grid: {
        left: 40,
        right: 10,
        top: 10,
        bottom: 30
      },
      xAxis: {
        type: 'category',
        data: chartData.map(d => d.day),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { 
          color: '#9CA3AF',
          fontSize: 10
        }
      },
      yAxis: {
        type: 'value',
        show: false,
        max: 120
      },
      series: [{
        type: 'bar',
        data: chartData.map(d => d.minutes),
        barWidth: '40%',
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#3B82F6' },
            { offset: 1, color: '#93C5FD' }
          ]),
          borderRadius: [4, 4, 0, 0]
        },
        label: {
          show: true,
          position: 'top',
          fontSize: 10,
          color: '#6B7280',
          formatter: '{c}分'
        }
      }]
    };

    chart.setOption(option);

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [chartData]);

  return (
    <div className="space-y-4">
      {/* 统计卡片 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 text-white">
          <div className="text-3xl font-bold mb-1">{formattedTime}</div>
          <div className="text-blue-100 text-sm">本周学习时长</div>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-4 text-white">
          <div className="text-3xl font-bold mb-1">{sessionCount}</div>
          <div className="text-green-100 text-sm">学习次数</div>
        </div>
      </div>

      {/* 周学习趋势柱状图 */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
        <h4 className="font-medium text-gray-900 dark:text-white mb-3">周学习趋势</h4>
        <div ref={barChartRef} style={{ width: '100%', height: 150 }} />
      </div>
    </div>
  );
});

LearningStats.displayName = 'LearningStats';
```

#### 3.4.6 性能指标

| 指标 | 目标值 |
|------|--------|
| 进度更新延迟 | <100ms |
| 雷达图加载 | <200ms |
| 统计图表渲染 | <300ms |
| 课程卡片滚动 | 60fps |
| 提醒推送延迟 | <500ms |

**验收标准**
- [ ] 课程卡片显示进度条
- [ ] 能力雷达图展示（ECharts）
- [ ] 支持跨学科横向对比
- [ ] 学习提醒功能
- [ ] SSE实时推送进度更新
- [ ] 统计卡片（总时长+次数）
- [ ] 周学习趋势柱状图

---

### 3.5 用户交互模块

#### 3.5.1 课程卡片管理

**CourseManageService完整实现**
```python
import json
import sqlite3
from datetime import datetime
from typing import Dict, List, Optional
from pathlib import Path

class CourseManageService:
    """课程管理服务"""
    
    def __init__(self, db_path: str = './data/learning.db'):
        self.db_path = db_path
    
    def get_courses(self, status: Optional[str] = None, sort_by: str = 'last_accessed') -> List[Dict]:
        """获取课程列表"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        
        query = 'SELECT * FROM courses'
        params = []
        
        if status:
            query += ' WHERE status = ?'
            params.append(status)
        
        # 排序
        if sort_by == 'last_accessed':
            query += ' ORDER BY last_accessed_at DESC'
        elif sort_by == 'created':
            query += ' ORDER BY created_at DESC'
        elif sort_by == 'progress':
            query += ' ORDER BY progress DESC'
        
        rows = conn.execute(query, params).fetchall()
        conn.close()
        
        return [dict(row) for row in rows]
    
    def archive_course(self, course_id: str) -> Dict:
        """归档课程"""
        conn = sqlite3.connect(self.db_path)
        conn.execute(
            'UPDATE courses SET status = ?, updated_at = ? WHERE id = ?',
            ('archived', int(datetime.now().timestamp()), course_id)
        )
        conn.commit()
        conn.close()
        
        return {'success': True, 'course_id': course_id}
    
    def unarchive_course(self, course_id: str) -> Dict:
        """取消归档"""
        conn = sqlite3.connect(self.db_path)
        conn.execute(
            'UPDATE courses SET status = ?, updated_at = ? WHERE id = ?',
            ('active', int(datetime.now().timestamp()), course_id)
        )
        conn.commit()
        conn.close()
        
        return {'success': True, 'course_id': course_id}
    
    def delete_course(self, course_id: str) -> Dict:
        """删除课程（软删除）"""
        conn = sqlite3.connect(self.db_path)
        
        # 检查是否有相关数据
        progress = conn.execute(
            'SELECT id FROM learning_progress WHERE course_id = ?',
            (course_id,)
        ).fetchone()
        
        if progress:
            # 软删除：标记为deleted状态
            conn.execute(
                'UPDATE courses SET status = ?, updated_at = ? WHERE id = ?',
                ('deleted', int(datetime.now().timestamp()), course_id)
            )
        else:
            # 硬删除（无关联数据）
            conn.execute('DELETE FROM courses WHERE id = ?', (course_id,))
        
        conn.commit()
        conn.close()
        
        return {'success': True, 'course_id': course_id}
    
    def batch_archive(self, course_ids: List[str]) -> Dict:
        """批量归档"""
        conn = sqlite3.connect(self.db_path)
        timestamp = int(datetime.now().timestamp())
        
        conn.executemany(
            'UPDATE courses SET status = ?, updated_at = ? WHERE id = ?',
            [('archived', timestamp, cid) for cid in course_ids]
        )
        
        conn.commit()
        conn.close()
        
        return {'success': True, 'archived_count': len(course_ids)}
```

**CourseCardManager React组件完整实现**
```typescript
import React, { memo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Haptic } from '@/utils/haptic';
import { CourseCard } from './CourseCard';

interface CourseManagePanelProps {
  courses: Course[];
  onArchive: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onSort: (sortBy: 'last_accessed' | 'created' | 'progress') => void;
}

export const CourseManagePanel = memo(({
  courses,
  onArchive,
  onDelete,
  onSort
}: CourseManagePanelProps) => {
  const [sortBy, setSortBy] = useState<'last_accessed' | 'created' | 'progress'>('last_accessed');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelecting, setIsSelecting] = useState(false);

  const handleSortChange = useCallback((newSort: typeof sortBy) => {
    setSortBy(newSort);
    onSort(newSort);
  }, [onSort]);

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === courses.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(courses.map(c => c.id)));
    }
  }, [courses, selectedIds.size]);

  const handleSelectCourse = useCallback((id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const handleBatchArchive = useCallback(async () => {
    if (selectedIds.size === 0) return;
    Haptic.medium();
    
    for (const id of selectedIds) {
      await onArchive(id);
    }
    
    setSelectedIds(new Set());
    setIsSelecting(false);
    Haptic.success();
  }, [selectedIds, onArchive]);

  const handleBatchDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    Haptic.medium();
    
    if (!confirm(`确定删除选中的 ${selectedIds.size} 个课程吗？`)) {
      return;
    }
    
    for (const id of selectedIds) {
      await onDelete(id);
    }
    
    setSelectedIds(new Set());
    setIsSelecting(false);
    Haptic.success();
  }, [selectedIds, onDelete]);

  // 按状态分组
  const activeCourses = courses.filter(c => c.status === 'active');
  const archivedCourses = courses.filter(c => c.status === 'archived');

  return (
    <div className="space-y-6">
      {/* 工具栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* 排序选择 */}
          <select
            value={sortBy}
            onChange={(e) => handleSortChange(e.target.value as typeof sortBy)}
            className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
          >
            <option value="last_accessed">最近访问</option>
            <option value="created">创建时间</option>
            <option value="progress">学习进度</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          {isSelecting ? (
            <>
              <span className="text-sm text-gray-500">
                已选择 {selectedIds.size} 项
              </span>
              <button
                onClick={() => setIsSelecting(false)}
                className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400"
              >
                取消
              </button>
              <button
                onClick={handleSelectAll}
                className="px-3 py-1.5 text-sm text-blue-500"
              >
                {selectedIds.size === courses.length ? '取消全选' : '全选'}
              </button>
              <button
                onClick={handleBatchArchive}
                disabled={selectedIds.size === 0}
                className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg disabled:opacity-50"
              >
                批量归档
              </button>
              <button
                onClick={handleBatchDelete}
                disabled={selectedIds.size === 0}
                className="px-3 py-1.5 text-sm bg-red-100 dark:bg-red-900/30 text-red-600 rounded-lg disabled:opacity-50"
              >
                批量删除
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsSelecting(true)}
              className="px-3 py-1.5 text-sm text-blue-500"
            >
              管理
            </button>
          )}
        </div>
      </div>

      {/* 活跃课程 */}
      <div>
        <h3 className="text-sm font-medium text-gray-500 mb-3">
          进行中的课程 ({activeCourses.length})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeCourses.map(course => (
            isSelecting ? (
              <div
                key={course.id}
                onClick={() => handleSelectCourse(course.id)}
                className={`relative cursor-pointer ${
                  selectedIds.has(course.id) ? 'ring-2 ring-blue-500 rounded-2xl' : ''
                }`}
              >
                <CourseCard {...course} />
                <div className="absolute top-2 left-2">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedIds.has(course.id)
                      ? 'bg-blue-500 border-blue-500'
                      : 'border-gray-300 bg-white'
                  }`}>
                    {selectedIds.has(course.id) && (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                      </svg>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <CourseCard key={course.id} {...course} />
            )
          ))}
        </div>
      </div>

      {/* 归档课程折叠 */}
      {archivedCourses.length > 0 && (
        <div>
          <button
            onClick={() => {}}
            className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-3"
          >
            <span>已归档课程 ({archivedCourses.length})</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-60">
            {archivedCourses.map(course => (
              <CourseCard key={course.id} {...course} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

CourseManagePanel.displayName = 'CourseManagePanel';
```

#### 3.5.2 协作讨论区

**DiscussionService完整实现**
```python
import json
import sqlite3
from datetime import datetime
from typing import Dict, List, Optional
from services.llm_service import LLMService

class DiscussionService:
    """讨论服务"""
    
    def __init__(self, db_path: str = './data/learning.db'):
        self.db_path = db_path
        self.llm = LLMService()
    
    def get_discussions(self, controversy_id: str) -> List[Dict]:
        """获取讨论列表"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        
        rows = conn.execute(
            '''SELECT * FROM discussions 
               WHERE controversy_id = ? ORDER BY created_at ASC''',
            (controversy_id,)
        ).fetchall()
        
        conn.close()
        return [dict(row) for row in rows]
    
    def create_discussion(
        self,
        controversy_id: str,
        user_id: str,
        content: str,
        position: str  # 'pro' or 'con'
    ) -> Dict:
        """创建讨论"""
        conn = sqlite3.connect(self.db_path)
        discussion_id = f"disc_{controversy_id}_{int(datetime.now().timestamp() * 1000)}"
        
        conn.execute(
            '''INSERT INTO discussions 
               (id, controversy_id, user_id, content, position, created_at)
               VALUES (?, ?, ?, ?, ?, ?)''',
            (discussion_id, controversy_id, user_id, content, position, 
             int(datetime.now().timestamp()))
        )
        conn.commit()
        conn.close()
        
        return {
            'id': discussion_id,
            'controversy_id': controversy_id,
            'user_id': user_id,
            'content': content,
            'position': position,
            'created_at': int(datetime.now().timestamp())
        }
    
    async def reply_with_ai(
        self,
        controversy_id: str,
        discussion_id: str
    ) -> Dict:
        """AI回复"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        
        # 获取上下文
        discussions = conn.execute(
            'SELECT * FROM discussions WHERE controversy_id = ? ORDER BY created_at ASC',
            (controversy_id,)
        ).fetchall()
        
        conn.close()
        
        # 构建上下文prompt
        context = "\n".join([
            f"[{d['position'].upper()}]({d['user_id']}): {d['content']}"
            for d in discussions[-10:]  # 最近10条
        ])
        
        prompt = f"""
基于以下讨论上下文，生成一个AI助手的回复意见。

上下文：
{context}

要求：
1. 分析正反双方观点
2. 提供平衡的第三方视角
3. 促进理性讨论
4. 语气友好、专业

输出JSON格式：
{{
  "content": "AI回复内容",
  "key_points": ["要点1", "要点2"],
  "sentiment": "neutral"
}}
"""
        
        try:
            result = await self.llm.chat(prompt)
            ai_reply = json.loads(result)
            return ai_reply
        except Exception:
            return None
```

**DiscussionPanel React组件完整实现**
```typescript
import React, { memo, useState, useCallback } from 'react';
import { Haptic } from '@/utils/haptic';

interface Discussion {
  id: string;
  controversy_id: string;
  user_id: string;
  content: string;
  position: 'pro' | 'con';
  created_at: number;
}

interface DiscussionPanelProps {
  controversyId: string;
  discussions: Discussion[];
  onSubmit: (content: string, position: 'pro' | 'con') => Promise<void>;
  onAIReply?: () => Promise<void>;
}

export const DiscussionPanel = memo(({
  controversyId,
  discussions,
  onSubmit,
  onAIReply
}: DiscussionPanelProps) => {
  const [message, setMessage] = useState('');
  const [position, setPosition] = useState<'pro' | 'con'>('pro');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAIReply, setShowAIReply] = useState(false);
  const [aiReply, setAiReply] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    if (!message.trim()) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit(message, position);
      setMessage('');
      Haptic.success();
    } catch (err) {
      Haptic.error();
    } finally {
      setIsSubmitting(false);
    }
  }, [message, position, onSubmit]);

  const handleAIReply = useCallback(async () => {
    setShowAIReply(true);
    if (onAIReply) {
      const reply = await onAIReply();
      setAiReply(reply?.content || null);
    }
  }, [onAIReply]);

  // 按立场分组
  const proDiscussions = discussions.filter(d => d.position === 'pro');
  const conDiscussions = discussions.filter(d => d.position === 'con');

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
      {/* 讨论头部 */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            参与讨论
          </h3>
          <button
            onClick={handleAIReply}
            className="px-3 py-1.5 text-sm text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
          >
            AI分析
          </button>
        </div>
      </div>

      {/* AI回复 */}
      {showAIReply && aiReply && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm">
              AI
            </div>
            <div>
              <div className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">
                AI分析助手
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {aiReply}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 讨论列表 */}
      <div className="max-h-[400px] overflow-y-auto">
        {discussions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>暂无讨论，发表你的观点吧</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {/* 正方观点 */}
            {proDiscussions.length > 0 && (
              <div className="p-4 bg-green-50/50 dark:bg-green-900/10">
                <div className="text-sm font-medium text-green-700 dark:text-green-400 mb-3">
                  正方观点 ({proDiscussions.length})
                </div>
                {proDiscussions.map(d => (
                  <DiscussionItem key={d.id} discussion={d} />
                ))}
              </div>
            )}

            {/* 反方观点 */}
            {conDiscussions.length > 0 && (
              <div className="p-4 bg-red-50/50 dark:bg-red-900/10">
                <div className="text-sm font-medium text-red-700 dark:text-red-400 mb-3">
                  反方观点 ({conDiscussions.length})
                </div>
                {conDiscussions.map(d => (
                  <DiscussionItem key={d.id} discussion={d} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 输入区域 */}
      <div className="p-4 border-t border-gray-100 dark:border-gray-700">
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setPosition('pro')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              position === 'pro'
                ? 'bg-green-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            }`}
          >
            支持正方
          </button>
          <button
            onClick={() => setPosition('con')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              position === 'con'
                ? 'bg-red-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            }`}
          >
            支持反方
          </button>
        </div>

        <div className="flex gap-2">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="发表你的观点..."
            className="flex-1 p-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 resize-none focus:outline-none focus:border-blue-500"
            rows={2}
          />
          <button
            onClick={handleSubmit}
            disabled={!message.trim() || isSubmitting}
            className="px-4 py-2 bg-blue-500 text-white rounded-xl disabled:opacity-50 hover:bg-blue-600 transition-colors"
          >
            发送
          </button>
        </div>
      </div>
    </div>
  );
});

const DiscussionItem = memo(({ discussion }: { discussion: Discussion }) => {
  const timeAgo = new Date(discussion.created_at * 1000).toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="py-2">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          用户 {discussion.user_id.slice(0, 8)}
        </span>
        <span className="text-xs text-gray-400">{timeAgo}</span>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400">{discussion.content}</p>
    </div>
  );
});

DiscussionItem.displayName = 'DiscussionItem';
```

#### 3.5.3 数据导出功能

**ExportService完整实现**
```python
import json
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional
import zipfile
import io

class ExportService:
    """数据导出服务"""
    
    SUPPORTED_FORMATS = ['pdf', 'json', 'markdown']
    
    def __init__(self, db_path: str = './data/learning.db'):
        self.db_path = db_path
    
    def export_course(
        self,
        course_id: str,
        format: str = 'json',
        include_discussions: bool = True
    ) -> Dict:
        """导出课程数据"""
        if format not in self.SUPPORTED_FORMATS:
            raise ValueError(f"不支持的格式: {format}")
        
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        
        # 获取课程信息
        course = conn.execute(
            'SELECT * FROM courses WHERE id = ?',
            (course_id,)
        ).fetchone()
        
        if not course:
            conn.close()
            return {'error': '课程不存在'}
        
        # 获取进度
        progress = conn.execute(
            'SELECT * FROM learning_progress WHERE course_id = ?',
            (course_id,)
        ).fetchone()
        
        # 获取讨论
        discussions = []
        if include_discussions:
            discussions = conn.execute(
                'SELECT * FROM discussions WHERE controversy_id IN (SELECT id FROM controversies WHERE course_id = ?)',
                (course_id,)
            ).fetchall()
        
        conn.close()
        
        # 按格式导出
        if format == 'json':
            return self._export_json(course, progress, discussions)
        elif format == 'markdown':
            return self._export_markdown(course, progress, discussions)
        elif format == 'pdf':
            return self._export_pdf(course, progress, discussions)
    
    def _export_json(
        self,
        course: sqlite3.Row,
        progress: Optional[sqlite3.Row],
        discussions: List[sqlite3.Row]
    ) -> Dict:
        """导出JSON格式"""
        export_data = {
            'course': dict(course),
            'progress': dict(progress) if progress else None,
            'discussions': [dict(d) for d in discussions],
            'exported_at': datetime.now().isoformat()
        }
        
        return {
            'format': 'json',
            'data': export_data,
            'filename': f"{course['title']}_export.json"
        }
    
    def _export_markdown(
        self,
        course: sqlite3.Row,
        progress: Optional[sqlite3.Row],
        discussions: List[sqlite3.Row]
    ) -> str:
        """导出Markdown格式"""
        lines = [
            f"# {course['title']}\n",
            f"**导出时间**: {datetime.now().strftime('%Y-%m-%d %H:%M')}\n",
            f"**关键词**: {', '.join(json.loads(course.get('keywords', '[]')))}\n",
            f"**原始问题**: {course.get('original_question', 'N/A')}\n",
            "\n## 学习进度\n"
        ]
        
        if progress:
            lines.extend([
                f"- 第一问（知识图谱）: {'✓' if progress['q1_completed'] else '✗'}",
                f"- 第二问（争议挖掘）: {'✓' if progress['q2_completed'] else '✗'}",
                f"- 第三问（测评）: {'✓' if progress['q3_completed'] else '✗'}",
                f"- 总进度: {progress.get('overall_progress', 0)}%",
                f"- 学习时长: {progress.get('total_minutes', 0)}分钟\n"
            ])
        
        lines.append("\n## 讨论记录\n")
        for d in discussions:
            lines.append(f"### [{d['position'].upper()}] 用户{d['user_id'][:8]}\n")
            lines.append(f"{d['content']}\n")
            lines.append(f"*发表于: {datetime.fromtimestamp(d['created_at'])}*\n\n")
        
        return ''.join(lines)
    
    def _export_pdf(
        self,
        course: sqlite3.Row,
        progress: Optional[sqlite3.Row],
        discussions: List[sqlite3.Row]
    ) -> bytes:
        """导出PDF格式（生成HTML后转换）"""
        markdown_content = self._export_markdown(course, progress, discussions)
        # 这里需要集成PDF生成库（如pdfkit/weasyprint）
        # 简化处理：返回markdown作为占位
        return markdown_content.encode('utf-8')
    
    def batch_export(
        self,
        course_ids: List[str],
        format: str = 'json'
    ) -> Dict:
        """批量导出课程"""
        export_dir = Path('./data/exports')
        export_dir.mkdir(parents=True, exist_ok=True)
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        zip_filename = f"courses_export_{timestamp}.zip"
        zip_path = export_dir / zip_filename
        
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
            for course_id in course_ids:
                try:
                    result = self.export_course(course_id, format)
                    if 'data' in result:
                        filename = result['filename']
                        content = json.dumps(result['data'], ensure_ascii=False, indent=2)
                        zf.writestr(filename, content.encode('utf-8'))
                except Exception:
                    continue
        
        return {
            'success': True,
            'zip_path': str(zip_path),
            'exported_count': len(course_ids)
        }
```

**ExportPanel React组件完整实现**
```typescript
import React, { memo, useState, useCallback } from 'react';
import { Haptic } from '@/utils/haptic';

interface ExportPanelProps {
  courseId: string;
  courseTitle: string;
  onExport: (format: 'pdf' | 'json' | 'markdown') => Promise<void>;
}

export const ExportPanel = memo(({ courseId, courseTitle, onExport }: ExportPanelProps) => {
  const [selectedFormat, setSelectedFormat] = useState<'pdf' | 'json' | 'markdown'>('json');
  const [isExporting, setIsExporting] = useState(false);
  const [includeDiscussions, setIncludeDiscussions] = useState(true);
  const [exportResult, setExportResult] = useState<{success: boolean; path?: string} | null>(null);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    setExportResult(null);
    
    try {
      await onExport(selectedFormat);
      Haptic.success();
      setExportResult({ success: true });
    } catch (err) {
      Haptic.error();
      setExportResult({ success: false });
    } finally {
      setIsExporting(false);
    }
  }, [selectedFormat, onExport]);

  const formatOptions = [
    { value: 'json', label: 'JSON', desc: '适合程序处理和备份' },
    { value: 'markdown', label: 'Markdown', desc: '适合阅读和笔记' },
    { value: 'pdf', label: 'PDF', desc: '适合打印和分享' }
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6">
      <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
        导出课程数据
      </h3>

      {/* 格式选择 */}
      <div className="space-y-3 mb-4">
        {formatOptions.map(opt => (
          <label
            key={opt.value}
            className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${
              selectedFormat === opt.value
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-100 dark:border-gray-700 hover:border-gray-200'
            }`}
          >
            <input
              type="radio"
              name="format"
              value={opt.value}
              checked={selectedFormat === opt.value}
              onChange={() => setSelectedFormat(opt.value as typeof selectedFormat)}
              className="mt-1"
            />
            <div>
              <div className="font-medium text-gray-900 dark:text-white">
                {opt.label}
              </div>
              <div className="text-sm text-gray-500">{opt.desc}</div>
            </div>
          </label>
        ))}
      </div>

      {/* 选项 */}
      <label className="flex items-center gap-2 mb-6">
        <input
          type="checkbox"
          checked={includeDiscussions}
          onChange={(e) => setIncludeDiscussions(e.target.checked)}
          className="rounded border-gray-300"
        />
        <span className="text-sm text-gray-700 dark:text-gray-300">
          包含讨论记录
        </span>
      </label>

      {/* 导出按钮 */}
      <button
        onClick={handleExport}
        disabled={isExporting}
        className="w-full py-3 bg-blue-500 text-white rounded-xl font-medium disabled:opacity-50 hover:bg-blue-600 transition-colors"
      >
        {isExporting ? '导出中...' : `导出为${selectedFormat.toUpperCase()}`}
      </button>

      {/* 结果提示 */}
      {exportResult && (
        <div className={`mt-4 p-3 rounded-xl text-sm ${
          exportResult.success
            ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
            : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
        }`}>
          {exportResult.success ? '✓ 导出成功' : '✗ 导出失败'}
        </div>
      )}
    </div>
  );
});

ExportPanel.displayName = 'ExportPanel';
```

**验收标准**：
- [ ] 课程卡片排序/归档/删除
- [ ] 讨论区发表观点
- [ ] 支持PDF/JSON/Markdown导出

#### 3.5.4 拖拽排序与交互增强

**整体架构设计**
```
┌─────────────────────────────────────────────────────────────────┐
│                      用户交互模块                                 │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │  课程卡片    │ │  协作讨论区  │ │  数据导出    │            │
│  │  管理       │ │  (争议讨论)   │ │  (多格式)    │            │
│  └──────┬───────┘ └──────┬───────┘ └──────┬───────┘            │
│         │                │                │                     │
│         └────────────────┼────────────────┘                     │
│                          ▼                                      │
│                   ┌─────────────┐                               │
│                   │  本地存储    │                               │
│                   │ (SQLite +    │                               │
│                   │  IndexedDB)  │                               │
│                   └─────────────┘                               │
└─────────────────────────────────────────────────────────────────┘
核心设计原则：
- 手势驱动：长按、滑动等iOS原生交互
- 触觉反馈：关键操作带震动反馈
- 流畅动画：60fps交互动画
- 即时反馈：操作响应<100ms
```

**DraggableCourseCard拖拽排序组件**
```typescript
import { memo, useRef, useState } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { Haptic } from '@/utils/haptic';

interface DraggableCourseCardProps {
  course: Course;
  index: number;
  moveCard: (dragIndex: number, hoverIndex: number) => void;
  onLongPress: (course: Course) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  onExport: (id: string) => void;
}

const CARD_TYPE = 'COURSE_CARD';

export const DraggableCourseCard = memo(({
  course,
  index,
  moveCard,
  onLongPress,
  onArchive,
  onDelete,
  onExport
}: DraggableCourseCardProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [showMenu, setShowMenu] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout>();

  const [{ isDragging }, drag] = useDrag({
    type: CARD_TYPE,
    item: { index, id: course.id },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  });

  const [, drop] = useDrop({
    accept: CARD_TYPE,
    hover: (item: { index: number }) => {
      if (item.index !== index) {
        moveCard(item.index, index);
        item.index = index;
        Haptic.light();
      }
    }
  });

  drag(drop(ref));

  const handleTouchStart = () => {
    longPressTimer.current = setTimeout(() => {
      Haptic.medium();
      onLongPress(course);
      setShowMenu(true);
    }, 500);
  };

  const handleTouchEnd = () => {
    clearTimeout(longPressTimer.current);
  };

  return (
    <>
      <div
        ref={ref}
        className={`
          transition-all duration-200 cursor-grab active:cursor-grabbing
          ${isDragging ? 'opacity-50 scale-95' : 'opacity-100'}
        `}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleTouchStart}
        onMouseUp={handleTouchEnd}
      >
        <CourseCard course={course} />
      </div>

      {showMenu && (
        <ActionSheet
          visible={showMenu}
          onClose={() => setShowMenu(false)}
          actions={[
            { title: '上传资料', icon: 'upload', action: () => {} },
            { title: '导出课程', icon: 'export', action: () => onExport(course.id) },
            { title: '归档', icon: 'archive', action: () => onArchive(course.id), destructive: false },
            { title: '删除', icon: 'delete', action: () => onDelete(course.id), destructive: true }
          ]}
        />
      )}
    </>
  );
});
```

**ActionSheet iOS风格组件**
```typescript
interface Action {
  title: string;
  icon: string;
  action: () => void;
  destructive?: boolean;
}

interface ActionSheetProps {
  visible: boolean;
  onClose: () => void;
  actions: Action[];
  title?: string;
}

export const ActionSheet = ({ visible, onClose, actions, title }: ActionSheetProps) => {
  useEffect(() => {
    if (visible) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [visible]);

  if (!visible) return null;

  const handleAction = (action: Action) => {
    Haptic.selection();
    action.action();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" />

      <div className="relative w-full max-w-lg mx-4 mb-8 animate-slide-up">
        {title && (
          <div className="bg-white dark:bg-gray-800 rounded-t-2xl px-4 py-3 text-center border-b border-gray-100 dark:border-gray-700">
            <p className="text-sm text-gray-500">{title}</p>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden">
          {actions.map((action, idx) => (
            <button
              key={idx}
              onClick={() => handleAction(action)}
              className={`
                w-full px-4 py-3 flex items-center gap-3
                transition-colors active:bg-gray-100 dark:active:bg-gray-700
                ${idx !== actions.length - 1 ? 'border-b border-gray-100 dark:border-gray-700' : ''}
                ${action.destructive ? 'text-red-500' : 'text-gray-900 dark:text-white'}
              `}
            >
              <ActionIcon name={action.icon} className="w-5 h-5" />
              <span className="flex-1 text-left">{action.title}</span>
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-2 py-3 bg-white dark:bg-gray-800 rounded-2xl font-medium text-blue-500 active:bg-gray-100 dark:active:bg-gray-700 transition-colors"
        >
          取消
        </button>
      </div>
    </div>
  );
};
```

**react-dnd拖拽集成**
```typescript
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import { isMobile } from '@/utils/platform';

const DnDBackend = isMobile() ? TouchBackend : HTML5Backend;

export const Home = () => {
  const { courses, reorderCourses } = useCourseStore();

  const moveCard = (dragIndex: number, hoverIndex: number) => {
    const newCourses = [...courses];
    const dragged = newCourses[dragIndex];
    newCourses.splice(dragIndex, 1);
    newCourses.splice(hoverIndex, 0, dragged);
    reorderCourses(newCourses);
    Haptic.light();
  };

  return (
    <DndProvider backend={DnDBackend}>
      <div className="space-y-2">
        {courses.map((course, idx) => (
          <DraggableCourseCard
            key={course.id}
            course={course}
            index={idx}
            moveCard={moveCard}
            onLongPress={(c) => setSelectedCourse(c)}
            onArchive={(id) => archiveCourse(id)}
            onDelete={(id) => deleteCourse(id)}
            onExport={(id) => exportCourse(id)}
          />
        ))}
      </div>
    </DndProvider>
  );
};
```

**交互动画预设**
```css
/* 入场动画 */
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slide-up {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

@keyframes slide-down {
  from { transform: translateY(-20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

@keyframes scale-in {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

/* 动画类 */
.animate-fade-in {
  animation: fade-in 0.2s ease-out;
}

.animate-slide-up {
  animation: slide-up 0.3s cubic-bezier(0.2, 0.9, 0.4, 1.1);
}

.animate-slide-down {
  animation: slide-down 0.3s cubic-bezier(0.2, 0.9, 0.4, 1.1);
}

.animate-scale-in {
  animation: scale-in 0.2s cubic-bezier(0.2, 0.9, 0.4, 1.1);
}

/* 卡片悬浮效果 */
.card-hover {
  transition: transform 0.2s cubic-bezier(0.2, 0.9, 0.4, 1.1),
              box-shadow 0.2s ease-out;
}

.card-hover:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

/* 按压反馈 */
.press-feedback {
  transition: transform 0.05s linear;
}

.press-feedback:active {
  transform: scale(0.97);
}
```

**性能指标**
| 交互 | 响应时间 | 实现方式 |
|------|---------|---------|
| 卡片点击跳转 | <100ms | 预加载 + 缓存 |
| 长按菜单 | 500ms触发 | setTimeout + 触觉 |
| 拖拽排序 | 60fps | react-dnd + GPU加速 |
| 导出生成 | <2秒 | 流式输出 |
| AI总结生成 | 3-5秒 | 异步 + 加载动画 |

**讨论区后端服务补充**
```python
class DiscussionService:
    """协作讨论区服务"""

    @classmethod
    def create_post(cls, course_id: str, controversy_id: str,
                    content: str, author: str = "用户") -> Dict:
        """创建讨论帖子"""
        conn = sqlite3.connect(cls.DB_PATH)
        post_id = f"post_{course_id}_{int(datetime.now().timestamp() * 1000)}"

        conn.execute("""
            INSERT INTO discussion_posts (id, course_id, controversy_id, content, author, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (post_id, course_id, controversy_id, content, author, int(datetime.now().timestamp() * 1000)))

        conn.commit()
        conn.close()

        return {"id": post_id, "content": content, "author": author}

    @classmethod
    def get_posts(cls, course_id: str, controversy_id: str = None) -> List[Dict]:
        """获取讨论帖子列表"""
        conn = sqlite3.connect(cls.DB_PATH)
        conn.row_factory = sqlite3.Row

        if controversy_id:
            cursor = conn.execute(
                "SELECT * FROM discussion_posts WHERE course_id = ? AND controversy_id = ? ORDER BY created_at DESC",
                (course_id, controversy_id)
            )
        else:
            cursor = conn.execute(
                "SELECT * FROM discussion_posts WHERE course_id = ? ORDER BY created_at DESC",
                (course_id,)
            )

        posts = [dict(row) for row in cursor.fetchall()]
        conn.close()

        return posts

    @classmethod
    async def generate_summary(cls, course_id: str, controversy_id: str) -> Dict:
        """AI生成讨论总结"""
        posts = cls.get_posts(course_id, controversy_id)

        if not posts:
            return {"summary": "暂无讨论内容"}

        posts_text = "\n\n".join([f"{p['author']}: {p['content']}" for p in posts[:10]])

        llm = LLMService()
        prompt = f"""
        分析以下关于学术争议的讨论，生成总结。

        讨论内容：
        {posts_text}

        输出JSON：
        {{
          "summary": "讨论总结（100字以内）",
          "hot_topics": ["热门观点1", "热门观点2"],
          "consensus": "共识点",
          "divergence": "分歧点"
        }}
        """

        result = await llm.chat(prompt)
        return json.loads(result)
```

**导出服务补充**
```python
@classmethod
def export_course_markdown(cls, course_id: str) -> str:
    """导出Markdown格式"""
    data = cls.export_course_json(course_id)
    course = data['course']

    md = f"""# {course['title']}

## 课程信息
- 创建时间：{datetime.fromtimestamp(course['created_at'] / 1000).strftime('%Y-%m-%d %H:%M')}
- 学习进度：{data['progress']['overall_progress'] if data['progress'] else 0}%

## 三问进度
- 第一问（知识图谱）：{'✅' if data['progress']['q1_completed'] else '⏳'}
- 第二问（争议挖掘）：{'✅' if data['progress']['q2_completed'] else '⏳'}
- 第三问（测评）：{'✅' if data['progress']['q3_completed'] else '⏳'}

## 资料列表
"""
    for doc in data['documents']:
        md += f"- {doc['title']} ({doc['source']})\n"

    md += "\n## 争议点分析\n"
    for c in data['controversies']:
        md += f"\n### {c['topic']}\n"
        md += f"\n**正方观点：** {c['pro_view']}\n"
        md += f"\n**反方观点：** {c['con_view']}\n"

    return md

@classmethod
def export_quiz_mistakes(cls, course_id: str) -> Dict:
    """导出错题集"""
    conn = sqlite3.connect(cls.DB_PATH)
    conn.row_factory = sqlite3.Row

    mistakes = conn.execute("""
        SELECT * FROM quiz_records
        WHERE course_id = ? AND is_correct = 0
        ORDER BY created_at DESC
    """, (course_id,)).fetchall()

    conn.close()

    return {
        "course_id": course_id,
        "total_mistakes": len(mistakes),
        "mistakes": [dict(m) for m in mistakes],
        "exported_at": datetime.now().isoformat()
    }
```

---

## 四、数据存储

### 4.1 ChromaDB集合设计

| 集合 | 维度 | 用途 |
|------|------|------|
| knowledge-ai | 1536 | AI补充资料向量 |
| knowledge-user | 1536 | 用户上传资料向量 |
| knowledge-fused | 1536 | 融合知识库 |
| disputes | - | 争议分析结果(JSON) |
| assessments | - | 测评题目(JSON) |

### 4.2 本地文件存储

```
data/
├── config.json           # 用户配置（API Key等）
├── courses.json         # 课程元数据
└── uploads/            # 用户上传文件
    └── {courseId}/
        ├── text/        # 文本/Markdown
        ├── pdf/         # PDF文件
        └── word/       # Word文件
```

---

## 五、AI抽象层设计

### 5.1 接口定义

```typescript
interface AIProvider {
  generate(prompt: string, options?: AIOptions): Promise<string>;
  generateJSON<T>(prompt: string, options?: AIOptions): Promise<T>;
  embed(texts: string[]): Promise<number[][]>;
}

interface AIOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}
```

### 5.2 MiniMax配置

```typescript
const MINI_MAX_CONFIG = {
  baseUrl: 'https://api.minimax.chat/v1',
  model: 'MiniMax-2.7B',
  embedModel: 'embo-01',
  embedDimension: 1536,
  maxTokens: 4096
};
```

### 5.3 扩展性

当前支持MiniMax，可轻松扩展其他Provider：
- 实现`AIProvider`接口即可
- 在配置中切换provider

---

## 六、SSE实时通知

### 6.1 统一端口
- 后端统一使用8000端口
- REST API和SSE共用同一端口

### 6.2 事件类型

| 事件 | 路径 | 触发时机 | 数据内容 |
|------|------|---------|---------|
| graph-update | /sse/graph | 资料添加后 | {nodes, edges} |
| dispute-result | /sse/dispute | 分析完成时 | {disputes[]} |
| assessment-ready | /sse/assessment | 测评生成完成 | {assessmentId} |

---

## 七、项目结构

```
three-questions-learner/
├── client/                      # React前端
│   ├── src/
│   │   ├── components/
│   │   │   ├── MindMap.tsx      # D3知识图谱
│   │   │   ├── CourseCard.tsx
│   │   │   ├── FileUpload.tsx
│   │   │   └── DisputeView.tsx
│   │   ├── pages/
│   │   │   ├── Home.tsx         # 搜索框 + 课程列表
│   │   │   ├── LearningSpace.tsx # 学习空间（三问）
│   │   │   ├── Assessment.tsx  # 测评中心
│   │   │   └── Settings.tsx    # API Key配置
│   │   ├── services/
│   │   │   ├── api.ts           # REST API调用
│   │   │   └── sse.ts           # SSE客户端
│   │   └── types/
│   └── package.json
├── server/                      # Node.js后端
│   ├── src/
│   │   ├── routes/
│   │   │   ├── courses.ts
│   │   │   ├── knowledge.ts
│   │   │   ├── assessment.ts
│   │   │   └── config.ts
│   │   ├── services/
│   │   │   ├── ai/
│   │   │   │   ├── base.ts
│   │   │   │   └── minimax.ts
│   │   │   ├── course.ts
│   │   │   ├── graph/
│   │   │   │   └── realTimeFusion.ts
│   │   │   ├── dispute/
│   │   │   │   └── asyncFusion.ts
│   │   │   ├── assessment/
│   │   │   │   └── finalFusion.ts
│   │   │   ├── knowledge/
│   │   │   │   └── vectorStore.ts
│   │   │   └── sse.ts
│   │   └── index.ts
│   └── package.json
├── data/                        # 本地数据
├── uploads/                     # 用户上传文件
├── OpenSpec.md
├── README.md
└── package.json                 # 根目录workspace
```

---

## 八、开发计划

### Phase 1（第1周）：文本 + Markdown
```
用户输入 → 文本粘贴 → 立即向量化 → 三问流程
```
- [ ] React项目搭建
- [ ] Express后端框架
- [ ] ChromaDB集成
- [ ] AI抽象层（MiniMax）
- [ ] 文本/Markdown粘贴向量化
- [ ] 知识图谱D3.js渲染
- [ ] 三问核心流程完成

### Phase 2（第2周）：+ PDF支持
```
PDF上传 → 自动解析 → 向量化 → 效果提升50%
```
- [ ] PDF解析（pdf-parse）
- [ ] PDF自动向量化
- [ ] 多资料源合并

### Phase 3（第3周）：+ Word支持
```
Word上传 → 自动解析 → 向量化 → 完整度95%
```
- [ ] Word解析（mammoth）
- [ ] Word自动向量化
- [ ] 部署配置文档

---

## 九、验收标准总览

### 9.1 性能要求
- 课程生成响应时间 ≤ 2秒
- 知识图谱加载时间 ≤ 2秒
- 资料解析准确率 ≥ 95%

### 9.2 功能完成度
| 模块 | 完成标准 |
|------|---------|
| 课程生成 | 提问→创建→展示≤3秒 |
| 知识库 | 支持文本/PDF/Word上传 |
| 第一问 | 图谱实时更新≤2秒 |
| 第二问 | 异步分析，点击即看 |
| 第三问 | 24题六维度测评 |
| 进度追踪 | 卡片+雷达图 |
| 数据导出 | PDF/JSON/Markdown |

### 9.3 完成定义
项目完成 = 100%功能实现 + 0未关闭Bug + 测试覆盖≥80% + 文档齐全

---

## 十、问题记录

### 10.1 前端开发环境问题

#### 问题1：Import路径错误导致500错误

**问题描述：**
```
[vite:import-analysis] Failed to resolve import "../components/ui/Icons"
from "src/components/business/QuizEntrance.tsx"
```

**原因分析：**
- 文件位于 `src/components/business/` 目录
- 错误引用 `../components/ui/Icons`（多了一层components）
- 正确路径应为 `../ui/Icons`

**受影响文件：**
| 文件 | 错误路径 | 正确路径 |
|------|---------|---------|
| QuizEntrance.tsx | `../components/ui/Icons` | `../ui/Icons` |
| CourseCard.tsx | `../components/ui/Icons` | `../ui/Icons` |
| ControversyPanel.tsx | `../components/ui/Icons` | `../ui/Icons` |
| TabBarLayout.tsx | `../components/ui/Icons` | `../ui/Icons` |
| QuizPlayer.tsx | `../components/ui/Icons` | `../ui/Icons` |

**修复方案：**
```typescript
// 错误写法（多了一层components）
import { CheckCircleIcon } from '../components/ui/Icons'

// 正确写法
import { CheckCircleIcon } from '../ui/Icons'
```

#### 问题2：Vite开发服务器重启
启动命令：`npm run dev`（位于client目录）
服务器端口：5173

#### 问题3：iOS WebApp Meta标签警告
```
<meta name="apple-mobile-web-app-capable" content="yes"> is deprecated
```
**修复方案：** 添加备用meta标签
```html
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
```

### 10.2 client目录最终结构
```
client/
├── package.json              # React + Vite + Tailwind + ECharts + react-dnd + zustand
├── vite.config.ts            # Vite配置，路径别名@指向src
├── tailwind.config.js        # Tailwind配置，iOS系统色
├── postcss.config.js
├── index.html
└── src/
    ├── main.tsx              # 入口，BrowserRouter包裹App
    ├── App.tsx               # 路由配置
    ├── index.css             # Tailwind + 全局样式(.page-container边距145pt)
    ├── components/
    │   ├── ui/               # 基础UI组件
    │   │   ├── Icons.tsx     # SVG图标库
    │   │   └── ActionSheet.tsx
    │   ├── layout/           # 布局组件
    │   │   ├── TabBarLayout.tsx
    │   │   ├── NavBar.tsx
    │   │   └── SafeArea.tsx
    │   └── business/         # 业务组件
    │       ├── CourseCard.tsx
    │       ├── KnowledgeGraph.tsx
    │       ├── ControversyPanel.tsx
    │       ├── QuizEntrance.tsx
    │       ├── QuizPlayer.tsx
    │       └── RadarChart.tsx
    └── pages/
        ├── Home.tsx
        ├── LearningSpace.tsx
        ├── QuizCenter.tsx
        └── Profile.tsx
```

### 10.3 设计变更记录
| 变更项 | 原设计规范 | 实际实现 | 状态 | 日期 |
|--------|---------|---------|------|------|
| 左右边距 | 16-20pt | **145pt** | ✅ 已定稿 | 2026-06-01 |
| 内容宽度 | 640px | 无限制 | ✅ 已定稿 | 2026-06-01 |
| 课程卡片进度条 | 显示 | **移除** | ✅ 已定稿 | 2026-06-01 |
| TabBar可见性 | 仅首页 | 全局显示 | ✅ 已修复 | 2026-06-01 |
| 顶部栏边距 | 全宽无边距 | 与内容一致 | ✅ 已定稿 | 2026-06-01 |
| 三问进度显示 | 进度条 | 三个圆点 | ✅ 已定稿 | 2026-06-01 |
| 首页右上按钮 | 头像 | **上传资料** | ✅ 已定稿 | 2026-06-01 |
| 课程卡片布局 | 横向滚动 | 纵向列表 | ✅ 已定稿 | 2026-06-01 |

> 📝 恢复相同效果方法：查阅 index.css 中 .page-container 样式（padding: 145pt）

---

## 十一、前端UI设计规范（已归档）

### 11.1 页面结构

| 页面 | 文件路径 | TabBar | 边距 | 特殊说明 |
|------|---------|--------|------|---------|
| 首页 Home | pages/Home.tsx | ✅ 全局 | 145pt | 右上为上传资料按钮 |
| 学习空间 | pages/LearningSpace.tsx | ✅ 全局 | 145pt | NavBar + Tab切换 |
| 测评中心 | pages/QuizCenter.tsx | ✅ 全局 | 145pt | NavBar |
| 个人中心 | pages/Profile.tsx | ✅ 全局 | 145pt | 无 |

### 11.2 全局样式（index.css）

```css
.page-container {
  padding-left: 145pt;
  padding-right: 145pt;
  margin: 0 auto;
}
```

### 11.3 关键组件实现状态

| 组件 | 文件 | 进度 |
|------|------|------|
| TabBarLayout | components/layout/TabBarLayout.tsx | ✅ 完成 |
| CourseCard | components/business/CourseCard.tsx | ✅ 完成（无进度条） |
| NavBar | components/layout/NavBar.tsx | ✅ 完成 |
| Icons | components/ui/Icons.tsx | ✅ 完成 |
| ActionSheet | components/ui/ActionSheet.tsx | ✅ 完成 |

### 11.4 暗黑模式

- 使用 `@media (prefers-color-scheme: dark)` 自动跟随系统
- 无需手动切换
- CSS 变量：--bg-primary, --bg-secondary, --text-primary 等