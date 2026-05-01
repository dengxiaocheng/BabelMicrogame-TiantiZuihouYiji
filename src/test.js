// test.js — minimal tests for npm test

const { GameState, BRIDGE_SLOTS } = require('./state');

let pass = 0, fail = 0;
function assert(cond, msg) {
  if (cond) { pass++; console.log('  ✓ ' + msg); }
  else { fail++; console.log('  ✗ ' + msg); }
}

console.log('=== GameState tests ===');

// Test 1: initial state
const s = new GameState();
assert(s.materials.boards === 3, 'starts with 3 boards');
assert(s.materials.ropes === 2, 'starts with 2 ropes');
assert(s.materials.wedges === 2, 'starts with 2 wedges');
assert(s.stress === 0, 'stress starts at 0');
assert(s.wind >= 15 && s.wind <= 25, 'wind starts 15-25');
assert(s.crossingOrder.length === 0, 'no one in crossing order');
assert(s.phase === 'build', 'starts in build phase');

// Test 2: place materials
assert(s.placeMaterial('boards', 0) === true, 'place board in slot 0');
assert(s.materials.boards === 2, 'boards decreased');
assert(s.placedMaterials.length === 1, '1 material placed');
assert(s.placeMaterial('ropes', 0) === false, 'cannot double-place in slot 0');
assert(s.placeMaterial('ropes', 1) === true, 'place rope in slot 1');
assert(s.placeMaterial('wedges', 2) === true, 'place wedge in slot 2');
assert(s.stress === 0, 'stress 0 when all slots filled');

// Test 3: remove material
assert(s.removeMaterial(1) === true, 'remove from slot 1');
assert(s.materials.ropes === 2, 'ropes restored');
assert(s.placedMaterials.length === 2, '2 materials remain');

// Test 4: crossing order
assert(s.addToOrder(1) === true, 'add person 1 to order');
assert(s.phase === 'order', 'phase moves to order');
assert(s.crossingOrder.length === 1, '1 in order');
assert(s.addToOrder(1) === false, 'cannot add same person twice');
assert(s.addToOrder(2) === true, 'add person 2');
assert(s.removeFromOrder(1) === true, 'remove person 1');
assert(s.crossingOrder.length === 1, '1 remains');

// Test 5: cannot start crossing without materials & order
const s2 = new GameState();
assert(s2.canStartCrossing() === false, 'cannot start: no materials, no order');
s2.addToOrder(1);
assert(s2.canStartCrossing() === false, 'cannot start: no materials');
s2.placeMaterial('boards', 0);
s2.addToOrder(2);
assert(s2.canStartCrossing() === true, 'can start: has materials + order');

// Test 6: crossing tick advances progress
const s3 = new GameState();
s3.placeMaterial('boards', 0);
s3.placeMaterial('ropes', 1);
s3.placeMaterial('wedges', 2);
s3.addToOrder(3); // light person first
s3.startCrossing();
assert(s3.phase === 'cross', 'phase is cross');
const progBefore = s3.crossingProgress;
s3.tick();
assert(s3.crossingProgress > progBefore, 'progress advances after tick');

// Test 7: full crossing with light person + good bridge (fix wind for determinism)
const s4 = new GameState();
s4.placeMaterial('boards', 0);
s4.placeMaterial('ropes', 1);
s4.placeMaterial('wedges', 2);
s4.addToOrder(3); // 少年 40kg
s4.wind = 0; // minimize wind for reliable test
s4.startCrossing();
for (let i = 0; i < 200; i++) { s4.wind = 0; s4.tick(); }
assert(s4.phase === 'result', 'reaches result phase');
assert(s4.result.success === true, 'light person + full bridge + no wind = success');

// Test 8: full crossing with heavy person + bad bridge (stress builds)
const s5 = new GameState();
s5.placeMaterial('boards', 0); // only 1 material
s5.addToOrder(1); // 勇者 70kg
s5.startCrossing();
for (let i = 0; i < 200; i++) s5.tick();
assert(s5.phase === 'result', 'reaches result (heavy fail)');
assert(s5.result.success === false, 'heavy + partial bridge = failure');

console.log('\nResults: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail > 0 ? 1 : 0);
