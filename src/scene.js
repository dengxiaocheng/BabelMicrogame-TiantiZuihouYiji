// scene.js — 天梯最后一级 enhanced canvas rendering & drag-drop interaction
// Enhanced: immediate pressure visibility, bridge stress visualization, crossing animation

(function () {
  var C = document.getElementById('game');
  var ctx = C.getContext('2d');
  var W = C.width, H = C.height;

  // Layout zones
  var GAP = { x: 320, y: 200, w: 320, h: 120 };
  var MAT_PANEL = { x: 20, y: 60, w: 260, h: 540 };
  var PPL_PANEL = { x: 680, y: 60, w: 260, h: 540 };
  var ORDER_SLOTS = [
    { x: 310, y: 430 }, { x: 410, y: 430 },
    { x: 510, y: 430 }, { x: 610, y: 430 }
  ];
  var BRIDGE_POS = [
    { x: 350, y: 230 }, { x: 450, y: 230 }, { x: 550, y: 230 }
  ];

  // Animation state
  var windParticles = [];
  for (var pi = 0; pi < 50; pi++) {
    windParticles.push({
      x: Math.random() * W, y: Math.random() * H,
      size: 1 + Math.random() * 2, speed: 0.5 + Math.random() * 1.5
    });
  }
  var shakeOffset = { x: 0, y: 0 };
  var glowPhase = 0;

  // Drag state
  var drag = null; // { kind, id/type, ox, oy, mx, my, color, label }

  // ─── Drawing helpers ───

  function drawRect(x, y, w, h, fill, stroke) {
    ctx.fillStyle = fill; ctx.fillRect(x, y, w, h);
    if (stroke) { ctx.strokeStyle = stroke; ctx.strokeRect(x, y, w, h); }
  }

  function drawText(txt, x, y, color, size, align) {
    ctx.fillStyle = color || '#eee';
    ctx.font = (size || 14) + 'px sans-serif';
    ctx.textAlign = align || 'left';
    ctx.fillText(txt, x, y);
  }

  function stressColor(stress) {
    if (stress < 40) return '#4ecca3';
    if (stress < 70) return '#e8a838';
    return '#e84545';
  }

  // ─── Animated wind particles ───

  function drawWindParticles(wind) {
    var intensity = wind / 100;
    ctx.globalAlpha = 0.12 + intensity * 0.3;
    for (var i = 0; i < windParticles.length; i++) {
      var p = windParticles[i];
      p.x += p.speed * (1 + intensity * 4);
      p.y += Math.sin(p.x * 0.01 + i) * 0.4;
      if (p.x > W) { p.x = -5; p.y = Math.random() * H; }
      ctx.fillStyle = '#5e9eff';
      ctx.fillRect(p.x, p.y, p.size * (1 + intensity * 2), p.size * 0.4);
    }
    ctx.globalAlpha = 1;
  }

  // ─── Gap danger glow (pulsing) ───

  function drawGapGlow(stress, wind) {
    var danger = Math.max(stress, wind) / 100;
    if (danger < 0.15) return;
    var alpha = 0.08 + danger * 0.25 + Math.sin(glowPhase) * 0.06;
    var color = danger < 0.4
      ? 'rgba(232,168,56,' + alpha + ')'
      : 'rgba(232,69,69,' + alpha + ')';
    ctx.fillStyle = color;
    ctx.fillRect(GAP.x - 10, GAP.y - 10, GAP.w + 20, GAP.h + 20);
  }

  // ─── Bridge shake on high stress ───

  function updateShake(stress) {
    if (stress > 55) {
      var intensity = (stress - 55) * 0.06;
      shakeOffset.x = (Math.random() - 0.5) * intensity * 2;
      shakeOffset.y = (Math.random() - 0.5) * intensity * 2;
    } else {
      shakeOffset.x = 0;
      shakeOffset.y = 0;
    }
  }

  // ─── Person walking on bridge during crossing ───

  function drawCrossingPerson(state) {
    if (state.phase !== 'cross') return;
    var pid = state.crossingOrder[state.currentCrosserIdx];
    if (pid == null) return;
    var person = state.persons.find(function (p) { return p.id === pid; });
    if (!person) return;

    var progress = state.crossingProgress / 100;
    var px = GAP.x + progress * GAP.w;
    var py = GAP.y + GAP.h / 2 - 25;

    ctx.save();
    ctx.translate(px + shakeOffset.x, py + shakeOffset.y);
    // Head
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#ddd';
    ctx.fill();
    // Body
    drawRect(-6, 7, 12, 18, stressColor(state.stress));
    // Name above
    drawText(person.name, 0, -14, '#ffc857', 11, 'center');
    ctx.restore();
  }

  // ─── Main render ───

  function render(state) {
    ctx.clearRect(0, 0, W, H);
    glowPhase += 0.04;
    updateShake(state.stress);

    // Wind particles (atmospheric pressure)
    drawWindParticles(state.wind);

    // ── HUD: stress bar with glow ──
    drawRect(20, 10, 200, 22, '#0f3460');
    drawRect(20, 10, state.stress * 2, 22, stressColor(state.stress));
    if (state.stress > 65) {
      ctx.globalAlpha = 0.25 + Math.sin(glowPhase * 2) * 0.1;
      drawRect(20, 8, state.stress * 2, 26, stressColor(state.stress));
      ctx.globalAlpha = 1;
    }
    drawText('结构应力 ' + Math.round(state.stress) + '%', 230, 27, stressColor(state.stress), 14);

    // ── HUD: wind bar ──
    drawRect(500, 10, 200, 22, '#0f3460');
    drawRect(500, 10, state.wind * 2, 22, '#5e9eff');
    var windLabel = state.wind > 55 ? '暴风' : state.wind > 35 ? '强风' : state.wind > 20 ? '中风' : '微风';
    drawText('风力 ' + windLabel + ' ' + Math.round(state.wind) + '%', 710, 27,
      state.wind > 55 ? '#e84545' : '#5e9eff', 14);

    // ── Phase label with instruction ──
    var phaseLabels = {
      build: '搭建阶段 — 拖放材料到缺口槽位',
      order: '排列顺序 — 拖放人员到通过顺序',
      cross: '通过中...',
      result: '结算'
    };
    var phaseColors = { build: '#ffc857', order: '#7ec8e3', cross: '#e8a838', result: '#4ecca3' };
    drawText(phaseLabels[state.phase] || '', 480, 52, phaseColors[state.phase] || '#fff', 14, 'center');

    // ── Gap danger glow ──
    drawGapGlow(state.stress, state.wind);

    // ── Left platform (tower top) ──
    drawRect(GAP.x - 120, GAP.y, 120, GAP.h, '#3a506b', '#5e9eff');
    drawText('塔顶', GAP.x - 60, GAP.y + GAP.h / 2 + 5, '#c0c0c0', 16, 'center');

    // ── Right platform ──
    drawRect(GAP.x + GAP.w, GAP.y, 120, GAP.h, '#3a506b', '#5e9eff');
    drawText('彼岸', GAP.x + GAP.w + 60, GAP.y + GAP.h / 2 + 5, '#c0c0c0', 16, 'center');

    // ── Gap void ──
    ctx.save();
    ctx.translate(shakeOffset.x, shakeOffset.y);
    drawRect(GAP.x, GAP.y, GAP.w, GAP.h, '#0d1117');
    // Depth lines for visual depth
    for (var gi = 0; gi < 4; gi++) {
      ctx.globalAlpha = 0.08 + gi * 0.02;
      drawRect(GAP.x + 15 + gi * 20, GAP.y + GAP.h + gi * 4, GAP.w - 30 - gi * 40, 2, '#222');
    }
    ctx.globalAlpha = 1;
    drawText('缺 口', GAP.x + GAP.w / 2, GAP.y + GAP.h / 2 + 5, '#444', 20, 'center');
    ctx.restore();

    // ── Bridge slots with stress tint ──
    var matSlotColors = { boards: '#8B6914', ropes: '#a0a0a0', wedges: '#6b4226' };
    var matSlotLabels = { boards: '板', ropes: '绳', wedges: '楔' };
    BRIDGE_POS.forEach(function (bp, i) {
      ctx.save();
      ctx.translate(bp.x + shakeOffset.x, bp.y + shakeOffset.y);
      var placed = state.placedMaterials.find(function (m) { return m.slot === i; });
      if (placed) {
        // Stress tint overlay
        ctx.globalAlpha = 0.2;
        drawRect(-42, -17, 84, 34, stressColor(state.stress));
        ctx.globalAlpha = 1;
        drawRect(-42, -17, 84, 34, matSlotColors[placed.type], '#fff');
        drawText(matSlotLabels[placed.type], 0, 5, '#fff', 16, 'center');
      } else {
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = '#555';
        ctx.strokeRect(-42, -17, 84, 34);
        ctx.setLineDash([]);
        drawText('槽' + (i + 1), 0, 5, '#555', 12, 'center');
      }
      ctx.restore();
    });

    // ── Crossing person on bridge ──
    drawCrossingPerson(state);

    // ── Material panel with scarcity ──
    drawRect(MAT_PANEL.x, MAT_PANEL.y, MAT_PANEL.w, MAT_PANEL.h, '#1a1a2e', '#0f3460');
    drawText('材料', MAT_PANEL.x + 10, MAT_PANEL.y + 25, '#ffc857', 16);

    var matLabels = { boards: '木板', ropes: '绳索', wedges: '楔子' };
    var matColors = { boards: '#8B6914', ropes: '#a0a0a0', wedges: '#6b4226' };
    var my = MAT_PANEL.y + 50;
    for (var t = 0; t < ['boards', 'ropes', 'wedges'].length; t++) {
      var mt = ['boards', 'ropes', 'wedges'][t];
      var count = state.materials[mt];
      // Scarcity indicator
      if (count === 0) {
        drawText('x' + count, MAT_PANEL.x + MAT_PANEL.w - 25, my + 22, '#e84545', 13, 'center');
      }
      for (var mi = 0; mi < count; mi++) {
        drawRect(MAT_PANEL.x + 15 + mi * 80, my, 70, 35, matColors[mt], '#fff');
        drawText(matLabels[mt], MAT_PANEL.x + 50 + mi * 80, my + 22, '#fff', 13, 'center');
      }
      my += 50;
    }

    // Bridge stats summary (immediate feedback on structure quality)
    var bStr = state._bridgeStrength();
    var bFlex = state._bridgeFlexibility();
    my += 5;
    drawRect(MAT_PANEL.x + 10, my, MAT_PANEL.w - 20, 50, '#111', '#0f3460');
    drawText('强度 ' + bStr + '  弹性 ' + bFlex.toFixed(1), MAT_PANEL.x + MAT_PANEL.w / 2, my + 18,
      '#7ec8e3', 13, 'center');
    if (state.crossingOrder.length > 0) {
      var ordW = state._orderWeight();
      var weightRatio = ordW / Math.max(1, bStr);
      var wColor = weightRatio > 1.5 ? '#e84545' : weightRatio > 1 ? '#e8a838' : '#4ecca3';
      drawText('挂载 ' + ordW + 'kg', MAT_PANEL.x + MAT_PANEL.w / 2, my + 38, wColor, 13, 'center');
    } else {
      drawText('挂载 0kg', MAT_PANEL.x + MAT_PANEL.w / 2, my + 38, '#888', 13, 'center');
    }

    // ── People panel with traits ──
    drawRect(PPL_PANEL.x, PPL_PANEL.y, PPL_PANEL.w, PPL_PANEL.h, '#1a1a2e', '#0f3460');
    drawText('人员', PPL_PANEL.x + 10, PPL_PANEL.y + 25, '#ffc857', 16);

    var traitLabels = { brave: '沉着', crafty: '巧手', agile: '敏捷', fragile: '脆弱' };
    var traits = { 1: 'brave', 2: 'crafty', 3: 'agile', 4: 'fragile' };
    state.persons.forEach(function (p, i) {
      var py = PPL_PANEL.y + 50 + i * 60;
      var inOrder = state.crossingOrder.includes(p.id);
      var col = p.crossed ? '#4ecca3' : p.fallen ? '#e84545' : inOrder ? '#444' : '#3a506b';
      drawRect(PPL_PANEL.x + 15, py, 230, 45, col, '#fff');
      drawText(p.name, PPL_PANEL.x + 55, py + 18, p.crossed ? '#fff' : '#eee', 14);
      drawText(p.weight + 'kg', PPL_PANEL.x + 130, py + 18, '#aaa', 12);
      drawText(traitLabels[traits[p.id]] || '', PPL_PANEL.x + 180, py + 18, '#888', 11);
      if (p.crossed) drawText('已过', PPL_PANEL.x + 215, py + 35, '#4ecca3', 11);
      if (p.fallen) drawText('坠落', PPL_PANEL.x + 215, py + 35, '#e84545', 11);
    });

    // ── Crossing order slots ──
    drawText('通过顺序:', 310, 415, '#ffc857', 14);
    ORDER_SLOTS.forEach(function (s, i) {
      var pid = state.crossingOrder[i];
      var person = pid != null ? state.persons.find(function (p) { return p.id === pid; }) : null;
      drawRect(s.x - 35, s.y - 5, 70, 35, person ? '#3a506b' : 'transparent', person ? '#fff' : '#555');
      if (!person) {
        ctx.setLineDash([3, 3]); ctx.strokeRect(s.x - 35, s.y - 5, 70, 35); ctx.setLineDash([]);
        drawText('_', s.x, s.y + 18, '#555', 14, 'center');
      } else {
        drawText(person.name, s.x, s.y + 18, '#eee', 13, 'center');
      }
    });

    // ── Start crossing button (pulsing) ──
    if (state.canStartCrossing()) {
      var pulse = 0.75 + Math.sin(glowPhase * 3) * 0.25;
      ctx.globalAlpha = pulse;
      drawRect(400, 490, 160, 40, '#4ecca3', '#fff');
      ctx.globalAlpha = 1;
      drawText('开始通过', 480, 516, '#1a1a2e', 16, 'center');
    }

    // ── Material scarcity warning ──
    var totalMats = state.materials.boards + state.materials.ropes + state.materials.wedges;
    var emptySlots = 3 - state.placedMaterials.length;
    if (totalMats === 0 && emptySlots > 0 && state.phase !== 'result') {
      ctx.globalAlpha = 0.6 + Math.sin(glowPhase * 4) * 0.3;
      drawText('材料耗尽！缺口未填满', 480, 580, '#e84545', 16, 'center');
      ctx.globalAlpha = 1;
    } else if (emptySlots > 0 && totalMats < emptySlots && state.phase !== 'result') {
      drawText('材料不足，缺口仍有空位', 480, 580, '#e8a838', 13, 'center');
    }

    // ── Crossing progress bar ──
    if (state.phase === 'cross') {
      drawRect(340, 350, 280, 16, '#0f3460');
      drawRect(340, 350, state.crossingProgress * 2.8, 16, stressColor(state.stress));
      var cp = state.persons.find(function (p) { return p.id === state.crossingOrder[state.currentCrosserIdx]; });
      if (cp) drawText(cp.name + ' 通过中 ' + Math.round(state.crossingProgress) + '%', 480, 382, '#eee', 13, 'center');
    }

    // ── Result screen (enhanced) ──
    if (state.phase === 'result' && state.result) {
      var rc = state.result.success ? '#1b4332' : '#6a040f';
      drawRect(250, 200, 460, 210, rc, '#fff');
      drawText(state.result.msg, 480, 238, '#fff', 22, 'center');

      var crossed = state.persons.filter(function (p) { return p.crossed; }).length;
      var fallen = state.persons.filter(function (p) { return p.fallen; }).length;
      drawText('通过: ' + crossed + '  坠落: ' + fallen + '  应力: ' + Math.round(state.stress) + '%  风力: ' + Math.round(state.wind) + '%',
        480, 268, '#ccc', 13, 'center');

      // Person outcome details
      var detailY = 292;
      state.persons.forEach(function (p) {
        var status = p.crossed ? '通过' : p.fallen ? '坠落' : '未尝试';
        var sColor = p.crossed ? '#4ecca3' : p.fallen ? '#e84545' : '#888';
        drawText(p.name + ': ' + status, 480, detailY, sColor, 12, 'center');
        detailY += 16;
      });

      if (state._resultContent) {
        drawText(state._resultContent, 480, detailY + 5, '#bbb', 12, 'center');
      }

      drawRect(420, 375, 120, 28, '#0f3460', '#fff');
      drawText('重新开始', 480, 394, '#eee', 14, 'center');
    }

    // ── Drag ghost ──
    if (drag) {
      ctx.globalAlpha = 0.7;
      drawRect(drag.mx - 30, drag.my - 15, 60, 30, drag.color || '#888', '#fff');
      drawText(drag.label, drag.mx, drag.my + 5, '#fff', 13, 'center');
      ctx.globalAlpha = 1;
    }

    // ── Event feedback messages ──
    if (state._eventMessages) {
      var msgY = 560;
      for (var mi = 0; mi < state._eventMessages.length && mi < 3; mi++) {
        var msg = state._eventMessages[mi];
        ctx.globalAlpha = Math.min(1, msg.ttl / 40);
        drawRect(240, msgY + mi * 28, 480, 24, 'rgba(0,0,0,0.7)');
        drawText(msg.text, 480, msgY + mi * 28 + 17, msg.color, 14, 'center');
        ctx.globalAlpha = 1;
      }
    }
  }

  // ─── Hit testing helpers ───

  function hitBridgeSlot(mx, my) {
    for (var i = 0; i < BRIDGE_POS.length; i++) {
      var bp = BRIDGE_POS[i];
      if (mx >= bp.x - 42 && mx <= bp.x + 42 && my >= bp.y - 17 && my <= bp.y + 17) return i;
    }
    return -1;
  }

  function hitOrderSlot(mx, my) {
    for (var i = 0; i < ORDER_SLOTS.length; i++) {
      var s = ORDER_SLOTS[i];
      if (mx >= s.x - 35 && mx <= s.x + 35 && my >= s.y - 5 && my <= s.y + 30) return i;
    }
    return -1;
  }

  function hitMaterial(mx, my) {
    var matColors = { boards: '#8B6914', ropes: '#a0a0a0', wedges: '#6b4226' };
    var matLabels = { boards: '木板', ropes: '绳索', wedges: '楔子' };
    var my2 = MAT_PANEL.y + 50;
    var types = ['boards', 'ropes', 'wedges'];
    for (var t = 0; t < types.length; t++) {
      var mt = types[t];
      for (var i = 0; i < 5; i++) {
        var ix = MAT_PANEL.x + 15 + i * 80, iy = my2;
        if (mx >= ix && mx <= ix + 70 && my >= iy && my <= iy + 35) {
          return { type: mt, color: matColors[mt], label: matLabels[mt] };
        }
      }
      my2 += 50;
    }
    return null;
  }

  function hitPerson(mx, my) {
    for (var i = 0; i < 4; i++) {
      var py = PPL_PANEL.y + 50 + i * 60;
      if (mx >= PPL_PANEL.x + 15 && mx <= PPL_PANEL.x + 245 && my >= py && my <= py + 45) {
        return i + 1;
      }
    }
    return null;
  }

  function hitStartButton(mx, my) {
    return mx >= 400 && mx <= 560 && my >= 490 && my <= 530;
  }

  function hitRestartButton(mx, my) {
    return mx >= 420 && mx <= 540 && my >= 375 && my <= 403;
  }

  function getCanvasPos(e) {
    var r = C.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  // ─── Input binding ───

  function initInput(state) {
    C.addEventListener('pointerdown', function (e) {
      var p = getCanvasPos(e);
      if (state.phase === 'result') {
        if (hitRestartButton(p.x, p.y)) { state.reset(); return; }
        return;
      }
      if (state.phase === 'cross') return;

      // Start crossing button
      if (state.canStartCrossing() && hitStartButton(p.x, p.y)) {
        state.startCrossing(); return;
      }

      // Material drag
      var mat = hitMaterial(p.x, p.y);
      if (mat && state.materials[mat.type] > 0) {
        drag = { kind: 'material', type: mat.type, color: mat.color, label: mat.label, mx: p.x, my: p.y };
        return;
      }

      // Person drag
      var pid = hitPerson(p.x, p.y);
      if (pid) {
        var person = state.persons.find(function (x) { return x.id === pid; });
        if (person && !person.crossed && !person.fallen && !state.crossingOrder.includes(pid)) {
          drag = { kind: 'person', id: pid, color: '#3a506b', label: person.name, mx: p.x, my: p.y };
          return;
        }
      }

      // Click on placed bridge material to remove
      var slot = hitBridgeSlot(p.x, p.y);
      if (slot >= 0) { state.removeMaterial(slot); }

      // Click on order slot to remove person
      var oslot = hitOrderSlot(p.x, p.y);
      if (oslot >= 0 && state.crossingOrder[oslot] != null) {
        state.removeFromOrder(state.crossingOrder[oslot]);
      }
    });

    C.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var p = getCanvasPos(e);
      drag.mx = p.x; drag.my = p.y;
    });

    C.addEventListener('pointerup', function (e) {
      if (!drag) return;
      var p = getCanvasPos(e);
      if (drag.kind === 'material') {
        var slot = hitBridgeSlot(p.x, p.y);
        if (slot >= 0) state.placeMaterial(drag.type, slot);
      } else if (drag.kind === 'person') {
        var oslot = hitOrderSlot(p.x, p.y);
        if (oslot >= 0) state.addToOrder(drag.id);
      }
      drag = null;
    });
  }

  window.GameScene = { render: render, initInput: initInput };
})();
