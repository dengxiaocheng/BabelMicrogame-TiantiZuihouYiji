# MECHANIC SPEC: 天梯最后一级

## Primary Mechanic

- mechanic: 临时桥搭建 + 承重顺序 + 人员通行
- primary_input: 拖放板/绳/楔搭桥并安排人员通过顺序
- minimum_interaction: 玩家必须用剩余材料搭出临时结构，再拖动人员顺序通过，stress 与 wind 持续改变

## Materials

### Board (木板)
- 覆盖 1 段缺口
- base_strength = 30
- 独立放置时，该段承受力 = 30

### Rope (绳索)
- 绑定 2 块已放置的 Board
- 被绑定的 Board 各 +20 strength
- 不可独立覆盖缺口

### Wedge (楔子)
- 锚定 1 块已放置的 Board
- 被锚定的 Board +15 strength
- 该段 wind 减免 = 20%
- 不可独立覆盖缺口

## Structure Strength Calculation

```
segment_strength[i] = board.base_strength
                    + (has_rope ? 20 : 0)
                    + (has_wedge ? 15 : 0)

total_strength = sum(segment_strength)
```

## Stress Calculation

```
crossing_stress = current_person.weight * 10
wind_stress = wind * 0.3 * (1 - wedge_coverage * 0.2)
per_crossing_delta = crossing_stress + wind_stress
stress += per_crossing_delta
```

- stress 从 0 开始累积
- 每有一人通过，stress 增加该人体重对应值 + 当前 wind 造成的应力
- wedge 覆盖率 = 已楔住的段数 / 总段数
- stress ≥ 100 → 结构坍塌 → 剩余人员坠落 → 当前 Phase 失败

## Crossing Mechanics

1. 玩家在 ORDERING 状态下拖拽人员卡片排列通行队列
2. 确认队列后进入 CROSSING 状态
3. 逐人自动通过，每人通过时：
   - crossing_progress++
   - stress += per_crossing_delta
   - 若 stress ≥ 100 → COLLAPSE → 未通过者坠落
4. 全部通过且 stress < 100 → PHASE_COMPLETE

## Person

```typescript
interface Person {
  id: string;
  name: string;
  weight: 1 | 2 | 3;  // 轻/中/重
  special?: string;     // 可选事件标记，如 "恐高"
}
```

- weight=1 (轻): 通过时 +10 crossing_stress
- weight=2 (中): 通过时 +20 crossing_stress
- weight=3 (重): 通过时 +30 crossing_stress

## Wind

- 每个 Phase 有基础 wind 值
- Phase 内 wind 每隔固定时间波动 ±5
- 天气事件可瞬时改变 wind
- wind 影响 wind_stress 计算

## State Coupling (每次有效操作必须推动两类后果)

### 示例 1: 放置 Board
- 生存/资源压力: materials.board-- (资源消耗)
- 秩序压力: segment_strength 改变，影响后续 crossing 可行性

### 示例 2: 安排通行顺序
- 关系/风险压力: 先让轻人过降低早期 stress 积累，但重人在后面 stress 更高
- 生存压力: 选择不同顺序直接影响 stress 是否会达到 100

### 示例 3: 人员通过
- 生存/进度压力: crossing_progress++ (进度推进)
- 关系/风险压力: stress 累积，后续人员风险增大

## Mechanic Steps

1. 玩家观察缺口段数和材料栏
2. 拖放 Board 到缺口格位 (至少覆盖所有段)
3. 可选拖放 Rope 绑定相邻 Board、拖放 Wedge 锚定 Board
4. 拖拽人员卡片安排 crossing_order
5. 点击"开始通行"
6. 系统逐人结算 stress 和 crossing_progress
7. 显示每人通过结果 (成功或坠落)

## Not A Choice List

- 不能只展示 2–4 个文字按钮让玩家选择
- 必须实现拖放操作到场景对象上
- UI worker 必须把 primary input 映射到可拖拽的 Board/Rope/Wedge 和人员卡片
- integration worker 必须让拖放操作进入状态结算，而不是只写叙事反馈
