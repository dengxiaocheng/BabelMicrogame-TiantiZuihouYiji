// scene.js — 天梯最后一级 canvas rendering & drag-drop interaction

(function () {
  const C = document.getElementById('game');
  const ctx = C.getContext('2d');
  const W = C.width, H = C.height;

  // Layout zones
  const GAP = { x: 320, y: 200, w: 320, h: 120 };
  const MAT_PANEL = { x: 20, y: 60, w: 260, h: 540 };
  const PPL_PANEL = { x: 680, y: 60, w: 260, h: 540 };
  const ORDER_SLOTS = [
    { x: 310, y: 430 }, { x: 410, y: 430 },
    { x: 510, y: 430 }, { x: 610, y: 430 }
  ];
  const BRIDGE_POS = [
    { x: 350, y: 230 }, { x: 450, y: 230 }, { x: 550, y: 230 }
  ];

  // Drag state
  let drag = null; // { kind:'material'|'person', id, ox, oy }

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

  function render(state) {
    ctx.clearRect(0, 0, W, H);

    // HUD: stress & wind
    drawRect(20, 10, 200, 20, '#0f3460');
    drawRect(20, 10, state.stress * 2, 20, stressColor(state.stress));
    drawText('应力 ' + Math.round(state.stress), 230, 26, '#eee', 14);

    drawRect(500, 10, 200, 20, '#0f3460');
    drawRect(500, 10, state.wind * 2, 20, '#5e9eff');
    drawText('风力 ' + Math.round(state.wind), 710, 26, '#eee', 14);

    // Phase label
    const phaseLabel = { build: '搭建阶段', order: '排列顺序', cross: '通过中...', result: '结算' };
    drawText(phaseLabel[state.phase] || '', 380, 26, '#ffc857', 16, 'center');

    // Left platform
    drawRect(GAP.x - 120, GAP.y, 120, GAP.h, '#3a506b', '#5e9eff');
    drawText('塔顶', GAP.x - 100, GAP.y + GAP.h / 2 + 5, '#c0c0c0', 16, 'center');

    // Right platform
    drawRect(GAP.x + GAP.w, GAP.y, 120, GAP.h, '#3a506b', '#5e9eff');
    drawText('彼岸', GAP.x + GAP.w + 100, GAP.y + GAP.h / 2 + 5, '#c0c0c0', 16, 'center');

    // Gap (the void)
    drawRect(GAP.x, GAP.y, GAP.w, GAP.h, '#0d1117');
    drawText('缺 口', GAP.x + GAP.w / 2, GAP.y + GAP.h / 2 + 5, '#555', 20, 'center');

    // Bridge slots
    BRIDGE_POS.forEach((bp, i) => {
      const placed = state.placedMaterials.find(m => m.slot === i);
      if (placed) {
        const colors = { boards: '#8B6914', ropes: '#a0a0a0', wedges: '#6b4226' };
        const labels = { boards: '板', ropes: '绳', wedges: '楔' };
        drawRect(bp.x - 40, bp.y - 15, 80, 30, colors[placed.type], '#fff');
        drawText(labels[placed.type], bp.x, bp.y + 5, '#fff', 16, 'center');
      } else {
        drawRect(bp.x - 40, bp.y - 15, 80, 30, 'transparent', '#555');
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(bp.x - 40, bp.y - 15, 80, 30);
        ctx.setLineDash([]);
        drawText('槽' + (i + 1), bp.x, bp.y + 5, '#555', 12, 'center');
      }
    });

    // Material panel
    drawRect(MAT_PANEL.x, MAT_PANEL.y, MAT_PANEL.w, MAT_PANEL.h, '#1a1a2e', '#0f3460');
    drawText('材料', MAT_PANEL.x + 10, MAT_PANEL.y + 25, '#ffc857', 16);
    const matLabels = { boards: '木板', ropes: '绳索', wedges: '楔子' };
    const matColors = { boards: '#8B6914', ropes: '#a0a0a0', wedges: '#6b4226' };
    let my = MAT_PANEL.y + 50;
    for (const t of ['boards', 'ropes', 'wedges']) {
      for (let i = 0; i < state.materials[t]; i++) {
        drawRect(MAT_PANEL.x + 15 + i * 80, my, 70, 35, matColors[t], '#fff');
        drawText(matLabels[t], MAT_PANEL.x + 50 + i * 80, my + 22, '#fff', 13, 'center');
      }
      my += 50;
    }

    // People panel
    drawRect(PPL_PANEL.x, PPL_PANEL.y, PPL_PANEL.w, PPL_PANEL.h, '#1a1a2e', '#0f3460');
    drawText('人员', PPL_PANEL.x + 10, PPL_PANEL.y + 25, '#ffc857', 16);
    state.persons.forEach((p, i) => {
      const py = PPL_PANEL.y + 50 + i * 60;
      const inOrder = state.crossingOrder.includes(p.id);
      const col = p.crossed ? '#4ecca3' : p.fallen ? '#e84545' : inOrder ? '#555' : '#3a506b';
      drawRect(PPL_PANEL.x + 15, py, 230, 45, col, '#fff');
      drawText(p.name + ' (' + p.weight + 'kg)', PPL_PANEL.x + 130, py + 28,
        p.crossed ? '#fff' : '#eee', 14, 'center');
      if (p.crossed) drawText('已过', PPL_PANEL.x + 200, py + 28, '#4ecca3', 12);
      if (p.fallen) drawText('坠落', PPL_PANEL.x + 200, py + 28, '#e84545', 12);
    });

    // Crossing order slots
    drawText('通过顺序:', 310, 415, '#ffc857', 14);
    ORDER_SLOTS.forEach((s, i) => {
      const pid = state.crossingOrder[i];
      const person = pid != null ? state.persons.find(p => p.id === pid) : null;
      drawRect(s.x - 35, s.y - 5, 70, 35, person ? '#3a506b' : 'transparent', person ? '#fff' : '#555');
      if (!person) {
        ctx.setLineDash([3, 3]); ctx.strokeRect(s.x - 35, s.y - 5, 70, 35); ctx.setLineDash([]);
        drawText('_', s.x, s.y + 18, '#555', 14, 'center');
      } else {
        drawText(person.name, s.x, s.y + 18, '#eee', 13, 'center');
      }
    });

    // Start crossing button
    if (state.canStartCrossing()) {
      drawRect(400, 490, 160, 40, '#4ecca3', '#fff');
      drawText('开始通过', 480, 516, '#1a1a2e', 16, 'center');
    }

    // Crossing progress bar
    if (state.phase === 'cross') {
      drawRect(340, 350, 280, 16, '#0f3460');
      drawRect(340, 350, state.crossingProgress * 2.8, 16, '#4ecca3');
      const cp = state.persons.find(p => p.id === state.crossingOrder[state.currentCrosserIdx]);
      if (cp) drawText(cp.name + ' 通过中...', 480, 380, '#eee', 13, 'center');
    }

    // Result
    if (state.phase === 'result' && state.result) {
      drawRect(280, 260, 400, 120, state.result.success ? '#1b4332' : '#6a040f', '#fff');
      drawText(state.result.msg, 480, 310, '#fff', 22, 'center');
      drawRect(420, 340, 120, 30, '#0f3460', '#fff');
      drawText('重新开始', 480, 360, '#eee', 14, 'center');
    }

    // Drag ghost
    if (drag) {
      ctx.globalAlpha = 0.7;
      drawRect(drag.mx - 30, drag.my - 15, 60, 30, drag.color || '#888', '#fff');
      drawText(drag.label, drag.mx, drag.my + 5, '#fff', 13, 'center');
      ctx.globalAlpha = 1;
    }

    // Event feedback messages (from content event pool)
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

  // Hit testing helpers
  function hitBridgeSlot(mx, my) {
    for (let i = 0; i < BRIDGE_POS.length; i++) {
      const bp = BRIDGE_POS[i];
      if (mx >= bp.x - 40 && mx <= bp.x + 40 && my >= bp.y - 15 && my <= bp.y + 15) return i;
    }
    return -1;
  }

  function hitOrderSlot(mx, my) {
    for (let i = 0; i < ORDER_SLOTS.length; i++) {
      const s = ORDER_SLOTS[i];
      if (mx >= s.x - 35 && mx <= s.x + 35 && my >= s.y - 5 && my <= s.y + 30) return i;
    }
    return -1;
  }

  function hitMaterial(mx, my) {
    const matColors = { boards: '#8B6914', ropes: '#a0a0a0', wedges: '#6b4226' };
    const matLabels = { boards: '木板', ropes: '绳索', wedges: '楔子' };
    let my2 = MAT_PANEL.y + 50;
    for (const t of ['boards', 'ropes', 'wedges']) {
      for (let i = 0; i < 5; i++) { // check up to 5 possible items
        const ix = MAT_PANEL.x + 15 + i * 80, iy = my2;
        if (mx >= ix && mx <= ix + 70 && my >= iy && my <= iy + 35) {
          return { type: t, color: matColors[t], label: matLabels[t] };
        }
      }
      my2 += 50;
    }
    return null;
  }

  function hitPerson(mx, my) {
    // returns person id or null
    for (let i = 0; i < 4; i++) {
      const py = PPL_PANEL.y + 50 + i * 60;
      if (mx >= PPL_PANEL.x + 15 && mx <= PPL_PANEL.x + 245 && my >= py && my <= py + 45) {
        return i + 1; // person ids are 1-based
      }
    }
    return null;
  }

  function hitStartButton(mx, my) {
    return mx >= 400 && mx <= 560 && my >= 490 && my <= 530;
  }

  function hitRestartButton(mx, my) {
    return mx >= 420 && mx <= 540 && my >= 340 && my <= 370;
  }

  function getCanvasPos(e) {
    const r = C.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function initInput(state) {
    C.addEventListener('pointerdown', e => {
      const p = getCanvasPos(e);
      if (state.phase === 'result') {
        if (hitRestartButton(p.x, p.y)) { state.reset(); return; }
        return;
      }
      if (state.phase === 'cross') return;

      // Check start button
      if (state.canStartCrossing() && hitStartButton(p.x, p.y)) {
        state.startCrossing(); return;
      }

      // Check material drag
      const mat = hitMaterial(p.x, p.y);
      if (mat && state.materials[mat.type] > 0) {
        drag = { kind: 'material', type: mat.type, color: mat.color, label: mat.label, mx: p.x, my: p.y };
        return;
      }

      // Check person drag
      const pid = hitPerson(p.x, p.y);
      if (pid) {
        const person = state.persons.find(x => x.id === pid);
        if (person && !person.crossed && !person.fallen && !state.crossingOrder.includes(pid)) {
          drag = { kind: 'person', id: pid, color: '#3a506b', label: person.name, mx: p.x, my: p.y };
          return;
        }
      }

      // Click on placed bridge material to remove
      const slot = hitBridgeSlot(p.x, p.y);
      if (slot >= 0) { state.removeMaterial(slot); }

      // Click on order slot to remove person
      const oslot = hitOrderSlot(p.x, p.y);
      if (oslot >= 0 && state.crossingOrder[oslot] != null) {
        state.removeFromOrder(state.crossingOrder[oslot]);
      }
    });

    C.addEventListener('pointermove', e => {
      if (!drag) return;
      const p = getCanvasPos(e);
      drag.mx = p.x; drag.my = p.y;
    });

    C.addEventListener('pointerup', e => {
      if (!drag) return;
      const p = getCanvasPos(e);
      if (drag.kind === 'material') {
        const slot = hitBridgeSlot(p.x, p.y);
        if (slot >= 0) state.placeMaterial(drag.type, slot);
      } else if (drag.kind === 'person') {
        const oslot = hitOrderSlot(p.x, p.y);
        if (oslot >= 0) state.addToOrder(drag.id);
      }
      drag = null;
    });
  }

  window.GameScene = { render, initInput };
})();
