// state.js — 天梯最后一级 game state (Direction Lock)

const PERSONS = [
  { id: 1, name: '勇者', weight: 70 },
  { id: 2, name: '工匠', weight: 60 },
  { id: 3, name: '少年', weight: 40 },
  { id: 4, name: '长老', weight: 50 },
];

const MATERIAL_TYPES = ['boards', 'ropes', 'wedges'];
const BRIDGE_SLOTS = 3;

// Material type properties: strength resists stress, flexibility absorbs shock
const MAT_PROPS = {
  boards:  { strength: 40, flexibility: 0.2 },
  ropes:   { strength: 20, flexibility: 0.6 },
  wedges:  { strength: 30, flexibility: 0.1 },
};

class GameState {
  constructor() { this.reset(); }

  reset() {
    this.materials = { boards: 3, ropes: 2, wedges: 2 };
    this.placedMaterials = []; // { type, slot }
    this.stress = 0;
    this.wind = 15 + Math.random() * 10;
    this.crossingOrder = [];
    this.crossingProgress = 0;
    this.currentCrosserIdx = -1;
    this.persons = PERSONS.map(p => ({ ...p, crossed: false, fallen: false }));
    this.phase = 'build'; // build -> order -> cross -> result
    this.result = null;
    this.ticks = 0;
  }

  // --- Computed bridge properties ---

  _bridgeStrength() {
    return this.placedMaterials.reduce((s, m) => s + MAT_PROPS[m.type].strength, 0);
  }

  _bridgeFlexibility() {
    return this.placedMaterials.reduce((s, m) => s + MAT_PROPS[m.type].flexibility, 0);
  }

  // Total weight of people committed to crossing order
  _orderWeight() {
    return this.crossingOrder.reduce((sum, id) => {
      const p = this.persons.find(x => x.id === id);
      return sum + (p ? p.weight : 0);
    }, 0);
  }

  // Recalculate stress: gap penalty + wind pressure + order weight − bridge strength
  _recalcStress() {
    const gapPenalty = Math.max(0, (BRIDGE_SLOTS - this.placedMaterials.length) * 20);
    const windPressure = this.wind * 0.3;
    const strengthReduction = this._bridgeStrength() * 0.5;
    const orderPressure = this._orderWeight() * 0.05;
    this.stress = Math.max(0, gapPenalty + windPressure + orderPressure - strengthReduction);
  }

  // Small wind shift on each player action (risk pressure)
  _shiftWind() {
    this.wind = Math.min(100, Math.max(0, this.wind + (Math.random() * 6 - 2)));
  }

  // --- Operations with dual-pressure coupling ---
  // Each operation affects both survival/resource pressure and risk/order pressure.

  placeMaterial(type, slot) {
    if ((this.phase !== 'build' && this.phase !== 'order') || this.materials[type] <= 0) return false;
    if (slot < 0 || slot >= BRIDGE_SLOTS) return false;
    if (this.placedMaterials.some(m => m.slot === slot)) return false;
    // Survival pressure: material consumed (resource depletion)
    this.materials[type]--;
    this.placedMaterials.push({ type, slot });
    // Risk pressure: stress recalc + wind shift
    this._shiftWind();
    this._recalcStress();
    return true;
  }

  removeMaterial(slot) {
    if (this.phase !== 'build' && this.phase !== 'order') return false;
    const idx = this.placedMaterials.findIndex(m => m.slot === slot);
    if (idx === -1) return false;
    const m = this.placedMaterials.splice(idx, 1)[0];
    // Survival pressure: material restored
    this.materials[m.type]++;
    // Risk pressure: stress rises from gap, wind shifts
    this._shiftWind();
    this._recalcStress();
    return true;
  }

  addToOrder(personId) {
    if (this.phase === 'build') this.phase = 'order';
    if (this.phase !== 'order') return false;
    if (this.crossingOrder.includes(personId)) return false;
    const p = this.persons.find(x => x.id === personId);
    if (!p || p.crossed || p.fallen) return false;
    // Progress pressure: order commitment
    // Risk pressure: total order weight affects stress
    this.crossingOrder.push(personId);
    this._recalcStress();
    return true;
  }

  removeFromOrder(personId) {
    if (this.phase !== 'order') return false;
    const idx = this.crossingOrder.indexOf(personId);
    if (idx === -1) return false;
    this.crossingOrder.splice(idx, 1);
    this._recalcStress();
    return true;
  }

  canStartCrossing() {
    return (this.phase === 'order' || this.phase === 'build')
      && this.crossingOrder.length > 0 && this.placedMaterials.length > 0;
  }

  startCrossing() {
    if (!this.canStartCrossing()) return false;
    this.phase = 'cross';
    this.currentCrosserIdx = 0;
    this.crossingProgress = 0;
    return true;
  }

  // --- Crossing tick: core loop settlement ---

  tick() {
    if (this.phase !== 'cross') return;
    this.ticks++;

    const pid = this.crossingOrder[this.currentCrosserIdx];
    if (pid == null) { this._finish(); return; }
    const person = this.persons.find(p => p.id === pid);

    // Risk pressure: wind fluctuates unpredictably during crossing
    this.wind = Math.min(100, Math.max(0, this.wind + (Math.random() * 10 - 4)));

    // Survival pressure: stress from person weight + wind − bridge mitigation
    const bridgeStr = this._bridgeStrength();
    const bridgeFlex = this._bridgeFlexibility();
    const weightStress = person.weight * 0.08 * Math.max(0.1, 1 - bridgeFlex * 0.3);
    const windStress = this.wind * 0.04;
    const strengthMitigation = bridgeStr * 0.02;
    this.stress = Math.max(0, this.stress + weightStress + windStress - strengthMitigation);

    // Progress pressure: crossing advances (speed depends on bridge quality)
    this.crossingProgress += 3 + bridgeStr * 0.04 + Math.random() * 5;

    // Settlement check: person reaches far side
    if (this.crossingProgress >= 100) {
      if (this.stress >= 100) {
        person.fallen = true;
        this._finish();
        return;
      }
      person.crossed = true;
      this.crossingProgress = 0;
      this.currentCrosserIdx++;
      if (this.currentCrosserIdx >= this.crossingOrder.length) this._finish();
    }
  }

  _finish() {
    this.phase = 'result';
    const fallen = this.persons.filter(p => p.fallen).length;
    const crossed = this.persons.filter(p => p.crossed).length;
    const ordered = this.crossingOrder
      .map(id => this.persons.find(p => p.id === id))
      .filter(Boolean);
    const allOrderedCrossed = ordered.length > 0 && ordered.every(p => p.crossed);

    if (fallen > 0) {
      this.result = { success: false, msg: '有人坠落了...', fallen, crossed };
    } else if (allOrderedCrossed && ordered.length === this.persons.length) {
      this.result = { success: true, msg: '全员安全通过！', fallen: 0, crossed };
    } else if (allOrderedCrossed) {
      this.result = { success: true, msg: '成功通过！', fallen: 0, crossed };
    } else {
      this.result = { success: false, msg: '还有人没能过桥', fallen, crossed };
    }
  }

  integrity() { return Math.max(0, 100 - this.stress); }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GameState, PERSONS, MATERIAL_TYPES, BRIDGE_SLOTS, MAT_PROPS };
}
