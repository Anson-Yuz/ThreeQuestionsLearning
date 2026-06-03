<!-- openspec workflow metadata -->
---
title: OpenSpec 流程规范
version: 1.0.0
status: active
domain: process
---

# OpenSpec 工作流程

## 目录结构

```
openspec/
├── README.md           # 本文件 — 流程说明
├── changes/            # 活跃的变更提案（待审批/实施中）
│   └── <change-name>/
│       ├── proposal.md # 为什么改、改什么、影响范围
│       ├── tasks.md    # 可执行的任务清单
│       ├── design.md   # 技术决策（可选）
│       └── specs/      # 增量规范
│           └── *.md    # ADDED / MODIFIED / REMOVED
├── specs/              # 已合并的主规范
│   └── *.md            # YAML 前置元数据 + Requirement/Scenario
└── archive/            # 已完成并归档的变更
    └── <date>-<change-name>/
```

## 核心工作流

### 1. 提案阶段
- 所有新功能、重构、修复必须先创建提案
- 存放于 `openspec/changes/<change-name>/`
- 必需文件: `proposal.md` + `tasks.md`
- 可选文件: `design.md`

### 2. 审查阶段
- 提交提案后等待人工审查
- 只有明确说"批准"或"开始实施"才能进入下一阶段

### 3. 实施阶段
- 严格按照 `tasks.md` 逐项实现
- 每完成一项标记 `[x]`

### 4. 同步与验证
- 实施中如需调整规范，先更新增量规范文件
- 再次获得确认后继续

### 5. 归档阶段
- 所有任务完成后归档
- 增量合并到 `specs/`，变更移入 `archive/`

## 规范文件格式

```markdown
---
title: 功能名称
version: 1.0.0
status: draft | active | archived
domain: 所属域
---

### Requirement: SHALL / MUST 描述
#### Scenario: GIVEN / WHEN / THEN
```

## 禁止行为

- ❌ 不允许跳过提案直接写代码
- ❌ 不允许未经批准合并规范或归档
- ❌ 不允许删除或修改已有 `specs/` 文件
