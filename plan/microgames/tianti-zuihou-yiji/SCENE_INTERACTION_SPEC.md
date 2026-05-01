# SCENE_INTERACTION_SPEC: 天梯最后一级

## Scene Objects

- 缺口格
- 木板
- 绳索
- 楔子
- 通行队列
- 风暴条

## Player Input

- primary_input: 拖放板/绳/楔搭桥并安排人员通过顺序
- minimum_interaction: 玩家必须用剩余材料搭出临时结构，再拖动人员顺序通过，stress 与 wind 持续改变

## Feedback Channels

- 结构受力颜色
- wind 偏移
- 材料损耗
- 通过进度

## Forbidden UI

- 不允许做终章剧情
- 不允许只用“让谁先过”按钮

## Acceptance Rule

- 首屏必须让玩家看到至少一个可直接操作的场景对象
- 玩家操作必须产生即时可见反馈，且反馈能追溯到 Required State
- 不得只靠随机事件文本或普通选择按钮完成主循环
