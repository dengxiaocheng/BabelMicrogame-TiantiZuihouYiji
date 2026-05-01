# TASK BREAKDOWN: 天梯最后一级

## Dependency Order

```
foundation → state → content ──┐
                   └──→ ui ────┤
                               ↓
                          integration → qa
```

- foundation 必须先完成
- state、content、ui 可并行 (依赖 foundation)
- integration 等待 state + content + ui 全部完成
- qa 最后执行

---

## Worker 1: `tianti-zuihou-yiji-foundation`

- **Lane**: foundation
- **Level**: M
- **Goal**: 建立可运行的项目骨架，包含 Required State 类型定义、Phase 配置常量、Canvas/DOM 渲染容器和主循环框架
- **Deliverables**:
  - 项目构建配置 (可运行的 HTML + JS 入口)
  - Required State 类型/接口定义 (materials, stress, wind, crossing_order, crossing_progress)
  - Phase 配置常量 (缺口段数、初始材料、人员、wind 基值)
  - 游戏主循环状态机框架 (IDLE → VIEWING_GAP → BUILDING → ORDERING → CROSSING → STRESS_CHECK → PHASE_COMPLETE/COLLAPSE)
- **Acceptance**:
  - `npm start` 或等效命令可启动空白页面
  - 类型定义与 DIRECTION_LOCK.md Required State 一致
  - Phase 配置与 DIRECTION_LOCK.md Progression Rhythm 一致
  - 状态机可空转 (每个状态都有 enter/exit 占位)
- **Serves Primary Input**: 为后续 worker 提供材料拖放和人员排序所需的状态结构和 Phase 切换逻辑
- **Anti-patterns**:
  - 不要实现具体渲染或交互逻辑
  - 不要引入游戏内容 (事件、文案)
  - 不要偏离 DIRECTION_LOCK.md 定义的状态

---

## Worker 2: `tianti-zuihou-yiji-state`

- **Lane**: logic
- **Level**: M
- **Goal**: 实现 MECHANIC_SPEC.md 中所有状态计算：材料放置验证、structure strength 计算、stress 累积、wind 影响、crossing 结算
- **Deliverables**:
  - 材料放置验证函数 (Board → 缺口格位, Rope → 相邻 Board, Wedge → 已放置 Board)
  - structure strength 计算函数
  - stress 计算函数 (含 wind/wedge 联动)
  - crossing 逐人结算函数
  - 状态转换函数 (VIEWING_GAP → BUILDING → ORDERING → CROSSING → STRESS_CHECK)
- **Acceptance**:
  - 放置 1 Board 到 1 段缺口 → segment_strength = 30
  - 绑 1 Rope → 相邻 Board 各 +20
  - 锚 1 Wedge → Board +15, wind 减免 20%
  - 少年A(w=1) 通过 → stress += 10 + wind_stress
  - stress 累积到 ≥ 100 → 返回 COLLAPSE 状态
  - 全员通过 → 返回 PHASE_COMPLETE 状态
  - 所有计算与 MECHANIC_SPEC.md 公式一致
- **Serves Primary Input**: 为拖放操作和通行排序提供底层结算逻辑
- **Anti-patterns**:
  - 不要处理 UI 渲染
  - 不要硬编码 Phase 配置 (从 foundation 读取)
  - 不要修改 foundation 定义的状态类型

---

## Worker 3: `tianti-zuihou-yiji-content`

- **Lane**: content
- **Level**: M
- **Goal**: 实现 MINI_GDD.md 中定义的事件池和人员数据，强化核心循环"临时桥搭建 + 承重顺序 + 人员通行"
- **Deliverables**:
  - 人员数据集 (轻/中/重 + 名字 + 可选 special 标记)
  - 4 个 Phase 的人员分配配置
  - 事件池实现 (材料事件、天气事件、人员事件、结构事件)
  - 事件触发条件和效果函数
- **Acceptance**:
  - 每个事件有明确的触发条件和 Required State 影响
  - 人员 weight 值为 1/2/3，与 MECHANIC_SPEC.md 一致
  - Phase 配置与 DIRECTION_LOCK.md Progression Rhythm 一致
  - 事件不会改变核心循环流程，只影响 Required State 数值
