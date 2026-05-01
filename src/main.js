// main.js — 天梯最后一级 entry point & game loop

(function () {
  var state = new GameState();
  var scene = window.GameScene;
  scene.initInput(state);

  // Gracefully handle missing content.js / EventEngine
  var engine = (typeof EventEngine !== 'undefined') ? new EventEngine(state) : null;
  var lastTime = 0;
  var TICK_MS = 200; // 5 ticks/sec during crossing
  var actionCounter = 0;

  // Patch state.reset to also reset event engine
  var origReset = state.reset.bind(state);
  state.reset = function () {
    origReset();
    if (engine) engine.reset();
  };

  // Hook: after each player action, check for events
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

  function loop(now) {
    if (state.phase === 'cross') {
      if (now - lastTime >= TICK_MS) {
        state.tick();
        if (engine) engine.check();
        lastTime = now;
      }
    }
    // Wire result content from event engine
    if (state.phase === 'result' && !state._resultContent && engine) {
      state._resultContent = engine.getResultContent(state);
    }
    // Feed event messages to scene for rendering
    state._eventMessages = engine ? engine.getMessages() : [];
    scene.render(state);
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
})();
