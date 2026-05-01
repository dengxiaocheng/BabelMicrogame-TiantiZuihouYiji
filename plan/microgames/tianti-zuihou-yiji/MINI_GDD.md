# MINI GDD: 天梯最后一级

## Scope

- runtime: web (HTML5 Canvas 或 DOM)
- duration: 20min，分 4 个 Phase
- project_line: 天梯最后一级
- single_core_loop: 查看缺口 -> 放置板/绳/楔 -> 安排通过顺序 -> 结构受力 -> 成功通过或坠落

## Core Loop

1. **查看缺口**: 屏幕上方显示当前缺口段数和结构状态
2. **放置材料**: 玩家从材料栏拖放板/绳/楔到缺口格位
3. **安排顺序**: 玩家拖动人员卡片排列通行队列
4. **结构受力**: 每人通过时结算 stress，wind 持续施加额外应力
5. **结果反馈**: 通过成功 (crossing_progress++) 或坠落 (stress ≥ 100)

## State

- materials: { board, rope, wedge } — 各材料剩余数量
- stress: float 0–100 — 结构当前应力
- wind: float 0–100 — 风力，随 Phase 递增
- crossing_order: Person[] — 玩家安排的通行队列
- crossing_progress: int — 已安全通过人数

## State Transitions

```
IDLE → (phase_start) → VIEWING_GAP
VIEWING_GAP → (player drags material) → BUILDING
BUILDING → (player places all available materials) → ORDERING
ORDERING → (player confirms order) → CROSSING
CROSSING → (each person crosses) → STRESS_CHECK
STRESS_CHECK → (stress < 100 && people remain) → CROSSING
STRESS_CHECK → (stress < 100 && no people remain) → PHASE_COMPLETE
STRESS_CHECK → (stress ≥ 100) → COLLAPSE → GAME_OVER
PHASE_COMPLETE → (more phases) → VIEWING_GAP
PHASE_COMPLETE → (last phase done) → VICTORY
```

## UI Layout

```
┌──────────────────────────────────────────────┐
│  [Phase indicator] [Timer]                    │
│                                               │
│  ┌─────────────────────────────┐ ┌─────────┐ │
│  │                             │ │材料栏    │ │
│  │    缺口 / 结构区域           │ │ 板 x2   │ │
│  │    (可拖放目标)              │ │ 绳 x2   │ │
│  │                             │ │ 楔 x1   │ │
│  └─────────────────────────────┘ └─────────┘ │
│                                               │
│  [Stress 条 ████████░░ 78%] [Wind 🌬️ 45]     │
│                                               │
│  通行队列: [人物A] [人物B] [人物C]  (可拖拽排序) │
│                                               │
│  [开始通行] [重置结构]                          │
└──────────────────────────────────────────────┘
```

- 主界面：缺口区域 + 材料栏 + 应力条 + 风力 + 通行队列
- 结果反馈：通过成功/失败的即时动画 + stress 变化
- 结算入口：Phase 完成 → VICTORY 或 GAME_OVER 画面
- 不加多余菜单、设置页或后台页

## Content

### 事件池 (小型，每 Phase 触发 0–1 个)
- **材料事件**: "发现一块旧木板" — 补充 1 个 board
- **天气事件**: "阵风加剧" — wind 瞬时 +15
- **人员事件**: "有人恐高犹豫" — 该人员通行时额外 +5 stress
- **结构事件**: "楔子松动" — 随机一个 wedge 效果减半

### 人员类型
- 轻量 (weight=1): 儿童、少年
- 中量 (weight=2): 成年人
- 重量 (weight=3): 携带物资的成年人

每 Phase 分配不同人员组合，重量差在 Phase 3 后成为关键因素。

## Constraints

- 总体规模目标控制在 5000 行以内
- 单个 worker 任务必须服从 packet budget
- 如需扩线，交回 manager 重新拆
- 不做终章剧情，不做开放世界
