/**
 * Solmarina: Neon Heat - Configuration and Tuning Constants
 * Central configuration for world layout, player stats, economy, wanted system,
 * missions, vehicles, combat, audio, and camera parameters.
 */

export const CONFIG = {
  // World geometry and district layout
  world: {
    blocksX: 10,
    blocksZ: 10,
    blockSize: 70,
    roadWidth: 16,
    sidewalkWidth: 3.5,
    buildingMinHeight: 15,
    buildingMaxHeight: 65,
    beachWidth: 80,
    portWidth: 120,
  },

  // Player movement and stats
  player: {
    walkSpeed: 5.2,
    runSpeed: 9.5,
    turnSpeed: 12.0,
    maxHealth: 100,
    jumpForce: 7.0,
    gravity: 20.0,
    punchDamage: 25,
    punchRange: 2.5,
  },

  // Economy and progression ($50,000 debt to Vera Kane)
  economy: {
    startingDebt: 50000,
    playerCash: 5000,
    hospitalPenalty: 2500,
    carStolenReward: 150,
    sunCoinReward: 500,
    totalSunCoins: 20,
  },

  // Wanted level and police heat mechanics
  wanted: {
    maxStars: 5,
    heatMax: 100,
    decayRate: 4.0,
    crimeHeat: {
      carStolen: 30,
      pedHit: 35,
      policeRam: 50,
      speeding: 12,
      punchPed: 25,
      copAttacked: 60,
    },
    starThresholds: [0, 20, 45, 70, 90, 100],
  },

  // Vehicle specifications (sedan, taxi, sports, pickup, boat)
  vehicles: {
    maxSpeed: {
      sedan: 35,
      taxi: 38,
      sports: 52,
      pickup: 30,
      boat: 45,
    },
    acceleration: {
      sedan: 12,
      taxi: 13,
      sports: 22,
      pickup: 10,
      boat: 15,
    },
    handling: {
      sedan: 2.5,
      taxi: 2.4,
      sports: 3.8,
      pickup: 2.0,
      boat: 2.2,
    },
    health: 100,
  },

  // Story missions and side jobs
  missions: {
    rewardPerJob: 10000,
    storyMissions: [
      { id: 1, title: "First Fare", client: "Vera Kane", reward: 10000, desc: "Drive Vera's client across town within the time limit." },
      { id: 2, title: "Package Run", client: "Vera Kane", reward: 10000, desc: "Collect 3 packages around the downtown core while evading police." },
      { id: 3, title: "Hot Wheels", client: "Vera Kane", reward: 10000, desc: "Steal a high-end sports car from the waterfront and lose a 2-star wanted level." },
      { id: 4, title: "The Getaway", client: "Vera Kane", reward: 10000, desc: "Escape a 4-star dragnet spanning across the downtown bridges." },
      { id: 5, title: "Neon Heat", client: "Vera Kane", reward: 10000, desc: "Final heist: rob the port vault and escape by boat to freedom." },
    ],
  },

  // Audio settings
  audio: {
    masterVolume: 0.8,
    sfxVolume: 1.0,
    musicVolume: 0.6,
  },

  // Camera rig settings
  camera: {
    orbitSpeed: 0.25,
    followDistance: 14,
    followHeight: 5.5,
    maxPitch: Math.PI / 2.5,
    minPitch: -Math.PI / 6,
  },

  // Environment and golden hour lighting settings
  environment: {
    timeOfDay: "goldenHour",
    skyColor: 0xff7b54,
    sunColor: 0xffea85,
    ambientColor: 0x4a3b6c,
    fogDensity: 0.003,
  }
};
