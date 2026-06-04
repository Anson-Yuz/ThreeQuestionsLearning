# 任务清单 — Tab 栏真根因修复 ✅

## 阶段 1：排查

- [x] 用户反馈「问题还在」但代码已修改
- [x] 排查：grep `BrainIcon/ClipboardIcon/学习/测评` 在 `client/src` 下还有引用
- [x] 发现 37 个陈旧 `.js` 编译产物（Vite 优先解析 `.js`）
- [x] 验证：`TabBarLayout.js` 仍是旧 4-Tab 版本

## 阶段 2：清理

- [x] `find client/src -name "*.js" -type f -delete` 删除 37 个陈旧文件
- [x] 验证 `find src -name "*.js" | wc -l` = 0

## 阶段 3：根本修复

- [x] 在 `client/tsconfig.json` 添加 `"noEmit": true`
- [x] 验证 `npm run build` 仍成功
- [x] 验证 build 后 `src/` 下无新增 `.js` 文件

## 阶段 4：归档与推送

- [x] 提交 `61fbbff fix(client): tsconfig 添加 noEmit,防止 tsc 污染 .ts 源文件`
- [x] 推送到 origin/main
- [x] 提醒：用户可能需要重启 dev server 让 Vite 重新解析
