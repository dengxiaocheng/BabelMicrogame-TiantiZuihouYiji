# TASK_BREAKDOWN: 天梯最后一级

## Standard Worker Bundle

1. `tianti-zuihou-yiji-foundation`
   - lane: foundation
   - level: M
   - goal: 建立只服务「查看缺口 -> 放置板/绳/楔 -> 安排通过顺序 -> 结构受力 -> 成功通过或坠落」的可运行骨架

2. `tianti-zuihou-yiji-state`
   - lane: logic
   - level: M
   - goal: 实现 Direction Lock 状态的一次分配/操作结算

3. `tianti-zuihou-yiji-content`
   - lane: content
   - level: M
   - goal: 用事件池强化「临时桥搭建 + 承重顺序 + 人员通行」

4. `tianti-zuihou-yiji-ui`
   - lane: ui
   - level: M
   - goal: 让玩家看见核心压力、可选操作和后果反馈

5. `tianti-zuihou-yiji-integration`
   - lane: integration
   - level: M
   - goal: 把已有 state/content/ui 接成单一主循环

6. `tianti-zuihou-yiji-qa`
   - lane: qa
   - level: S
   - goal: 用测试和 scripted playthrough 确认方向没跑偏
