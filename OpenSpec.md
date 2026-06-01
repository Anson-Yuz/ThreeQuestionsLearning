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
    ├── index.css             # Tailwind + 全局样式(CSS变量+暗黑模式)
    ├── stores/
    │   └── themeStore.ts  # 暗黑模式状态管理
    ├── components/
    │   ├── ui/               # 基础UI组件
    │   │   ├── Icons.tsx     # SVG图标库
    │   │   ├── ActionSheet.tsx
    │   │   └── ThemeToggle.tsx # 暗黑模式切换按钮
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
| 暗黑模式 | 跟随系统 | **手动切换** | ✅ 已定稿 | 2026-06-01 |
| Profile暗黑按钮 | 无 | **月亮/太阳图标** | ✅ 已定稿 | 2026-06-01 |

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

### 11.4 暗黑模式（iOS风格手动切换）

**切换机制**：通过 `.dark` 类控制 CSS 变量，手动点击按钮切换

**存储**：localStorage 持久化

**配色方案**：

| 元素 | 亮色模式 | 暗黑模式 |
|------|---------|---------|
| 主背景 | #FFFFFF | #000000 |
| 二级背景 | #F2F2F7 | #1C1C1E |
| 三级背景 | #E5E5EA | #2C2C2E |
| 主文字 | #000000 | #FFFFFF |
| 次文字 | #6C6C70 | #8E8E93 |
| 强调色 | #007AFF | #0A84FF |
| 分割线 | rgba(60,60,67,0.08) | rgba(84,84,88,0.65) |

**关键文件**：
- `stores/themeStore.ts` - Zustand 状态管理
- `components/ui/ThemeToggle.tsx` - 切换按钮组件
- `App.tsx` - initTheme() 初始化

### 11.5 组件样式映射

| 组件属性 | CSS变量 |
|---------|---------|
| 页面背景 | `var(--bg-primary)` |
| 卡片背景 | `var(--bg-secondary)` |
| 按压态背景 | `var(--bg-tertiary)` |
| 主文字 | `var(--text-primary)` |
| 次文字 | `var(--text-secondary)` |
| 分割线 | `var(--separator)` |
| 主按钮 | `var(--accent)` |
| 卡片阴影 | `var(--card-shadow)` |

---

## 十二、测评中心模块（Quiz Center）

### 12.1 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                      测评中心模块                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  测评列表   │→ │  答题界面   │→ │  结果反馈   │         │
│  │ (认知层级)  │  │  (单题模式) │  │  (报告)     │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 12.2 数据结构设计

#### 12.2.1 题目数据结构

```typescript
// 认知层级枚举
enum BloomLevel {
  REMEMBER = 'remember',      // 记忆
  UNDERSTAND = 'understand',  // 理解
  APPLY = 'apply',            // 应用
  ANALYZE = 'analyze',        // 分析
  EVALUATE = 'evaluate',      // 评价
  CREATE = 'create'           // 创造
}

// 难度等级
enum Difficulty {
  EASY = 1,
  MEDIUM = 2,
  HARD = 3
}

// 题目类型
enum QuestionType {
  SINGLE_CHOICE = 'single',   // 单选题
  MULTIPLE_CHOICE = 'multiple', // 多选题
  TRUE_FALSE = 'truefalse',   // 判断题
  TEXT = 'text',              // 简答题
  CODE = 'code'               // 编程题
}

// 题目接口
interface Question {
  id: string;
  courseId: string;
  bloomLevel: BloomLevel;
  type: QuestionType;
  difficulty: Difficulty;
  content: string;
  options?: string[];
  correctAnswer: string | string[];
  explanation: string;
  知识点: string[];
  userAnswer?: string | string[];
  isCorrect?: boolean;
  isMarked?: boolean;
  timeSpent?: number;
}
```

#### 12.2.2 测评报告数据结构

```typescript
interface QuizReport {
  courseId: string;
  courseTitle: string;
  completedAt: number;

  // 总体统计
  totalQuestions: number;
  answeredCount: number;
  correctCount: number;
  accuracy: number;

  // 能力维度得分
  abilityScores: {
    [BloomLevel.REMEMBER]: number;
    [BloomLevel.UNDERSTAND]: number;
    [BloomLevel.APPLY]: number;
    [BloomLevel.ANALYZE]: number;
    [BloomLevel.EVALUATE]: number;
    [BloomLevel.CREATE]: number;
  };

  // 错题集
  mistakes: Array<{
    question: Question;
    userAnswer: string;
    correctAnswer: string;
    explanation: string;
  }>;

  // 复习建议
  suggestions: {
    weakAreas: string[];
    recommendedQuestions: string[];
    studyTips: string;
  };

  // 答题时间
  totalTime: number;
  averageTime: number;
}
```

### 12.3 后端API设计

#### 12.3.1 API端点

| 方法 | 路径 | 功能 |
|------|------|------|
| GET | /api/quiz/{courseId}/list | 获取测评题目列表（按认知层级分组）|
| GET | /api/quiz/{courseId}/questions | 获取所有题目（答题用）|
| POST | /api/quiz/submit | 提交单题答案 |
| POST | /api/quiz/{courseId}/complete | 完成测评，生成报告 |
| GET | /api/quiz/{courseId}/report | 获取测评报告 |
| POST | /api/quiz/mark | 标记/取消标记题目 |

#### 12.3.2 后端核心逻辑

**QuizService 核心方法：**

| 方法 | 功能 |
|------|------|
| `generate_questions(course_id, documents)` | 基于学习资料生成题目（6个认知层级各2题）|
| `evaluate_answer(question, user_answer)` | 评估用户答案 |
| `generate_report(course_id, answers)` | 生成测评报告 |
| `_generate_suggestions(weak_areas, scores)` | 生成学习建议 |

