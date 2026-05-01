// content.js — 天梯最后一级 event pool & engine
// All events serve core loop: 查看缺口 -> 放置板/绳/楔 -> 安排通过顺序 -> 结构受力 -> 成功通过或坠落
// Events modify Required State (materials, stress, wind, crossing_order, crossing_progress)
// and produce feedback through Scene Objects and Feedback Channels

(function () {

  // ─── Feedback channel mapping ───
  // Each event targets a specific feedback channel:
  //   stress   -> 结构受力颜色 (stress bar color shift)
  //   wind     -> wind偏移 (wind bar movement)
  //   material -> 材料损耗 (material count change)
  //   progress -> 通过进度 (crossing progress change)

  const URGENCY_STYLE = {
    info:     { color: '#7ec8e3', duration: 120 },
    warning:  { color: '#e8a838', duration: 150 },
    danger:   { color: '#e84545', duration: 180 },
    critical: { color: '#ff0040', duration: 200 },
  };

  // ─── Event Pool ───
  // Each event: { id, phases, trigger(state), apply(state), feedback }

  var EVENTS = [

    // === BUILD PHASE: environment pressure on placement decisions ===

    {
      id: 'gust_warning',
      phases: ['build', 'order'],
      cooldown: 8,
      _lastTick: -99,
      // Triggers when wind is already high and bridge has gaps
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
      _lastTick: -99,
      // Triggers when ropes are placed in wind — risk of material weakening
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
      _lastTick: -99,
      // Triggers when wedges are placed — they settle and grip, minor stress reduction
      trigger: function (s) {
        var hasWedge = s.placedMaterials.some(function (m) { return m.type === 'wedges'; });
        return hasWedge && s.stress > 15;
      },
      apply: function (s) {
        s.stress = Math.max(0, s.stress - 3);
      },
      feedback: { channel: 'stress', text: '楔子卡入缝隙，结构略微稳固', urgency: 'info' }
    },

    // === ORDER PHASE: weight & composition pressure ===

    {
      id: 'weight_warning',
      phases: ['order'],
      cooldown: 6,
      _lastTick: -99,
      // Triggers when total order weight exceeds bridge capacity — ordering matters!
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
      _lastTick: -99,
      // Reward: putting light person first reduces initial stress
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

    // === CROSS PHASE: dynamic pressure during crossing ===

    {
      id: 'bridge_creak',
      phases: ['cross'],
      cooldown: 6,
      _lastTick: -99,
      // Triggers at moderate stress — rising tension
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
      _lastTick: -99,
      // Triggers when wedges placed and wind high — material stress event
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
      _lastTick: -99,
      // Triggers when heavy person (>=65kg) is crossing — weight order consequence
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
      _lastTick: -99,
      // Triggers when light person (<=45kg) is crossing — reward good ordering
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
      _lastTick: -99,
      // Major danger: storm intensifies mid-crossing — time pressure!
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
      _lastTick: -99,
      // Brief respite — hope amid tension, but don't last
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
      _lastTick: -99,
      // Triggers when ropes are placed — flexibility helps absorb but swings
      trigger: function (s) {
        var hasRope = s.placedMaterials.some(function (m) { return m.type === 'ropes'; });
        return hasRope && s.wind > 25;
      },
      apply: function (s) {
        // Ropes absorb shock (reduce stress) but wind makes them swing (slow progress)
        s.stress = Math.max(0, s.stress - 2);
        s.crossingProgress = Math.max(0, s.crossingProgress - 3);
      },
      feedback: { channel: 'progress', text: '绳索在风中摇摆，减缓了速度', urgency: 'warning' }
    },

    {
      id: 'board_crack',
      phases: ['cross'],
      cooldown: 12,
      _lastTick: -99,
      // Triggers when boards are under heavy stress — material failure risk
      trigger: function (s) {
        var hasBoard = s.placedMaterials.some(function (m) { return m.type === 'boards'; });
        return hasBoard && s.stress > 55;
      },
      apply: function (s) {
        s.stress += 8;
      },
      feedback: { channel: 'material', text: '木板出现了裂纹！', urgency: 'critical' }
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

      // Cooldown check
      if (this.tickCount - evt._lastTick < evt.cooldown) continue;

      // Probability gate (some events fire less often)
      if (evt.id === 'wind_lull' && Math.random() > 0.3) continue;
      if (evt.id === 'storm_surge' && Math.random() > 0.25) continue;

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

  // Drain messages for scene rendering, decrement TTL
  EventEngine.prototype.getMessages = function () {
    for (var i = activeMessages.length - 1; i >= 0; i--) {
      activeMessages[i].ttl--;
      if (activeMessages[i].ttl <= 0) {
        activeMessages.splice(i, 1);
      }
    }
    return activeMessages.slice(); // return copy
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

})();
