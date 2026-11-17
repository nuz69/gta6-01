import * as THREE from '../vendor/three.min.js';

export class MissionSystem {
  constructor(rng) {
    this.rng = rng;
    this.missions = [
      {
        id: 1,
        title: "First Fare",
        briefing: "Vera Kane: 'Rex, I got a nervous client needing a fast ride across town. Get them to the drop-off in time.'",
        objective: "Drive to the client drop-off point across town.",
        waypoint: new THREE.Vector3(120, 0, 120),
        reward: 10000,
        type: 'waypoint',
        timeLimit: 120,
        active: false
      },
      {
        id: 2,
        title: "Package Run",
        briefing: "Vera Kane: 'Three package drops are waiting in the district. Collect all three before heat builds up.'",
        objective: "Collect 3 hidden packages around the city (0/3).",
        waypoint: new THREE.Vector3(-100, 0, 80),
        reward: 10000,
        type: 'packages',
        packagesNeeded: 3,
        packagesCollected: 0,
        active: false
      },
      {
        id: 3,
        title: "Hot Wheels",
        briefing: "Vera Kane: 'We need high-end wheels. Steal a sports car from downtown and shake the police tail.'",
        objective: "Steal a sports car and lose the wanted level.",
        waypoint: new THREE.Vector3(0, 0, 0),
        reward: 10000,
        type: 'hotwheels',
        active: false
      },
      {
        id: 4,
        title: "The Getaway",
        briefing: "Vera Kane: 'The dragnet is out! A 4-star chase is locked on you. Reach the suburban safehouse.'",
        objective: "Reach the safehouse and shake the police dragnet.",
        waypoint: new THREE.Vector3(-180, 0, -180),
        reward: 10000,
        type: 'getaway',
        active: false
      },
      {
        id: 5,
        title: "Neon Heat",
        briefing: "Vera Kane: 'This is it, Rex. Rob the port vault at the east docks, then escape by boat at the beach.'",
        objective: "Rob the port vault and escape by boat at the west beach.",
        waypoint: new THREE.Vector3(200, 0, 0),
        reward: 10000,
        type: 'heist',
        heistPhase: 1, // 1: Port vault, 2: Beach boat
        active: false
      }
    ];

    this.currentMissionIndex = 0;
    this.missionTimer = 0;
    this.sunCoins = [];
    this.generateSunCoins();
  }

  generateSunCoins() {
    for (let i = 0; i < 20; i++) {
      this.sunCoins.push({
        id: i,
        position: new THREE.Vector3(
          this.rng.range(-200, 200),
          0.5,
          this.rng.range(-200, 200)
        ),
        collected: false
      });
    }
  }

  getCurrentMission() {
    if (this.currentMissionIndex >= this.missions.length) return null;
    return this.missions[this.currentMissionIndex];
  }

  startMission(index) {
    if (index < 0 || index >= this.missions.length) return false;
    this.currentMissionIndex = index;
    const m = this.missions[index];
    m.active = true;
    this.missionTimer = m.timeLimit || 300;
    if (m.type === 'packages') {
      m.packagesCollected = 0;
    }
    if (m.type === 'heist') {
      m.heistPhase = 1;
      m.waypoint.set(200, 0, 50); // Port vault
    }
    return m;
  }

  update(dt, playerPos, activeCar, policeStars) {
    const m = this.getCurrentMission();
    if (!m || !m.active) return { status: 'idle' };

    if (m.timeLimit) {
      this.missionTimer -= dt;
      if (this.missionTimer <= 0) {
        m.active = false;
        return { status: 'failed', reason: 'Time expired' };
      }
    }

    const pos = activeCar ? activeCar.position : playerPos;
    const dist = pos.distanceTo(m.waypoint);

    if (m.type === 'waypoint' || m.type === 'getaway') {
      if (dist < 6.0) {
        if (m.type === 'getaway' && policeStars > 0) {
          // Cannot finish getaway while police stars active
          return { status: 'progress', message: 'Shake the police before entering safehouse!' };
        }
        m.active = false;
        return { status: 'completed', mission: m };
      }
    } else if (m.type === 'hotwheels') {
      // Check if player is in a sports car and stars == 0
      if (activeCar && activeCar.typeKey === 'sports' && policeStars === 0) {
        m.active = false;
        return { status: 'completed', mission: m };
      }
    } else if (m.type === 'heist') {
      if (m.heistPhase === 1 && dist < 6.0) {
        m.heistPhase = 2;
        m.waypoint.set(-240, 0, 0); // Beach boat
        m.objective = "Escape by boat at the western beach!";
        return { status: 'progress', message: 'Vault robbed! Head to the beach boat escape!' };
      } else if (m.heistPhase === 2 && dist < 6.0) {
        m.active = false;
        return { status: 'completed', mission: m };
      }
    } else if (m.type === 'packages') {
      if (dist < 6.0) {
        m.packagesCollected++;
        if (m.packagesCollected >= m.packagesNeeded) {
          m.active = false;
          return { status: 'completed', mission: m };
        } else {
          // Move waypoint for next package
          m.waypoint.set(this.rng.range(-150, 150), 0, this.rng.range(-150, 150));
          m.objective = `Collect 3 hidden packages around the city (${m.packagesCollected}/3).`;
          return { status: 'progress', message: `Package collected (${m.packagesCollected}/3)` };
        }
      }
    }

    // Check sun coins collection
    for (const coin of this.sunCoins) {
      if (!coin.collected && pos.distanceTo(coin.position) < 3.5) {
        coin.collected = true;
        return { status: 'coin_collected', coinId: coin.id };
      }
    }

    return { status: 'running' };
  }
}
