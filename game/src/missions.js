import * as THREE from '../vendor/three.min.js';
import { CONFIG } from './config.js';

export class MissionSystem {
  constructor(rng) {
    this.rng = rng;
    this.cash = CONFIG.economy.playerCash;
    this.debt = CONFIG.economy.startingDebt;
    this.currentMissionIndex = -1; // null before start
    this.missionTimer = 0;
    this.sunCoins = [];

    // Build missions from CONFIG.missions.storyMissions as required
    this.missions = CONFIG.missions.storyMissions.map((sm, index) => {
      const mission = {
        id: sm.id,
        title: sm.title,
        client: sm.client,
        reward: sm.reward,
        desc: sm.desc,
        active: false,
        waypoint: new THREE.Vector3(0, 0, 0),
        type: 'waypoint'
      };

      // Configure specific mission types and default waypoints
      if (index === 0) {
        mission.type = 'waypoint';
        mission.timeLimit = 120;
        mission.waypoint.set(140, 0, 140);
      } else if (index === 1) {
        mission.type = 'packages';
        mission.packagesNeeded = 3;
        mission.packagesCollected = 0;
        mission.waypoint.set(-120, 0, 90);
      } else if (index === 2) {
        mission.type = 'hotwheels';
        mission.waypoint.set(60, 0, -100);
      } else if (index === 3) {
        mission.type = 'getaway';
        mission.waypoint.set(-180, 0, -180);
      } else if (index === 4) {
        mission.type = 'heist';
        mission.heistPhase = 1; // Phase 1: Port vault; Phase 2: Beach boat
        mission.waypoint.set(200, 0, 20);
      }
      return mission;
    });

    this.generateSunCoins();
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

    const dist = pos.distanceTo(m.waypoint);

    if (m.type === 'waypoint') {
      if (dist < 6.5) {
        m.active = false;
        return { status: 'completed', mission: m };
      }
    } else if (m.type === 'getaway') {
      if (dist < 6.5) {
        if (policeStars > 0) {
          return { status: 'progress', mission: m, message: 'Shake the police before entering safehouse!' };
        }
        m.active = false;
        return { status: 'completed', mission: m };
      }
    } else if (m.type === 'hotwheels') {
      const inSportsCar = activeCar && activeCar.typeKey === 'sports';
      if (inSportsCar && policeStars === 0) {
        if (dist < 8.0) {
          m.active = false;
          return { status: 'completed', mission: m };
        }
      }
    } else if (m.type === 'packages') {
      if (dist < 6.5) {
        m.packagesCollected++;
        if (m.packagesCollected >= m.packagesNeeded) {
          m.active = false;
          return { status: 'completed', mission: m };
        } else {
          // Relocate waypoint for next package
          m.waypoint.set(this.rng.range(-160, 160), 0, this.rng.range(-160, 160));
          return { status: 'progress', mission: m, message: `Package collected (${m.packagesCollected}/${m.packagesNeeded})` };
        }
      }
    } else if (m.type === 'heist') {
      if (m.heistPhase === 1) {
        if (dist < 6.5) {
          m.heistPhase = 2;
          m.waypoint.set(-240, 0, -20); // Western beach boat escape
          return { status: 'progress', mission: m, message: 'Vault robbed! Head to the beach boat escape!' };
        }
      } else if (m.heistPhase === 2) {
        if (dist < 6.5) {
          m.active = false;
          return { status: 'completed', mission: m };
        }
      }
    }

    return { status: 'running', mission: m, timer: this.missionTimer };
  }
}
