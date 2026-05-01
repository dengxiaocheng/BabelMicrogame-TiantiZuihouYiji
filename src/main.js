// main.js — 天梯最后一级 entry point & game loop

(function () {
  const state = new GameState();
  const scene = window.GameScene;
  scene.initInput(state);

  let lastTime = 0;
  const TICK_MS = 200; // 5 ticks/sec during crossing

  function loop(now) {
    if (state.phase === 'cross') {
      if (now - lastTime >= TICK_MS) {
        state.tick();
        lastTime = now;
      }
    }
    scene.render(state);
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
})();
