import * as THREE from '../vendor/three.min.js';
import { CONFIG } from './config.js';

// Per-mission gameplay template, zipped with CONFIG.missions.storyMissions
// by index. Only the fields a mission type needs are present here.
const MISSION_TEMPLATES = [
  { type: 'waypoint', timeLimit: 120, waypoint: [140, 0, 140] },
  { type: 'packages', packagesNeeded: 3, waypoint: [-120, 0, 90] },
  { type: 'hotwheels', waypoint: [60, 0, -100] },
  { type: 'getaway', waypoint: [-180, 0, -180] },
  { type: 'heist', heistPhase: 1, waypoint: [200, 0, 20] },
];

const ARRIVAL_RADIUS = 6.5;

export class MissionSystem {
  constructor(rng) {
    this.rng = rng;
    this.cash = CONFIG.economy.playerCash;
    this.debt = CONFIG.economy.startingDebt;
    this.currentMissionIndex = -1; // null before start
    this.missionTimer = 0;
    this.sunCoins = [];

    // Build missions from CONFIG.missions.storyMissions as required
    this.missions = CONFIG.missions.storyMissions.map((sm, index) =>
      this._buildMission(sm, MISSION_TEMPLATES[index])
    );

    // One progress handler per mission type; update() dispatches through this map.
    this._typeHandlers = new Map([
      ['waypoint', (m, ctx) => this._checkWaypoint(m, ctx)],
      ['getaway', (m, ctx) => this._checkGetaway(m, ctx)],
      ['hotwheels', (m, ctx) => this._checkHotwheels(m, ctx)],
      ['packages', (m, ctx) => this._checkPackages(m, ctx)],
      ['heist', (m, ctx) => this._checkHeist(m, ctx)],
    ]);

    this.generateSunCoins();
  }

  _buildMission(story, template) {
    const mission = {
      id: story.id,
      title: story.title,
      client: story.client,
      reward: story.reward,
      desc: story.desc,
      active: false,
      waypoint: new THREE.Vector3(...template.waypoint),
      type: template.type,
    };
    if (template.timeLimit !== undefined) mission.timeLimit = template.timeLimit;
    if (template.packagesNeeded !== undefined) {
      mission.packagesNeeded = template.packagesNeeded;
      mission.packagesCollected = 0;
    }
    if (template.heistPhase !== undefined) mission.heistPhase = template.heistPhase;
    return mission;
  }

  generateSunCoins() {
    for (let i = 0; i < CONFIG.economy.totalSunCoins; i++) {
      this.sunCoins.push({
        id: i,
        position: new THREE.Vector3(
          this.rng.range(-240, 240),
          0.5,
          this.rng.range(-240, 240)
        ),
        collected: false
      });
    }
  }

  getCash() {
    return this.cash;
  }

  getDebt() {
    return this.debt;
  }

  getCurrentMission() {
    if (this.currentMissionIndex < 0 || this.currentMissionIndex >= this.missions.length) {
      return null;
    }
    const m = this.missions[this.currentMissionIndex];
    return m.active ? m : null;
  }

  startMission(index) {
    if (index < 0 || index >= this.missions.length) return null;
    this.currentMissionIndex = index;
    const m = this.missions[index];
    m.active = true;
    this.missionTimer = m.timeLimit || 0;

    if (m.type === 'packages') {
      m.packagesCollected = 0;
      m.waypoint.set(this.rng.range(-150, 150), 0, this.rng.range(-150, 150));
    } else if (m.type === 'heist') {
      m.heistPhase = 1;
      m.waypoint.set(200, 0, 20);
    }
    return m;
  }

  collectReward(mission) {
    if (!mission || !mission.reward) return;
    this.cash += mission.reward;
    this.debt = Math.max(0, this.debt - mission.reward);
  }

  _complete(m) {
    m.active = false;
    return { status: 'completed', mission: m };
  }

  _checkWaypoint(m, { dist }) {
    return dist < ARRIVAL_RADIUS ? this._complete(m) : null;
  }

  _checkGetaway(m, { dist, policeStars }) {
    if (dist >= ARRIVAL_RADIUS) return null;
    if (policeStars > 0) {
      return { status: 'progress', mission: m, message: 'Shake the police before entering safehouse!' };
    }
    return this._complete(m);
  }

  _checkHotwheels(m, { dist, activeCar, policeStars }) {
    const inSportsCar = activeCar && activeCar.typeKey === 'sports';
    if (inSportsCar && policeStars === 0 && dist < 8.0) {
      return this._complete(m);
    }
    return null;
  }

  _checkPackages(m, { dist }) {
    if (dist >= ARRIVAL_RADIUS) return null;
    m.packagesCollected++;
    if (m.packagesCollected >= m.packagesNeeded) {
      return this._complete(m);
    }
    // Relocate waypoint for next package
    m.waypoint.set(this.rng.range(-160, 160), 0, this.rng.range(-160, 160));
    return { status: 'progress', mission: m, message: `Package collected (${m.packagesCollected}/${m.packagesNeeded})` };
  }

  _checkHeist(m, { dist }) {
    if (dist >= ARRIVAL_RADIUS) return null;
    if (m.heistPhase === 1) {
      m.heistPhase = 2;
      m.waypoint.set(-240, 0, -20); // Western beach boat escape
      return { status: 'progress', mission: m, message: 'Vault robbed! Head to the beach boat escape!' };
    }
    return this._complete(m);
  }

  update(dt, playerPos, activeCar, policeStars) {
    // Check sun coins collection regardless of active mission state
    const pos = activeCar ? activeCar.position : playerPos;
    for (const coin of this.sunCoins) {
      if (!coin.collected && pos.distanceTo(coin.position) < 4.0) {
        coin.collected = true;
        this.cash += CONFIG.economy.sunCoinReward;
        return { status: 'coin_collected', coinId: coin.id, sunCoinsRemaining: this.sunCoins.filter(c => !c.collected).length };
      }
    }

    const m = this.getCurrentMission();
    if (!m || !m.active) {
      return { status: 'idle' };
    }

    // Handle timer for timed missions (e.g. M1)
    if (m.timeLimit && m.active) {
      this.missionTimer -= dt;
      if (this.missionTimer <= 0) {
        m.active = false;
        return { status: 'failed', mission: m, reason: 'Mission timer expired' };
      }
    }

    const ctx = { dist: pos.distanceTo(m.waypoint), activeCar, policeStars };
    const handler = this._typeHandlers.get(m.type);
    const result = handler ? handler(m, ctx) : null;
    if (result) return result;

    return { status: 'running', mission: m, timer: this.missionTimer };
  }
}
