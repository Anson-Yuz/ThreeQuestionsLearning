# 任务清单 — Tab 栏间距对称分布 ✅

## 阶段 1：响应用户反馈

- [x] 收到反馈：「间距太窄了，对称扩大些，分成四份位置，第一根线和第三根线」
- [x] 解读：将屏幕宽度 4 等分，两个 Tab 分别放在 1/4 和 3/4 位置
- [x] 原样式分析：`justify-center gap-24 max-w-[400px]` 导致两个 Tab 挤在中间

## 阶段 2：修改样式

- [x] `TabBarLayout.tsx` 删除 `gap-24` 和 `max-w-[400px] mx-auto`
- [x] 改为 `flex justify-around items-center h-14`
- [x] 验证 `npx tsc --noEmit` 零错误

## 阶段 3：归档与推送

- [x] 提交 `29dc04b fix(ui): Tab 栏改为 justify-around,两个 Tab 对称分布于 1/4 / 3/4 位置`
- [x] 推送到 origin/main