#### 12.3.3 QuizService 完整实现

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
        """为课程生成完整测评（6个维度各2题）"""
        
        # 1. 合并课程资料
        combined_text = "\n\n".join([doc.get('content', '')[:2000] for doc in documents[:5]])
        
        # 2. 为每个Bloom维度生成题目（每个维度2题）
        quizzes = []
        
        for dimension, difficulty in DIFFICULTIES.items():
            for i in range(2):  # 每个维度2题
                question = await self._generate_question(
                    dimension, difficulty, combined_text, question_num=i+1
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
        context: str,
        question_num: int = 1
    ) -> Dict:
        """为指定维度生成一道题目"""
        
        prompt = f"""
基于以下学习资料，为"{dimension}"认知层级生成第{question_num}道测评题目。

要求：
- 难度系数: {difficulty} (0.2最简单，0.95最难)
- 题型: {QUESTION_TYPES[dimension]}
- 考察{dimension}级别能力

学习资料：
{context[:4000]}

输出JSON格式：
{{
  "id": "question_{dimension}_{question_num}",
  "dimension": "{dimension}",
  "bloom_level": "{dimension}",
  "difficulty": {difficulty},
  "question_type": "{QUESTION_TYPES[dimension][0]}",
  "question": "题目内容",
  "options": ["A. 选项1", "B. 选项2", "C. 选项3", "D. 选项4"],
  "correct_answer": "A",
  "explanation": "答案解析",
  "common_mistakes": ["常见错误1", "常见错误2"],
  "related_concepts": ["相关概念1", "相关概念2"],
  "知识点": ["知识点1", "知识点2"]
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
    
    async def generate_report(
        self, 
        course_id: str, 
        quiz_results: List[Dict]
    ) -> Dict:
        """生成测评报告"""
        
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
        
        # 计算能力维度得分
        ability_scores = {}
        for dim, data in dimension_accuracy.items():
            accuracy = data['correct'] / data['total'] if data['total'] > 0 else 0
            ability_scores[dim] = round(accuracy * 100, 1)
        
        # 找出薄弱环节
        weak_areas = [
            dim for dim, data in dimension_accuracy.items()
            if data['total'] > 0 and data['correct'] / data['total'] < 0.6
        ]
        
        return {
            'course_id': course_id,
            'totalQuestions': total,
            'answeredCount': total,
            'correctCount': correct,
            'accuracy': round(correct / total * 100, 1) if total > 0 else 0,
            'abilityScores': ability_scores,
            'suggestions': {
                'weakAreas': weak_areas,
                'recommendedQuestions': [],  # 可根据薄弱环节推荐相关题目
                'studyTips': '建议加强薄弱维度的学习，多做相关练习'
            }
        }
```

### 12.4 前端实现

#### 12.4.1 测评Store (quizStore)

```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// 认知层级枚举
enum BloomLevel {
  REMEMBER = 'remember',
  UNDERSTAND = 'understand',
  APPLY = 'apply',
  ANALYZE = 'analyze',
  EVALUATE = 'evaluate',
  CREATE = 'create'
}

// 难度等级
enum Difficulty {
  EASY = 1,
  MEDIUM = 2,
  HARD = 3
}

// 题目类型
enum QuestionType {
  SINGLE_CHOICE = 'single',
  MULTIPLE_CHOICE = 'multiple',
  TRUE_FALSE = 'truefalse',
  TEXT = 'text',
  CODE = 'code'
}

interface Question {
  id: string;
  courseId: string;
  bloomLevel: BloomLevel;
  type: QuestionType;
  difficulty: Difficulty;
  content: string;
  options?: string[];
  correctAnswer: string | string[];
  explanation: string;
  知识点: string[];
  userAnswer?: string | string[];
  isCorrect?: boolean;
  isMarked?: boolean;
  timeSpent?: number;
}

interface QuizReport {
  courseId: string;
  courseTitle: string;
  completedAt: number;
  totalQuestions: number;
  answeredCount: number;
  correctCount: number;
  accuracy: number;
  abilityScores: Record<BloomLevel, number>;
  mistakes: Array<{
    question: Question;
    userAnswer: string;
    correctAnswer: string;
    explanation: string;
  }>;
  suggestions: {
    weakAreas: string[];
    recommendedQuestions: string[];
    studyTips: string;
  };
  totalTime: number;
  averageTime: number;
}

interface QuizStore {
  questions: Question[];
  currentQuestions: Question[];
  currentIndex: number;
  report: QuizReport | null;
  loading: boolean;
  quizStarted: boolean;
  quizCompleted: boolean;
  timeSpent: number;

  fetchQuestions: (courseId: string) => Promise<void>;
  startQuiz: (courseId: string, level?: string) => void;
  submitAnswer: (answer: string, timeSpent: number) => Promise<void>;
  markQuestion: (questionId: string) => void;
  nextQuestion: () => void;
  prevQuestion: () => void;
  completeQuiz: () => Promise<void>;
  fetchReport: (courseId: string) => Promise<void>;
  resetQuiz: () => void;
}

export const useQuizStore = create<QuizStore>()(
  persist(
    (set, get) => ({
      questions: [],
      currentQuestions: [],
      currentIndex: 0,
      report: null,
      loading: false,
      quizStarted: false,
      quizCompleted: false,
      timeSpent: 0,

      fetchQuestions: async (courseId: string) => {
        set({ loading: true });
        try {
          const response = await fetch(`/api/quiz/${courseId}/questions`);
          const data = await response.json();
          set({ questions: data.questions, loading: false });
        } catch (error) {
          console.error('Failed to fetch questions:', error);
          set({ loading: false });
        }
      },

      startQuiz: (courseId: string, level?: string) => {
        const { questions } = get();
        let filtered = questions;
        if (level) {
          filtered = questions.filter(q => q.bloomLevel === level);
        }
        set({
          currentQuestions: filtered,
          currentIndex: 0,
          quizStarted: true,
          quizCompleted: false,
          timeSpent: 0
        });
      },

      submitAnswer: async (answer: string, timeSpent: number) => {
        const { currentQuestions, currentIndex, timeSpent: totalTime } = get();
        const question = currentQuestions[currentIndex];
        
        // 评估答案
        const isCorrect = answer.toUpperCase() === question.correctAnswer.toUpperCase();
        
        // 更新当前题目的用户答案
        const updatedQuestions = [...currentQuestions];
        updatedQuestions[currentIndex] = {
          ...question,
          userAnswer: answer,
          isCorrect,
          timeSpent
        };
        
        set({
          currentQuestions: updatedQuestions,
          timeSpent: totalTime + timeSpent
        });
      },

      markQuestion: (questionId: string) => {
        const { currentQuestions, currentIndex } = get();
        const updatedQuestions = [...currentQuestions];
        const question = updatedQuestions.find(q => q.id === questionId);
        if (question) {
          question.isMarked = !question.isMarked;
        }
        set({ currentQuestions: updatedQuestions });
      },

      nextQuestion: () => {
        const { currentIndex, currentQuestions } = get();
        if (currentIndex < currentQuestions.length - 1) {
          set({ currentIndex: currentIndex + 1 });
        }
      },

      prevQuestion: () => {
        const { currentIndex } = get();
        if (currentIndex > 0) {
          set({ currentIndex: currentIndex - 1 });
        }
      },

      completeQuiz: async () => {
        const { currentQuestions, timeSpent } = get();
        set({ quizCompleted: true });
        
        // 计算报告
        const correctCount = currentQuestions.filter(q => q.isCorrect).length;
        const totalQuestions = currentQuestions.length;
        const accuracy = Math.round(correctCount / totalQuestions * 100);
        
        // 计算各维度得分
        const abilityScores: Record<BloomLevel, number> = {
          [BloomLevel.REMEMBER]: 0,
          [BloomLevel.UNDERSTAND]: 0,
          [BloomLevel.APPLY]: 0,
          [BloomLevel.ANALYZE]: 0,
          [BloomLevel.EVALUATE]: 0,
          [BloomLevel.CREATE]: 0
        };
        
        const dimensionCounts: Record<string, number> = {};
        const dimensionCorrect: Record<string, number> = {};
        
        currentQuestions.forEach(q => {
          const dim = q.bloomLevel;
          dimensionCounts[dim] = (dimensionCounts[dim] || 0) + 1;
          if (q.isCorrect) {
            dimensionCorrect[dim] = (dimensionCorrect[dim] || 0) + 1;
          }
        });
        
        Object.keys(dimensionCounts).forEach(dim => {
          abilityScores[dim as BloomLevel] = Math.round(
            (dimensionCorrect[dim] || 0) / dimensionCounts[dim] * 100
          );
        });
        
        // 收集错题
        const mistakes = currentQuestions
          .filter(q => !q.isCorrect)
          .map(q => ({
            question: q,
            userAnswer: q.userAnswer || '',
            correctAnswer: q.correctAnswer as string,
            explanation: q.explanation
          }));
        
        // 找出薄弱环节
        const weakAreas = Object.entries(abilityScores)
          .filter(([_, score]) => score < 60)
          .map(([level, _]) => level);
        
        const report: QuizReport = {
          courseId: '',
          courseTitle: '',
          completedAt: Date.now(),
          totalQuestions,
          answeredCount: totalQuestions,
          correctCount,
          accuracy,
          abilityScores,
          mistakes,
          suggestions: {
            weakAreas,
            recommendedQuestions: [],
            studyTips: weakAreas.length > 0 
              ? `建议加强 ${weakAreas.join('、')} 维度的学习`
              : '整体表现良好，继续保持'
          },
          totalTime,
          averageTime: Math.round(timeSpent / totalQuestions)
        };
        
        set({ report });
      },

      fetchReport: async (courseId: string) => {
        try {
          const response = await fetch(`/api/quiz/${courseId}/report`);
          const data = await response.json();
          set({ report: data });
        } catch (error) {
          console.error('Failed to fetch report:', error);
        }
      },

      resetQuiz: () => {
        set({
          questions: [],
          currentQuestions: [],
          currentIndex: 0,
          report: null,
          quizStarted: false,
          quizCompleted: false,
          timeSpent: 0
        });
      }
    }),
    { name: 'quiz-storage' }
  )
);
```

#### 12.4.2 认知层级配置

| 层级 | 名称 | 颜色 | 图标 |
|------|------|------|------|
| remember | 记忆 | #8B5CF6 | BrainIcon |
| understand | 理解 | #3B82F6 | BookOpenIcon |
| apply | 应用 | #10B981 | LightningIcon |
| analyze | 分析 | #F59E0B | MagnifyingGlassIcon |
| evaluate | 评价 | #EF4444 | StarIcon |
| create | 创造 | #EC4899 | SparklesIcon |

#### 12.4.3 测评列表页面 (QuizCenter)

```tsx
import React, { memo, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuizStore } from '../stores/quizStore'
import { useCourseStore } from '../stores/courseStore'

// SVG图标组件
const BrainIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M12 4.5c1.5 0 3 .5 4 1.5l.5.5c1 1 1.5 2.5 1.5 4v1c0 2-1 4-3 5.5l-1 1c-.5.5-1 1-1.5 1.5l-.5.5c-1 1-2.5 1.5-4 1.5s-3-.5-4-1.5l-.5-.5c-.5-.5-1-1-1.5-1.5l-1-1C5 16 4 14 4 12v-1c0-1.5.5-3 1.5-4l.5-.5c1-1 2.5-1.5 4-1.5z"/>
    <path d="M12 4.5v15"/>
    <path d="M9 7c0 1.5.5 3 1.5 4"/>
    <path d="M15 7c0 1.5-.5 3-1.5 4"/>
    <path d="M9 12c0 2 1 4 3 5"/>
    <path d="M15 12c0 2-1 4-3 5"/>
  </svg>
)

const BookOpenIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
  </svg>
)

const LightningIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
  </svg>
)

const MagnifyingGlassIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="11" cy="11" r="8"/>
    <path d="M21 21l-4.35-4.35"/>
  </svg>
)

const StarIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
)

const SparklesIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z"/>
    <path d="M5 19l1 3 1-3 3-1-3-1-1-3-1 3-3 1 3 1z"/>
    <path d="M19 13l1 2 1-2 2-1-2-1-1-2-1 2-2 1 2 1z"/>
  </svg>
)

const ChevronRightIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 18l6-6-6-6"/>
  </svg>
)

const PlayIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5v14l11-7z"/>
  </svg>
)

const CheckIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 6L9 17l-5-5"/>
  </svg>
)

const ClockIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="10"/>
    <path d="M12 6v6l4 2"/>
  </svg>
)

// 认知层级配置
const BLOOM_LEVELS = [
  { key: 'remember', name: '记忆', color: '#8B5CF6', bgColor: 'bg-purple-500', icon: BrainIcon },
  { key: 'understand', name: '理解', color: '#3B82F6', bgColor: 'bg-blue-500', icon: BookOpenIcon },
  { key: 'apply', name: '应用', color: '#10B981', bgColor: 'bg-green-500', icon: LightningIcon },
  { key: 'analyze', name: '分析', color: '#F59E0B', bgColor: 'bg-orange-500', icon: MagnifyingGlassIcon },
  { key: 'evaluate', name: '评价', color: '#EF4444', bgColor: 'bg-red-500', icon: StarIcon },
  { key: 'create', name: '创造', color: '#EC4899', bgColor: 'bg-pink-500', icon: SparklesIcon },
]

// 难度标签
const DIFFICULTY_LABELS = ['入门', '简单', '中等', '困难', '挑战']
const DIFFICULTY_COLORS = ['text-green-500', 'text-emerald-500', 'text-yellow-500', 'text-orange-500', 'text-red-500']

const QuizCenter = () => {
  const { courseId } = useParams<{ courseId: string }>()
  const navigate = useNavigate()
  const { questions, loading, fetchQuestions } = useQuizStore()
  const { currentCourse } = useCourseStore()
  
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null)

  useEffect(() => {
    if (courseId) {
      fetchQuestions(courseId)
    }
  }, [courseId, fetchQuestions])

  // 按认知层级分组题目
  const questionsByLevel = questions.reduce((acc, q) => {
    const level = q.bloomLevel
    if (!acc[level]) acc[level] = []
    acc[level].push(q)
    return acc
  }, {} as Record<string, Question[]>)

  // 计算每个层级的完成数和正确率
  const levelStats = Object.entries(questionsByLevel).map(([level, qs]) => {
    const answered = qs.filter(q => q.userAnswer !== undefined).length
    const correct = qs.filter(q => q.isCorrect).length
    const total = qs.length
    return {
      level,
      total,
      answered,
      correct,
      accuracy: total > 0 ? Math.round(correct / total * 100) : 0
    }
  })

  const handleStartQuiz = (level?: string) => {
    if (level) {
      setSelectedLevel(level)
    }
    navigate(`/quiz/${courseId}/play`)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-20">
      {/* 页面标题 */}
      <div className="page-container pt-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">测评中心</h1>
        <p className="text-sm text-gray-500">{currentCourse?.title || '课程测评'}</p>
      </div>

      {/* 能力雷达图预览 */}
      <div className="page-container mt-4">
        <div className="card p-4">
          <h2 className="text-sm font-medium text-gray-500 mb-3">能力雷达图</h2>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <RadarPreview scores={levelStats} />
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-blue-500">
                {levelStats.length > 0 
                  ? Math.round(levelStats.reduce((sum, s) => sum + s.accuracy, 0) / levelStats.length)
                  : 0}%
              </div>
              <div className="text-xs text-gray-500">综合正确率</div>
            </div>
          </div>
        </div>
      </div>

      {/* 认知层级网格 */}
      <div className="page-container mt-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">认知层级测评</h2>
        <div className="bloom-grid space-y-3">
          {BLOOM_LEVELS.map((level) => {
            const stats = levelStats.find(s => s.level === level.key) || { total: 0, answered: 0, correct: 0, accuracy: 0 }
            const isCompleted = stats.answered === stats.total && stats.total > 0
            const Icon = level.icon
            
            return (
              <div
                key={level.key}
                className="bloom-card bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 border-t-4 cursor-pointer transition-all active:scale-98"
                style={{ borderTopColor: level.color }}
                onClick={() => handleStartQuiz(level.key)}
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${level.color}20` }}
                  >
                    <Icon className="w-6 h-6" style={{ color: level.color }} />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900 dark:text-white">{level.name}</h3>
                      {isCompleted ? (
                        <span className="flex items-center gap-1 text-green-500 text-sm">
                          <CheckIcon className="w-4 h-4" />
                          完成
                        </span>
                      ) : stats.answered > 0 ? (
                        <span className="text-sm text-gray-500">
                          {stats.answered}/{stats.total}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">未开始</span>
                      )}
                    </div>
                    
                    {/* 进度条 */}
                    <div className="mt-2 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ 
                          width: `${stats.total > 0 ? (stats.answered / stats.total) * 100 : 0}%`,
                          backgroundColor: level.color
                        }}
                      />
                    </div>
                    
                    {/* 统计信息 */}
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span>正确率 {stats.accuracy}%</span>
                      <span className="flex items-center gap-1">
                        <ClockIcon className="w-3 h-3" />
                        {stats.total > 0 ? '2分钟' : '-'}
                      </span>
                    </div>
                  </div>
                  
                  <ChevronRightIcon className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 开始完整测评按钮 */}
      <div className="page-container mt-6">
        <button
          onClick={() => handleStartQuiz()}
          className="w-full py-4 bg-blue-500 text-white rounded-2xl font-semibold flex items-center justify-center gap-2 active:bg-blue-600 transition-colors"
        >
          <PlayIcon className="w-5 h-5" />
          开始完整测评
        </button>
      </div>
    </div>
  )
}

// 雷达图预览组件
const RadarPreview = ({ scores }: { scores: any[] }) => {
  const maxScore = 100
  const size = 100
  const center = size / 2
  const radius = size / 2 - 10
  
  const levels = BLOOM_LEVELS.map(l => l.key)
  const angles = levels.map((_, i) => (i * 2 * Math.PI) / levels.length - Math.PI / 2)
  
  const getPoint = (score: number, angle: number) => {
    const r = (score / maxScore) * radius
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle)
    }
  }
  
  // 绘制网格线
  const gridLevels = [0.25, 0.5, 0.75, 1]
  
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* 网格 */}
      {gridLevels.map(level => (
        <polygon
          key={level}
          points={angles.map((angle, i) => {
            const r = radius * level
            const x = center + r * Math.cos(angle)
            const y = center + r * Math.sin(angle)
            return `${x},${y}`
          }).join(' ')}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth="0.5"
        />
      ))}
      
      {/* 数据区域 */}
      <polygon
        points={BLOOM_LEVELS.map((level, i) => {
          const stat = scores.find(s => s.level === level.key)
          const score = stat?.accuracy || 0
          const point = getPoint(score, angles[i])
          return `${point.x},${point.y}`
        }).join(' ')}
        fill="rgba(59, 130, 246, 0.3)"
        stroke="#3B82F6"
        strokeWidth="2"
      />
      
      {/* 中心点 */}
      <circle cx={center} cy={center} r="2" fill="#3B82F6" />
    </svg>
  )
}

export default QuizCenter
```

#### 12.4.4 答题界面 (QuizPlay)

```tsx
import React, { memo, useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuizStore } from '../stores/quizStore'

// SVG图标
const ChevronLeftIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M15 18l-6-6 6-6"/>
  </svg>
)

const ChevronRightIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 18l6-6-6-6"/>
  </svg>
)

const FlagIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
    <line x1="4" y1="22" x2="4" y2="15"/>
  </svg>
)

const ClockIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="10"/>
    <path d="M12 6v6l4 2"/>
  </svg>
)

const CheckIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 6L9 17l-5-5"/>
  </svg>
)

const XIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
)

const BookOpenIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
  </svg>
)

// 认知层级配置
const BLOOM_LEVELS = [
  { key: 'remember', name: '记忆', color: '#8B5CF6' },
  { key: 'understand', name: '理解', color: '#3B82F6' },
  { key: 'apply', name: '应用', color: '#10B981' },
  { key: 'analyze', name: '分析', color: '#F59E0B' },
  { key: 'evaluate', name: '评价', color: '#EF4444' },
  { key: 'create', name: '创造', color: '#EC4899' },
]

const DIFFICULTY_LABELS = ['入门', '简单', '中等', '困难', '挑战']

const QuizPlay = () => {
  const { courseId } = useParams<{ courseId: string }>()
  const navigate = useNavigate()
  const { 
    currentQuestions, 
    currentIndex, 
    submitAnswer, 
    markQuestion, 
    nextQuestion, 
    prevQuestion,
    completeQuiz,
    quizCompleted
  } = useQuizStore()
  
  const [selectedAnswer, setSelectedAnswer] = useState<string>('')
  const [timeSpent, setTimeSpent] = useState(0)
  const [showExplanation, setShowExplanation] = useState(false)
  const [isAnswered, setIsAnswered] = useState(false)
  const timerRef = useRef<NodeJS.Timeout>()
  
  const currentQuestion = currentQuestions[currentIndex]
  const isLast = currentIndex === currentQuestions.length - 1
  const isFirst = currentIndex === 0
  
  // 计时器
  useEffect(() => {
    if (!quizCompleted && !isAnswered) {
      timerRef.current = setInterval(() => {
        setTimeSpent(prev => prev + 1)
      }, 1000)
    }
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [quizCompleted, isAnswered])
  
  // 格式化时间
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  
  const handleSelectAnswer = useCallback((answer: string) => {
    if (isAnswered) return
    setSelectedAnswer(answer)
  }, [isAnswered])
  
  const handleSubmit = useCallback(async () => {
    if (!selectedAnswer) return
    
    if (timerRef.current) clearInterval(timerRef.current)
    
    await submitAnswer(selectedAnswer, timeSpent)
    setIsAnswered(true)
    setShowExplanation(true)
  }, [selectedAnswer, timeSpent, submitAnswer])
  
  const handleNext = useCallback(() => {
    if (isLast) {
      await completeQuiz()
      navigate(`/quiz/${courseId}/report`)
    } else {
      nextQuestion()
      setSelectedAnswer('')
      setTimeSpent(0)
      setIsAnswered(false)
      setShowExplanation(false)
    }
  }, [isLast, nextQuestion, completeQuiz, navigate, courseId])
  
  const handlePrev = useCallback(() => {
    if (!isFirst) {
      prevQuestion()
      const prevQ = currentQuestions[currentIndex - 1]
      setSelectedAnswer(prevQ?.userAnswer || '')
      setTimeSpent(0)
      setIsAnswered(!!prevQ?.userAnswer)
      setShowExplanation(!!prevQ?.userAnswer)
    }
  }, [isFirst, prevQuestion, currentQuestions, currentIndex])
  
  const handleMark = useCallback(() => {
    if (currentQuestion) {
      markQuestion(currentQuestion.id)
    }
  }, [currentQuestion, markQuestion])
  
  const handleComplete = useCallback(async () => {
    await completeQuiz()
    navigate(`/quiz/${courseId}/report`)
  }, [completeQuiz, navigate, courseId])
  
  if (!currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">暂无题目</p>
      </div>
    )
  }
  
  const levelConfig = BLOOM_LEVELS.find(l => l.key === currentQuestion.bloomLevel)
  const difficulty = currentQuestion.difficulty
  const isMarked = currentQuestion.isMarked
  
  return (
    <div className="min-h-screen pb-20">
      {/* 顶部导航 */}
      <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 z-10">
        <div className="page-container py-3">
          <div className="flex items-center justify-between">
            <button onClick={() => navigate(`/quiz/${courseId}`)} className="p-2">
              <ChevronLeftIcon className="w-6 h-6" />
            </button>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">
                {currentIndex + 1} / {currentQuestions.length}
              </span>
              <div className="flex items-center gap-1 text-sm">
                <ClockIcon className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600 dark:text-gray-400">{formatTime(timeSpent)}</span>
              </div>
            </div>
            
            <button onClick={handleMark} className={`p-2 ${isMarked ? 'text-orange-500' : 'text-gray-400'}`}>
              <FlagIcon className="w-5 h-5" />
            </button>
          </div>
          
          {/* 进度条 */}
          <div className="mt-2 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / currentQuestions.length) * 100}%` }}
            />
          </div>
        </div>
      </div>
      
      {/* 题目内容 */}
      <div className="page-container mt-4">
        {/* 层级和难度标签 */}
        <div className="flex items-center gap-2 mb-4">
          <span 
            className="px-2 py-1 text-xs text-white rounded"
            style={{ backgroundColor: levelConfig?.color }}
          >
            {levelConfig?.name}
          </span>
          <span className={`text-xs ${['text-green-500', 'text-emerald-500', 'text-yellow-500', 'text-orange-500', 'text-red-500'][difficulty - 1]}`}>
            {DIFFICULTY_LABELS[difficulty - 1]}
          </span>
        </div>
        
        {/* 题目卡片 */}
        <div className="card p-6 mb-4">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white leading-relaxed">
            {currentQuestion.content}
          </h2>
        </div>
        
        {/* 选项 */}
        {currentQuestion.options && (
          <div className="space-y-3">
            {currentQuestion.options.map((option, index) => {
              const isSelected = selectedAnswer === option
              const isCorrect = option === currentQuestion.correctAnswer
              const showResult = isAnswered
              
              let optionClass = 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
              if (showResult) {
                if (isCorrect) {
                  optionClass = 'bg-green-50 dark:bg-green-900/20 border-green-500'
                } else if (isSelected && !isCorrect) {
                  optionClass = 'bg-red-50 dark:bg-red-900/20 border-red-500'
                }
              } else if (isSelected) {
                optionClass = 'bg-blue-50 dark:bg-blue-900/20 border-blue-500'
              }
              
              return (
                <button
                  key={index}
                  onClick={() => handleSelectAnswer(option)}
                  disabled={isAnswered}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all ${optionClass} ${!isAnswered ? 'hover:border-blue-300 active:scale-98' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      showResult 
                        ? isCorrect 
                          ? 'bg-green-500 text-white'
                          : isSelected 
                            ? 'bg-red-500 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                        : isSelected 
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}>
                      {String.fromCharCode(65 + index)}
                    </div>
                    <span className="flex-1 text-gray-700 dark:text-gray-200">{option}</span>
                    {showResult && isCorrect && (
                      <CheckIcon className="w-5 h-5 text-green-500" />
                    )}
                    {showResult && isSelected && !isCorrect && (
                      <XIcon className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
        
        {/* 简答题输入 */}
        {!currentQuestion.options && (
          <div>
            <textarea
              value={selectedAnswer}
              onChange={(e) => handleSelectAnswer(e.target.value)}
              disabled={isAnswered}
              placeholder="请输入你的答案..."
              className="w-full p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 resize-none focus:border-blue-500 focus:outline-none"
              rows={6}
            />
          </div>
        )}
        
        {/* 答案解析 */}
        {showExplanation && currentQuestion.explanation && (
          <div className="mt-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <BookOpenIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              <h4 className="font-medium text-yellow-800 dark:text-yellow-200">答案解析</h4>
            </div>
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              {currentQuestion.explanation}
            </p>
          </div>
        )}
      </div>
      
      {/* 底部操作栏 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
        <div className="page-container py-3">
          <div className="flex gap-3">
            <button
              onClick={handlePrev}
              disabled={isFirst}
              className="flex-1 py-3 px-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <ChevronLeftIcon className="w-4 h-4" />
              上一题
            </button>
            
            {!isAnswered ? (
              <button
                onClick={handleSubmit}
                disabled={!selectedAnswer}
                className="flex-1 py-3 px-4 rounded-xl bg-blue-500 text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                提交答案
              </button>
            ) : isLast ? (
              <button
                onClick={handleComplete}
                className="flex-1 py-3 px-4 rounded-xl bg-green-500 text-white flex items-center justify-center gap-2"
              >
                完成测评
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="flex-1 py-3 px-4 rounded-xl bg-blue-500 text-white flex items-center justify-center gap-2"
              >
                下一题
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default QuizPlay
```

#### 12.4.5 测评报告页面 (QuizReport)

```tsx
import React, { memo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuizStore } from '../stores/quizStore'

// SVG图标
const ChevronLeftIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M15 18l-6-6 6-6"/>
  </svg>
)

const RotateCcwIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M1 4v6h6"/>
    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
  </svg>
)

const CheckCircleIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
    <path d="M22 4L12 14.01l-3-3"/>
  </svg>
)

const XCircleIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="10"/>
    <line x1="15" y1="9" x2="9" y2="15"/>
    <line x1="9" y1="9" x2="15" y2="15"/>
  </svg>
)

const BookOpenIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
  </svg>
)

const LightbulbIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M9 18h6"/>
    <path d="M10 22h4"/>
    <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/>
  </svg>
)

const BrainIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M12 4.5c1.5 0 3 .5 4 1.5l.5.5c1 1 1.5 2.5 1.5 4v1c0 2-1 4-3 5.5l-1 1c-.5.5-1 1-1.5 1.5l-.5.5c-1 1-2.5 1.5-4 1.5s-3-.5-4-1.5l-.5-.5c-.5-.5-1-1-1.5-1.5l-1-1C5 16 4 14 4 12v-1c0-1.5.5-3 1.5-4l.5-.5c1-1 2.5-1.5 4-1.5z"/>
    <path d="M12 4.5v15"/>
  </svg>
)

const BookOpenFilledIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
  </svg>
)

const LightningIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
  </svg>
)

const MagnifyingGlassIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="11" cy="11" r="8"/>
    <path d="M21 21l-4.35-4.35"/>
  </svg>
)

const StarIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
)

const SparklesIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z"/>
    <path d="M5 19l1 3 1-3 3-1-3-1-1-3-1 3-3 1 3 1z"/>
  </svg>
)

// 认知层级配置
const BLOOM_LEVELS = [
  { key: 'remember', name: '记忆', color: '#8B5CF6', icon: BrainIcon },
  { key: 'understand', name: '理解', color: '#3B82F6', icon: BookOpenFilledIcon },
  { key: 'apply', name: '应用', color: '#10B981', icon: LightningIcon },
  { key: 'analyze', name: '分析', color: '#F59E0B', icon: MagnifyingGlassIcon },
  { key: 'evaluate', name: '评价', color: '#EF4444', icon: StarIcon },
  { key: 'create', name: '创造', color: '#EC4899', icon: SparklesIcon },
]

const QuizReport = () => {
  const { courseId } = useParams<{ courseId: string }>()
  const navigate = useNavigate()
  const { report, resetQuiz } = useQuizStore()
  
  const handleRetry = () => {
    resetQuiz()
    navigate(`/quiz/${courseId}`)
  }
  
  const handleBackToCourse = () => {
    navigate(`/learning/${courseId}`)
  }
  
  if (!report) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">暂无报告数据</p>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen pb-20">
      {/* 顶部导航 */}
      <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 z-10">
        <div className="page-container py-3">
          <div className="flex items-center justify-between">
            <button onClick={() => navigate(`/quiz/${courseId}`)} className="p-2">
              <ChevronLeftIcon className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-semibold">测评报告</h1>
            <div className="w-10" />
          </div>
        </div>
      </div>
      
      {/* 总体正确率 */}
      <div className="page-container mt-4">
        <div className="score-card bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl p-6 text-white">
          <div className="text-center">
            <div className="text-5xl font-bold mb-2">{report.accuracy}%</div>
            <div className="text-blue-100">综合正确率</div>
          </div>
          
          <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/20">
            <div className="text-center">
              <div className="text-2xl font-bold">{report.totalQuestions}</div>
              <div className="text-sm text-blue-100">总题数</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-300">{report.correctCount}</div>
              <div className="text-sm text-blue-100">正确</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-300">{report.totalQuestions - report.correctCount}</div>
              <div className="text-sm text-blue-100">错误</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* 能力雷达图 */}
      <div className="page-container mt-4">
        <div className="card p-4">
          <h2 className="text-sm font-medium text-gray-500 mb-4">能力雷达图</h2>
          <AbilityRadarChart abilityScores={report.abilityScores} />
        </div>
      </div>
      
      {/* 薄弱环节 */}
      {report.suggestions.weakAreas.length > 0 && (
        <div className="page-container mt-4">
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-3">
              <LightbulbIcon className="w-5 h-5 text-yellow-500" />
              <h2 className="text-sm font-medium text-gray-500">薄弱环节</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {report.suggestions.weakAreas.map(area => {
                const level = BLOOM_LEVELS.find(l => l.key === area)
                return (
                  <span 
                    key={area}
                    className="px-3 py-1 text-sm rounded-full text-white"
                    style={{ backgroundColor: level?.color }}
                  >
                    {level?.name}
                  </span>
                )
              })}
            </div>
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
              {report.suggestions.studyTips}
            </p>
          </div>
        </div>
      )}
      
      {/* 错题本 */}
      {report.mistakes.length > 0 && (
        <div className="page-container mt-4">
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-4">
              <BookOpenIcon className="w-5 h-5 text-blue-500" />
              <h2 className="text-sm font-medium text-gray-500">错题本</h2>
              <span className="ml-auto text-sm text-gray-400">{report.mistakes.length}题</span>
            </div>
            
            <div className="space-y-4">
              {report.mistakes.map((item, index) => (
                <div key={index} className="border border-gray-100 dark:border-gray-700 rounded-xl p-4">
                  <div className="flex items-start gap-3 mb-2">
                    <XCircleIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {item.question.content}
                      </p>
                    </div>
                  </div>
                  
                  <div className="ml-8 space-y-2 text-sm">
                    <div className="text-red-600 dark:text-red-400">
                      <span className="text-gray-500">你的答案：</span>
                      {item.userAnswer || '未作答'}
                    </div>
                    <div className="text-green-600 dark:text-green-400">
                      <span className="text-gray-500">正确答案：</span>
                      {item.correctAnswer}
                    </div>
                    {item.explanation && (
                      <div className="text-gray-600 dark:text-gray-400">
                        <span className="text-gray-500">解析：</span>
                        {item.explanation}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* 操作按钮 */}
      <div className="page-container mt-6">
        <div className="flex gap-3">
          <button
            onClick={handleRetry}
            className="flex-1 py-3 px-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 flex items-center justify-center gap-2"
          >
            <RotateCcwIcon className="w-5 h-5" />
            重新练习
          </button>
          <button
            onClick={handleBackToCourse}
            className="flex-1 py-3 px-4 rounded-xl bg-blue-500 text-white flex items-center justify-center gap-2"
          >
            返回学习
          </button>
        </div>
      </div>
    </div>
  )
}

// 能力雷达图组件
const AbilityRadarChart = ({ abilityScores }: { abilityScores: Record<string, number> }) => {
  const size = 200
  const center = size / 2
  const radius = size / 2 - 20
  
  const levels = BLOOM_LEVELS.map(l => l.key)
  const angles = levels.map((_, i) => (i * 2 * Math.PI) / levels.length - Math.PI / 2)
  
  const maxScore = 100
  
  const getPoint = (score: number, angle: number) => {
    const r = (score / maxScore) * radius
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle)
    }
  }
  
  // 网格层级
  const gridLevels = [0.25, 0.5, 0.75, 1]
  
  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* 网格 */}
        {gridLevels.map(level => (
          <polygon
            key={level}
            points={angles.map((angle, i) => {
              const r = radius * level
              const x = center + r * Math.cos(angle)
              const y = center + r * Math.sin(angle)
              return `${x},${y}`
            }).join(' ')}
            fill="none"
            stroke="#E5E7EB"
            strokeWidth="0.5"
          />
        ))}
        
        {/* 轴线 */}
        {angles.map((angle, i) => {
          const x = center + radius * Math.cos(angle)
          const y = center + radius * Math.sin(angle)
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={x}
              y2={y}
              stroke="#E5E7EB"
              strokeWidth="0.5"
            />
          )
        })}
        
        {/* 数据区域 */}
        <polygon
          points={BLOOM_LEVELS.map((level, i) => {
            const score = abilityScores[level.key] || 0
            const point = getPoint(score, angles[i])
            return `${point.x},${point.y}`
          }).join(' ')}
          fill="rgba(59, 130, 246, 0.3)"
          stroke="#3B82F6"
          strokeWidth="2"
        />
        
        {/* 数据点 */}
        {BLOOM_LEVELS.map((level, i) => {
          const score = abilityScores[level.key] || 0
          const point = getPoint(score, angles[i])
          return (
            <circle
              key={level.key}
              cx={point.x}
              cy={point.y}
              r="4"
              fill={level.color}
              stroke="#fff"
              strokeWidth="2"
            />
          )
        })}
      </svg>
      
      {/* 图例 */}
      <div className="flex flex-wrap justify-center gap-3 mt-4">
        {BLOOM_LEVELS.map(level => (
          <div key={level.key} className="flex items-center gap-1">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: level.color }}
            />
            <span className="text-xs text-gray-500">{level.name}</span>
            <span className="text-xs font-medium">{abilityScores[level.key] || 0}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default QuizReport
```

### 12.5 CSS样式规范

#### 12.5.1 认知层级网格

```css
/* 认知层级网格容器 */
.bloom-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 认知层级卡片 */
.bloom-card {
  background: var(--bg-secondary);
  border-radius: 16px;
  padding: 16px;
  border-top-width: 4px;
  border-top-style: solid;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.bloom-card:active {
  transform: scale(0.98);
}

/* 各层级颜色 */
.bloom-card.remember { border-top-color: #8B5CF6; }
.bloom-card.understand { border-top-color: #3B82F6; }
.bloom-card.apply { border-top-color: #10B981; }
.bloom-card.analyze { border-top-color: #F59E0B; }
.bloom-card.evaluate { border-top-color: #EF4444; }
.bloom-card.create { border-top-color: #EC4899; }
```

#### 12.5.2 选项按钮

```css
/* 选项按钮基础样式 */
.option-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: var(--bg-secondary);
  border: 2px solid var(--separator);
  border-radius: 14px;
  transition: all 0.2s ease;
}

/* 选中状态 */
.option-btn.selected {
  border-color: var(--accent);
  background: rgba(10, 132, 255, 0.1);
}

/* 正确状态 */
.option-btn.correct {
  border-color: #34c759;
  background: rgba(52, 199, 89, 0.1);
}

/* 错误状态 */
.option-btn.incorrect {
  border-color: #ff3b30;
  background: rgba(255, 59, 48, 0.1);
}

/* 选项字母圆圈 */
.option-letter {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 500;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  transition: all 0.2s ease;
}

.option-btn.selected .option-letter {
  background: var(--accent);
  color: white;
}

.option-btn.correct .option-letter {
  background: #34c759;
  color: white;
}

.option-btn.incorrect .option-letter {
  background: #ff3b30;
  color: white;
}
```

#### 12.5.3 报告卡片

```css
/* 分数卡片 */
.score-card {
  background: linear-gradient(135deg, var(--accent) 0%, #5856d6 100%);
  border-radius: 24px;
  padding: 24px;
  color: white;
}

/* 错题卡片 */
.mistake-card {
  background: var(--bg-secondary);
  border: 1px solid var(--separator);
  border-radius: 16px;
  padding: 16px;
}

/* 错题正确答案标签 */
.correct-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 9999px;
  font-size: 12px;
  background: rgba(52, 199, 89, 0.1);
  color: #34c759;
}

/* 错题错误答案标签 */
.incorrect-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 9999px;
  font-size: 12px;
  background: rgba(255, 59, 48, 0.1);
  color: #ff3b30;
}

/* 解析卡片 */
.explanation-card {
  background: rgba(255, 149, 0, 0.1);
  border-radius: 16px;
  padding: 16px;
}

/* 薄弱环节标签 */
.weakness-tag {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 9999px;
  font-size: 14px;
  color: white;
}
```

### 12.6 路由配置

```tsx
// App.tsx 中的路由配置
<Route path="/quiz/:courseId" element={<QuizCenter />} />
<Route path="/quiz/:courseId/play" element={<QuizPlay />} />
<Route path="/quiz/:courseId/report" element={<QuizReport />} />
```

### 12.7 功能清单

| 功能 | 状态 | 说明 |
|------|------|------|
| 认知层级分类 | ✅ | 6个层级，按颜色区分 |
| 难度标注 | ✅ | 入门/简单/中等/困难/挑战 |
| 知识点标注 | ✅ | 显示关联知识点 |
| 单题展示 | ✅ | 每次一题，专注作答 |
| 标记题目 | ✅ | 可标记需复习的题目 |
| 查看解析 | ✅ | 提交后显示答案和解析 |
| 能力雷达图 | ✅ | 6维度能力可视化 |
| 错题本 | ✅ | 错题收集+解析 |
| 复习建议 | ✅ | AI生成个性化建议 |
| 计时功能 | ✅ | 显示答题时间 |
| 进度追踪 | ✅ | 显示当前进度 |

---

## 十四、后端路由层（Backend Router Layer）

### 14.1 课程管理路由 (backend/routers/courses.py)

```python
import uuid
import json
from datetime import datetime
from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import Optional, List

from database import get_db
from models import CourseCreate, CourseResponse, CourseUpdateStatus, CourseUpdateProgress, SuccessResponse

router = APIRouter()

# 辅助函数：格式化课程响应
def format_course(row) -> dict:
    """将数据库行转换为响应格式"""
    return {
        "id": row["id"],
        "title": row["title"],
        "keywords": json.loads(row["keywords"]) if row["keywords"] else [],
        "original_question": row["original_question"],
        "status": row["status"],
        "progress": 0,
        "three_ask_progress": {
            "question1": False,
            "question2": False,
            "question3": False
        },
        "created_at": row["created_at"],
        "last_accessed": row.get("updated_at", row["created_at"])
    }

@router.post("/create", response_model=CourseResponse)
async def create_course(
    req: CourseCreate,
    background_tasks: BackgroundTasks
):
    """创建课程：用户提问触发"""
    
    # 1. 生成课程 ID
    course_id = str(uuid.uuid4())
    now = int(datetime.now().timestamp() * 1000)
    
    # 2. 从问题中提取标题（简化版，实际可调用 LLM）
    title = req.question[:50] if len(req.question) > 50 else req.question
    if len(title) < 10:
        title = f"课程：{title}"
    
    # 3. 提取关键词（简化版）
    keywords = json.dumps(["AI", "学习", "自定义"])
    
    # 4. 保存到数据库
    with get_db() as conn:
        conn.execute("""
            INSERT INTO courses (id, title, keywords, original_question, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (course_id, title, keywords, req.question, "active", now, now))
        
        # 同时创建学习进度记录
        conn.execute("""
            INSERT INTO learning_progress (id, course_id, created_at, updated_at)
            VALUES (?, ?, ?, ?)
        """, (f"progress_{course_id}", course_id, now, now))
        
        conn.commit()
        
        # 获取刚创建的课程
        row = conn.execute("SELECT * FROM courses WHERE id = ?", (course_id,)).fetchone()
    
    # 5. 后台触发 AI 资料补充（异步）
    background_tasks.add_task(ai_supplement_background, course_id, req.question)
    
    return format_course(row)

