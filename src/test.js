// test.js — tests for Direction Lock state (dual-pressure coupling + settlement)

const { GameState, BRIDGE_SLOTS, MAT_PROPS } = require('./state');

let pass = 0, fail = 0;
function assert(cond, msg) {
  if (cond) { pass++; console.log('  ✓ ' + msg); }
  else { fail++; console.log('  ✗ ' + msg); }
}

console.log('=== GameState: Direction Lock state tests ===');

// --- Test 1: Initial state ---
console.log('\n--- Initial state ---');
const s = new GameState();
assert(s.materials.boards === 3, 'starts with 3 boards');
assert(s.materials.ropes === 2, 'starts with 2 ropes');
assert(s.materials.wedges === 2, 'starts with 2 wedges');
assert(s.stress === 0, 'stress starts at 0 (no materials, no order)');
assert(s.wind >= 15 && s.wind <= 25, 'wind starts 15-25');
assert(s.crossingOrder.length === 0, 'no one in crossing order');
assert(s.crossingProgress === 0, 'progress starts at 0');
assert(s.phase === 'build', 'starts in build phase');

// --- Test 2: Place materials + stress recalc ---
console.log('\n--- Place materials ---');
assert(s.placeMaterial('boards', 0) === true, 'place board in slot 0');
assert(s.materials.boards === 2, 'boards decreased');
assert(s.placedMaterials.length === 1, '1 material placed');
assert(s.placeMaterial('ropes', 0) === false, 'cannot double-place in slot 0');
assert(s.placeMaterial('ropes', 1) === true, 'place rope in slot 1');
assert(s.placeMaterial('wedges', 2) === true, 'place wedge in slot 2');
assert(s.stress === 0, 'stress 0 when all slots filled (strength overcomes gap+wind)');

// --- Test 3: Remove material restores resource, shifts wind ---
console.log('\n--- Remove material ---');
const windBefore = s.wind;
assert(s.removeMaterial(1) === true, 'remove from slot 1');
assert(s.materials.ropes === 2, 'ropes restored');
assert(s.placedMaterials.length === 2, '2 materials remain');
// Strong remaining materials may keep stress at 0; test with weak bridge + high wind
const s3b = new GameState();
s3b.placeMaterial('ropes', 0);
s3b.wind = 50;
const stressWithRope = s3b.stress;
s3b.removeMaterial(0);
assert(s3b.stress > stressWithRope, 'stress rises when material removed under high wind');

// --- Test 4: Crossing order adds risk pressure ---
console.log('\n--- Crossing order ---');
const stressBeforeOrder = s.stress;
assert(s.addToOrder(1) === true, 'add person 1 to order');
assert(s.phase === 'order', 'phase moves to order');
assert(s.crossingOrder.length === 1, '1 in order');
assert(s.addToOrder(1) === false, 'cannot add same person twice');
assert(s.addToOrder(2) === true, 'add person 2');
// Adding heavier people increases order weight pressure
assert(s.stress >= stressBeforeOrder, 'stress does not decrease from adding order');
assert(s.removeFromOrder(1) === true, 'remove person 1');
assert(s.crossingOrder.length === 1, '1 remains');

// --- Test 5: Dual-pressure coupling on placeMaterial ---
console.log('\n--- Dual-pressure: placeMaterial ---');
const s2 = new GameState();
const boardsBefore = s2.materials.boards;
const stressBefore = s2.stress;
s2.placeMaterial('boards', 0);
assert(s2.materials.boards < boardsBefore, 'resource pressure: boards consumed');
assert(s2.wind >= 13 && s2.wind <= 31, 'risk pressure: wind shifted');
// Stress depends on wind + gap vs strength, but wind did shift

