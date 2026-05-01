# ACCEPTANCE PLAYTHROUGH: 天梯最后一级

## Minimum Playable Script

以下脚本是 integration worker 必须交付的最小可试玩流程。QA worker 用此脚本验证方向未跑偏。

### Setup (Phase 1 默认配置)
- 缺口: 1 段
- materials: { board: 3, rope: 2, wedge: 1 }
- stress: 0
- wind: 10
- 人员: [少年A(w=1), 成人B(w=2), 成人C(w=2)]

### Step-by-step Playthrough

#### Step 1: 开局显示
- **操作**: 无 (自动)
- **期望**: 屏幕显示缺口区域 (1 个空格位)、材料栏 (3 板 2 绳 1 楔)、stress=0、wind=10、3 人通行队列
- **验证**: 所有 Required State 可见

#### Step 2: 放置 Board
- **操作**: 从材料栏拖 1 个 Board 到缺口格位
- **期望**: 格位显示 Board 图形，materials.board=2，stress 预估更新
- **验证**: materials 直接变化 (资源消耗)

#### Step 3: 绑定 Rope
- **操作**: 拖 1 个 Rope 到已放置 Board (Phase 1 只有 1 段，Rope 提供额外加固)
- **期望**: Board 旁显示绳索标记，materials.rope=1，segment_strength 增加
- **验证**: 结构强度变化反映在 UI

#### Step 4: 锚定 Wedge
- **操作**: 拖 1 个 Wedge 到已放置 Board
- **期望**: Board 旁显示楔子标记，materials.wedge=0，wind 减免生效
- **验证**: wind 对 stress 的影响降低

#### Step 5: 安排通行顺序
- **操作**: 拖拽人员卡片排列为 [少年A, 成人B, 成人C]
- **期望**: 队列显示新顺序
- **验证**: crossing_order 确认

#### Step 6: 开始通行 — 第 1 人 (少年A, w=1)
- **操作**: 点击"开始通行"按钮
- **期望**:
  - 少年A 卡片滑向缺口并到达对面
  - crossing_progress = 1
  - stress += 1*10 + 10*0.3*(1-0.2) = 10 + 2.4 = 12.4
  - stress 条更新为 ~12, 绿色
- **验证**: crossing_progress++ (进度压力) + stress 增长 (风险压力)

#### Step 7: 第 2 人 (成人B, w=2)
- **操作**: 无 (自动继续)
- **期望**:
  - 成人B 通过
  - crossing_progress = 2
  - stress += 2*10 + 10*0.3*(1-0.2) = 20 + 2.4 = 22.4
  - stress ≈ 34.8, 黄色
- **验证**: stress 持续累积

#### Step 8: 第 3 人 (成人C, w=2)
- **操作**: 无 (自动继续)
- **期望**:
  - 成人C 通过
  - crossing_progress = 3
  - stress += 22.4
  - stress ≈ 57.2, 黄色偏橙
  - 全部通过 → PHASE_COMPLETE
- **验证**: Phase 1 完成，显示短暂庆祝

#### Step 9: 结算反馈
- **期望**:
  - 显示 "Phase 1 完成" 提示
  - crossing_progress = 3/3
  - materials 剩余: { board: 2, rope: 1, wedge: 0 }
  - stress 重置为 0 (新 Phase)
  - 自动进入 Phase 2 配置
- **验证**: 进入下一 Phase 的状态正确

### Failure Scenario (可选验证)

#### 坍塌场景
- **Setup**: 缺口 2 段，只放 1 个 Board，不绑绳不锚楔，安排重人先过
- **操作**: 5 人通行，重人(w=3)先过
- **期望**: stress 快速累积到 ≥100，结构坍塌动画，剩余人员坠落
- **验证**: GAME_OVER 状态正确触发

## Direction Gate

- integration worker 必须让上述 Step 1–9 流程可完整试玩
- QA worker 必须用自动化测试或手工记录验证每个 Step 的期望结果
- 如试玩要求需要偏离 Direction Lock，停止并回交 manager
- 拖放操作必须映射到场景对象，不允许降级为文字按钮

## Acceptance Checklist

- [ ] 首屏显示所有 Required State
- [ ] Board 可拖放到缺口格位
- [ ] Rope 可绑定已放置 Board
- [ ] Wedge 可锚定已放置 Board
- [ ] 人员卡片可拖拽排序
- [ ] 每次操作产生即时可见反馈
- [ ] stress 正确累积且与 weight/wind/wedge 联动
- [ ] stress ≥ 100 触发坍塌
- [ ] 全员通过触发 PHASE_COMPLETE
- [ ] 坍塌触发 GAME_OVER
