export class SaveSystem {
  constructor() {
    this.key = 'solmarina_neon_heat_save_v1';
    this.defaultData = {
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
        return { ...this.defaultData, ...parsed };
      }
    } catch (e) {
      // Fail silently if localStorage unavailable
    }
    return { ...this.defaultData };
  }

  save(gameData) {
    try {
      this.data = { ...this.data, ...gameData };
      localStorage.setItem(this.key, JSON.stringify(this.data));
    } catch (e) {
      // Fail silently
    }
  }

  clear() {
    try {
      localStorage.removeItem(this.key);
      this.data = { ...this.defaultData };
    } catch (e) {
      // Fail silently
    }
    return this.data;
  }
}