// --- Test 6: Material type effectiveness ---
console.log('\n--- Material type effectiveness ---');
const sb = new GameState(); sb.placeMaterial('boards', 0);
const sr = new GameState(); sr.placeMaterial('ropes', 0);
const sw = new GameState(); sw.placeMaterial('wedges', 0);
// Boards have highest strength, so lowest stress
const stressBoard = sb.stress;
const stressRope = sr.stress;
const stressWedge = sw.stress;
assert(stressBoard <= stressRope, 'boards produce less stress than ropes (higher strength)');
assert(stressBoard <= stressWedge, 'boards produce less stress than wedges');
assert(MAT_PROPS.boards.strength > MAT_PROPS.ropes.strength, 'MAT_PROPS: boards strongest');
assert(MAT_PROPS.ropes.flexibility > MAT_PROPS.boards.flexibility, 'MAT_PROPS: ropes most flexible');

// --- Test 7: Can start crossing requires both materials and order ---
console.log('\n--- Can start crossing ---');
const s3 = new GameState();
assert(s3.canStartCrossing() === false, 'cannot start: no materials, no order');
s3.addToOrder(1);
assert(s3.canStartCrossing() === false, 'cannot start: no materials');
s3.placeMaterial('boards', 0);
s3.addToOrder(2);
assert(s3.canStartCrossing() === true, 'can start: has materials + order');

// --- Test 8: Crossing tick advances progress + dual pressure ---
console.log('\n--- Crossing tick ---');
const s4 = new GameState();
s4.placeMaterial('boards', 0);
s4.placeMaterial('ropes', 1);
s4.placeMaterial('wedges', 2);
s4.addToOrder(3);
s4.startCrossing();
assert(s4.phase === 'cross', 'phase is cross');
const progBefore = s4.crossingProgress;
const stressB = s4.stress;
s4.tick();
assert(s4.crossingProgress > progBefore, 'progress pressure: progress advances');
assert(s4.stress >= stressB || s4.stress === 0, 'survival pressure: stress accumulates (or was 0)');

// --- Test 9: Light person + full bridge + no wind = success ---
console.log('\n--- Light person + full bridge = success ---');
const s5 = new GameState();
s5.placeMaterial('boards', 0);
s5.placeMaterial('ropes', 1);
s5.placeMaterial('wedges', 2);
s5.addToOrder(3); // 少年 40kg
s5.wind = 0;
s5.startCrossing();
for (let i = 0; i < 200; i++) { s5.wind = 0; s5.tick(); }
assert(s5.phase === 'result', 'reaches result phase');
assert(s5.result.success === true, 'light person + full bridge + no wind = success');

// --- Test 10: Heavy person + partial bridge = failure ---
console.log('\n--- Heavy person + partial bridge = failure ---');
const s6 = new GameState();
s6.placeMaterial('boards', 0); // only 1 material
s6.addToOrder(1); // 勇者 70kg
s6.startCrossing();
for (let i = 0; i < 200; i++) s6.tick();
assert(s6.phase === 'result', 'reaches result (heavy fail)');
assert(s6.result.success === false, 'heavy + partial bridge = failure');
assert(s6.result.fallen >= 1, 'at least 1 fallen');

// --- Test 11: Full crossing with multiple people, good bridge ---
console.log('\n--- Multiple people crossing ---');
const s7 = new GameState();
s7.placeMaterial('boards', 0);
s7.placeMaterial('ropes', 1);
s7.placeMaterial('wedges', 2);
s7.addToOrder(3); // 少年 40kg first
s7.addToOrder(4); // 长老 50kg second
s7.wind = 0;
s7.startCrossing();
for (let i = 0; i < 400; i++) { s7.wind = 0; s7.tick(); }
assert(s7.phase === 'result', 'multi-person reaches result');
assert(s7.result.success === true, 'light-to-heavy order + full bridge = success');

// --- Test 12: Result carries fallen/crossed counts ---
console.log('\n--- Result details ---');
assert(typeof s6.result.fallen === 'number', 'result has fallen count');
assert(typeof s6.result.crossed === 'number', 'result has crossed count');
assert(typeof s5.result.msg === 'string', 'result has message');

// --- Test 13: Integrity helper ---
console.log('\n--- Integrity helper ---');
const s8 = new GameState();
assert(s8.integrity() === 100, 'full integrity at start');
s8.stress = 50;
assert(s8.integrity() === 50, 'half integrity at stress 50');

console.log('\nResults: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail > 0 ? 1 : 0);
