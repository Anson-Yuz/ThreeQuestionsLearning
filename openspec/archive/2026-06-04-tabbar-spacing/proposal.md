# 提案：Tab 栏间距对称分布

## 为什么改

前置 `a2b6090` 的 Tab 栏布局是 `justify-center gap-24 max-w-[400px] mx-auto`：
- 两个 Tab 挤在屏幕中央 400px 宽的容器内
- `gap-24`（96px）让两个图标挨得很近
- 在大屏手机（375px+）上，Tab 视觉上偏向中间偏右，整体不对称

用户反馈：「间距太窄了，对称扩大些，分成大约四份位置，在第一根线和第三根线上」。

要求两个 Tab 位于屏幕宽度的 1/4 和 3/4 位置（四等分中的第 1 格和第 3 格）。

## 改什么

`client/src/components/layout/TabBarLayout.tsx`：

```diff
- <div className="flex justify-center items-center gap-24 h-14 max-w-[400px] mx-auto">
+ <div className="flex justify-around items-center h-14">
```

- 移除 `max-w-[400px] mx-auto`（不再居中容器）
- 移除 `gap-24`（不再用固定间距）
- 改用 `justify-around`（两个项目时自动分布于 1/4 / 3/4 位置）

## 影响范围

- `client/src/components/layout/TabBarLayout.tsx`（1 行修改）

## 风险评估

- **窄屏 (< 320px)**：`justify-around` 在极窄屏可能让 Tab 紧贴边缘。当前项目无此场景
- **多 Tab 扩展**：若未来加回更多 Tab，`justify-around` 自动重新分布，行为符合预期

## 验收标准

- 两个 Tab 在屏幕宽度上对称分布
- 视觉上「首页」位于 1/4 位置、「我的」位于 3/4 位置
- Tab 高度、激活态、间距与其他 Tab 行为一致
- `npx tsc --noEmit` 零错误
