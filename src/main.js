// main.js — 天梯最后一级 entry point & game loop

(function () {
  const state = new GameState();
  const scene = window.GameScene;
  scene.initInput(state);

  const engine = new EventEngine(state);
  let lastTime = 0;
  const TICK_MS = 200; // 5 ticks/sec during crossing
  let actionCounter = 0;

  // Patch state.reset to also reset event engine
  const origReset = state.reset.bind(state);
  state.reset = function () {
    origReset();
    engine.reset();
  };

  // Hook: after each player action, check for events
  const origPlace = state.placeMaterial.bind(state);
  const origRemove = state.removeMaterial.bind(state);
  const origAddOrder = state.addToOrder.bind(state);
  const origRemoveOrder = state.removeFromOrder.bind(state);

  state.placeMaterial = function (type, slot) {
    const r = origPlace(type, slot);
    if (r) { actionCounter++; engine.check(); }
    return r;
  };
  state.removeMaterial = function (slot) {
    const r = origRemove(slot);
    if (r) { actionCounter++; engine.check(); }
    return r;
  };
  state.addToOrder = function (pid) {
    const r = origAddOrder(pid);
    if (r) { actionCounter++; engine.check(); }
    return r;
  };
  state.removeFromOrder = function (pid) {
    const r = origRemoveOrder(pid);
    if (r) { actionCounter++; engine.check(); }
    return r;
  };

  function loop(now) {
    if (state.phase === 'cross') {
      if (now - lastTime >= TICK_MS) {
        state.tick();
        engine.check();
        lastTime = now;
      }
    }
    // Feed event messages to scene for rendering
    state._eventMessages = engine.getMessages();
    scene.render(state);
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
})();
