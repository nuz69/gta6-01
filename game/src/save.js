/**
 * SaveSystem - LocalStorage state persistence for SOLMARINA: NEON HEAT
 */
export class SaveSystem {
  constructor() {
    this.key = 'solmarina_neon_heat_save_v1';
    this.defaults = {
      cash: 5000,
      debt: 50000,
      currentMission: 1,
      completedMissions: [],
      respect: 0,
      bestCar: 'standard',
      sunCoinsCollected: []
    };
    this.data = this.load();
  }

  load() {
    try {
      const raw = localStorage.getItem(this.key);
      if (raw) {
        const parsed = JSON.parse(raw);
        return { ...this.defaults, ...parsed };
      }
    } catch (e) {
      // Fail silently when localStorage unavailable
    }
    return { ...this.defaults };
  }

  save(gameData) {
    try {
      this.data = { ...this.data, ...gameData };
      localStorage.setItem(this.key, JSON.stringify(this.data));
    } catch (e) {
      // Fail silently
    }
    return this.data;
  }

  clear() {
    try {
      localStorage.removeItem(this.key);
      this.data = { ...this.defaults };
    } catch (e) {
      // Fail silently
    }
    return this.data;
  }
}
