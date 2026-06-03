# 提案：OpenSpec 100% 完成

## 为什么改
项目完成度仅 26%，缺失整个 backend/ 目录、前端 API 层、Store、测试、文档和配置文件。

## 改什么
按 OpenSpec §13-§20 逐阶段补齐所有缺失文件，使 `full-check.sh` 输出 100% PASSED。

## 影响范围
- 新建 backend/（18 个文件）
- 新建 client/src/api/、stores、hooks、pages
- 新建配置/文档/脚本（14 个文件）
- 修改 App.tsx 路由、index.css 暗黑模式

## 验收标准
- `bash scripts/full-check.sh` → 0 失败
- `npx tsc --noEmit` → 零错误
- `npm run build` → 成功
- `python3 -m compileall backend/` → 零语法错误
- pytest → 21/21 通过