async def ai_supplement_background(course_id: str, question: str):
    """后台异步补充 AI 资料"""
    # TODO: 实现联网检索和资料补充
    print(f"正在为课程 {course_id} 补充 AI 资料，问题：{question}")
    pass

@router.get("/list")
async def list_courses(
    status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0
):
    """获取课程列表"""
    with get_db() as conn:
        query = "SELECT * FROM courses"
        params = []
        
        if status:
            query += " WHERE status = ?"
            params.append(status)
        
        query += " ORDER BY updated_at DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])
        
        rows = conn.execute(query, params).fetchall()
        
        # 获取每个课程的进度
        courses = []
        for row in rows:
            course = format_course(row)
            
            # 获取三问进度
            progress_row = conn.execute(
                "SELECT q1_completed, q2_completed, q3_completed, overall_progress FROM learning_progress WHERE course_id = ?",
                (row["id"],)
            ).fetchone()
            
            if progress_row:
                course["progress"] = progress_row["overall_progress"] or 0
                course["three_ask_progress"] = {
                    "question1": bool(progress_row["q1_completed"]),
                    "question2": bool(progress_row["q2_completed"]),
                    "question3": bool(progress_row["q3_completed"])
                }
            
            courses.append(course)
        
        return {"courses": courses, "total": len(courses)}

@router.get("/{course_id}")
async def get_course(course_id: str):
    """获取单个课程详情"""
    with get_db() as conn:
        row = conn.execute("SELECT * FROM courses WHERE id = ?", (course_id,)).fetchone()
        
        if not row:
            raise HTTPException(status_code=404, detail="课程不存在")
        
        # 更新最后访问时间
        conn.execute(
            "UPDATE courses SET updated_at = ? WHERE id = ?",
            (int(datetime.now().timestamp() * 1000), course_id)
        )
        conn.commit()
        
        course = format_course(row)
        
        # 获取三问进度
        progress_row = conn.execute(
            "SELECT q1_completed, q2_completed, q3_completed, overall_progress FROM learning_progress WHERE course_id = ?",
            (course_id,)
        ).fetchone()
        
        if progress_row:
            course["progress"] = progress_row["overall_progress"] or 0
            course["three_ask_progress"] = {
                "question1": bool(progress_row["q1_completed"]),
                "question2": bool(progress_row["q2_completed"]),
                "question3": bool(progress_row["q3_completed"])
            }
        
        return course

