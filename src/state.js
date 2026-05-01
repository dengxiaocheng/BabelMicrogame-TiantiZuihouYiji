// state.js — 天梯最后一级 game state (Direction Lock)

const PERSONS = [
  { id: 1, name: '勇者', weight: 70 },
  { id: 2, name: '工匠', weight: 60 },
  { id: 3, name: '少年', weight: 40 },
  { id: 4, name: '长老', weight: 50 },
];

const MATERIAL_TYPES = ['boards', 'ropes', 'wedges'];
const BRIDGE_SLOTS = 3;

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

  placeMaterial(type, slot) {
    if ((this.phase !== 'build' && this.phase !== 'order') || this.materials[type] <= 0) return false;
    if (slot < 0 || slot >= BRIDGE_SLOTS) return false;
    if (this.placedMaterials.some(m => m.slot === slot)) return false;
    this.materials[type]--;
    this.placedMaterials.push({ type, slot });
    this._recalcStress();
    return true;
  }

  removeMaterial(slot) {
    if (this.phase !== 'build' && this.phase !== 'order') return false;
    const idx = this.placedMaterials.findIndex(m => m.slot === slot);
    if (idx === -1) return false;
    const m = this.placedMaterials.splice(idx, 1)[0];
    this.materials[m.type]++;
    this._recalcStress();
    return true;
  }

  _recalcStress() {
    const filled = this.placedMaterials.length;
    this.stress = Math.max(0, (BRIDGE_SLOTS - filled) * 25);
  }

  addToOrder(personId) {
    if (this.phase === 'build') this.phase = 'order';
    if (this.phase !== 'order') return false;
    if (this.crossingOrder.includes(personId)) return false;
    const p = this.persons.find(x => x.id === personId);
    if (!p || p.crossed || p.fallen) return false;
    this.crossingOrder.push(personId);
    return true;
  }

  removeFromOrder(personId) {
    if (this.phase !== 'order') return false;
    const idx = this.crossingOrder.indexOf(personId);
    if (idx === -1) return false;
    this.crossingOrder.splice(idx, 1);
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

  tick() {
    if (this.phase !== 'cross') return;
    this.ticks++;
    this.wind = Math.min(100, Math.max(0, this.wind + (Math.random() * 8 - 3)));

    const pid = this.crossingOrder[this.currentCrosserIdx];
    if (pid == null) { this._finish(); return; }
    const person = this.persons.find(p => p.id === pid);

    this.crossingProgress += 4 + Math.random() * 6;
    this.stress += person.weight * 0.06 + this.wind * 0.03;

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
    const ordered = this.crossingOrder.map(id => this.persons.find(p => p.id === id));
    const allCrossed = ordered.every(p => p && p.crossed);
    if (fallen > 0) {
      this.result = { success: false, msg: '有人坠落了...' };
    } else if (allCrossed && ordered.length === this.persons.length) {
      this.result = { success: true, msg: '全员安全通过！' };
    } else if (allCrossed) {
      this.result = { success: true, msg: '成功通过！' };
    } else {
      this.result = { success: false, msg: '还有人没能过桥' };
    }
  }

  integrity() { return Math.max(0, 100 - this.stress); }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GameState, PERSONS, MATERIAL_TYPES, BRIDGE_SLOTS };
}
