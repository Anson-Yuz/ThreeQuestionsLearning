---
title: 项目基础设施
version: 1.0.0
status: active
domain: infrastructure
---

### Requirement: 项目 MUST 包含完整的启动/安装脚本

#### Scenario: macOS 用户双击启动
GIVEN 用户首次使用项目
WHEN 用户双击 `start.command`
THEN 系统自动检查 Node.js/Python 环境
AND 自动安装缺失依赖
AND 启动后端(8000)和前端(5173)
AND 自动打开浏览器访问 http://localhost:5173

#### Scenario: Windows 用户双击启动
GIVEN 用户首次使用项目
WHEN 用户双击 `start.bat`
THEN 系统启动后端和前端服务

### Requirement: 项目 MUST 通过 OpenSpec 完整检测

#### Scenario: 提交前验证
GIVEN 所有代码变更完成
WHEN 运行 `bash scripts/full-check.sh`
THEN 输出 SHALL 为 `✓ OpenSpec 100% 完成！可以提交。`
AND 通过数 ≥ 39 项
AND 失败数 = 0 项
AND 生成 `openspec-report.json`
