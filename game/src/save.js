/**
 * SOLMARINA: NEON HEAT - Save System
 * Manages persistent game state in localStorage with robust validation and normalization.
 *
 * Validation is table-driven: each save field declares how a raw value is
 * sanitized, so adding a field means adding one row instead of a new branch.
 * The storage key, the default state, and every clamping/filtering rule are
 * identical to the original implementation, keeping old saves compatible.
 */

const SAVE_KEY = 'solmarina_neon_heat_save_v1';

function freshDefaults() {
  return {
    cash: 5000,
    debt: 50000,
    currentMission: 1,
    completedMissions: [],
    respect: 0,
    bestCar: 'standard',
    sunCoinsCollected: []
  };
}

const isRealNumber = (value) => typeof value === 'number' && !isNaN(value);
const isIdList = (value) =>
  Array.isArray(value)
    ? value.filter((item) => typeof item === 'number' || typeof item === 'string')
    : null;

// One rule per persisted field: how to turn a raw value into a valid one,
// falling back to the default when the raw value is unusable.
const FIELD_RULES = [
  { key: 'cash', sanitize: (value, fallback) => (isRealNumber(value) ? Math.max(0, value) : fallback) },
  { key: 'debt', sanitize: (value, fallback) => (isRealNumber(value) ? Math.max(0, value) : fallback) },
  {
    key: 'currentMission',
    sanitize: (value, fallback) =>
      isRealNumber(value) ? Math.max(1, Math.min(5, Math.floor(value))) : fallback,
  },
  {
    key: 'completedMissions',
    sanitize: (value, fallback) => isIdList(value) ?? [...fallback],
  },
  { key: 'respect', sanitize: (value, fallback) => (isRealNumber(value) ? Math.max(0, value) : fallback) },
  {
    key: 'bestCar',
    sanitize: (value, fallback) =>
      typeof value === 'string' && value.trim().length > 0 ? value : fallback,
  },
  {
    key: 'sunCoinsCollected',
    sanitize: (value, fallback) => isIdList(value) ?? [...fallback],
  },
];

export class SaveSystem {
  constructor() {
    this.key = SAVE_KEY;
    this.data = this.load();
  }

  _createDefaultState() {
    return freshDefaults();
  }

  _normalizeData(raw) {
    const defaults = this._createDefaultState();
    if (!raw || typeof raw !== 'object') {
      return defaults;
    }
    const normalized = {};
    for (const rule of FIELD_RULES) {
      normalized[rule.key] = rule.sanitize(raw[rule.key], defaults[rule.key]);
    }
    return normalized;
  }

  _readRaw() {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage.getItem(this.key);
  }

  load() {
    try {
      const serialized = this._readRaw();
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
