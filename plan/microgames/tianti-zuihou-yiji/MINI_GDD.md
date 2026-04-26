# MINI_GDD: 天梯最后一级

## Scope

- runtime: web
- duration: 20min
- project_line: 天梯最后一级
- single_core_loop: 查看缺口 -> 放置板/绳/楔 -> 安排通过顺序 -> 结构受力 -> 成功通过或坠落

## Core Loop
1. 执行核心循环：查看缺口 -> 放置板/绳/楔 -> 安排通过顺序 -> 结构受力 -> 成功通过或坠落
2. 按 20 分钟节奏推进：短缺口 -> 多材料 -> 人员重量差 -> 塔顶风暴下最后通行

## State

- resource
- pressure
- risk
- relation
- round

## UI

- 只保留主界面、结果反馈、结算入口
- 不加多余菜单和后台页

## Content

- 用小型事件池支撑主循环
- 一次只验证一条 Babel 创意线

## Constraints

- 总体规模目标控制在 5000 行以内
- 单个 worker 任务必须服从 packet budget
- 如需扩线，交回 manager 重新拆