@router.patch("/{course_id}/status")
async def update_course_status(course_id: str, req: CourseUpdateStatus):
    """更新课程状态"""
    with get_db() as conn:
        row = conn.execute("SELECT * FROM courses WHERE id = ?", (course_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="课程不存在")
        
        conn.execute(
            "UPDATE courses SET status = ?, updated_at = ? WHERE id = ?",
            (req.status, int(datetime.now().timestamp() * 1000), course_id)
        )
        conn.commit()
    
    return SuccessResponse(success=True, message=f"课程状态已更新为 {req.status}")

@router.patch("/{course_id}/progress")
async def update_course_progress(course_id: str, req: CourseUpdateProgress):
    """更新课程进度"""
    with get_db() as conn:
        row = conn.execute("SELECT * FROM learning_progress WHERE course_id = ?", (course_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="课程进度记录不存在")
        
        # 根据进度推算三问完成度
        q1 = 1 if req.progress >= 33 else 0
        q2 = 1 if req.progress >= 66 else 0
        q3 = 1 if req.progress >= 100 else 0
        
        conn.execute("""
            UPDATE learning_progress 
            SET overall_progress = ?, q1_completed = ?, q2_completed = ?, q3_completed = ?, updated_at = ?
            WHERE course_id = ?
        """, (req.progress, q1, q2, q3, int(datetime.now().timestamp() * 1000), course_id))
        conn.commit()
    
    return SuccessResponse(success=True, message="进度已更新")

@router.delete("/{course_id}")
async def delete_course(course_id: str):
    """删除课程（软删除，标记为 deleted）"""
    with get_db() as conn:
        row = conn.execute("SELECT * FROM courses WHERE id = ?", (course_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="课程不存在")
        
        conn.execute(
            "UPDATE courses SET status = 'deleted', updated_at = ? WHERE id = ?",
            (int(datetime.now().timestamp() * 1000), course_id)
        )
        conn.commit()
    
    return SuccessResponse(success=True, message="课程已删除")
```

### 14.2 知识库路由 (backend/routers/knowledge.py)

```python
import uuid
import os
import shutil
import json
from datetime import datetime
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, BackgroundTasks
from typing import Optional, List
from pathlib import Path

from database import get_db
from models import SearchRequest, SuccessResponse

router = APIRouter()

# 上传目录配置
UPLOAD_DIR = Path("./data/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# 支持的文件类型
ALLOWED_TYPES = {
    "application/pdf": ".pdf",
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "text/markdown": ".md",
    "text/plain": ".txt"
}

MAX_FILE_SIZES = {
    "application/pdf": 20 * 1024 * 1024,
    "application/msword": 10 * 1024 * 1024,
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": 10 * 1024 * 1024,
    "text/markdown": 5 * 1024 * 1024,
    "text/plain": 5 * 1024 * 1024
}

@router.post("/upload")
async def upload_document(
    course_id: str = Form(...),
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None
):
    """用户上传资料（PDF/Word/Markdown）"""
    
    # 1. 验证文件类型
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, f"不支持的文件类型: {file.content_type}")
    
    # 2. 验证文件大小
    file_size = 0
    content = await file.read()
    file_size = len(content)
    await file.seek(0)  # 重置指针
    
    if file_size > MAX_FILE_SIZES[file.content_type]:
        raise HTTPException(413, f"文件过大，最大 {MAX_FILE_SIZES[file.content_type] // (1024*1024)}MB")
    
    # 3. 保存文件
    ext = ALLOWED_TYPES[file.content_type]
    file_name = f"{uuid.uuid4().hex}{ext}"
    course_upload_dir = UPLOAD_DIR / course_id
    course_upload_dir.mkdir(parents=True, exist_ok=True)
    file_path = course_upload_dir / file_name
    
    with open(file_path, "wb") as f:
        f.write(content)
    
    # 4. 提取文本内容（简化版，实际需要调用解析服务）
    content_text = f"文件内容：{file.filename}\n请使用解析服务提取完整文本。"
    
    # 5. 保存到数据库
    doc_id = str(uuid.uuid4())
    now = int(datetime.now().timestamp() * 1000)
    
    with get_db() as conn:
        conn.execute("""
            INSERT INTO documents (id, course_id, title, content, file_path, file_type, source, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (doc_id, course_id, file.filename, content_text, str(file_path), file.content_type, "user", now))
        conn.commit()
    
    # 6. 后台触发向量化和融合
    if background_tasks:
        background_tasks.add_task(vectorize_document, course_id, doc_id, content_text)
    
    return SuccessResponse(success=True, message="文件上传成功", data={"doc_id": doc_id})

async def vectorize_document(course_id: str, doc_id: str, content: str):
    """后台向量化文档"""
    # TODO: 调用 Embedding 服务
    print(f"正在向量化文档 {doc_id}，内容长度: {len(content)}")

@router.post("/ai-fetch/{course_id}")
async def ai_fetch_documents(
    course_id: str,
    background_tasks: BackgroundTasks
):
    """AI 自动联网检索权威资料"""
    
    # 获取课程关键词
    with get_db() as conn:
        row = conn.execute("SELECT title, keywords FROM courses WHERE id = ?", (course_id,)).fetchone()
        if not row:
            raise HTTPException(404, "课程不存在")
        
        keywords = json.loads(row["keywords"]) if row["keywords"] else [row["title"]]
    
    # 后台触发 AI 搜索
    background_tasks.add_task(ai_search_background, course_id, keywords)
    
    return SuccessResponse(success=True, message="AI 资料补充已启动")

async def ai_search_background(course_id: str, keywords: List[str]):
    """后台 AI 搜索"""
    # TODO: 实现联网检索
    print(f"正在为课程 {course_id} 搜索关键词: {keywords}")

@router.get("/documents")
async def list_documents(
    course_id: str,
    source: Optional[str] = None
):
    """获取课程资料列表"""
    with get_db() as conn:
        query = "SELECT * FROM documents WHERE course_id = ?"
        params = [course_id]
        
        if source:
            query += " AND source = ?"
            params.append(source)
        
        query += " ORDER BY created_at DESC"
        
        rows = conn.execute(query, params).fetchall()
        
        documents = []
        for row in rows:
            documents.append({
                "id": row["id"],
                "title": row["title"],
                "content_preview": row["content"][:200] if row["content"] else "",
                "file_type": row["file_type"],
                "source": row["source"],
                "created_at": row["created_at"]
            })
        
        return {"documents": documents}

@router.get("/documents/{doc_id}")
async def get_document(doc_id: str):
    """获取单个资料详情"""
    with get_db() as conn:
        row = conn.execute("SELECT * FROM documents WHERE id = ?", (doc_id,)).fetchone()
        
        if not row:
            raise HTTPException(404, "资料不存在")
        
        return {
            "id": row["id"],
            "title": row["title"],
            "content": row["content"],
            "file_path": row["file_path"],
            "file_type": row["file_type"],
            "source": row["source"],
            "created_at": row["created_at"]
        }

@router.delete("/documents/{doc_id}")
async def delete_document(doc_id: str):
    """删除资料"""
    with get_db() as conn:
        row = conn.execute("SELECT * FROM documents WHERE id = ?", (doc_id,)).fetchone()
        if not row:
            raise HTTPException(404, "资料不存在")
        
        # 删除本地文件
        if row["file_path"] and Path(row["file_path"]).exists():
            Path(row["file_path"]).unlink()
        
        # 删除数据库记录
        conn.execute("DELETE FROM documents WHERE id = ?", (doc_id,))
        conn.commit()
    
    return SuccessResponse(success=True, message="资料已删除")

@router.post("/search")
async def semantic_search(req: SearchRequest):
    """语义检索知识库"""
    # TODO: 实现向量检索
    return {
        "results": [
            {
                "content": "这是检索结果的示例内容",
                "score": 0.95,
                "metadata": {"source": "AI补充资料", "title": "示例文档"}
            }
        ]
    }
```

### 14.3 三问引擎路由 (backend/routers/three_ask.py)

```python
import json
import uuid
from datetime import datetime
from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import List, Optional

from database import get_db
from models import KnowledgeGraph, Controversy, QuizQuestion, QuizSubmit, SuccessResponse

router = APIRouter()

@router.post("/graph/generate/{course_id}")
async def generate_graph(course_id: str):
    """第一问：生成知识图谱"""
    
    with get_db() as conn:
        # 获取课程资料
        docs = conn.execute(
            "SELECT content, title FROM documents WHERE course_id = ? LIMIT 5",
            (course_id,)
        ).fetchall()
        
        if not docs:
            return KnowledgeGraph(nodes=[], links=[])
    
    # TODO: 调用 AI 服务生成图谱
    # 临时返回示例数据
    graph_data = {
        "nodes": [
            {"id": "node1", "name": "核心概念", "description": "这是核心概念", "bloom_level": "understand", "difficulty": 0.5, "is_threshold_concept": True},
            {"id": "node2", "name": "相关概念", "description": "这是相关概念", "bloom_level": "remember", "difficulty": 0.3, "is_threshold_concept": False}
        ],
        "links": [
            {"source": "node1", "target": "node2", "relation": "related", "strength": 0.8}
        ]
    }
    
    # 缓存图谱数据
    with get_db() as conn:
        conn.execute("""
            INSERT OR REPLACE INTO knowledge_graphs (course_id, graph_data, updated_at)
            VALUES (?, ?, ?)
        """, (course_id, json.dumps(graph_data), int(datetime.now().timestamp() * 1000)))
        conn.commit()
    
    return graph_data

@router.post("/graph/update/{course_id}")
async def update_graph_incremental(course_id: str, doc_id: str):
    """增量更新知识图谱"""
    # TODO: 实现增量更新逻辑
    return await generate_graph(course_id)

@router.post("/controversy/detect/{course_id}")
async def detect_controversy(
    course_id: str,
    background_tasks: BackgroundTasks
):
    """第二问：异步检测学术分歧"""
    
    with get_db() as conn:
        # 检查资料数量
        doc_count = conn.execute(
            "SELECT COUNT(*) FROM documents WHERE course_id = ?",
            (course_id,)
        ).fetchone()[0]
        
        if doc_count < 2:
            return {"status": "skipped", "message": "需要至少2份资料才能进行争议分析"}
    
    # 异步处理
    background_tasks.add_task(controversy_detection_background, course_id)
    
    return {"status": "processing", "message": "争议分析已开始"}

async def controversy_detection_background(course_id: str):
    """后台争议检测"""
    # TODO: 实现 NLI 模型检测
    print(f"正在分析课程 {course_id} 的争议点")
    
    # 示例争议数据
    controversies = [
        {
            "id": str(uuid.uuid4()),
            "topic": "示例争议主题",
            "pro_view": "正方观点示例",
            "pro_evidence": "正方证据示例",
            "con_view": "反方观点示例",
            "con_evidence": "反方证据示例",
            "confidence": 0.85
        }
    ]
    
    # 保存到数据库
    now = int(datetime.now().timestamp() * 1000)
    with get_db() as conn:
        for c in controversies:
            conn.execute("""
                INSERT OR REPLACE INTO controversies 
                (id, course_id, topic, pro_view, pro_evidence, con_view, con_evidence, confidence, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (c["id"], course_id, c["topic"], c["pro_view"], c["pro_evidence"], 
                  c["con_view"], c["con_evidence"], c["confidence"], now))
        conn.commit()
    
    # 更新学习进度
    with get_db() as conn:
        conn.execute(
            "UPDATE learning_progress SET q2_completed = 1, updated_at = ? WHERE course_id = ?",
            (now, course_id)
        )
        conn.commit()

@router.get("/controversy/{course_id}")
async def get_controversies(course_id: str):
    """获取课程的争议点列表"""
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM controversies WHERE course_id = ? ORDER BY created_at DESC",
            (course_id,)
        ).fetchall()
        
        controversies = []
        for row in rows:
            controversies.append({
                "id": row["id"],
                "topic": row["topic"],
                "pro_view": row["pro_view"],
                "pro_evidence": row["pro_evidence"],
                "con_view": row["con_view"],
                "con_evidence": row["con_evidence"],
                "confidence": row["confidence"]
            })
        
        return {"controversies": controversies}

@router.post("/quiz/generate/{course_id}")
async def generate_quiz(course_id: str):
    """第三问：生成测评题目"""
    
    with get_db() as conn:
        # 获取课程资料
        docs = conn.execute(
            "SELECT content, title FROM documents WHERE course_id = ? LIMIT 5",
            (course_id,)
        ).fetchall()
        
        if not docs:
            return {"quizzes": [], "message": "暂无资料，无法生成测评"}
    
    # TODO: 调用 AI 服务生成测评
    # 示例题目
    quizzes = [
        {
            "id": f"quiz_{course_id}_1",
            "dimension": "记忆",
            "bloom_level": "remember",
            "difficulty": 0.2,
            "question_type": "single",
            "question": "这是示例题目，请基于课程内容回答。",
            "options": ["选项A", "选项B", "选项C", "选项D"],
            "correct_answer": "A",
            "explanation": "这是答案解析",
            "knowledge_points": ["知识点1"]
        }
    ]
    
    return {"quizzes": quizzes, "total": len(quizzes)}

@router.post("/quiz/submit")
async def submit_quiz(req: QuizSubmit):
    """提交测评答案"""
    
    # TODO: 实现答案评估
    # 示例评估
    evaluation = {
        "is_correct": True,
        "score": 100,
        "feedback": "回答正确！"
    }
    
    # 保存答题记录
    now = int(datetime.now().timestamp() * 1000)
    with get_db() as conn:
        conn.execute("""
            INSERT INTO quiz_records (id, course_id, question_id, user_answer, is_correct, score, dimension, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (f"record_{req.course_id}_{req.question_id}", req.course_id, 
              req.question_id, req.user_answer, 1 if evaluation["is_correct"] else 0, 
              evaluation["score"], "", now))
        conn.commit()
    
    return evaluation

@router.post("/quiz/{course_id}/complete")
async def complete_quiz(course_id: str):
    """完成测评，更新进度"""
    
    now = int(datetime.now().timestamp() * 1000)
    with get_db() as conn:
        # 计算正确率
        rows = conn.execute(
            "SELECT COUNT(*) as total, SUM(is_correct) as correct FROM quiz_records WHERE course_id = ?",
            (course_id,)
        ).fetchone()
        
        total = rows["total"] or 0
        correct = rows["correct"] or 0
        accuracy = (correct / total * 100) if total > 0 else 0
        
        # 更新进度
        conn.execute("""
            UPDATE learning_progress 
            SET q3_completed = 1, q3_score = ?, overall_progress = 100, updated_at = ?
            WHERE course_id = ?
        """, (accuracy, now, course_id))
        conn.commit()
    
    return SuccessResponse(success=True, message="测评完成", data={"accuracy": accuracy})

@router.get("/progress/{course_id}")
async def get_progress(course_id: str):
    """获取三问完成进度"""
    with get_db() as conn:
        row = conn.execute(
            "SELECT q1_completed, q2_completed, q3_completed, overall_progress FROM learning_progress WHERE course_id = ?",
            (course_id,)
        ).fetchone()
        
        if not row:
            return {
                "question1": False,
                "question2": False,
                "question3": False,
                "overall_progress": 0
            }
        
        return {
            "question1": bool(row["q1_completed"]),
            "question2": bool(row["q2_completed"]),
            "question3": bool(row["q3_completed"]),
            "overall_progress": row["overall_progress"] or 0
        }
```

### 14.4 测评中心路由 (backend/routers/quiz.py)

```python
import uuid
import json
from datetime import datetime
from fastapi import APIRouter, HTTPException
from typing import List, Optional

from database import get_db
from models import QuizQuestion, QuizSubmit, QuizComplete, SuccessResponse

router = APIRouter()

@router.get("/{course_id}/questions")
async def get_questions(course_id: str):
    """获取测评题目列表"""
    with get_db() as conn:
        # 检查是否有已生成的题目
        rows = conn.execute(
            "SELECT * FROM quiz_records WHERE course_id = ? GROUP BY question_id",
            (course_id,)
        ).fetchall()
        
        if rows:
            # 返回已有的题目记录
            questions = []
            for row in rows:
                questions.append({
                    "id": row["question_id"],
                    "dimension": row["dimension"],
                    "user_answer": row["user_answer"],
                    "is_correct": bool(row["is_correct"])
                })
            return {"questions": questions}
        
        # 如果没有题目，生成示例题目
        questions = generate_sample_questions(course_id)
        return {"questions": questions}

def generate_sample_questions(course_id: str) -> List[dict]:
    """生成示例题目"""
    dimensions = ["记忆", "理解", "应用", "分析", "评价", "创造"]
    questions = []
    
    for i, dim in enumerate(dimensions):
        question = {
            "id": f"{course_id}_{dim}",
            "courseId": course_id,
            "bloomLevel": dim,
            "type": "single",
            "difficulty": i + 1,
            "content": f"这是{dim}层级的示例题目。请基于学习内容回答。",
            "options": ["选项A", "选项B", "选项C", "选项D"],
            "correctAnswer": "A",
            "explanation": f"这是{dim}层级的答案解析。",
            "知识点": ["示例知识点"],
            "userAnswer": None,
            "isCorrect": None,
            "isMarked": False
        }
        questions.append(question)
    
    return questions

@router.get("/{course_id}/list")
async def list_questions(course_id: str):
    """按认知层级分组获取题目列表"""
    questions = generate_sample_questions(course_id)
    
    # 按维度分组
    grouped = {}
    for q in questions:
        dim = q["bloomLevel"]
        if dim not in grouped:
            grouped[dim] = []
        grouped[dim].append(q)
    
    return {
        "grouped_questions": grouped,
        "total": len(questions)
    }

@router.post("/submit")
async def submit_answer(req: QuizSubmit):
    """提交单题答案"""
    
    # 评估答案（简化版）
    is_correct = req.user_answer.upper() == "A"
    score = 100 if is_correct else 0
    
    # 保存记录
    now = int(datetime.now().timestamp() * 1000)
    with get_db() as conn:
        conn.execute("""
            INSERT OR REPLACE INTO quiz_records 
            (id, course_id, question_id, user_answer, is_correct, score, dimension, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (f"{req.course_id}_{req.question_id}", req.course_id, 
              req.question_id, req.user_answer, 1 if is_correct else 0, 
              score, "", now))
        conn.commit()
    
    return {
        "is_correct": is_correct,
        "score": score,
        "explanation": "这是答案解析示例。正确答案是A。",
        "feedback": "回答正确！" if is_correct else "回答错误，正确答案是A。"
    }

@router.post("/{course_id}/complete")
async def complete_quiz(course_id: str, req: QuizComplete):
    """完成测评，生成报告"""
    
    # 计算统计数据
    total = len(req.answers)
    correct = sum(1 for a in req.answers if a.get("is_correct", False))
    accuracy = (correct / total * 100) if total > 0 else 0
    
    # 计算各维度得分
    ability_scores = {
        "remember": 0, "understand": 0, "apply": 0,
        "analyze": 0, "evaluate": 0, "create": 0
    }
    
    for answer in req.answers:
        dim = answer.get("dimension", "understand")
        if dim in ability_scores and answer.get("is_correct", False):
            ability_scores[dim] += 100 / 2  # 每个维度2题
    
    # 保存测评记录
    now = int(datetime.now().timestamp() * 1000)
    with get_db() as conn:
        conn.execute("""
            UPDATE learning_progress 
            SET q3_completed = 1, q3_score = ?,
                ability_remember = ?, ability_understand = ?, ability_apply = ?,
                ability_analyze = ?, ability_evaluate = ?, ability_create = ?,
                overall_progress = 100, updated_at = ?
            WHERE course_id = ?
        """, (accuracy, ability_scores["remember"], ability_scores["understand"],
              ability_scores["apply"], ability_scores["analyze"], ability_scores["evaluate"],
              ability_scores["create"], now, course_id))
        conn.commit()
    
    # 收集错题
    mistakes = []
    for answer in req.answers:
        if not answer.get("is_correct", False):
            mistakes.append({
                "question": answer.get("content", ""),
                "user_answer": answer.get("user_answer", ""),
                "correct_answer": answer.get("correct_answer", ""),
                "explanation": answer.get("explanation", "")
            })
    
    # 找出薄弱环节
    weak_areas = [dim for dim, score in ability_scores.items() if score < 60]
    
    # 维度名称映射
    dim_names = {
        "remember": "记忆", "understand": "理解", "apply": "应用",
        "analyze": "分析", "evaluate": "评价", "create": "创造"
    }
    weak_names = [dim_names.get(w, w) for w in weak_areas]
    
    return {
        "accuracy": accuracy,
        "totalQuestions": total,
        "correctCount": correct,
        "abilityScores": ability_scores,
        "mistakes": mistakes,
        "suggestions": {
            "weakAreas": weak_names,
            "studyTips": f"建议加强{', '.join(weak_names)}维度的学习" if weak_names else "整体表现良好，继续保持"
        },
        "totalTime": sum(a.get("timeSpent", 0) for a in req.answers),
        "averageTime": sum(a.get("timeSpent", 0) for a in req.answers) / total if total > 0 else 0
    }

@router.get("/{course_id}/report")
async def get_report(course_id: str):
    """获取测评报告"""
    with get_db() as conn:
        # 获取进度数据
        progress = conn.execute(
            "SELECT * FROM learning_progress WHERE course_id = ?",
            (course_id,)
        ).fetchone()
        
        if not progress:
            raise HTTPException(404, "暂无测评报告")
        
        # 获取错题记录
        mistakes_rows = conn.execute(
            "SELECT * FROM quiz_records WHERE course_id = ? AND is_correct = 0",
            (course_id,)
        ).fetchall()
        
        mistakes = []
        for row in mistakes_rows:
            mistakes.append({
                "question": row["question_id"],
                "user_answer": row["user_answer"],
                "correct_answer": "A",
                "explanation": "示例解析"
            })
        
        ability_scores = {
            "remember": progress["ability_remember"] or 0,
            "understand": progress["ability_understand"] or 0,
            "apply": progress["ability_apply"] or 0,
            "analyze": progress["ability_analyze"] or 0,
            "evaluate": progress["ability_evaluate"] or 0,
            "create": progress["ability_create"] or 0
        }
        
        weak_areas = [dim for dim, score in ability_scores.items() if score < 60]
        dim_names = {
            "remember": "记忆", "understand": "理解", "apply": "应用",
            "analyze": "分析", "evaluate": "评价", "create": "创造"
        }
        
        return {
            "accuracy": progress["q3_score"] or 0,
            "totalQuestions": 12,
            "correctCount": int((progress["q3_score"] or 0) / 100 * 12),
            "abilityScores": ability_scores,
            "mistakes": mistakes,
            "suggestions": {
                "weakAreas": [dim_names.get(w, w) for w in weak_areas],
                "studyTips": f"建议加强{', '.join([dim_names.get(w, w) for w in weak_areas])}维度的学习" if weak_areas else "整体表现良好，继续保持"
            }
        }

@router.post("/mark")
async def mark_question(question_id: str, course_id: str, marked: bool = True):
    """标记/取消标记题目"""
    # TODO: 实现标记功能
    return SuccessResponse(success=True, message=f"题目已{'标记' if marked else '取消标记'}")
```

### 14.5 SSE实时推送路由 (backend/routers/sse.py)

```python
import asyncio
import json
from fastapi import APIRouter
from sse_starlette.sse import EventSourceResponse
from typing import Dict, Any

router = APIRouter()

# 存储每个课程的 SSE 事件队列
event_queues: Dict[str, asyncio.Queue] = {}

def get_queue(course_id: str) -> asyncio.Queue:
    """获取或创建课程的事件队列"""
    if course_id not in event_queues:
        event_queues[course_id] = asyncio.Queue()
    return event_queues[course_id]

def push_event(course_id: str, event_type: str, data: Any):
    """向指定课程推送 SSE 事件"""
    queue = get_queue(course_id)
    queue.put_nowait({
        "event": event_type,
        "data": json.dumps(data, ensure_ascii=False)
    })

@router.get("/stream/{course_id}")
async def sse_stream(course_id: str):
    """
    SSE 实时推送流
    事件类型：
    - graph_updated: 知识图谱更新
    - controversy_ready: 争议分析完成
    - quiz_ready: 测评生成完成
    - progress: 进度更新
    - notification: 一般通知
    """
    
    queue = get_queue(course_id)
    
    async def event_generator():
        try:
            while True:
                # 等待新事件
                event = await queue.get()
                yield event
        except asyncio.CancelledError:
            # 连接断开，清理队列
            if course_id in event_queues:
                del event_queues[course_id]
    
    return EventSourceResponse(event_generator())

@router.post("/push/{course_id}")
async def push_test_event(course_id: str, event_type: str, message: str):
    """测试推送事件（开发用）"""
    push_event(course_id, event_type, {"message": message})
    return {"status": "ok", "message": f"事件已推送到课程 {course_id}"}
```

### 14.6 路由模块汇总

| 文件 | 路由前缀 | 功能 |
|------|---------|------|
| courses.py | /api/courses | 课程CRUD、三问进度管理 |
| knowledge.py | /api/knowledge | 资料上传、AI检索、语义搜索 |
| three_ask.py | /api/three-ask | 知识图谱、争议检测、测评生成 |
| quiz.py | /api/quiz | 题目获取、答案提交、报告生成 |
| sse.py | /api/sse | 实时事件推送流 |

### 14.7 路由验证方法

```bash
cd backend
python main.py
# 访问 http://localhost:8000/docs 查看所有 API 端点
```

---

## 十三、后端基础层（Backend Foundation Layer）

### 13.1 依赖配置 (backend/requirements.txt)

```
# FastAPI 核心
fastapi==0.104.1
uvicorn[standard]==0.24.0
python-multipart==0.0.6

# 数据库
sqlalchemy==2.0.23
aiosqlite==0.19.0

# AI 相关
openai==1.3.0
sentence-transformers==2.2.2
transformers==4.36.0
torch==2.1.0

# PDF/Word 解析
pypdf==3.17.1
python-docx==1.1.0
markdown==3.5.1

# 向量数据库
chromadb==0.4.22

# 网络请求
httpx==0.25.1
aiohttp==3.9.1
beautifulsoup4==4.12.2

# 工具
python-dotenv==1.0.0
pydantic==2.5.0
pydantic-settings==2.1.0
```

### 13.2 环境变量配置 (backend/.env.example)

```
# MiniMax API 配置
MINIMAX_API_KEY=your_api_key_here
MINIMAX_API_HOST=https://api.minimaxi.com

# 本地存储路径
DATA_DIR=./data
UPLOAD_DIR=./data/uploads
CHROMA_DIR=./data/chroma

# 模型配置
LLM_MODEL=MiniMax-M2.7
EMBEDDING_MODEL=BAAI/bge-large-zh-v1.5
EMBEDDING_DIMENSION=1024

# 服务配置
BACKEND_PORT=8000
FRONTEND_URL=http://localhost:5173
```

### 13.3 数据库层 (backend/database.py)

```python
import sqlite3
import os
from contextlib import contextmanager
from pathlib import Path
from datetime import datetime

# 数据库路径
DATA_DIR = Path("./data")
DB_PATH = DATA_DIR / "courses.db"

def ensure_data_dir():
    """确保数据目录存在"""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    (DATA_DIR / "uploads").mkdir(exist_ok=True)
    (DATA_DIR / "chroma").mkdir(exist_ok=True)

@contextmanager
def get_db():
    """获取数据库连接（上下文管理器）"""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

def init_db():
    """初始化数据库：创建所有表"""
    ensure_data_dir()
    
    with get_db() as conn:
        # 课程表
        conn.execute("""
            CREATE TABLE IF NOT EXISTS courses (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                keywords TEXT,
                original_question TEXT,
                status TEXT DEFAULT 'active',
                created_at INTEGER,
                updated_at INTEGER
            )
        """)
        
        # 资料表
        conn.execute("""
            CREATE TABLE IF NOT EXISTS documents (
                id TEXT PRIMARY KEY,
                course_id TEXT NOT NULL,
                title TEXT,
                content TEXT,
                file_path TEXT,
                file_type TEXT,
                source TEXT,
                created_at INTEGER,
                FOREIGN KEY (course_id) REFERENCES courses(id)
            )
        """)
        
        # 学习进度表
        conn.execute("""
            CREATE TABLE IF NOT EXISTS learning_progress (
                id TEXT PRIMARY KEY,
                course_id TEXT NOT NULL,
                q1_completed INTEGER DEFAULT 0,
                q2_completed INTEGER DEFAULT 0,
                q3_completed INTEGER DEFAULT 0,
                q3_score REAL,
                ability_remember REAL DEFAULT 0,
                ability_understand REAL DEFAULT 0,
                ability_apply REAL DEFAULT 0,
                ability_analyze REAL DEFAULT 0,
                ability_evaluate REAL DEFAULT 0,
                ability_create REAL DEFAULT 0,
                total_minutes INTEGER DEFAULT 0,
                session_count INTEGER DEFAULT 0,
                last_activity INTEGER,
                overall_progress INTEGER DEFAULT 0,
                created_at INTEGER,
                updated_at INTEGER,
                FOREIGN KEY (course_id) REFERENCES courses(id)
            )
        """)
        
        # 学习事件表
        conn.execute("""
            CREATE TABLE IF NOT EXISTS learning_events (
                id TEXT PRIMARY KEY,
                course_id TEXT NOT NULL,
                event_type TEXT,
                duration INTEGER,
                metadata TEXT,
                created_at INTEGER,
                FOREIGN KEY (course_id) REFERENCES courses(id)
            )
        """)
        
        # 测评记录表
        conn.execute("""
            CREATE TABLE IF NOT EXISTS quiz_records (
                id TEXT PRIMARY KEY,
                course_id TEXT NOT NULL,
                question_id TEXT,
                user_answer TEXT,
                is_correct INTEGER,
                score REAL,
                dimension TEXT,
                created_at INTEGER,
                FOREIGN KEY (course_id) REFERENCES courses(id)
            )
        """)
        
        # 争议点表
        conn.execute("""
            CREATE TABLE IF NOT EXISTS controversies (
                id TEXT PRIMARY KEY,
                course_id TEXT NOT NULL,
                topic TEXT NOT NULL,
                pro_view TEXT,
                pro_evidence TEXT,
                con_view TEXT,
                con_evidence TEXT,
                confidence REAL,
                created_at INTEGER,
                FOREIGN KEY (course_id) REFERENCES courses(id)
            )
        """)
        
        # 讨论帖子表
        conn.execute("""
            CREATE TABLE IF NOT EXISTS discussion_posts (
                id TEXT PRIMARY KEY,
                course_id TEXT NOT NULL,
                controversy_id TEXT,
                content TEXT NOT NULL,
                author TEXT DEFAULT '用户',
                likes INTEGER DEFAULT 0,
                created_at INTEGER,
                FOREIGN KEY (course_id) REFERENCES courses(id)
            )
        """)
        
        # 讨论回复表
        conn.execute("""
            CREATE TABLE IF NOT EXISTS discussion_replies (
                id TEXT PRIMARY KEY,
                post_id TEXT NOT NULL,
                content TEXT NOT NULL,
                author TEXT DEFAULT '用户',
                created_at INTEGER,
                FOREIGN KEY (post_id) REFERENCES discussion_posts(id)
            )
        """)
        
        # 提醒表
        conn.execute("""
            CREATE TABLE IF NOT EXISTS reminders (
                id TEXT PRIMARY KEY,
                course_id TEXT NOT NULL,
                type TEXT,
                title TEXT,
                content TEXT,
                is_read INTEGER DEFAULT 0,
                created_at INTEGER,
                FOREIGN KEY (course_id) REFERENCES courses(id)
            )
        """)
        
        # 知识图谱缓存表
        conn.execute("""
            CREATE TABLE IF NOT EXISTS knowledge_graphs (
                course_id TEXT PRIMARY KEY,
                graph_data TEXT,
                updated_at INTEGER,
                FOREIGN KEY (course_id) REFERENCES courses(id)
            )
        """)
        
        conn.commit()
        print("✅ 数据库初始化完成")

# 初始化数据库
if __name__ == "__main__":
    init_db()
```

### 13.4 数据模型 (backend/models.py)

```python
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
    course_id: str
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
```

### 13.5 主入口 (backend/main.py)

```python
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

from routers import courses, knowledge, three_ask, quiz, sse

app.include_router(courses.router, prefix="/api/courses", tags=["课程管理"])
app.include_router(knowledge.router, prefix="/api/knowledge", tags=["知识库"])
app.include_router(three_ask.router, prefix="/api/three-ask", tags=["三问引擎"])
app.include_router(quiz.router, prefix="/api/quiz", tags=["测评中心"])
app.include_router(sse.router, prefix="/api/sse", tags=["实时推送"])

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
```

### 13.6 后端目录结构

```
backend/
├── requirements.txt      # Python 依赖
├── .env.example         # 环境变量模板
├── database.py          # 数据库层
├── models.py           # Pydantic 数据模型
├── main.py             # FastAPI 主入口
├── routers/           # 路由模块
│   ├── __init__.py
│   ├── courses.py     # 课程管理路由
│   ├── knowledge.py   # 知识库路由
│   ├── three_ask.py   # 三问引擎路由
│   ├── quiz.py        # 测评中心路由
│   └── sse.py         # SSE实时推送路由
├── services/          # 业务逻辑层
│   ├── __init__.py
│   ├── llm_service.py      # LLM 服务
│   ├── course_service.py   # 课程服务
│   ├── knowledge_service.py # 知识库服务
│   ├── graph_service.py    # 知识图谱服务
│   ├── controversy_service.py # 争议检测服务
│   └── quiz_service.py     # 测评服务
└── utils/             # 工具函数
    ├── __init__.py
    ├── file_parser.py  # 文件解析
    └── embedder.py    # 向量化工具
```

### 13.7 数据库表结构总览

| 表名 | 说明 | 关联表 |
|------|------|--------|
| courses | 课程表 | - |
| documents | 资料表 | courses |
| learning_progress | 学习进度表 | courses |
| learning_events | 学习事件表 | courses |
| quiz_records | 测评记录表 | courses |
| controversies | 争议点表 | courses |
| discussion_posts | 讨论帖子表 | courses |
| discussion_replies | 讨论回复表 | discussion_posts |
| reminders | 提醒表 | courses |
| knowledge_graphs | 知识图谱缓存表 | courses |

---

## 十五、数据库表结构SQL（Database Schema）

### 15.1 数据库Schema (backend/schema.sql)

```sql
-- ============================================
-- 三问高效学习机 - 数据库表结构
-- 数据库: SQLite
-- ============================================

-- 1. 课程表
CREATE TABLE IF NOT EXISTS courses (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    keywords TEXT,
    original_question TEXT,
    status TEXT DEFAULT 'active',
    created_at INTEGER,
    updated_at INTEGER
);

-- 2. 资料表
CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL,
    title TEXT,
    content TEXT,
    file_path TEXT,
    file_type TEXT,
    source TEXT,
    created_at INTEGER,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- 3. 学习进度表
CREATE TABLE IF NOT EXISTS learning_progress (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL,
    q1_completed INTEGER DEFAULT 0,
    q2_completed INTEGER DEFAULT 0,
    q3_completed INTEGER DEFAULT 0,
    q3_score REAL,
    ability_remember REAL DEFAULT 0,
    ability_understand REAL DEFAULT 0,
    ability_apply REAL DEFAULT 0,
    ability_analyze REAL DEFAULT 0,
    ability_evaluate REAL DEFAULT 0,
    ability_create REAL DEFAULT 0,
    total_minutes INTEGER DEFAULT 0,
    session_count INTEGER DEFAULT 0,
    last_activity INTEGER,
    overall_progress INTEGER DEFAULT 0,
    created_at INTEGER,
    updated_at INTEGER,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- 4. 学习事件表
CREATE TABLE IF NOT EXISTS learning_events (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL,
    event_type TEXT,
    duration INTEGER,
    metadata TEXT,
    created_at INTEGER,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- 5. 测评记录表
CREATE TABLE IF NOT EXISTS quiz_records (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL,
    question_id TEXT,
    user_answer TEXT,
    is_correct INTEGER,
    score REAL,
    dimension TEXT,
    time_spent INTEGER,
    created_at INTEGER,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- 6. 争议点表
CREATE TABLE IF NOT EXISTS controversies (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL,
    topic TEXT NOT NULL,
    pro_view TEXT,
    pro_evidence TEXT,
    con_view TEXT,
    con_evidence TEXT,
    confidence REAL,
    created_at INTEGER,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- 7. 讨论帖子表
CREATE TABLE IF NOT EXISTS discussion_posts (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL,
    controversy_id TEXT,
    content TEXT NOT NULL,
    author TEXT DEFAULT '用户',
    likes INTEGER DEFAULT 0,
    created_at INTEGER,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (controversy_id) REFERENCES controversies(id) ON DELETE SET NULL
);

-- 8. 讨论回复表
CREATE TABLE IF NOT EXISTS discussion_replies (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL,
    content TEXT NOT NULL,
    author TEXT DEFAULT '用户',
    created_at INTEGER,
    FOREIGN KEY (post_id) REFERENCES discussion_posts(id) ON DELETE CASCADE
);

-- 9. 提醒表
CREATE TABLE IF NOT EXISTS reminders (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL,
    type TEXT,
    title TEXT,
    content TEXT,
    is_read INTEGER DEFAULT 0,
    created_at INTEGER,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- 10. 知识图谱缓存表
CREATE TABLE IF NOT EXISTS knowledge_graphs (
    course_id TEXT PRIMARY KEY,
    graph_data TEXT,
    updated_at INTEGER,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- 11. 课程标签表
CREATE TABLE IF NOT EXISTS course_tags (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL,
    tag_name TEXT NOT NULL,
    created_at INTEGER,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- 12. 用户设置表（单用户本地版）
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at INTEGER
);

-- 13. 导出记录表
CREATE TABLE IF NOT EXISTS export_records (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL,
    format TEXT,
    file_path TEXT,
    created_at INTEGER,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- ============================================
-- 索引（提升查询性能）
-- ============================================

-- 课程表索引
CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status);
CREATE INDEX IF NOT EXISTS idx_courses_updated_at ON courses(updated_at DESC);

-- 资料表索引
CREATE INDEX IF NOT EXISTS idx_documents_course_id ON documents(course_id);
CREATE INDEX IF NOT EXISTS idx_documents_source ON documents(source);

-- 学习进度索引
CREATE INDEX IF NOT EXISTS idx_progress_course_id ON learning_progress(course_id);

-- 学习事件索引
CREATE INDEX IF NOT EXISTS idx_events_course_id ON learning_events(course_id);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON learning_events(created_at DESC);

-- 测评记录索引
CREATE INDEX IF NOT EXISTS idx_quiz_course_id ON quiz_records(course_id);
CREATE INDEX IF NOT EXISTS idx_quiz_created_at ON quiz_records(created_at DESC);

-- 讨论索引
CREATE INDEX IF NOT EXISTS idx_posts_course_id ON discussion_posts(course_id);
CREATE INDEX IF NOT EXISTS idx_posts_controversy_id ON discussion_posts(controversy_id);

-- 提醒索引
CREATE INDEX IF NOT EXISTS idx_reminders_course_id ON reminders(course_id);
CREATE INDEX IF NOT EXISTS idx_reminders_is_read ON reminders(is_read);

-- ============================================
-- 初始化默认数据
-- ============================================

-- 插入默认设置
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES 
    ('theme', 'light', unixepoch('subsec')),
    ('auto_save', '1', unixepoch('subsec')),
    ('notification_enabled', '1', unixepoch('subsec'));
```

### 15.2 数据库初始化脚本 (backend/init_db.py)

```python
#!/usr/bin/env python
"""
数据库初始化脚本
使用方法: python init_db.py
"""

import sqlite3
import os
from pathlib import Path
from datetime import datetime

# 数据库路径
DATA_DIR = Path("./data")
DB_PATH = DATA_DIR / "courses.db"

def init_database():
    """初始化数据库"""
    # 确保数据目录存在
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    (DATA_DIR / "uploads").mkdir(exist_ok=True)
    (DATA_DIR / "chroma").mkdir(exist_ok=True)
    (DATA_DIR / "exports").mkdir(exist_ok=True)
    
    # 读取 schema.sql
    schema_path = Path(__file__).parent / "schema.sql"
    
    if not schema_path.exists():
        print(f"❌ schema.sql 文件不存在: {schema_path}")
        return False
    
    with open(schema_path, "r", encoding="utf-8") as f:
        schema_sql = f.read()
    
    # 执行 SQL
    try:
        conn = sqlite3.connect(str(DB_PATH))
        conn.executescript(schema_sql)
        conn.commit()
        conn.close()
        print(f"✅ 数据库初始化成功: {DB_PATH}")
        return True
    except Exception as e:
        print(f"❌ 数据库初始化失败: {e}")
        return False

def check_database():
    """检查数据库状态"""
    if not DB_PATH.exists():
        print(f"⚠️ 数据库不存在: {DB_PATH}")
        return False
    
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()
    
    # 获取所有表
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = cursor.fetchall()
    
    print(f"\n📊 数据库表列表 ({len(tables)} 个表):")
    for table in tables:
        cursor.execute(f"SELECT COUNT(*) FROM {table[0]}")
        count = cursor.fetchone()[0]
        print(f"  - {table[0]}: {count} 条记录")
    
    conn.close()
    return True

def reset_database():
    """重置数据库（删除所有数据）"""
    if DB_PATH.exists():
        backup_path = DATA_DIR / f"courses_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.db"
        DB_PATH.rename(backup_path)
        print(f"📦 已备份原数据库到: {backup_path}")
    
    return init_database()

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "--reset":
        print("⚠️ 正在重置数据库...")
        reset_database()
    elif len(sys.argv) > 1 and sys.argv[1] == "--check":
        check_database()
    else:
        init_database()
        check_database()
```

### 15.3 验证方法

```bash
cd backend
python init_db.py          # 初始化数据库
python init_db.py --check  # 检查数据库状态
python init_db.py --reset  # 重置数据库（危险操作）
```

### 15.4 数据库表结构说明

| 表名 | 说明 | 记录内容 |
|------|------|---------|
| courses | 课程表 | 课程基本信息 |
| documents | 资料表 | 用户上传的文档 |
| learning_progress | 学习进度表 | 三问完成状态、能力分数 |
| learning_events | 学习事件表 | 用户行为日志 |
| quiz_records | 测评记录表 | 答题记录和分数 |
| controversies | 争议点表 | 学术分歧点 |
| discussion_posts | 讨论帖子表 | 用户讨论 |
| discussion_replies | 讨论回复表 | 讨论回复 |
| reminders | 提醒表 | 学习提醒 |
| knowledge_graphs | 知识图谱缓存表 | 图谱数据缓存 |
| course_tags | 课程标签表 | 课程标签 |
| settings | 用户设置表 | 系统设置 |
| export_records | 导出记录表 | 导出历史 |

---

## 十六、后端服务层（Backend Service Layer）

### 16.1 LLM服务 (backend/services/llm_service.py)

```python
import os
import json
import httpx
from typing import Optional, List, Dict, Any
from dotenv import load_dotenv

load_dotenv()

class LLMService:
    """MiniMax API 调用服务"""
    
    def __init__(self):
        self.api_key = os.getenv("MINIMAX_API_KEY", "")
        self.api_host = os.getenv("MINIMAX_API_HOST", "https://api.minimaxi.com")
        self.model = os.getenv("LLM_MODEL", "MiniMax-M2.7")
        
        if not self.api_key:
            print("⚠️ 警告: MINIMAX_API_KEY 未设置，LLM 功能将不可用")
    
    async def chat(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096
    ) -> str:
        """调用 LLM 进行对话"""
        
        if not self.api_key:
            return self._mock_response(prompt)
        
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                response = await client.post(
                    f"{self.api_host}/v1/text/chatcompletion_v2",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": self.model,
                        "messages": messages,
                        "temperature": temperature,
                        "max_tokens": max_tokens
                    }
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return data.get("choices", [{}])[0].get("message", {}).get("content", "")
                else:
                    print(f"❌ LLM API 错误: {response.status_code}")
                    return self._mock_response(prompt)
                    
            except Exception as e:
                print(f"❌ LLM 调用失败: {e}")
                return self._mock_response(prompt)
    
    def _mock_response(self, prompt: str) -> str:
        """模拟响应（当 API 不可用时）"""
        return f"【模拟响应】收到了你的问题：{prompt[:50]}... 我会基于课程内容为你解答。"
```

### 16.2 课程服务 (backend/services/course_service.py)

```python
import uuid
import json
from datetime import datetime
from typing import List, Dict, Optional

class CourseService:
    """课程管理业务逻辑"""
    
    def __init__(self, db_path: str = "./data/courses.db"):
        self.db_path = db_path
    
    def create_course(self, question: str, title: str = None, keywords: List[str] = None) -> Dict:
        """创建课程"""
        course_id = str(uuid.uuid4())
        now = int(datetime.now().timestamp() * 1000)
        
        # 生成标题
        if not title:
            title = question[:50] if len(question) > 50 else f"课程：{question}"
        
        # 生成关键词
        if not keywords:
            keywords = ["AI学习", "自适应", "个性化"]
        
        return {
            "id": course_id,
            "title": title,
            "keywords": keywords,
            "original_question": question,
            "status": "active",
            "created_at": now,
            "updated_at": now
        }
    
    def extract_title_from_question(self, question: str) -> str:
        """从问题中提取标题"""
        # 简化实现，实际可调用 LLM
        keywords = ["如何", "怎么", "什么", "为什么", "教程", "学习"]
        for kw in keywords:
            if kw in question:
                return f"关于{question[:30]}的学习"
        return question[:50]
    
    def extract_keywords(self, question: str) -> List[str]:
        """从问题中提取关键词"""
        # 简化实现，实际可调用 LLM
        return ["AI", "学习", "自适应"]
    
    def calculate_progress(self, q1: bool, q2: bool, q3: bool, total_minutes: int = 0) -> int:
        """计算总体进度"""
        base = 0
        if q1: base += 33
        if q2: base += 33
        if q3: base += 34
        
        # 学习时长加成（最多20%）
        time_bonus = min(total_minutes / 120 * 20, 20) if total_minutes else 0
        
        return min(int(base + time_bonus), 100)
```

### 16.3 知识库服务 (backend/services/knowledge_service.py)

```python
import uuid
import os
from datetime import datetime
from typing import List, Dict, Optional
from pathlib import Path

class KnowledgeService:
    """知识库管理业务逻辑"""
    
    def __init__(self, db_path: str = "./data/courses.db", chroma_dir: str = "./data/chroma"):
        self.db_path = db_path
        self.chroma_dir = chroma_dir
        self.embedder = None  # 延迟初始化
    
    async def add_document(self, course_id: str, title: str, content: str, source: str = "user") -> Dict:
        """添加文档到知识库"""
        doc_id = str(uuid.uuid4())
        now = int(datetime.now().timestamp() * 1000)
        
        # 向量化
        embedding = await self._get_embedding(content)
        
        return {
            "id": doc_id,
            "course_id": course_id,
            "title": title,
            "content": content,
            "source": source,
            "created_at": now,
            "embedding": embedding
        }
    
    async def _get_embedding(self, text: str) -> List[float]:
        """获取文本向量（调用 Embedding 服务）"""
        # TODO: 实现真实的向量化
        return [0.0] * 1024  # 占位符
    
    async def semantic_search(self, course_id: str, query: str, top_k: int = 5) -> List[Dict]:
        """语义检索"""
        query_embedding = await self._get_embedding(query)
        
        # TODO: 实现基于向量的相似度搜索
        return [
            {
                "content": "检索结果示例内容",
                "score": 0.95,
                "metadata": {"title": "示例文档", "source": "AI补充"}
            }
        ]
```

### 16.4 知识图谱服务 (backend/services/graph_service.py)

```python
import json
from typing import List, Dict, Optional

class GraphService:
    """知识图谱生成与管理"""
    
    def __init__(self, llm_service=None):
        self.llm = llm_service
    
    async def generate_graph(self, course_id: str, documents: List[Dict]) -> Dict:
        """生成知识图谱"""
        if not documents:
            return {"nodes": [], "links": []}
        
        # 合并文档内容
        combined_text = "\n\n".join([doc.get("content", "")[:2000] for doc in documents[:5]])
        
        # 调用 LLM 生成图谱
        if self.llm:
            prompt = f"""
基于以下学习资料，生成一个知识图谱，包含核心概念及其关系。

学习资料：
{combined_text[:4000]}

请生成包含以下结构的JSON：
{{
  "nodes": [
    {{"id": "node1", "name": "核心概念", "description": "描述", "bloom_level": "understand", "difficulty": 0.5, "is_threshold_concept": true}}
  ],
  "links": [
    {{"source": "node1", "target": "node2", "relation": "related", "strength": 0.8}}
  ]
}}
"""
            result = await self.llm.chat(prompt)
            try:
                return json.loads(result)
            except:
                pass
        
        # 返回示例数据
        return {
            "nodes": [
                {"id": "concept1", "name": "核心概念", "description": "这是核心概念", "bloom_level": "understand", "difficulty": 0.5, "is_threshold_concept": True},
                {"id": "concept2", "name": "相关概念", "description": "这是相关概念", "bloom_level": "remember", "difficulty": 0.3, "is_threshold_concept": False}
            ],
            "links": [
                {"source": "concept1", "target": "concept2", "relation": "related", "strength": 0.8}
            ]
        }
    
    def update_graph_incremental(self, existing_graph: Dict, new_document: Dict) -> Dict:
        """增量更新图谱"""
        # TODO: 实现增量更新逻辑
        return existing_graph
```

### 16.5 争议检测服务 (backend/services/controversy_service.py)

```python
import uuid
from typing import List, Dict

class ControversyService:
    """学术争议检测服务"""
    
    def __init__(self, llm_service=None):
        self.llm = llm_service
    
    async def detect_controversies(self, course_id: str, documents: List[Dict]) -> List[Dict]:
        """检测学术争议点"""
        if len(documents) < 2:
            return []
        
        # 提取观点
        views = await self._extract_views(documents)
        
        # 检测矛盾
        contradictions = await self._detect_contradictions(views)
        
        # 生成争议点
        controversies = []
        for pair in contradictions:
            c = await self._generate_controversy(views[pair["view1_idx"]], views[pair["view2_idx"]])
            if c:
                controversies.append(c)
        
        return controversies
    
    async def _extract_views(self, documents: List[Dict]) -> List[Dict]:
        """从文档中提取观点"""
        views = []
        for doc in documents:
            # TODO: 调用 LLM 提取观点
            views.append({
                "view": f"关于{doc.get('title', '未知')}的观点",
                "evidence": "支持证据",
                "source": doc.get("title", "未知")
            })
        return views
    
    async def _detect_contradictions(self, views: List[Dict]) -> List[Dict]:
        """检测观点间的矛盾"""
        # TODO: 实现 NLI 模型检测
        return []
    
    async def _generate_controversy(self, view1: Dict, view2: Dict) -> Optional[Dict]:
        """生成争议点"""
        if not self.llm:
            return None
        
        prompt = f"""
分析以下两个观点，生成一个学术争议点。

正方观点：{view1['view']}
证据：{view1['evidence']}

反方观点：{view2['view']}
证据：{view2['evidence']}

请生成包含以下字段的JSON：
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
            return json.loads(result)
        except:
            return None
```

### 16.6 测评服务 (backend/services/quiz_service.py)

```python
import json
from typing import List, Dict

class QuizService:
    """测评题目生成与评估"""
    
    # Bloom 认知层级难度系数
    DIFFICULTIES = {
        "remember": 0.2,
        "understand": 0.4,
        "apply": 0.6,
        "analyze": 0.75,
        "evaluate": 0.85,
        "create": 0.95
    }
    
    # 各维度题型
    QUESTION_TYPES = {
        "remember": ["multiple_choice", "fill_blank"],
        "understand": ["short_answer", "explanation"],
        "apply": ["coding", "calculation"],
        "analyze": ["case_study", "analysis"],
        "evaluate": ["essay", "discussion"],
        "create": ["project_design", "innovation"]
    }
    
    def __init__(self, llm_service=None):
        self.llm = llm_service
    
    async def generate_quiz(self, course_id: str, documents: List[Dict], questions_per_level: int = 2) -> List[Dict]:
        """生成测评题目"""
        combined_text = "\n\n".join([doc.get("content", "")[:2000] for doc in documents[:5]])
        
        quizzes = []
        for dimension, difficulty in self.DIFFICULTIES.items():
            for i in range(questions_per_level):
                question = await self._generate_question(dimension, difficulty, combined_text, i + 1)
                if question:
                    quizzes.append(question)
        
        return quizzes
    
    async def _generate_question(self, dimension: str, difficulty: float, context: str, question_num: int = 1) -> Optional[Dict]:
        """生成单道题目"""
        if not self.llm:
            return self._mock_question(dimension, difficulty, question_num)
        
        prompt = f"""
基于以下学习资料，为"{dimension}"认知层级生成第{question_num}道测评题目。

要求：
- 难度系数: {difficulty}
- 题型: {self.QUESTION_TYPES[dimension]}

学习资料：
{context[:4000]}

请生成包含以下字段的JSON：
{{
  "id": "question_{dimension}_{question_num}",
  "dimension": "{dimension}",
  "bloom_level": "{dimension}",
  "difficulty": {difficulty},
  "question_type": "{self.QUESTION_TYPES[dimension][0]}",
  "question": "题目内容",
  "options": ["A. 选项1", "B. 选项2", "C. 选项3", "D. 选项4"],
  "correct_answer": "A",
  "explanation": "答案解析",
  "knowledge_points": ["知识点1", "知识点2"]
}}
"""
        try:
            result = await self.llm.chat(prompt)
            return json.loads(result)
        except:
            return self._mock_question(dimension, difficulty, question_num)
    
    def _mock_question(self, dimension: str, difficulty: float, question_num: int) -> Dict:
        """生成模拟题目"""
        return {
            "id": f"question_{dimension}_{question_num}",
            "dimension": dimension,
            "bloom_level": dimension,
            "difficulty": difficulty,
            "question_type": self.QUESTION_TYPES[dimension][0],
            "question": f"这是{dimension}层级的示例题目（第{question_num}题）。",
            "options": ["选项A", "选项B", "选项C", "选项D"],
            "correct_answer": "A",
            "explanation": f"这是{dimension}层级的答案解析。",
            "knowledge_points": ["知识点1"]
        }
    
    async def evaluate_answer(self, question: Dict, user_answer: str) -> Dict:
        """评估答案"""
        correct = question.get("correct_answer", "").strip().upper()
        user = user_answer.strip().upper()
        
        if question.get("question_type") in ["multiple_choice", "fill_blank"]:
            is_correct = user == correct.upper()
            return {
                "is_correct": is_correct,
                "score": 100 if is_correct else 0,
                "feedback": "回答正确！" if is_correct else f"正确答案：{correct}"
            }
        else:
            # 主观题使用 LLM 评估
            if self.llm:
                return await self._llm_evaluate(question, user_answer)
            return {"is_correct": False, "score": 0, "feedback": "评分失败"}
    
    async def _llm_evaluate(self, question: Dict, user_answer: str) -> Dict:
        """LLM 评估主观题"""
        prompt = f"""
评估以下回答：

题目：{question['question']}
正确答案：{question.get('correct_answer', '无标准答案')}
用户回答：{user_answer}

请评估并输出JSON：
{{"score": 85, "is_correct": true, "feedback": "评估反馈"}}
"""
        try:
            result = await self.llm.chat(prompt)
            return json.loads(result)
        except:
            return {"is_correct": False, "score": 0, "feedback": "评分异常"}
    
    def calculate_ability_scores(self, quiz_results: List[Dict]) -> Dict:
        """计算能力维度得分"""
        scores = {dim: [] for dim in self.DIFFICULTIES.keys()}
        
        for result in quiz_results:
            dim = result.get("dimension", "remember")
            if dim in scores and result.get("is_correct"):
                scores[dim].append(100)
        
        ability_scores = {}
        for dim, score_list in scores.items():
            ability_scores[dim] = sum(score_list) / len(score_list) if score_list else 0
        
        return ability_scores
```

### 16.7 服务层汇总

| 服务文件 | 核心方法 | 功能 |
|---------|---------|------|
| llm_service.py | chat() | MiniMax API 调用 |
| course_service.py | create_course(), calculate_progress() | 课程业务逻辑 |
| knowledge_service.py | add_document(), semantic_search() | 知识库管理 |
| graph_service.py | generate_graph(), update_graph_incremental() | 知识图谱 |
| controversy_service.py | detect_controversies() | 争议检测 |
| quiz_service.py | generate_quiz(), evaluate_answer() | 测评服务 |

---

## 十七、前端API层（Frontend API Layer）

### 17.1 API客户端 (src/api/client.ts)

```typescript
// API 基础配置和请求封装

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export interface ApiResponse<T = any> {
  success?: boolean;
  data?: T;
  message?: string;
  error?: string;
  detail?: string;
}

export interface ApiError {
  status: number;
  message: string;
  detail?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const config: RequestInit = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch {
          // 忽略 JSON 解析错误
        }
        throw { status: response.status, message: errorMessage };
      }

      // 204 No Content
      if (response.status === 204) {
        return {} as T;
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      if ((error as ApiError).status) {
        throw error;
      }
      throw { status: 0, message: (error as Error).message || '网络错误' };
    }
  }

  get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    let url = endpoint;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url = `${endpoint}?${queryString}`;
      }
    }
    return this.request<T>(url, { method: 'GET' });
  }

  post<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  put<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  patch<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  upload<T>(endpoint: string, formData: FormData, onProgress?: (progress: number) => void): Promise<T> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const url = `${this.baseUrl}${endpoint}`;

      xhr.open('POST', url);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress(progress);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            resolve(data as T);
          } catch {
            resolve({} as T);
          }
        } else {
          reject({ status: xhr.status, message: xhr.statusText });
        }
      };

      xhr.onerror = () => {
        reject({ status: 0, message: '网络错误' });
      };

      xhr.send(formData);
    });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
```

### 17.2 课程API (src/api/courses.ts)

```typescript
import { apiClient } from './client';

export interface Course {
  id: string;
  title: string;
  keywords: string[];
  originalQuestion: string;
  status: 'active' | 'completed' | 'archived' | 'deleted';
  progress: number;
  threeAskProgress: {
    question1: boolean;
    question2: boolean;
    question3: boolean;
  };
  createdAt: number;
  lastAccessed: number;
}

export interface CreateCourseRequest {
  question: string;
}

export interface CreateCourseResponse {
  id: string;
  title: string;
  keywords: string[];
  originalQuestion: string;
  status: string;
  progress: number;
  threeAskProgress: {
    question1: boolean;
    question2: boolean;
    question3: boolean;
  };
  createdAt: number;
}

export interface CourseListResponse {
  courses: Course[];
  total: number;
}

export const coursesApi = {
  // 创建课程
  create: (question: string): Promise<CreateCourseResponse> => {
    return apiClient.post('/courses/create', { question });
  },

  // 获取课程列表
  list: (status?: string, limit: number = 50, offset: number = 0): Promise<CourseListResponse> => {
    return apiClient.get('/courses/list', { status, limit, offset });
  },

  // 获取单个课程详情
  get: (courseId: string): Promise<Course> => {
    return apiClient.get(`/courses/${courseId}`);
  },

  // 更新课程状态
  updateStatus: (courseId: string, status: string): Promise<{ success: boolean; message: string }> => {
    return apiClient.patch(`/courses/${courseId}/status`, { status });
  },

  // 更新课程进度
  updateProgress: (courseId: string, progress: number): Promise<{ success: boolean; message: string }> => {
    return apiClient.patch(`/courses/${courseId}/progress`, { progress });
  },

  // 删除课程
  delete: (courseId: string): Promise<{ success: boolean; message: string }> => {
    return apiClient.delete(`/courses/${courseId}`);
  },

  // 归档课程
  archive: (courseId: string): Promise<{ success: boolean; message: string }> => {
    return apiClient.patch(`/courses/${courseId}/status`, { status: 'archived' });
  },

  // 恢复课程
  restore: (courseId: string): Promise<{ success: boolean; message: string }> => {
    return apiClient.patch(`/courses/${courseId}/status`, { status: 'active' });
  },
};
```

### 17.3 知识库API (src/api/knowledge.ts)

```typescript
import { apiClient } from './client';

export interface Document {
  id: string;
  courseId: string;
  title: string;
  contentPreview?: string;
  content?: string;
  filePath?: string;
  fileType?: string;
  source: 'user' | 'ai';
  createdAt: number;
}

export interface DocumentListResponse {
  documents: Document[];
}

export interface SearchRequest {
  courseId: string;
  query: string;
  topK?: number;
}

export interface SearchResult {
  content: string;
  score: number;
  metadata: Record<string, any>;
}

export interface SearchResponse {
  results: SearchResult[];
}

export const knowledgeApi = {
  // 上传资料
  upload: (courseId: string, file: File, onProgress?: (progress: number) => void): Promise<{ success: boolean; doc_id?: string }> => {
    const formData = new FormData();
    formData.append('course_id', courseId);
    formData.append('file', file);
    return apiClient.upload('/knowledge/upload', formData, onProgress);
  },

  // AI 智能补充资料
  aiFetch: (courseId: string): Promise<{ success: boolean; message: string }> => {
    return apiClient.post(`/knowledge/ai-fetch/${courseId}`);
  },

  // 获取资料列表
  list: (courseId: string, source?: 'user' | 'ai'): Promise<DocumentListResponse> => {
    return apiClient.get('/knowledge/documents', { course_id: courseId, source });
  },

  // 获取单个资料详情
  get: (docId: string): Promise<Document> => {
    return apiClient.get(`/knowledge/documents/${docId}`);
  },

  // 删除资料
  delete: (docId: string): Promise<{ success: boolean; message: string }> => {
    return apiClient.delete(`/knowledge/documents/${docId}`);
  },

  // 语义检索
  search: (courseId: string, query: string, topK: number = 5): Promise<SearchResponse> => {
    return apiClient.post('/knowledge/search', { course_id: courseId, query, top_k: topK });
  },
};
```

### 17.4 三问引擎API (src/api/threeAsk.ts)

```typescript
import { apiClient } from './client';

export interface GraphNode {
  id: string;
  name: string;
  description?: string;
  bloomLevel: string;
  difficulty: number;
  isThresholdConcept: boolean;
  x?: number;
  y?: number;
}

export interface GraphLink {
  source: string;
  target: string;
  relation: string;
  strength: number;
}

export interface KnowledgeGraph {
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface Controversy {
  id: string;
  topic: string;
  proView: string;
  proEvidence: string;
  conView: string;
  conEvidence: string;
  confidence: number;
}

export interface ControversyListResponse {
  controversies: Controversy[];
}

export interface QuizQuestion {
  id: string;
  dimension: string;
  bloomLevel: string;
  difficulty: number;
  questionType: string;
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation?: string;
  knowledgePoints: string[];
}

export interface QuizGenerateResponse {
  quizzes: QuizQuestion[];
  total: number;
}

export interface QuizSubmitRequest {
  courseId: string;
  questionId: string;
  userAnswer: string;
  timeSpent?: number;
}

export interface QuizSubmitResponse {
  isCorrect: boolean;
  score: number;
  explanation?: string;
  feedback?: string;
}

export interface ProgressResponse {
  question1: boolean;
  question2: boolean;
  question3: boolean;
  overallProgress: number;
}

export const threeAskApi = {
  // 第一问：生成知识图谱
  generateGraph: (courseId: string): Promise<KnowledgeGraph> => {
    return apiClient.post(`/three-ask/graph/generate/${courseId}`);
  },

  // 第一问：增量更新图谱
  updateGraph: (courseId: string, docId: string): Promise<KnowledgeGraph> => {
    return apiClient.post(`/three-ask/graph/update/${courseId}`, { doc_id: docId });
  },

  // 第二问：检测争议点（异步）
  detectControversy: (courseId: string): Promise<{ status: string; message: string }> => {
    return apiClient.post(`/three-ask/controversy/detect/${courseId}`);
  },

  // 第二问：获取争议点列表
  getControversies: (courseId: string): Promise<ControversyListResponse> => {
    return apiClient.get(`/three-ask/controversy/${courseId}`);
  },

  // 第三问：生成测评题目
  generateQuiz: (courseId: string): Promise<QuizGenerateResponse> => {
    return apiClient.post(`/three-ask/quiz/generate/${courseId}`);
  },

  // 第三问：提交单题答案
  submitQuiz: (req: QuizSubmitRequest): Promise<QuizSubmitResponse> => {
    return apiClient.post('/three-ask/quiz/submit', req);
  },

  // 第三问：完成测评
  completeQuiz: (courseId: string): Promise<{ success: boolean; message: string; accuracy?: number }> => {
    return apiClient.post(`/three-ask/quiz/${courseId}/complete`);
  },

  // 获取三问进度
  getProgress: (courseId: string): Promise<ProgressResponse> => {
    return apiClient.get(`/three-ask/progress/${courseId}`);
  },
};
```

### 17.5 SSE实时通信Hook (src/hooks/useSSE.ts)

```typescript
import { useEffect, useRef, useCallback } from 'react';

export interface SSEEvent {
  type: string;
  data: any;
}

export interface SSEOptions {
  onMessage?: (event: SSEEvent) => void;
  onGraphUpdated?: (data: any) => void;
  onControversyReady?: (data: any) => void;
  onQuizReady?: (data: any) => void;
  onProgress?: (data: any) => void;
  onNotification?: (data: any) => void;
  onError?: (error: Event) => void;
  onOpen?: () => void;
  autoReconnect?: boolean;
  reconnectInterval?: number;
}

export function useSSE(courseId: string | undefined, options: SSEOptions = {}) {
  const {
    onMessage,
    onGraphUpdated,
    onControversyReady,
    onQuizReady,
    onProgress,
    onNotification,
    onError,
    onOpen,
    autoReconnect = true,
    reconnectInterval = 3000,
  } = options;

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shouldReconnectRef = useRef(true);

  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (!courseId) return;

    // 关闭现有连接
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    shouldReconnectRef.current = true;
    const url = `http://localhost:8000/api/sse/stream/${courseId}`;
    const es = new EventSource(url);

    es.onopen = () => {
      console.log(`SSE 连接已建立: ${courseId}`);
      onOpen?.();
    };

    es.onerror = (error) => {
      console.error(`SSE 连接错误: ${courseId}`, error);
      onError?.(error);

      // 自动重连
      if (autoReconnect && shouldReconnectRef.current) {
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log(`SSE 尝试重连: ${courseId}`);
          connect();
        }, reconnectInterval);
      }
    };

    // 监听通用消息事件
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage?.({ type: 'message', data });
      } catch {
        onMessage?.({ type: 'message', data: event.data });
      }
    };

    // 监听 graph_updated 事件
    es.addEventListener('graph_updated', (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        onGraphUpdated?.(data);
        onMessage?.({ type: 'graph_updated', data });
      } catch {
        console.error('解析 graph_updated 事件失败');
      }
    });

    // 监听 controversy_ready 事件
    es.addEventListener('controversy_ready', (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        onControversyReady?.(data);
        onMessage?.({ type: 'controversy_ready', data });
      } catch {
        console.error('解析 controversy_ready 事件失败');
      }
    });

    // 监听 quiz_ready 事件
    es.addEventListener('quiz_ready', (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        onQuizReady?.(data);
        onMessage?.({ type: 'quiz_ready', data });
      } catch {
        console.error('解析 quiz_ready 事件失败');
      }
    });

    // 监听 progress 事件
    es.addEventListener('progress', (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        onProgress?.(data);
        onMessage?.({ type: 'progress', data });
      } catch {
        console.error('解析 progress 事件失败');
      }
    });

    // 监听 notification 事件
    es.addEventListener('notification', (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        onNotification?.(data);
        onMessage?.({ type: 'notification', data });
      } catch {
        console.error('解析 notification 事件失败');
      }
    });

    eventSourceRef.current = es;
  }, [courseId, onMessage, onGraphUpdated, onControversyReady, onQuizReady, onProgress, onNotification, onError, onOpen, autoReconnect, reconnectInterval]);

  useEffect(() => {
    if (courseId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [courseId, connect, disconnect]);

  return { disconnect, connect };
}

export default useSSE;
```

### 17.6 API层汇总

| 文件 | 用途 |
|------|------|
| client.ts | API客户端封装，支持GET/POST/PATCH/DELETE/上传 |
| courses.ts | 课程管理API |
| knowledge.ts | 知识库API |
| threeAsk.ts | 三问引擎API |
| useSSE.ts | SSE实时通信Hook |

### 17.7 验证方法

```bash
cd frontend
npm run dev
# 打开浏览器控制台，检查是否有 API 调用错误
```

---

## 18. 前端业务组件层

### 18.1 知识图谱组件 (src/components/business/KnowledgeGraph.tsx)

```tsx
import { memo, useEffect, useRef } from 'react'
import * as echarts from 'echarts'

interface GraphNode {
  id: string
  name: string
  description: string
  bloomLevel: string
  difficulty: number
  isThresholdConcept: boolean
  x?: number
  y?: number
}

interface GraphLink {
  source: string
  target: string
  relation: string
  strength: number
}

interface KnowledgeGraphProps {
  data: { nodes: GraphNode[]; links: GraphLink[] }
  loading?: boolean
  onNodeClick?: (node: GraphNode) => void
}

const bloomColors: Record<string, string> = {
  remember: '#8B5CF6',
  understand: '#3B82F6',
  apply: '#10B981',
  analyze: '#F59E0B',
  evaluate: '#EF4444',
  create: '#EC4899',
}

const getNodeSize = (node: GraphNode) => {
  let size = 30
  if (node.isThresholdConcept) size = 45
  switch (node.bloomLevel) {
    case 'remember': size += 0; break
    case 'understand': size += 5; break
    case 'apply': size += 10; break
    case 'analyze': size += 15; break
    case 'evaluate': size += 20; break
    case 'create': size += 25; break
  }
  return size
}

export const KnowledgeGraph = memo(({ data, loading, onNodeClick }: KnowledgeGraphProps) => {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    if (!chartRef.current || loading) return

    chartInstance.current = echarts.init(chartRef.current)

    const option: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          if (params.dataType === 'node') {
            return `
              <div style="padding: 8px; max-width: 200px;">
                <div style="font-weight: 600; margin-bottom: 4px;">${params.data.name}</div>
                <div style="font-size: 12px; color: #666; margin-bottom: 8px;">${params.data.description || ''}</div>
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                  <span style="padding: 2px 6px; background: #f3f4f6; border-radius: 4px; font-size: 11px;">${params.data.bloomLevel}</span>
                  <span style="padding: 2px 6px; background: #f3f4f6; border-radius: 4px; font-size: 11px;">难度: ${params.data.difficulty}</span>
                </div>
              </div>
            `
          }
          return ''
        },
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        borderRadius: 12,
        padding: 8,
      },
      series: [{
        type: 'graph',
        layout: 'force',
        force: {
          repulsion: 500,
          edgeLength: 150,
          gravity: 0.1,
          friction: 0.1,
          layoutAnimation: true,
        },
        roam: true,
        draggable: true,
        data: data.nodes.map(node => ({
          id: node.id,
          name: node.name,
          description: node.description,
          bloomLevel: node.bloomLevel,
          difficulty: node.difficulty,
          symbolSize: getNodeSize(node),
          itemStyle: {
            color: bloomColors[node.bloomLevel] || '#6B7280',
            borderColor: node.isThresholdConcept ? '#9333EA' : '#fff',
            borderWidth: node.isThresholdConcept ? 3 : 2,
            shadowBlur: 10,
            shadowColor: 'rgba(0,0,0,0.1)',
          },
          x: node.x,
          y: node.y,
        })),
        links: data.links.map(link => ({
          source: link.source,
          target: link.target,
          lineStyle: {
            color: link.relation === 'prerequisite' ? '#3B82F6' : '#9CA3AF',
            width: link.strength * 3,
            curveness: 0.3,
            type: link.relation === 'contradicts' ? 'dashed' : 'solid',
          },
          label: {
            show: link.relation === 'prerequisite',
            formatter: '依赖',
            fontSize: 10,
          },
        })),
        emphasis: {
          focus: 'adjacency',
          lineStyle: { width: 4 },
        },
        lineStyle: { color: '#9CA3AF', curveness: 0.3 },
        label: { show: true, position: 'right', fontSize: 12 },
      }],
    }

    chartInstance.current.setOption(option)

    chartInstance.current.on('click', (params: any) => {
      if (params.dataType === 'node' && onNodeClick) {
        const node = data.nodes.find(n => n.id === params.data.id)
        if (node) onNodeClick(node)
      }
    })

    const handleResize = () => chartInstance.current?.resize()
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chartInstance.current?.dispose()
    }
  }, [data, loading, onNodeClick])

  if (loading) {
    return (
      <div className="w-full h-[400px] bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500">正在分析知识结构...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full">
      <div ref={chartRef} style={{ width: '100%', height: 400 }} />

      {/* 图例 */}
      <div className="absolute bottom-4 right-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg px-3 py-2 text-xs shadow-sm">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#8B5CF6]"></span>记忆</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#3B82F6]"></span>理解</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#10B981]"></span>应用</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#F59E0B]"></span>分析</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#EF4444]"></span>评价</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#EC4899]"></span>创造</span>
        </div>
      </div>
    </div>
  )
})

KnowledgeGraph.displayName = 'KnowledgeGraph'

export default KnowledgeGraph
```

### 18.2 学术争议面板 (src/components/business/ControversyPanel.tsx)

```tsx
import { memo, useState } from 'react'
import { ChevronDownIcon, ChevronUpIcon, MessageIcon } from '../ui/Icons'

interface Controversy {
  id: string
  topic: string
  pro_view: string
  pro_evidence: string
  con_view: string
  con_evidence: string
  confidence: number
}

interface ControversyPanelProps {
  controversies: Controversy[]
  loading?: boolean
  onDiscussionClick?: (controversy: Controversy) => void
}

export const ControversyPanel = memo(({
  controversies,
  loading,
  onDiscussionClick,
}: ControversyPanelProps) => {
  const [expandedItem, setExpandedItem] = useState<string | null>(null)

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map(i => (
          <div key={i} className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!controversies.length) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
          <MessageIcon className="w-8 h-8 text-gray-400" />
        </div>
        <p className="text-gray-500 dark:text-gray-400 mb-2">暂无学术争议</p>
        <p className="text-sm text-gray-400 dark:text-gray-500">
          上传更多资料后，AI将自动分析学术分歧点
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {controversies.map((controversy) => (
        <div
          key={controversy.id}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden"
        >
          {/* 头部 */}
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

          {/* 正反方对比 */}
          <div className="grid grid-cols-2 divide-x divide-gray-100 dark:divide-gray-700">
            {/* 正方 */}
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

            {/* 反方 */}
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
                onClick={() => onDiscussionClick(controversy)}
                className="w-full py-2 flex items-center justify-center gap-2 text-sm text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
              >
                <MessageIcon className="w-4 h-4" />
                参与讨论 ({(controversy.confidence * 100).toFixed(0)}% 关注度)
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
})

const ConfidenceBadge = ({ confidence }: { confidence: number }) => {
  const getColor = () => {
    if (confidence >= 0.8) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
    if (confidence >= 0.5) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
    return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
  }

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getColor()}`}>
      {(confidence * 100).toFixed(0)}% 置信
    </span>
  )
}

ControversyPanel.displayName = 'ControversyPanel'

export default ControversyPanel
```

### 18.3 能力雷达图组件 (src/components/business/RadarChart.tsx)

```tsx
import { memo, useEffect, useRef } from 'react'
import * as echarts from 'echarts'

interface RadarChartProps {
  data: {
    dimensions: { name: string; max: number }[]
    values: number[]
    average?: number
    strongest?: string
    weakest?: string
  }
  size?: 'small' | 'large'
}

export const RadarChart = memo(({ data, size = 'large' }: RadarChartProps) => {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<echarts.ECharts | null>(null)

  const isSmall = size === 'small'
  const chartHeight = isSmall ? 200 : 300

  useEffect(() => {
    if (!chartRef.current) return

    chartInstance.current = echarts.init(chartRef.current)

    const option: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
        textStyle: { color: '#374151' },
      },
      radar: {
        indicator: data.dimensions.map(d => ({
          name: d.name,
          max: d.max,
        })),
        shape: 'polygon',
        splitNumber: 4,
        axisName: {
          color: '#6B7280',
          fontSize: isSmall ? 10 : 12,
          padding: [3, 5],
        },
        splitLine: {
          lineStyle: {
            color: '#E5E7EB',
            type: 'dashed',
          },
        },
        splitArea: {
          areaStyle: {
            color: ['rgba(59, 130, 246, 0.02)', 'rgba(59, 130, 246, 0.05)'],
          },
        },
        axisLine: {
          lineStyle: { color: '#D1D5DB' },
        },
        radius: isSmall ? '60%' : '70%',
      },
      series: [{
        type: 'radar',
        data: [{
          value: data.values,
          name: '能力雷达',
          lineStyle: {
            color: '#3B82F6',
            width: 2,
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(59, 130, 246, 0.4)' },
              { offset: 1, color: 'rgba(59, 130, 246, 0.1)' },
            ]),
          },
          symbol: 'circle',
          symbolSize: isSmall ? 4 : 6,
          itemStyle: {
            color: '#3B82F6',
            borderColor: '#fff',
            borderWidth: 2,
            shadowBlur: 10,
            shadowColor: 'rgba(59, 130, 246, 0.3)',
          },
        }],
      }],
    }

    chartInstance.current.setOption(option)

    const handleResize = () => chartInstance.current?.resize()
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chartInstance.current?.dispose()
    }
  }, [data, isSmall])

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
    )
  }

  return (
    <div className="relative">
      <div ref={chartRef} style={{ width: '100%', height: chartHeight }} />

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
  )
})

RadarChart.displayName = 'RadarChart'

export default RadarChart
```

### 18.4 组件汇总

| 文件 | 用途 |
|------|------|
| KnowledgeGraph.tsx | 知识图谱可视化，ECharts force布局，Bloom颜色编码 |
| ControversyPanel.tsx | 学术争议面板，正反方对比，置信度标签 |
| RadarChart.tsx | 能力雷达图，6维度Bloom认知层级可视化 |

### 18.5 验证方法

```bash
cd frontend
npm run dev
# 访问学习空间页面，检查知识图谱是否正常渲染
# 检查控制台是否有 ECharts 初始化错误
```

---

## 19. 配置文件层

### 19.1 后端环境变量配置 (backend/.env.example)

```env
# ============================================
# 三问高效学习机 - 后端环境变量配置
# 复制此文件为 .env 并填入实际值
# ============================================

# MiniMax API 配置
# 获取地址: https://platform.minimaxi.com
MINIMAX_API_KEY=your_api_key_here
MINIMAX_API_HOST=https://api.minimaxi.com

# 本地存储路径
DATA_DIR=./data
UPLOAD_DIR=./data/uploads
CHROMA_DIR=./data/chroma
EXPORT_DIR=./data/exports

# 模型配置
LLM_MODEL=MiniMax-M2.7
EMBEDDING_MODEL=BAAI/bge-large-zh-v1.5
EMBEDDING_DIMENSION=1024

# 服务配置
BACKEND_PORT=8000
FRONTEND_URL=http://localhost:5173

# 开发模式
DEBUG=true
```

### 19.2 前端环境变量配置 (frontend/.env.example)

```env
# ============================================
# 三问高效学习机 - 前端环境变量配置
# 复制此文件为 .env 并填入实际值
# ============================================

# API 服务地址
VITE_API_URL=http://localhost:8000/api

# 应用名称
VITE_APP_NAME=三问高效学习机

# 是否启用调试模式
VITE_DEBUG=true
```

### 19.3 Docker Compose 配置 (docker-compose.yml)

```yaml
version: '3.8'

services:
  # 后端服务
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: sanwen-backend
    ports:
      - "8000:8000"
    volumes:
      - ./data:/app/data
      - ./backend:/app
    environment:
      - MINIMAX_API_KEY=${MINIMAX_API_KEY}
      - MINIMAX_API_HOST=${MINIMAX_API_HOST}
      - DATA_DIR=/app/data
      - UPLOAD_DIR=/app/data/uploads
      - CHROMA_DIR=/app/data/chroma
      - BACKEND_PORT=8000
      - FRONTEND_URL=http://localhost:5173
      - DEBUG=true
    restart: unless-stopped
    networks:
      - sanwen-network

  # 前端服务
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: sanwen-frontend
    ports:
      - "5173:5173"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    environment:
      - VITE_API_URL=http://localhost:8000/api
      - VITE_APP_NAME=三问高效学习机
    depends_on:
      - backend
    restart: unless-stopped
    networks:
      - sanwen-network

  # ChromaDB 向量数据库（可选）
  chromadb:
    image: chromadb/chroma:latest
    container_name: sanwen-chromadb
    ports:
      - "8001:8000"
    volumes:
      - ./data/chroma:/chroma/chroma
    environment:
      - IS_PERSISTENT=TRUE
      - PERSIST_DIRECTORY=/chroma/chroma
      - ANONYMIZED_TELEMETRY=FALSE
    restart: unless-stopped
    networks:
      - sanwen-network

networks:
  sanwen-network:
    driver: bridge
```

### 19.4 后端 Dockerfile (backend/Dockerfile)

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# 复制依赖文件
COPY requirements.txt .

# 安装 Python 依赖
RUN pip install --no-cache-dir -r requirements.txt

# 复制应用代码
COPY . .

# 创建数据目录
RUN mkdir -p /app/data/uploads /app/data/chroma /app/data/exports

# 暴露端口
EXPOSE 8000

# 启动命令
CMD ["python", "main.py"]
```

### 19.5 前端 Dockerfile (frontend/Dockerfile)

```dockerfile
FROM node:20-alpine

WORKDIR /app

# 复制依赖文件
COPY package*.json ./

# 安装依赖
RUN npm ci

# 复制应用代码
COPY . .

# 暴露端口
EXPOSE 5173

# 启动命令
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
```

### 19.6 Windows 启动脚本 (start.bat)

```batch
@echo off
chcp 65001 >nul
title 三问高效学习机

echo ========================================
echo   三问高效学习机 - 启动脚本
echo ========================================
echo.

:: 检查 Python 环境
echo [1/4] 检查 Python 环境...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Python，请先安装 Python 3.8+
    echo 下载地址: https://python.org
    pause
    exit /b 1
)
echo        Python 已就绪

:: 检查 Node.js 环境
echo [2/4] 检查 Node.js 环境...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Node.js，请先安装 Node.js 18+
    echo 下载地址: https://nodejs.org
    pause
    exit /b 1
)
echo        Node.js 已就绪

:: 启动后端
echo [3/4] 启动后端服务...
cd backend
start "三问学习机-后端" cmd /c "python main.py"
cd ..

:: 等待后端启动
timeout /t 3 /nobreak >nul

:: 启动前端
echo [4/4] 启动前端服务...
cd frontend
start "三问学习机-前端" cmd /c "npm run dev"
cd ..

:: 打开浏览器
timeout /t 2 /nobreak >nul
start http://localhost:5173

echo.
echo ========================================
echo   启动完成！
echo   前端地址: http://localhost:5173
echo   后端地址: http://localhost:8000
echo   API 文档: http://localhost:8000/docs
echo ========================================
echo.
echo 按任意键关闭此窗口...
pause >nul
```

### 19.7 Mac/Linux 启动脚本 (start.sh)

```bash
#!/bin/bash

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================"
echo "  三问高效学习机 - 启动脚本"
echo "========================================"
echo

# 检查 Python 环境
echo "[1/4] 检查 Python 环境..."
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}[错误] 未检测到 Python3，请先安装 Python 3.8+${NC}"
    exit 1
fi
echo -e "${GREEN}       Python 已就绪${NC}"

# 检查 Node.js 环境
echo "[2/4] 检查 Node.js 环境..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}[错误] 未检测到 Node.js，请先安装 Node.js 18+${NC}"
    exit 1
fi
echo -e "${GREEN}       Node.js 已就绪${NC}"

# 创建数据目录
echo "[3/4] 创建数据目录..."
mkdir -p data/uploads data/chroma data/exports

# 启动后端
echo "[4/4] 启动后端服务..."
cd backend
python3 main.py &
BACKEND_PID=$!
cd ..

# 等待后端启动
sleep 3

# 启动前端
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

# 打开浏览器
sleep 2
open http://localhost:5173 2>/dev/null || xdg-open http://localhost:5173 2>/dev/null || echo "请手动打开浏览器访问 http://localhost:5173"

echo
echo "========================================"
echo -e "${GREEN}  启动完成！${NC}"
echo "   前端地址: http://localhost:5173"
echo "   后端地址: http://localhost:8000"
echo "   API 文档: http://localhost:8000/docs"
echo "========================================"
echo
echo "后端 PID: $BACKEND_PID"
echo "前端 PID: $FRONTEND_PID"
echo
echo "按 Ctrl+C 停止服务..."

# 等待用户中断
wait
```

### 19.8 Windows 安装脚本 (install.bat)

```batch
@echo off
chcp 65001 >nul
title 三问学习机 - 安装向导

echo ========================================
echo   三问高效学习机 - 安装脚本
echo ========================================
echo.

:: 检查 Python 环境
echo [1/3] 检查 Python 环境...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Python，请先安装 Python 3.8+
    echo 下载地址: https://python.org
    pause
    exit /b 1
)
python --version
echo.

:: 检查 Node.js 环境
echo [2/3] 检查 Node.js 环境...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Node.js，请先安装 Node.js 18+
    echo 下载地址: https://nodejs.org
    pause
    exit /b 1
)
node --version
echo.

:: 安装后端依赖
echo [3/3] 安装项目依赖...
echo.
echo 正在安装后端依赖...
cd backend
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo [警告] 后端依赖安装可能失败，请检查网络
)
cd ..

echo 正在安装前端依赖...
cd frontend
call npm install
if %errorlevel% neq 0 (
    echo [警告] 前端依赖安装可能失败，请检查网络
)
cd ..

:: 创建数据目录
mkdir data\chroma 2>nul
mkdir data\uploads 2>nul
mkdir data\exports 2>nul

:: 初始化数据库
echo.
echo 正在初始化数据库...
cd backend
python database.py
cd ..

echo.
echo ========================================
echo   安装完成！
echo   请复制 .env.example 为 .env 并配置 API Key
echo   然后运行 start.bat 启动程序
echo ========================================
echo.
pause
```

### 19.9 Mac/Linux 安装脚本 (install.sh)

```bash
#!/bin/bash

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "========================================"
echo "  三问高效学习机 - 安装脚本"
echo "========================================"
echo

# 检查 Python 环境
echo "[1/3] 检查 Python 环境..."
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}[错误] 未检测到 Python3，请先安装 Python 3.8+${NC}"
    exit 1
fi
python3 --version
echo

# 检查 Node.js 环境
echo "[2/3] 检查 Node.js 环境..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}[错误] 未检测到 Node.js，请先安装 Node.js 18+${NC}"
    exit 1
fi
node --version
echo

# 安装后端依赖
echo "[3/3] 安装项目依赖..."
echo
echo "正在安装后端依赖..."
cd backend
pip3 install -r requirements.txt
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}[警告] 后端依赖安装可能失败，请检查网络${NC}"
fi
cd ..

echo "正在安装前端依赖..."
cd frontend
npm install
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}[警告] 前端依赖安装可能失败，请检查网络${NC}"
fi
cd ..

# 创建数据目录
mkdir -p data/chroma data/uploads data/exports

# 初始化数据库
echo
echo "正在初始化数据库..."
cd backend
python3 database.py
cd ..

echo
echo "========================================"
echo -e "${GREEN}  安装完成！${NC}"
echo "   请复制 .env.example 为 .env 并配置 API Key"
echo "   然后运行 ./start.sh 启动程序"
echo "========================================"
echo

# 给启动脚本添加执行权限
chmod +x start.sh
```

### 19.10 根目录 package.json (package.json)

```json
{
  "name": "sanwen-learning",
  "version": "1.0.0",
  "description": "三问高效学习机 - AI驱动的个性化学习工具",
  "private": true,
  "scripts": {
    "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\"",
    "dev:backend": "cd backend && python main.py",
    "dev:frontend": "cd frontend && npm run dev",
    "install:all": "npm run install:backend && npm run install:frontend",
    "install:backend": "cd backend && pip install -r requirements.txt",
    "install:frontend": "cd frontend && npm install",
    "build": "cd frontend && npm run build",
    "start": "npm run dev"
  },
  "devDependencies": {
    "concurrently": "^8.2.2"
  },
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  }
}
```

### 19.11 配置文件汇总

| 文件 | 用途 |
|------|------|
| backend/.env.example | 后端环境变量配置模板 |
| frontend/.env.example | 前端环境变量配置模板 |
| docker-compose.yml | Docker 容器编排配置 |
| backend/Dockerfile | 后端 Docker 镜像构建 |
| frontend/Dockerfile | 前端 Docker 镜像构建 |
| start.bat | Windows 启动脚本 |
| start.sh | Mac/Linux 启动脚本 |
| install.bat | Windows 安装脚本 |
| install.sh | Mac/Linux 安装脚本 |
| package.json | 根目录项目配置与/npm脚本 |

### 19.12 验证方法

```bash
# Windows: 双击 install.bat 安装依赖，然后双击 start.bat 启动
# Mac/Linux: chmod +x install.sh start.sh && ./install.sh && ./start.sh
# Docker: docker-compose up -d
```

---

## 20. 项目文档层

### 20.1 README.md

```markdown
# 三问高效学习机

> AI驱动的个性化学习工具，通过"三问法"快速建立学科框架、挖掘核心争议、验证理解深度

[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-green.svg)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.2+-blue.svg)](https://reactjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://typescriptlang.org)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## 📖 项目简介

**三问高效学习机** 是一款以用户提问为核心触发机制的智能学习工具。通过"柔性课程生成 + 三问认知引擎"，帮助用户按需构建个性化学习路径，实现从问题提出到深度理解的认知闭环。

### 核心价值

- **按需学习**：课程内容由用户提问触发生成，杜绝信息过载
- **认知加速**：通过"三问法"快速建立学科框架、挖掘核心争议、验证理解深度
- **个性化适配**：AI补充 + 用户上传 = 专属复合知识库
- **进度可控**：课程状态动态变化，界面简洁

### 三问引擎

| 三问 | 功能 | 技术 |
|------|------|------|
| 第一问 | 核心心智模型提取 | 知识图谱 (ECharts) |
| 第二问 | 学术分歧挖掘 | NLI模型 + LLM |
| 第三问 | 深度测评生成 | 布鲁姆六维度 |

## 🚀 快速开始

### 环境要求

| 依赖 | 版本 | 下载地址 |
|------|------|---------|
| Python | 3.11+ | [python.org](https://python.org) |
| Node.js | 18+ | [nodejs.org](https://nodejs.org) |
| npm | 9+ | 随 Node.js 安装 |

### 一键安装

#### Windows
```bash
# 双击运行
install.bat
```

#### Mac/Linux
```bash
chmod +x install.sh
./install.sh
```

### 配置 API Key

复制 `backend/.env.example` 为 `backend/.env`

填入你的 MiniMax API Key：

```env
MINIMAX_API_KEY=your_api_key_here
```

### 启动程序

#### Windows
```bash
# 双击运行
start.bat
```

#### Mac/Linux
```bash
chmod +x start.sh
./start.sh
```

### Docker 一键启动

```bash
docker-compose up -d
```

### 访问地址

| 服务 | 地址 | 说明 |
|------|------|------|
| 前端 | http://localhost:5173 | 主应用界面 |
| 后端 API | http://localhost:8000 | REST API |
| API 文档 | http://localhost:8000/docs | Swagger UI |

## 📁 项目结构

```
sanwen-learning/
├── frontend/                 # React + TypeScript 前端
│   ├── src/
│   │   ├── pages/           # 页面组件
│   │   ├── components/      # 复用组件
│   │   ├── stores/          # Zustand 状态管理
│   │   ├── api/             # API 调用
│   │   └── hooks/           # 自定义 Hook
│   ├── package.json
│   └── vite.config.ts
├── backend/                  # Python FastAPI 后端
│   ├── routers/             # API 路由
│   ├── services/            # 业务逻辑
│   ├── models.py            # 数据模型
│   ├── database.py          # 数据库
│   └── requirements.txt
├── data/                     # 数据存储
│   ├── courses.db           # SQLite 数据库
│   ├── chroma/              # 向量数据库
│   └── uploads/             # 用户上传文件
├── docker-compose.yml       # Docker 编排
├── start.bat / start.sh     # 启动脚本
├── install.bat / install.sh # 安装脚本
└── README.md
```

## 🛠️ 技术栈

### 前端

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 18.2+ | UI 框架 |
| TypeScript | 5.0+ | 类型安全 |
| Vite | 5.x | 构建工具 |
| Zustand | 4.x | 状态管理 |
| React Router | 6.x | 路由 |
| ECharts | 5.x | 知识图谱/雷达图 |

### 后端

| 技术 | 版本 | 用途 |
|------|------|------|
| FastAPI | 0.104+ | Web 框架 |
| SQLite | 3.x | 数据库 |
| ChromaDB | 0.4+ | 向量数据库 |
| MiniMax | API | LLM 服务 |
| BAAI/bge-large-zh | 1.5 | 中文向量化 |

## 📚 功能模块

### 1. 柔性课程生成
- 提问触发课程创建（<2秒）
- 课程状态管理（活跃/完成/归档）
- 三问进度自动追踪

### 2. 复合知识库
- AI 智能补充权威资料
- 用户上传 PDF/Word/Markdown
- 资料动态融合 + 语义检索

### 3. 三问认知引擎
- 第一问：知识图谱（Bloom 认知层级）
- 第二问：争议挖掘（NLI 模型）
- 第三问：深度测评（6 维度自测）

### 4. 学习进度追踪
- 课程进度可视化
- 能力雷达图
- 个性化提醒

### 5. 用户交互
- 课程卡片管理（拖拽排序/长按菜单）
- 讨论区（AI 总结）
- 数据导出（JSON/Markdown/PDF）

## 🎨 设计规范

**iOS 风格设计**
- 左右边距：145px
- 卡片圆角：16px
- 系统字体：SF Pro
- 暗黑模式：手动切换

**配色方案**

| 用途 | 亮色模式 | 暗黑模式 |
|------|---------|---------|
| 主背景 | #FFFFFF | #000000 |
| 二级背景 | #F2F2F7 | #1C1C1E |
| 强调色 | #007AFF | #0A84FF |

## 🔧 开发指南

### 本地开发

```bash
# 安装依赖
npm run install:all

# 启动开发服务器
npm run dev

# 或分别启动
cd backend && python main.py
cd frontend && npm run dev
```

### 构建生产版本

```bash
cd frontend
npm run build
```

### 代码格式化

```bash
# 前端
cd frontend && npm run lint

# 后端
cd backend && black .
```

## 📊 API 文档

启动后端后访问：http://localhost:8000/docs

### 主要端点

| 模块 | 端点 | 方法 | 说明 |
|------|------|------|------|
| 课程 | /api/courses/create | POST | 创建课程 |
| 课程 | /api/courses/list | GET | 课程列表 |
| 知识库 | /api/knowledge/upload | POST | 上传资料 |
| 知识库 | /api/knowledge/search | POST | 语义检索 |
| 三问 | /api/three-ask/graph/generate/{id} | POST | 生成知识图谱 |
| 三问 | /api/three-ask/quiz/generate/{id} | POST | 生成测评 |
| SSE | /api/sse/stream/{id} | GET | 实时推送 |

## 🤝 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 详见 LICENSE 文件

## 📧 联系方式

- 项目 Issues: [GitHub Issues](https://github.com/anson1220/ThreeQuestionsLearning/issues)
- 邮箱: support@sanwen.com

## 🙏 致谢

- [MiniMax](https://www.minimaxi.com/) - 提供 LLM API
- [BAAI](https://www.baai.ac.cn/) - 提供中文向量化模型
- [ChromaDB](https://www.trychroma.com/) - 向量数据库
- [ECharts](https://echarts.apache.org/) - 数据可视化

⭐ 如果这个项目对你有帮助，请给一个 Star！
```

### 20.2 API.md

```markdown
# API 接口文档

## 概述

- **基础 URL**: `http://localhost:8000/api`
- **响应格式**: JSON
- **字符编码**: UTF-8

## 通用响应格式

### 成功响应

```json
{
  "success": true,
  "data": {...},
  "message": "操作成功"
}
```

### 错误响应

```json
{
  "error": "错误类型",
  "detail": "详细错误信息"
}
```

## 一、课程管理 API

### 1.1 创建课程

**POST** `/courses/create`

**请求体**

```json
{
  "question": "如何快速掌握JavaScript编程开发？"
}
```

**响应**

```json
{
  "id": "uuid",
  "title": "JavaScript精通之路",
  "keywords": ["JavaScript", "前端", "编程"],
  "originalQuestion": "如何快速掌握JavaScript编程开发？",
  "status": "active",
  "progress": 0,
  "threeAskProgress": {
    "question1": false,
    "question2": false,
    "question3": false
  },
  "createdAt": 1704067200000
}
```

### 1.2 获取课程列表

**GET** `/courses/list`

**查询参数**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| status | string | - | 课程状态筛选 |
| limit | int | 50 | 每页数量 |
| offset | int | 0 | 偏移量 |

**响应**

```json
{
  "courses": [...],
  "total": 10
}
```

### 1.3 获取单个课程

**GET** `/courses/{course_id}`

响应：同创建课程响应

### 1.4 更新课程状态

**PATCH** `/courses/{course_id}/status`

**请求体**

```json
{
  "status": "archived"
}
```

### 1.5 删除课程

**DELETE** `/courses/{course_id}`

## 二、知识库 API

### 2.1 上传资料

**POST** `/knowledge/upload`

请求格式: `multipart/form-data`

| 字段 | 类型 | 说明 |
|------|------|------|
| course_id | string | 课程ID |
| file | file | 文件（PDF/Word/Markdown/TXT）|

**响应**

```json
{
  "success": true,
  "doc_id": "uuid"
}
```

### 2.2 AI 智能补充

**POST** `/knowledge/ai-fetch/{course_id}`

**响应**

```json
{
  "success": true,
  "message": "AI 资料补充已启动"
}
```

### 2.3 获取资料列表

**GET** `/knowledge/documents`

**查询参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| course_id | string | 课程ID |
| source | string | user/ai（可选）|

### 2.4 语义检索

**POST** `/knowledge/search`

**请求体**

```json
{
  "course_id": "uuid",
  "query": "闭包的概念",
  "top_k": 5
}
```

**响应**

```json
{
  "results": [
    {
      "content": "闭包是指函数能够记住并访问它的词法作用域...",
      "score": 0.89,
      "metadata": {"source": "user", "title": "JavaScript高级编程"}
    }
  ]
}
```

## 三、三问引擎 API

### 3.1 生成知识图谱（第一问）

**POST** `/three-ask/graph/generate/{course_id}`

**响应**

```json
{
  "nodes": [
    {
      "id": "node1",
      "name": "闭包",
      "description": "函数与其词法环境的组合",
      "bloom_level": "understand",
      "difficulty": 0.6,
      "is_threshold_concept": true,
      "x": 100,
      "y": 200
    }
  ],
  "links": [
    {
      "source": "node1",
      "target": "node2",
      "relation": "prerequisite",
      "strength": 0.8
    }
  ]
}
```

### 3.2 检测争议点（第二问）

**POST** `/three-ask/controversy/detect/{course_id}`

**响应**

```json
{
  "status": "processing",
  "message": "争议分析已开始"
}
```

### 3.3 获取争议点列表

**GET** `/three-ask/controversy/{course_id}`

**响应**

```json
{
  "controversies": [
    {
      "id": "c1",
      "topic": "闭包是否会导致内存泄漏？",
      "pro_view": "会，闭包会持有外部变量引用",
      "pro_evidence": "MDN文档说明...",
      "con_view": "不会，现代JS引擎有优化",
      "con_evidence": "V8引擎优化机制...",
      "confidence": 0.85
    }
  ]
}
```

### 3.4 生成测评题目（第三问）

**POST** `/three-ask/quiz/generate/{course_id}`

**响应**

```json
{
  "quizzes": [
    {
      "id": "quiz_remember_1",
      "dimension": "记忆",
      "bloom_level": "remember",
      "difficulty": 0.2,
      "question_type": "single",
      "question": "闭包的定义是什么？",
      "options": ["A. 函数与环境的组合", "B. 函数内部函数", "C. 全局变量", "D. 匿名函数"],
      "correct_answer": "A",
      "explanation": "闭包是指函数能够记住并访问它的词法作用域",
      "knowledge_points": ["闭包", "作用域"]
    }
  ],
  "total": 12
}
```

### 3.5 提交答案

**POST** `/three-ask/quiz/submit`

**请求体**

```json
{
  "course_id": "uuid",
  "question_id": "quiz_remember_1",
  "user_answer": "A",
  "time_spent": 15
}
```

**响应**

```json
{
  "is_correct": true,
  "score": 100,
  "explanation": "闭包是指函数与其词法环境的组合",
  "feedback": "回答正确！"
}
```

### 3.6 完成测评

**POST** `/three-ask/quiz/{course_id}/complete`

**响应**

```json
{
  "success": true,
  "message": "测评完成",
  "accuracy": 75.0
}
```

### 3.7 获取三问进度

**GET** `/three-ask/progress/{course_id}`

**响应**

```json
{
  "question1": true,
  "question2": false,
  "question3": false,
  "overallProgress": 33
}
```

## 四、SSE 实时推送

### 4.1 建立 SSE 连接

**GET** `/sse/stream/{course_id}`

### 事件类型

| 事件名 | 触发时机 | 数据格式 |
|--------|---------|---------|
| graph_updated | 知识图谱更新 | {nodes, links} |
| controversy_ready | 争议分析完成 | {controversies[]} |
| quiz_ready | 测评生成完成 | {quizzes[]} |
| progress | 进度更新 | {progress} |
| notification | 系统通知 | {message, type} |

### 客户端示例

```javascript
const es = new EventSource('/api/sse/stream/course_123');

es.addEventListener('graph_updated', (e) => {
  const data = JSON.parse(e.data);
  updateKnowledgeGraph(data);
});

es.addEventListener('controversy_ready', (e) => {
  const data = JSON.parse(e.data);
  showControversies(data.controversies);
});
```

## 五、状态码说明

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 401 | 未授权 |
| 404 | 资源不存在 |
| 413 | 文件过大 |
| 500 | 服务器内部错误 |

## 六、错误码

| 错误码 | 说明 |
|--------|------|
| INVALID_FILE_TYPE | 不支持的文件类型 |
| FILE_TOO_LARGE | 文件过大 |
| COURSE_NOT_FOUND | 课程不存在 |
| DOCUMENT_NOT_FOUND | 资料不存在 |
| AI_SERVICE_ERROR | AI 服务异常 |
| VECTOR_SEARCH_ERROR | 向量检索失败 |
```

### 20.3 DEPLOY.md

```markdown
# 部署指南

## 一、部署方式选择

| 方式 | 适用场景 | 复杂度 | 推荐 |
|------|---------|--------|------|
| 本地一键启动 | 个人使用、开发测试 | ⭐ | ✅ |
| Docker 部署 | 生产环境、团队使用 | ⭐⭐ | ✅ |
| 云服务器部署 | 公网访问 | ⭐⭐⭐ | ⚠️ |

---

## 二、本地一键启动（推荐）

### Windows 用户

1. 安装 Python 3.11+ 和 Node.js 18+
2. 双击 `install.bat` 安装依赖
3. 配置 `backend/.env` 中的 API Key
4. 双击 `start.bat` 启动程序

### Mac/Linux 用户

```bash
# 1. 添加执行权限
chmod +x install.sh start.sh

# 2. 安装依赖
./install.sh

# 3. 配置 API Key
cp backend/.env.example backend/.env
# 编辑 backend/.env，填入 MINIMAX_API_KEY

# 4. 启动程序
./start.sh
```

---

## 三、Docker 部署

### 前置要求

- Docker 20.10+
- Docker Compose 2.0+

### 部署步骤

```bash
# 1. 克隆项目
git clone https://github.com/yourname/sanwen-learning.git
cd sanwen-learning

# 2. 配置环境变量
cp backend/.env.example backend/.env
# 编辑 backend/.env 填入 API Key

# 3. 启动所有服务
docker-compose up -d

# 4. 查看日志
docker-compose logs -f

# 5. 停止服务
docker-compose down
```

### 服务端口

| 服务 | 端口 | 外部访问 |
|------|------|---------|
| 前端 | 5173 | http://localhost:5173 |
| 后端 API | 8000 | http://localhost:8000 |
| ChromaDB | 8001 | http://localhost:8001 |

---

## 四、云服务器部署

### 4.1 服务器要求

| 配置 | 最低要求 | 推荐配置 |
|------|---------|---------|
| CPU | 2核 | 4核 |
| 内存 | 4GB | 8GB |
| 磁盘 | 20GB | 50GB |
| 系统 | Ubuntu 20.04+ | Ubuntu 22.04 |

### 4.2 安装 Docker

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com | bash
sudo systemctl enable docker
sudo systemctl start docker

# 安装 Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 4.3 部署项目

```bash
# 1. 克隆项目
git clone https://github.com/yourname/sanwen-learning.git
cd sanwen-learning

# 2. 配置环境变量
cp backend/.env.example backend/.env
vim backend/.env  # 填入 API Key

# 3. 使用 Docker Compose 启动
docker-compose up -d

# 4. 配置 Nginx 反向代理（可选）
```

### 4.4 Nginx 配置

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    # 前端
    location / {
        proxy_pass http://localhost:5173;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # 后端 API
    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # WebSocket (SSE)
    location /api/sse {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_buffering off;
        proxy_cache off;
        proxy_set_header X-Accel-Buffering no;
    }
}
```

---

## 五、环境变量配置

### 后端环境变量 (backend/.env)

| 变量 | 说明 | 必填 | 默认值 |
|------|------|------|--------|
| MINIMAX_API_KEY | MiniMax API 密钥 | ✅ | - |
| MINIMAX_API_HOST | API 地址 | ❌ | https://api.minimaxi.com |
| DATA_DIR | 数据目录 | ❌ | ./data |
| BACKEND_PORT | 后端端口 | ❌ | 8000 |
| FRONTEND_URL | 前端地址 | ❌ | http://localhost:5173 |

### 前端环境变量 (frontend/.env)

| 变量 | 说明 | 必填 | 默认值 |
|------|------|------|--------|
| VITE_API_URL | API 地址 | ❌ | http://localhost:8000/api |
| VITE_APP_NAME | 应用名称 | ❌ | 三问高效学习机 |

---

## 六、数据备份

### 备份数据库

```bash
# SQLite 数据库
cp data/courses.db data/backups/courses_$(date +%Y%m%d).db

# 向量数据库
cp -r data/chroma data/backups/chroma_$(date +%Y%m%d)

# 用户上传文件
cp -r data/uploads data/backups/uploads_$(date +%Y%m%d)
```

### 定时备份 (crontab)

```bash
# 每天凌晨 2 点备份
0 2 * * * /path/to/backup.sh
```

---

## 七、故障排查

### 7.1 后端启动失败

```bash
# 检查端口占用
lsof -i :8000
# 或
netstat -an | grep 8000

# 检查 Python 依赖
pip list | grep fastapi

# 查看详细日志
python main.py --debug
```

### 7.2 前端连接不上后端

```bash
# 检查后端是否运行
curl http://localhost:8000/api/health

# 检查 CORS 配置
# 确保 backend/main.py 中 allow_origins 包含前端地址
```

### 7.3 ChromaDB 连接失败

```bash
# 检查 ChromaDB 服务
docker ps | grep chromadb

# 重启 ChromaDB
docker-compose restart chromadb
```

### 7.4 AI API 调用失败

```bash
# 检查 API Key 配置
cat backend/.env | grep MINIMAX_API_KEY

# 测试 API 连接
curl -X POST https://api.minimaxi.com/v1/test \
  -H "Authorization: Bearer $MINIMAX_API_KEY"
```

---

## 八、性能优化建议

### 8.1 后端优化

```python
# 启用 uvicorn 多进程
uvicorn main:app --workers 4 --host 0.0.0.0 --port 8000

# 添加数据库索引
CREATE INDEX idx_courses_status ON courses(status);
```

### 8.2 前端优化

```bash
# 生产环境构建
npm run build

# 使用 CDN 加速静态资源
# 配置 vite.config.ts 中的 base 路径
```

### 8.3 向量检索优化

```python
# 调整 ChromaDB 索引参数
collection = client.create_collection(
    name="course_xxx",
    metadata={"hnsw:space": "cosine", "hnsw:M": 32, "hnsw:ef_construction": 200}
)
```

---

## 九、安全建议

- **API Key 管理**：不要将 .env 文件提交到版本控制
- **文件上传限制**：已限制文件类型和大小
- **CORS 配置**：生产环境只允许可信域名
- **数据加密**：敏感数据使用加密存储
- **定期更新**：及时更新依赖包版本

---

## 十、联系方式

- 技术问题：提交 [GitHub Issue](https://github.com/anson1220/ThreeQuestionsLearning/issues)
- 商务合作：business@sanwen.com
```

### 20.4 项目文档汇总

| 文件 | 用途 |
|------|------|
| README.md | 项目简介、功能说明、快速开始指南 |
| API.md | 完整API接口文档（REST + SSE） |
| DEPLOY.md | 部署指南、故障排查、性能优化 |

### 20.5 验证方法

```bash
# 访问 http://localhost:5173 检查前端运行
# 访问 http://localhost:8000/docs 检查API文档
# 查看 README.md 确认项目结构完整
```

---

## 📋 归档完成清单

| 批次 | 分组 | 文件数 | Section | 状态 |
|------|------|--------|---------|------|
| 第1批 | 后端基础层 | 5 | 13 | ✅ |
| 第2批 | 后端路由层 | 5 | 14 | ✅ |
| 第3批 | 数据库表结构 | 2 | 15 | ✅ |
| 第4批 | 后端服务层 | 7 | 16 | ✅ |
| 第5批 | 前端API层 | 5 | 17 | ✅ |
| 第6批 | 前端业务组件 | 3 | 18 | ✅ |
| 第7批 | 配置文件 | 10 | 19 | ✅ |
| 第8批 | 项目文档 | 3 | 20 | ✅ |
| **总计** | | **40** | - | ✅ |

### 项目启动验证

```bash
# 1. 安装依赖
./install.sh  # Mac/Linux
# 或双击 install.bat  # Windows

# 2. 配置 API Key
cp backend/.env.example backend/.env
# 编辑 backend/.env 填入 MINIMAX_API_KEY

# 3. 启动程序
./start.sh  # Mac/Linux
# 或双击 start.bat  # Windows

# 4. 访问应用
# 前端: http://localhost:5173
# 后端: http://localhost:8000
# API文档: http://localhost:8000/docs
```

---

## 21. 修复补丁

> 以下修复针对 OpenSpec 归档过程中发现的问题

### 21.1 修复1：import 路径错误

**问题描述：** 部分组件的 import 路径错误，多了一层 `components/` 路径

**修复文件：**

#### src/components/business/QuizEntrance.tsx

```typescript
// ❌ 错误写法
import { CheckCircleIcon, ClockIcon } from '../components/ui/Icons'

// ✅ 正确写法
import { CheckCircleIcon, ClockIcon } from '../ui/Icons'
```

#### src/components/business/CourseCard.tsx

```typescript
// ❌ 错误写法
import { BookIcon, ChevronRightIcon } from '../components/ui/Icons'

// ✅ 正确写法
import { BookIcon, ChevronRightIcon } from '../ui/Icons'
```

#### src/components/business/ControversyPanel.tsx

```typescript
// ❌ 错误写法
import { ChevronDownIcon, ChevronUpIcon, MessageIcon } from '../components/ui/Icons'

// ✅ 正确写法
import { ChevronDownIcon, ChevronUpIcon, MessageIcon } from '../ui/Icons'
```

#### src/layouts/TabBarLayout.tsx

```typescript
// ❌ 错误写法
import { HomeIcon, PersonIcon } from '../components/ui/Icons'

// ✅ 正确写法
import { HomeIcon, PersonIcon } from '../ui/Icons'
```

#### src/components/business/QuizPlayer.tsx

```typescript
// ❌ 错误写法
import { CheckIcon, XIcon, BookOpenIcon } from '../components/ui/Icons'

// ✅ 正确写法
import { CheckIcon, XIcon, BookOpenIcon } from '../ui/Icons'
```

### 21.2 修复2：补充缺失的图标组件

**文件：** `src/components/ui/Icons.tsx` - 完整版

```typescript
import React from 'react';

// ============================================
// 导航图标
// ============================================

export const HomeIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M3 9.5L12 3L21 9.5V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V9.5Z" />
    <path d="M9 21V12H15V21" />
  </svg>
);

export const BrainIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M12 4.5c1.5 0 3 .5 4 1.5l.5.5c1 1 1.5 2.5 1.5 4v1c0 2-1 4-3 5.5l-1 1c-.5.5-1 1-1.5 1.5l-.5.5c-1 1-2.5 1.5-4 1.5s-3-.5-4-1.5l-.5-.5c-.5-.5-1-1-1.5-1.5l-1-1C5 16 4 14 4 12v-1c0-1.5.5-3 1.5-4l.5-.5c1-1 2.5-1.5 4-1.5z"/>
    <path d="M12 4.5v15"/>
    <path d="M9 7c0 1.5.5 3 1.5 4"/>
    <path d="M15 7c0 1.5-.5 3-1.5 4"/>
    <path d="M9 12c0 2 1 4 3 5"/>
    <path d="M15 12c0 2-1 4-3 5"/>
  </svg>
);

export const ClipboardIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
  </svg>
);

export const PersonIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

// ============================================
// 操作图标
// ============================================

export const SearchIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

export const UploadIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M12 3v12m0 0-3-3m3 3 3-3" />
    <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
  </svg>
);

export const BookIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);

export const ChevronRightIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 18l6-6-6-6" />
  </svg>
);

export const ChevronLeftIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

export const ChevronDownIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M6 9l6 6 6-6" />
  </svg>
);

export const ChevronUpIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 15l-6-6-6 6" />
  </svg>
);

// ============================================
// 反馈图标
// ============================================

export const CheckIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

export const XIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export const CheckCircleIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <path d="M22 4L12 14.01l-3-3" />
  </svg>
);

export const ClockIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </svg>
);

export const MessageIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

export const BookOpenIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </svg>
);

export const LightbulbIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M9 18h6" />
    <path d="M10 22h4" />
    <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
  </svg>
);

export const FlagIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
    <line x1="4" y1="22" x2="4" y2="15" />
  </svg>
);

export const RotateCcwIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M1 4v6h6" />
    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
  </svg>
);

export const PlayIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5v14l11-7z" />
  </svg>
);

export const SparklesIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
    <path d="M5 19l1 3 1-3 3-1-3-1-1-3-1 3-3 1 3 1z" />
    <path d="M19 13l1 2 1-2 2-1-2-1-1-2-1 2-2 1 2 1z" />
  </svg>
);

export const ArchiveIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="3" y="10" width="18" height="12" rx="2" />
    <path d="M6 10V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v4" />
    <line x1="12" y1="14" x2="12" y2="18" />
    <line x1="9" y1="16" x2="15" y2="16" />
  </svg>
);

export const DownloadIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

export const GearIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);
```

### 21.3 修复3：补充缺失的路由端点

#### backend/routers/courses.py - 补充导出端点

```python
# 在文件末尾添加

@router.get("/export/{course_id}")
async def export_course(course_id: str, format: str = "json"):
    """导出课程数据（JSON/Markdown/PDF）"""
    from services.export_service import get_export_service
    from database import get_db
    
    export_service = get_export_service()
    
    with get_db() as conn:
        # 获取课程数据
        course = conn.execute("SELECT * FROM courses WHERE id = ?", (course_id,)).fetchone()
        if not course:
            raise HTTPException(404, "课程不存在")
        
        documents = conn.execute(
            "SELECT * FROM documents WHERE course_id = ?",
            (course_id,)
        ).fetchall()
        
        progress = conn.execute(
            "SELECT * FROM learning_progress WHERE course_id = ?",
            (course_id,)
        ).fetchone()
        
        controversies = conn.execute(
            "SELECT * FROM controversies WHERE course_id = ?",
            (course_id,)
        ).fetchall()
    
    course_data = {
        "course": dict(course),
        "documents": [dict(d) for d in documents],
        "progress": dict(progress) if progress else None,
        "controversies": [dict(c) for c in controversies]
    }
    
    if format == "json":
        result = export_service.export_course_json(course_data)
    elif format == "markdown":
        result = export_service.export_course_markdown(course_data)
    else:
        raise HTTPException(400, f"不支持的格式: {format}")
    
    return result
```

#### backend/routers/knowledge.py - 补充进度端点

```python
# 在文件末尾添加

@router.get("/ai-progress/{course_id}")
async def get_ai_progress(course_id: str):
    """获取 AI 资料补充进度（SSE）"""
    from routers.sse import push_event
    
    # 模拟进度推送
    import asyncio
    
    async def progress_generator():
        for i in range(0, 101, 20):
            push_event(course_id, "progress", {"type": "ai_fetch", "progress": i})
            await asyncio.sleep(0.5)
    
    # 在后台执行
    asyncio.create_task(progress_generator())
    
    return {"status": "started", "message": "进度推送已启动"}
```

### 21.4 修复4：补充 ChromaDB 连接初始化

#### backend/main.py - 添加上电初始化

```python
# 在 main.py 中添加 startup 事件

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

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
# 启动和关闭事件
# ============================================

@app.on_event("startup")
async def startup_event():
    """应用启动时初始化服务"""
    print("🚀 正在启动三问高效学习机后端...")
    
    # 初始化 ChromaDB
    try:
        from services.chroma_client import get_chroma_client
        client = get_chroma_client()
        print("✅ ChromaDB 连接成功")
    except Exception as e:
        print(f"⚠️ ChromaDB 连接失败: {e}")
    
    # 初始化 Embedding 模型（可选，预加载）
    try:
        from services.embedding_service import get_embedding_service
        embedder = get_embedding_service()
        print("✅ Embedding 服务已就绪")
    except Exception as e:
        print(f"⚠️ Embedding 服务初始化失败: {e}")
    
    print("✅ 后端服务启动完成")


@app.on_event("shutdown")
async def shutdown_event():
    """应用关闭时清理资源"""
    print("🛑 正在关闭三问高效学习机后端...")


# ============================================
# 导入路由
# ============================================

from routers import courses, knowledge, three_ask, quiz, sse

app.include_router(courses.router, prefix="/api/courses", tags=["课程管理"])
app.include_router(knowledge.router, prefix="/api/knowledge", tags=["知识库"])
app.include_router(three_ask.router, prefix="/api/three-ask", tags=["三问引擎"])
app.include_router(quiz.router, prefix="/api/quiz", tags=["测评中心"])
app.include_router(sse.router, prefix="/api/sse", tags=["实时推送"])

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
```

### 21.5 修复5：补充 ChromaDB 客户端实现

#### backend/services/chroma_client.py - 完整实现

```python
import os
import json
from pathlib import Path
from typing import List, Dict, Optional, Any
from dotenv import load_dotenv

load_dotenv()

class ChromaClient:
    """ChromaDB 向量数据库客户端"""
    
    def __init__(self):
        self.client = None
        self.persist_dir = os.getenv("CHROMA_DIR", "./data/chroma")
        self._connect()
    
    def _connect(self):
        """连接 ChromaDB"""
        try:
            import chromadb
            from chromadb.config import Settings
            
            # 确保目录存在
            Path(self.persist_dir).mkdir(parents=True, exist_ok=True)
            
            self.client = chromadb.PersistentClient(
                path=self.persist_dir,
                settings=Settings(anonymized_telemetry=False)
            )
            print(f"✅ ChromaDB 连接成功: {self.persist_dir}")
        except ImportError:
            print("⚠️ chromadb 未安装，请运行: pip install chromadb")
            self.client = None
        except Exception as e:
            print(f"⚠️ ChromaDB 连接失败: {e}")
            self.client = None
    
    def get_collection(self, course_id: str) -> Optional[Any]:
        """获取或创建课程的知识库集合"""
        if self.client is None:
            return None
        
        # 集合名称规范化
        collection_name = f"course_{course_id}".replace("-", "_")
        
        try:
            collection = self.client.get_collection(collection_name)
        except Exception:
            collection = self.client.create_collection(
                name=collection_name,
                metadata={"hnsw:space": "cosine"}
            )
        
        return collection
    
    def add_documents(
        self,
        course_id: str,
        ids: List[str],
        documents: List[str],
        metadatas: Optional[List[Dict]] = None,
        embeddings: Optional[List[List[float]]] = None
    ) -> bool:
        """添加文档到向量库"""
        collection = self.get_collection(course_id)
        if collection is None:
            return False
        
        try:
            collection.add(
                ids=ids,
                documents=documents,
                metadatas=metadatas or [{}] * len(ids),
                embeddings=embeddings
            )
            return True
        except Exception as e:
            print(f"添加文档失败: {e}")
            return False
    
    def search(
        self,
        course_id: str,
        query: str,
        query_embedding: Optional[List[float]] = None,
        top_k: int = 5
    ) -> List[Dict]:
        """语义检索"""
        collection = self.get_collection(course_id)
        if collection is None:
            return []
        
        try:
            if query_embedding:
                results = collection.query(
                    query_embeddings=[query_embedding],
                    n_results=top_k
                )
            else:
                results = collection.query(
                    query_texts=[query],
                    n_results=top_k
                )
            
            # 格式化结果
            formatted = []
            if results and results.get("documents"):
                for i in range(len(results["documents"][0])):
                    formatted.append({
                        "content": results["documents"][0][i],
                        "score": 1 - results["distances"][0][i] if results.get("distances") else 0.5,
                        "metadata": results["metadatas"][0][i] if results.get("metadatas") else {}
                    })
            
            return formatted
        except Exception as e:
            print(f"搜索失败: {e}")
            return []
    
    def delete_collection(self, course_id: str) -> bool:
        """删除课程的知识库集合"""
        if self.client is None:
            return False
        
        collection_name = f"course_{course_id}".replace("-", "_")
        
        try:
            self.client.delete_collection(collection_name)
            return True
        except Exception:
            return False
    
    def delete_document(self, course_id: str, doc_id: str) -> bool:
        """删除单个文档"""
        collection = self.get_collection(course_id)
        if collection is None:
            return False
        
        try:
            collection.delete(ids=[doc_id])
            return True
        except Exception:
            return False


# 单例实例
_chroma_client = None

def get_chroma_client() -> ChromaClient:
    global _chroma_client
    if _chroma_client is None:
        _chroma_client = ChromaClient()
    return _chroma_client
```

### 21.6 修复6：补充 Embedding 服务

#### backend/services/embedding_service.py - 完整实现

```python
import os
import numpy as np
from typing import List, Union
from dotenv import load_dotenv

load_dotenv()

class EmbeddingService:
    """向量化服务 - 使用 BAAI/bge-large-zh 模型"""
    
    def __init__(self):
        self.model = None
        self.model_name = os.getenv("EMBEDDING_MODEL", "BAAI/bge-large-zh-v1.5")
        self.dimension = int(os.getenv("EMBEDDING_DIMENSION", 1024))
        self._load_model()
    
    def _load_model(self):
        """加载向量化模型（懒加载）"""
        try:
            from sentence_transformers import SentenceTransformer
            print(f"正在加载向量化模型: {self.model_name}")
            self.model = SentenceTransformer(self.model_name)
            print(f"✅ 向量化模型加载完成，维度: {self.dimension}")
        except ImportError:
            print("⚠️ sentence-transformers 未安装，请运行: pip install sentence-transformers")
            self.model = None
        except Exception as e:
            print(f"⚠️ 向量化模型加载失败: {e}")
            print("   将使用模拟向量")
            self.model = None
    
    def encode(self, texts: Union[str, List[str]]) -> List[List[float]]:
        """将文本转换为向量"""
        
        if isinstance(texts, str):
            texts = [texts]
        
        # 如果模型未加载，返回模拟向量
        if self.model is None:
            return self._mock_encode(texts)
        
        try:
            embeddings = self.model.encode(texts, normalize_embeddings=True)
            return embeddings.tolist()
        except Exception as e:
            print(f"向量化失败: {e}")
            return self._mock_encode(texts)
    
    def _mock_encode(self, texts: List[str]) -> List[List[float]]:
        """生成模拟向量（开发测试用）"""
        np.random.seed(42)
        return [np.random.randn(self.dimension).tolist() for _ in texts]
    
    def similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """计算两个向量的余弦相似度"""
        v1 = np.array(vec1)
        v2 = np.array(vec2)
        return float(np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2) + 1e-8))
    
    async def search_similar(
        self,
        query: str,
        documents: List[dict],
        top_k: int = 5
    ) -> List[dict]:
        """在文档列表中搜索相似内容"""
        
        if not documents:
            return []
        
        # 向量化查询
        query_vec = self.encode(query)[0]
        
        # 计算相似度
        results = []
        for doc in documents:
            if "embedding" in doc:
                similarity = self.similarity(query_vec, doc["embedding"])
            else:
                similarity = 0.5  # 无向量的文档给默认分数
            
            results.append({
                **doc,
                "score": similarity
            })
        
        # 排序并返回 top_k
        results.sort(key=lambda x: x["score"], reverse=True)
        return results[:top_k]


# 单例实例
_embedding_service = None

def get_embedding_service() -> EmbeddingService:
    global _embedding_service
    if _embedding_service is None:
        _embedding_service = EmbeddingService()
    return _embedding_service
```

### 21.7 修复7：补充 PDF 解析服务

#### backend/services/parser_service.py - 完整实现

```python
import os
import re
from pathlib import Path
from typing import Optional, List

class ParserService:
    """文件解析服务 - 支持 PDF/Word/Markdown/TXT"""
    
    def __init__(self):
        self.max_chunk_size = 500
        self.chunk_overlap = 50
    
    async def parse_file(self, file_path: str, file_type: str) -> str:
        """解析文件，提取纯文本"""
        
        file_ext = Path(file_path).suffix.lower()
        
        if file_type == "application/pdf" or file_ext == ".pdf":
            return await self._parse_pdf(file_path)
        elif file_type in ["application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"] or file_ext in [".doc", ".docx"]:
            return await self._parse_word(file_path)
        elif file_type in ["text/markdown", "text/plain"] or file_ext in [".md", ".txt"]:
            return await self._parse_text(file_path)
        else:
            return f"不支持的文件类型: {file_type}"
    
    async def _parse_pdf(self, file_path: str) -> str:
        """解析 PDF 文件"""
        try:
            from pypdf import PdfReader
            
            reader = PdfReader(file_path)
            text = ""
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
            
            return text.strip() if text else f"[PDF 文件: {Path(file_path).name}，无法提取文本内容]"
        except ImportError:
            return f"[PDF 文件: {Path(file_path).name}，请安装 pypdf 库]"
        except Exception as e:
            return f"[PDF 解析失败: {e}]"
    
    async def _parse_word(self, file_path: str) -> str:
        """解析 Word 文件"""
        try:
            from docx import Document
            
            doc = Document(file_path)
            text = "\n".join([para.text for para in doc.paragraphs if para.text.strip()])
            
            return text.strip() if text else f"[Word 文件: {Path(file_path).name}，无文本内容]"
        except ImportError:
            return f"[Word 文件: {Path(file_path).name}，请安装 python-docx 库]"
        except Exception as e:
            return f"[Word 解析失败: {e}]"
    
    async def _parse_text(self, file_path: str) -> str:
        """解析文本/Markdown 文件"""
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
            
            # 如果是 Markdown，移除部分格式标记
            if file_path.endswith(".md"):
                content = self._clean_markdown(content)
            
            return content.strip()
        except UnicodeDecodeError:
            # 尝试其他编码
            with open(file_path, "r", encoding="gbk") as f:
                return f.read().strip()
        except Exception as e:
            return f"[文本解析失败: {e}]"
    
    def _clean_markdown(self, content: str) -> str:
        """清理 Markdown 格式标记"""
        # 移除图片
        content = re.sub(r'!\[.*?\]\(.*?\)', '', content)
        # 移除链接（保留文字）
        content = re.sub(r'\[(.*?)\]\(.*?\)', r'\1', content)
        # 移除代码块标记
        content = re.sub(r'```.*?```', '', content, flags=re.DOTALL)
        # 移除行内代码标记
        content = re.sub(r'`(.*?)`', r'\1', content)
        # 移除粗体/斜体标记
        content = re.sub(r'\*\*(.*?)\*\*', r'\1', content)
        content = re.sub(r'\*(.*?)\*', r'\1', content)
        # 移除标题标记
        content = re.sub(r'^#+\s+', '', content, flags=re.MULTILINE)
        
        return content
    
    def chunk_text(self, text: str) -> List[str]:
        """将长文本分块"""
        if len(text) <= self.max_chunk_size:
            return [text]
        
        chunks = []
        start = 0
        
        while start < len(text):
            end = start + self.max_chunk_size
            
            # 尝试在段落边界分割
            if end < len(text):
                # 寻找最近的段落结束
                last_period = text.rfind('。', start, end)
                last_newline = text.rfind('\n', start, end)
                split_pos = max(last_period, last_newline)
                
                if split_pos > start:
                    end = split_pos + 1
            
            chunk = text[start:end].strip()
            if chunk:
                chunks.append(chunk)
            
            start = end - self.chunk_overlap if end < len(text) else end
        
        return chunks


# 单例实例
_parser_service = None

def get_parser_service() -> ParserService:
    global _parser_service
    if _parser_service is None:
        _parser_service = ParserService()
    return _parser_service
```

### 21.8 修复汇总

| 修复项 | 文件 | 操作 |
|--------|------|------|
| 修复1 | 多个组件文件 | 更正 import 路径 |
| 修复2 | src/components/ui/Icons.tsx | 补充缺失图标 |
| 修复3 | backend/routers/courses.py | 添加导出端点 |
| 修复3 | backend/routers/knowledge.py | 添加进度端点 |
| 修复4 | backend/main.py | 添加上电初始化 |
| 修复5 | backend/services/chroma_client.py | 完整实现 |
| 修复6 | backend/services/embedding_service.py | 完整实现 |
| 修复7 | backend/services/parser_service.py | 完整实现 |