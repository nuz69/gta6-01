export const CONFIG = {
  world: {
    blocksX: 8,
    blocksZ: 8,
    blockSize: 60,
    roadWidth: 14,
    sidewalkWidth: 3,
  },
  player: {
    walkSpeed: 5.0,
    runSpeed: 9.0,
    turnSpeed: 10.0,
    maxHealth: 100,
  },
  economy: {
    startingDebt: 50000,
    playerCash: 5000,
    hospitalPenalty: 2500,
  },
  wanted: {
    maxStars: 5,
    heatMax: 100,
    decayRate: 5.0,
    crimeHeat: {
      carStolen: 25,
      pedHit: 30,
      policeRam: 45,
      speeding: 10,
      punchPed: 20
    }
  },
  missions: {
    rewardPerJob: 10000,
  },
  audio: {
    masterVolume: 0.8,
  },
  camera: {
    orbitSpeed: 0.2,
    followDistance: 12,
    followHeight: 5,
  }
};