- **Serves Primary Input**: 为通行排序提供人员重量差，增加"先过谁"的策略深度
- **Anti-patterns**:
  - 不要添加叙事剧情或对话
  - 不要引入新状态变量 (只用 Required State)
  - 不要绕过拖放交互直接用文字选择触发事件

---

## Worker 4: `tianti-zuihou-yiji-ui`

- **Lane**: ui
- **Level**: M
- **Goal**: 实现 SCENE_INTERACTION_SPEC.md 中定义的所有可拖拽对象和反馈通道，让玩家看见核心压力、可选操作和后果反馈
- **Deliverables**:
  - 缺口格位渲染 (drop target)
  - 材料 (Board/Rope/Wedge) 可拖拽组件
  - 人员卡片可拖拽排序组件
  - Stress 条颜色渐变显示
  - Wind 条和风向动画
  - 通过/坠落结果动画
  - "开始通行"和"重置结构"按钮
- **Acceptance**:
  - Board 可从材料栏拖放到缺口格位 (鼠标/触摸)
  - Rope 可拖放到两块相邻 Board 之间绑定
  - Wedge 可拖放到已放置 Board 上锚定
  - 人员卡片可拖拽重排通行队列
  - 每次拖放产生即时反馈 (高亮/颜色/数值变化)
  - Stress 条颜色与 SCENE_INTERACTION_SPEC.md 定义一致
  - 首屏显示至少一个可操作材料
- **Serves Primary Input**: 实现核心拖放交互 (板/绳/楔搭桥 + 人员排序)
- **Anti-patterns**:
  - 不要用文字按钮列表替代拖放操作
  - 不要隐藏 stress/wind 数值
  - 不要添加 SCENE_INTERACTION_SPEC.md 未定义的 UI 元素
  - 不要实现状态计算逻辑 (调用 state worker 的函数)

---

## Worker 5: `tianti-zuihou-yiji-integration`

- **Lane**: integration
- **Level**: M
- **Goal**: 把 state/content/ui 接成单一主循环，使 ACCEPTANCE_PLAYTHROUGH.md Step 1–9 可完整试玩
- **Deliverables**:
  - 主循环集成 (状态机驱动 state + content + ui)
  - Phase 切换逻辑 (Phase 完成 → 下一 Phase 配置)
  - 事件触发集成 (Phase 中随机触发 content 事件)
  - 端到端拖放 → 状态结算 → UI 反馈完整链路
  - GAME_OVER / VICTORY 结算画面
- **Acceptance**:
  - ACCEPTANCE_PLAYTHROUGH.md Step 1–9 可完整试玩
  - 拖放 Board → materials 变化 → UI 更新
  - 安排顺序 → 开始通行 → 逐人结算 → stress 实时变化
  - stress ≥ 100 → 坍塌动画 → GAME_OVER
  - 全员通过 → PHASE_COMPLETE → 下一 Phase
  - Phase 4 完成 → VICTORY
- **Serves Primary Input**: 连通拖放操作到状态结算的完整链路
- **Anti-patterns**:
  - 不要重新实现 state/content/ui 的逻辑
  - 不要绕过 state worker 直接计算 stress
  - 不要降级拖放为文字按钮
  - 如需偏离 Direction Lock，停止并回交 manager

---

## Worker 6: `tianti-zuihou-yiji-qa`

- **Lane**: qa
- **Level**: S
- **Goal**: 用测试和 scripted playthrough 确认方向没跑偏
- **Deliverables**:
  - state 计算单元测试 (与 MECHANIC_SPEC.md 公式对齐)
  - ACCEPTANCE_PLAYTHROUGH.md 逐步验证记录
  - 坍塌场景验证记录
- **Acceptance**:
  - state 计算测试全部通过
  - ACCEPTANCE_PLAYTHROUGH.md 每个 Step 的期望结果与实际一致
  - 坍塌场景正确触发 GAME_OVER
  - 未发现 Direction Lock 偏离
- **Serves Primary Input**: 确保拖放操作到状态结算的链路完整正确
- **Anti-patterns**:
  - 不要只测试 UI 外观，忽略状态计算正确性
  - 不要跳过 ACCEPTANCE_PLAYTHROUGH.md 的任何 Step
  - 如发现方向偏离，记录并回交 manager
