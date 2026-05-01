// main.js — 天梯最后一级 integration: wires state + content + scene into closed loop
// Core loop: 查看缺口 -> 放置板/绳/楔 -> 安排通过顺序 -> 结构受力 -> 成功通过或坠落

(function () {

  function initGame() {
    var state = new GameState();
    var scene = window.GameScene;
    scene.initInput(state);

    var engine = (typeof EventEngine !== 'undefined') ? new EventEngine(state) : null;
    var lastTime = 0;
    var TICK_MS = 200; // 5 ticks/sec during crossing
    var actionCounter = 0;

    // Patch state.reset to also reset event engine and clear derived state
    var origReset = state.reset.bind(state);
    state.reset = function () {
      origReset();
      state._resultContent = null;
      state._eventMessages = [];
      if (engine) engine.reset();
    };

    // Hook: after each player action, check for events (dual-pressure coupling)
    var origPlace = state.placeMaterial.bind(state);
    var origRemove = state.removeMaterial.bind(state);
    var origAddOrder = state.addToOrder.bind(state);
    var origRemoveOrder = state.removeFromOrder.bind(state);

    state.placeMaterial = function (type, slot) {
      var r = origPlace(type, slot);
      if (r) { actionCounter++; if (engine) engine.check(); }
      return r;
    };
    state.removeMaterial = function (slot) {
      var r = origRemove(slot);
      if (r) { actionCounter++; if (engine) engine.check(); }
      return r;
    };
    state.addToOrder = function (pid) {
      var r = origAddOrder(pid);
      if (r) { actionCounter++; if (engine) engine.check(); }
      return r;
    };
    state.removeFromOrder = function (pid) {
      var r = origRemoveOrder(pid);
      if (r) { actionCounter++; if (engine) engine.check(); }
      return r;
    };

    // ─── Main loop ───
    function loop(now) {
      // Crossing phase: tick state + fire events at fixed rate
      if (state.phase === 'cross') {
        if (now - lastTime >= TICK_MS) {
          state.tick();
          if (engine) engine.check();
          lastTime = now;
        }
      }

      // Generate result content once when entering result phase
      if (state.phase === 'result' && !state._resultContent && engine) {
        state._resultContent = engine.getResultContent(state);
      }

      // Feed event messages to scene for rendering
      state._eventMessages = engine ? engine.getMessages() : [];
      scene.render(state);
      requestAnimationFrame(loop);
    }

    requestAnimationFrame(loop);
  }

  // Integration: load content.js (event engine) if not already present
  // This ensures the event pool drives state changes during the full loop
  if (typeof EventEngine === 'undefined') {
    var s = document.createElement('script');
    s.src = 'src/content.js';
    s.onload = initGame;
    s.onerror = initGame; // degrade gracefully without events
    document.head.appendChild(s);
  } else {
    initGame();
  }
})();
