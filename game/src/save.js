/**
 * SOLMARINA: NEON HEAT - Save System (Re-authored version)
 * Manages persistent game state in localStorage with robust validation and normalization.
 */

const DEFAULT_SAVE_STATE = Object.freeze({
  cash: 5000,
  debt: 50000,
  currentMission: 1,
  completedMissions: [],
  respect: 0,
  bestCar: 'standard',
  sunCoinsCollected: []
});

export class SaveSystem {
  constructor() {
    this.key = 'solmarina_neon_heat_save_v1';
    this.data = this.load();
  }

  _createDefaultState() {
    return {
      cash: DEFAULT_SAVE_STATE.cash,
      debt: DEFAULT_SAVE_STATE.debt,
      currentMission: DEFAULT_SAVE_STATE.currentMission,
      completedMissions: [...DEFAULT_SAVE_STATE.completedMissions],
      respect: DEFAULT_SAVE_STATE.respect,
      bestCar: DEFAULT_SAVE_STATE.bestCar,
      sunCoinsCollected: [...DEFAULT_SAVE_STATE.sunCoinsCollected]
    };
  }

  _normalizeData(raw) {
    const defaults = this._createDefaultState();
    if (!raw || typeof raw !== 'object') {
      return defaults;
    }

    const cash = typeof raw.cash === 'number' && !isNaN(raw.cash) ? Math.max(0, raw.cash) : defaults.cash;
    const debt = typeof raw.debt === 'number' && !isNaN(raw.debt) ? Math.max(0, raw.debt) : defaults.debt;
    const currentMission = typeof raw.currentMission === 'number' && !isNaN(raw.currentMission) 
      ? Math.max(1, Math.min(5, Math.floor(raw.currentMission))) 
      : defaults.currentMission;
    
    const respect = typeof raw.respect === 'number' && !isNaN(raw.respect) ? Math.max(0, raw.respect) : defaults.respect;
    const bestCar = typeof raw.bestCar === 'string' && raw.bestCar.trim().length > 0 ? raw.bestCar : defaults.bestCar;

    const completedMissions = Array.isArray(raw.completedMissions)
      ? raw.completedMissions.filter(item => typeof item === 'number' || typeof item === 'string')
      : [...defaults.completedMissions];

    const sunCoinsCollected = Array.isArray(raw.sunCoinsCollected)
      ? raw.sunCoinsCollected.filter(item => typeof item === 'string' || typeof item === 'number')
      : [...defaults.sunCoinsCollected];

    return {
      cash,
      debt,
      currentMission,
      completedMissions,
      respect,
      bestCar,
      sunCoinsCollected
    };
  }

  load() {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return this._createDefaultState();
      }
      const serialized = window.localStorage.getItem(this.key);
      if (!serialized) {
        return this._createDefaultState();
      }
      const parsed = JSON.parse(serialized);
      return this._normalizeData(parsed);
    } catch (err) {
      // Fail silently and return defaults on any error (corrupt JSON, storage disabled, etc.)
      return this._createDefaultState();
    }
  }

  save(gameData) {
    try {
      const merged = { ...this.data, ...(gameData || {}) };
      this.data = this._normalizeData(merged);
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(this.key, JSON.stringify(this.data));
      }
    } catch (err) {
      // Fail silently
    }
    return this.data;
  }

  clear() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(this.key);
      }
    } catch (err) {
      // Fail silently
    }
    this.data = this._createDefaultState();
    return this.data;
  }

  hasSave() {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return false;
      }
      return window.localStorage.getItem(this.key) !== null;
    } catch (err) {
      return false;
    }
  }
}
