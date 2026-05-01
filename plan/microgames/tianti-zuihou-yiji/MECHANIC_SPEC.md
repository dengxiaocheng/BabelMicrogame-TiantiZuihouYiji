# MECHANIC_SPEC: 天梯最后一级

## Primary Mechanic

- mechanic: 临时桥搭建 + 承重顺序 + 人员通行
- primary_input: 拖放板/绳/楔搭桥并安排人员通过顺序
- minimum_interaction: 玩家必须用剩余材料搭出临时结构，再拖动人员顺序通过，stress 与 wind 持续改变

## Mechanic Steps

1. 观察缺口和材料强度
2. 拖放材料形成临时桥
3. 安排 crossing_order
4. 逐人通过并结算 stress/crossing_progress

## State Coupling

每次有效操作必须同时推动两类后果：

- 生存/资源/进度压力：从 Required State 中选择至少一个直接变化
- 关系/风险/秩序压力：从 Required State 中选择至少一个直接变化

## Not A Choice List

- 不能只展示 2-4 个文字按钮让玩家选择
- UI worker 必须把 primary input 映射到场景对象操作
- integration worker 必须让这个操作进入状态结算，而不是只写叙事反馈
