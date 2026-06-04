# 提案：Tab 栏真根因修复 — tsc 污染 .ts 源文件

## 为什么改

前置 commit `a2b6090` 已经把 `TabBarLayout.tsx` 改为 2 个 Tab 居中，但用户反馈「问题还在」。

排查发现 37 个陈旧 `.js` 文件（编译产物）仍残留在 `client/src/` 下：
- `client/src/components/layout/TabBarLayout.js` —— 旧版 4 Tab + 引入 `BrainIcon/ClipboardIcon`
- `client/src/components/business/KnowledgeGraph.js` —— 旧版（无 Bloom 颜色分类）
- 等等...

Vite 在解析时优先匹配 `.js`，导致浏览器加载的是旧 JS 副本，掩盖了 `.tsx` 的所有修复。

## 改什么

### 1. 立即清理
`find client/src -name "*.js" -type f -delete` 删除 37 个陈旧产物

### 2. 根本修复
`client/tsconfig.json` 添加 `"noEmit": true`：
- 之前 `package.json` 的 `"build": "tsc && vite build"` 让 tsc 把 `.ts` 编译成 `.js` 写到 src 同目录
- Vite 偶尔会优先解析 `.js`
- 现在 `tsc` 只做类型检查，由 Vite/esbuild 处理实际编译

## 影响范围

- `client/tsconfig.json`（+1 行 `"noEmit": true`）
- 37 个陈旧 `.js` 文件（已删除，无需提交，gitignored）

## 风险评估

- **构建产物位置变化**：之前 `tsc` 把 `.js` 输出到 `src/` 同目录污染源；现在 `tsc` 不再输出任何文件，Vite 编译产物输出到 `dist/`，符合预期
- **dev 模式影响**：Vite dev server 一直用 ESM + esbuild 实时编译，不依赖 `.js` 文件
- **OpenSpec pre-push 检查**：`tsc && vite build` 中 `tsc` 现在只做类型检查，构建速度提升

## 验收标准

- `npm run build` 退出码 0，输出到 `dist/`，`src/` 下不出现新的 `.js` 文件
- 删除陈旧 `.js` 后浏览器自动用 `.tsx` 编译（无需重启 dev server，因为文件已变）
- Tab 栏只显示「首页」「我的」两个 Tab，居中
- `npx tsc --noEmit` 零错误
