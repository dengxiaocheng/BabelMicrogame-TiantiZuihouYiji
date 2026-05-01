// content.js — 天梯最后一级 event pool & engine
// All events serve core loop: 查看缺口 -> 放置板/绳/楔 -> 安排通过顺序 -> 结构受力 -> 成功通过或坠落
// Events modify Required State (materials, stress, wind, crossing_order, crossing_progress)
// and produce feedback through Scene Objects and Feedback Channels

(function () {

  // ─── Person content data ───
  // Personality traits that influence event triggers — serves crossing order decision
  var PERSON_CONTENT = {
    1: { id: 1, name: '勇者', weight: 70, trait: 'brave',
         desc: '身材魁梧，步伐沉稳，但体重对临时结构是最大考验' },
    2: { id: 2, name: '工匠', weight: 60, trait: 'crafty',
         desc: '擅长观察结构，能察觉细微的应力变化' },
    3: { id: 3, name: '少年', weight: 40, trait: 'agile',
         desc: '身手敏捷，体重最轻，善于利用绳索' },
    4: { id: 4, name: '长老', weight: 50, trait: 'fragile',
         desc: '年迈体弱，高处行走格外困难' },
  };

  // ─── Feedback channel mapping ───
  // Each event targets a specific feedback channel:
  //   stress   -> 结构受力颜色 (stress bar color shift)
  //   wind     -> wind偏移 (wind bar movement)
  //   material -> 材料损耗 (material count change)
  //   progress -> 通过进度 (crossing progress change)

  var URGENCY_STYLE = {
    info:     { color: '#7ec8e3', duration: 120 },
    warning:  { color: '#e8a838', duration: 150 },
    danger:   { color: '#e84545', duration: 180 },
    critical: { color: '#ff0040', duration: 200 },
  };

  // ─── Result content ───
  var RESULT_CONTENT = {
    perfect: '所有人安全通过临时天梯，塔顶的风暴在身后呼啸。',
    partial:  '一部分人通过了，但代价沉重。',
    fallen:   '有人坠入了缺口深处的黑暗中...',
  };

  // ─── Event Pool ───
  // Each event: { id, phases, probability, cooldown, trigger(state), apply(state), feedback }
  // probability: 0-1 chance of firing when conditions met (replaces hardcoded checks)

  var EVENTS = [

    // ═══ BUILD PHASE: environment pressure on placement decisions ═══

    {
      id: 'gust_warning',
      phases: ['build', 'order'],
      cooldown: 8,
      probability: 1.0,
      _lastTick: -99,
      trigger: function (s) {
        return s.wind > 25 && s.placedMaterials.length < 3;
      },
      apply: function (s) {
        s.wind = Math.min(100, s.wind + 8 + Math.random() * 5);
      },
      feedback: { channel: 'wind', text: '一阵强风从缺口涌来！', urgency: 'warning' }
    },

    {
      id: 'rope_fray',
      phases: ['build'],
      cooldown: 12,
      probability: 1.0,
      _lastTick: -99,
      trigger: function (s) {
        var hasRope = s.placedMaterials.some(function (m) { return m.type === 'ropes'; });
        return hasRope && s.wind > 20;
      },
      apply: function (s) {
        s.stress += 5;
      },
      feedback: { channel: 'stress', text: '绳索在风中微微磨损...', urgency: 'warning' }
    },

    {
      id: 'wedge_settle',
      phases: ['build'],
      cooldown: 10,
      probability: 1.0,
      _lastTick: -99,
      trigger: function (s) {
        var hasWedge = s.placedMaterials.some(function (m) { return m.type === 'wedges'; });
        return hasWedge && s.stress > 15;
      },
      apply: function (s) {
        s.stress = Math.max(0, s.stress - 3);
      },
      feedback: { channel: 'stress', text: '楔子卡入缝隙，结构略微稳固', urgency: 'info' }
    },

    // Build: urgency when nothing placed and storm howling
    {
      id: 'empty_gap_urgency',
      phases: ['build'],
      cooldown: 15,
      probability: 0.4,
      _lastTick: -99,
      trigger: function (s) {
        return s.placedMaterials.length === 0 && s.wind > 30;
      },
      apply: function (s) {
        s.stress += 6;
      },
      feedback: { channel: 'stress', text: '缺口在风暴中暴露无遗，必须赶紧搭建！', urgency: 'danger' }
    },

    // ═══ ORDER PHASE: weight & composition pressure ═══

    {
      id: 'weight_warning',
      phases: ['order'],
      cooldown: 6,
      probability: 1.0,
      _lastTick: -99,
      trigger: function (s) {
        if (s.crossingOrder.length < 2) return false;
        var totalW = s._orderWeight();
        var bridgeStr = s._bridgeStrength();
        return totalW > bridgeStr * 1.5;
      },
      apply: function (s) {
        s.stress += 4;
      },
      feedback: { channel: 'stress', text: '结构在预挂重量下发出咯吱声...', urgency: 'danger' }
    },

    {
      id: 'light_first_bonus',
      phases: ['order'],
      cooldown: 99,
      probability: 1.0,
      _lastTick: -99,
      trigger: function (s) {
        if (s.crossingOrder.length === 0) return false;
        var firstId = s.crossingOrder[0];
        var first = s.persons.find(function (p) { return p.id === firstId; });
        return first && first.weight <= 45 && s.stress > 5;
      },
      apply: function (s) {
        s.stress = Math.max(0, s.stress - 4);
      },
      feedback: { channel: 'progress', text: '最轻的人先试，结构压力减轻', urgency: 'info' }
    },

    // Order: storm escalates when many queued — pressure to commit
    {
      id: 'order_pressure',
      phases: ['order'],
      cooldown: 8,
      probability: 0.5,
      _lastTick: -99,
      trigger: function (s) {
        return s.crossingOrder.length >= 3 && s.wind > 25;
      },
      apply: function (s) {
        s.wind = Math.min(100, s.wind + 5);
      },
      feedback: { channel: 'wind', text: '风暴不等人，快安排好顺序！', urgency: 'warning' }
    },

    // ═══ CROSS PHASE: dynamic pressure during crossing ═══

    {
      id: 'bridge_creak',
      phases: ['cross'],
      cooldown: 6,
      probability: 1.0,
      _lastTick: -99,
      trigger: function (s) {
        return s.stress > 30 && s.stress < 65;
      },
      apply: function (s) {
        s.stress += 3 + Math.random() * 4;
      },
      feedback: { channel: 'stress', text: '木板发出不祥的嘎吱声...', urgency: 'danger' }
    },

    {
      id: 'wedge_slip',
      phases: ['cross'],
      cooldown: 8,
      probability: 1.0,
      _lastTick: -99,
      trigger: function (s) {
        var hasWedge = s.placedMaterials.some(function (m) { return m.type === 'wedges'; });
        return hasWedge && s.wind > 30;
      },
      apply: function (s) {
        s.stress += 6;
      },
      feedback: { channel: 'material', text: '楔子在风中微微滑动！', urgency: 'danger' }
    },

    {
      id: 'heavy_step',
      phases: ['cross'],
      cooldown: 5,
      probability: 1.0,
      _lastTick: -99,
      trigger: function (s) {
        var pid = s.crossingOrder[s.currentCrosserIdx];
        var p = s.persons.find(function (x) { return x.id === pid; });
        return p && p.weight >= 65;
      },
      apply: function (s) {
        s.stress += 4;
      },
      feedback: { channel: 'stress', text: '沉重的脚步让结构剧烈晃动！', urgency: 'danger' }
    },

    {
      id: 'light_step',
      phases: ['cross'],
      cooldown: 6,
      probability: 1.0,
      _lastTick: -99,
      trigger: function (s) {
        var pid = s.crossingOrder[s.currentCrosserIdx];
        var p = s.persons.find(function (x) { return x.id === pid; });
        return p && p.weight <= 45 && s.stress > 8;
      },
      apply: function (s) {
        s.stress = Math.max(0, s.stress - 3);
        s.crossingProgress += 2;
      },
      feedback: { channel: 'progress', text: '轻盈的脚步减轻了结构压力', urgency: 'info' }
    },

    {
      id: 'storm_surge',
      phases: ['cross'],
      cooldown: 15,
      probability: 0.25,
      _lastTick: -99,
      trigger: function (s) {
        return s.ticks > 8 && s.wind > 20;
      },
      apply: function (s) {
        s.wind = Math.min(100, s.wind + 12);
        s.stress += 7;
      },
      feedback: { channel: 'wind', text: '塔顶风暴突然加剧！', urgency: 'critical' }
    },

    {
      id: 'wind_lull',
      phases: ['build', 'order', 'cross'],
      cooldown: 10,
      probability: 0.3,
      _lastTick: -99,
      trigger: function (s) {
        return s.wind > 35;
      },
      apply: function (s) {
        s.wind = Math.max(5, s.wind - 10);
      },
      feedback: { channel: 'wind', text: '风力短暂减弱...', urgency: 'info' }
    },

    {
      id: 'rope_swing',
      phases: ['cross'],
      cooldown: 8,
      probability: 1.0,
      _lastTick: -99,
      trigger: function (s) {
        var hasRope = s.placedMaterials.some(function (m) { return m.type === 'ropes'; });
        return hasRope && s.wind > 25;
      },
      apply: function (s) {
        s.stress = Math.max(0, s.stress - 2);
        s.crossingProgress = Math.max(0, s.crossingProgress - 3);
      },
      feedback: { channel: 'progress', text: '绳索在风中摇摆，减缓了速度', urgency: 'warning' }
    },

    {
      id: 'board_crack',
      phases: ['cross'],
      cooldown: 12,
      probability: 1.0,
      _lastTick: -99,
      trigger: function (s) {
        var hasBoard = s.placedMaterials.some(function (m) { return m.type === 'boards'; });
        return hasBoard && s.stress > 55;
      },
      apply: function (s) {
        s.stress += 8;
      },
      feedback: { channel: 'material', text: '木板出现了裂纹！', urgency: 'critical' }
    },

    // ═══ PERSON-SPECIFIC: crossing order consequence events ═══
    // Each person has unique behavior during crossing — reinforces ordering decision

    // 长老(50kg, id:4): fragile — struggles under stress, slows down
    {
      id: 'elder_struggle',
      phases: ['cross'],
      cooldown: 7,
      probability: 0.6,
      _lastTick: -99,
      trigger: function (s) {
        var pid = s.crossingOrder[s.currentCrosserIdx];
        return pid === 4 && s.stress > 35;
      },
      apply: function (s) {
        s.stress += 5;
        s.crossingProgress = Math.max(0, s.crossingProgress - 2);
      },
      feedback: { channel: 'stress', text: '长老在高处瑟瑟发抖，走得格外小心', urgency: 'danger' }
    },

    // 少年(40kg, id:3): agile — bonus when ropes placed
    {
      id: 'youth_rapid',
      phases: ['cross'],
      cooldown: 8,
      probability: 0.6,
      _lastTick: -99,
      trigger: function (s) {
        var pid = s.crossingOrder[s.currentCrosserIdx];
        var hasRope = s.placedMaterials.some(function (m) { return m.type === 'ropes'; });
        return pid === 3 && hasRope && s.wind < 40;
      },
      apply: function (s) {
        s.crossingProgress += 6;
      },
      feedback: { channel: 'progress', text: '少年抓住绳索，灵巧地快速通过！', urgency: 'info' }
    },

    // 勇者(70kg, id:1): brave — steady progress if structure holds
    {
      id: 'brave_steady',
      phases: ['cross'],
      cooldown: 7,
      probability: 0.5,
      _lastTick: -99,
      trigger: function (s) {
        var pid = s.crossingOrder[s.currentCrosserIdx];
        return pid === 1 && s.stress < 55;
      },
      apply: function (s) {
        s.crossingProgress += 4;
      },
      feedback: { channel: 'progress', text: '勇者沉着脚步，稳稳推进', urgency: 'info' }
    },

    // 工匠(60kg, id:2): crafty — in order + bridge built = stress insight
    {
      id: 'craftsman_insight',
      phases: ['order'],
      cooldown: 12,
      probability: 0.5,
      _lastTick: -99,
      trigger: function (s) {
        var inOrder = s.crossingOrder.indexOf(2) >= 0;
        return inOrder && s.placedMaterials.length >= 2 && s.stress > 10;
      },
      apply: function (s) {
        s.stress = Math.max(0, s.stress - 5);
      },
      feedback: { channel: 'stress', text: '工匠仔细查看了结构，调整了一处支撑', urgency: 'info' }
    },

    // ═══ MATERIAL SYNERGY: bridge composition consequences ═══

    // Full bridge (all 3 slots) = more stable — rewards complete construction
    {
      id: 'full_bridge_bonus',
      phases: ['cross'],
      cooldown: 10,
      probability: 0.5,
      _lastTick: -99,
      trigger: function (s) {
        return s.placedMaterials.length === 3 && s.stress > 15;
      },
      apply: function (s) {
        s.stress = Math.max(0, s.stress - 4);
      },
      feedback: { channel: 'stress', text: '完整的桥面让结构更加稳固', urgency: 'info' }
    },

    // Incomplete bridge degrades under load — punishes half-building
    {
      id: 'gaps_widen',
      phases: ['cross'],
      cooldown: 9,
      probability: 0.5,
      _lastTick: -99,
      trigger: function (s) {
        return s.placedMaterials.length < 2 && s.crossingProgress > 30;
      },
      apply: function (s) {
        s.stress += 5;
      },
      feedback: { channel: 'stress', text: '缺口处的材料在重压下变形！', urgency: 'danger' }
    },

    // ═══ CLIMACTIC TENSION: late-crossing pressure ═══

    // Last person — storm surges for the finale
    {
      id: 'last_push',
      phases: ['cross'],
      cooldown: 10,
      probability: 0.5,
      _lastTick: -99,
      trigger: function (s) {
        var remaining = s.crossingOrder.length - s.currentCrosserIdx;
        return remaining === 1 && s.ticks > 10;
      },
      apply: function (s) {
        s.wind = Math.min(100, s.wind + 8);
        s.stress += 4;
      },
      feedback: { channel: 'wind', text: '最后一人！风暴在身后越刮越烈', urgency: 'critical' }
    },

    // Near-miss: high stress + almost across — knife-edge moment
    {
      id: 'near_miss',
      phases: ['cross'],
      cooldown: 8,
      probability: 0.5,
      _lastTick: -99,
      trigger: function (s) {
        return s.stress > 70 && s.crossingProgress > 60 && s.stress < 90;
      },
      apply: function (s) {
        s.stress += 3;
      },
      feedback: { channel: 'stress', text: '结构剧烈摇晃，差一点就要断裂！', urgency: 'critical' }
    },
  ];

  // ─── Event Engine ───

  var activeMessages = []; // { text, color, ttl }

  function EventEngine(state) {
    this.state = state;
    this.tickCount = 0;
  }

  // Check all events for current phase; fire eligible ones
  EventEngine.prototype.check = function () {
    var s = this.state;
    var phase = s.phase;
    this.tickCount++;

    for (var i = 0; i < EVENTS.length; i++) {
      var evt = EVENTS[i];
      if (evt.phases.indexOf(phase) === -1) continue;
      if (this.tickCount - evt._lastTick < evt.cooldown) continue;

      // Probability gate (field-driven, no hardcoded ID checks)
      if (Math.random() > (evt.probability || 1.0)) continue;

      if (evt.trigger(s)) {
        evt.apply(s);
        evt._lastTick = this.tickCount;

        // Clamp state after event
        s.stress = Math.max(0, Math.min(100, s.stress));
        s.wind = Math.max(0, Math.min(100, s.wind));

        // Queue visual feedback
        var style = URGENCY_STYLE[evt.feedback.urgency] || URGENCY_STYLE.info;
        activeMessages.push({
          text: evt.feedback.text,
          color: style.color,
          ttl: style.duration,
          channel: evt.feedback.channel,
        });
      }
    }
  };

  // Generate result content based on game outcome
  EventEngine.prototype.getResultContent = function (state) {
    var crossed = state.persons.filter(function (p) { return p.crossed; }).length;
    var fallen = state.persons.filter(function (p) { return p.fallen; }).length;
    var total = state.persons.length;

    if (fallen > 0) return RESULT_CONTENT.fallen;
    if (crossed === total) return RESULT_CONTENT.perfect;
    return RESULT_CONTENT.partial;
  };

  // Drain messages for scene rendering, decrement TTL
  EventEngine.prototype.getMessages = function () {
    for (var i = activeMessages.length - 1; i >= 0; i--) {
      activeMessages[i].ttl--;
      if (activeMessages[i].ttl <= 0) {
        activeMessages.splice(i, 1);
      }
    }
    return activeMessages.slice();
  };

  // Clear all on reset
  EventEngine.prototype.reset = function () {
    activeMessages.length = 0;
    for (var i = 0; i < EVENTS.length; i++) {
      EVENTS[i]._lastTick = -99;
    }
  };

  // Expose
  window.EventEngine = EventEngine;
  window.EventFeedback = {
    getUrgencyStyle: function (urgency) { return URGENCY_STYLE[urgency] || URGENCY_STYLE.info; }
  };
  window.PersonContent = PERSON_CONTENT;

})();
