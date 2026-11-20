/**
 * Solmarina: Neon Heat - Configuration and Tuning Constants
 * Central configuration for world layout, player stats, economy, wanted system,
 * missions, vehicles, combat, audio, and camera parameters.
 *
 * Each section is built by a small factory so the tuning table stays grouped
 * by concern; the exported CONFIG object carries exactly the same values,
 * keys, and nesting as before.
 */

// One row per vehicle class: [maxSpeed, acceleration, handling].
const VEHICLE_ROWS = {
  sedan: [35, 12, 2.5],
  taxi: [38, 13, 2.4],
  sports: [52, 22, 3.8],
  pickup: [30, 10, 2.0],
  boat: [45, 15, 2.2],
};

function vehicleTable(column) {
  const table = {};
  for (const [key, row] of Object.entries(VEHICLE_ROWS)) {
    table[key] = row[column];
  }
  return table;
}

function storyMission(id, title, desc) {
  return { id, title, client: 'Vera Kane', reward: 10000, desc };
}

const worldSection = {
  blocksX: 10,
  blocksZ: 10,
  blockSize: 70,
  roadWidth: 16,
  sidewalkWidth: 3.5,
  buildingMinHeight: 15,
  buildingMaxHeight: 65,
  beachWidth: 80,
  portWidth: 120,
};

const playerSection = {
  walkSpeed: 5.2,
  runSpeed: 9.5,
  turnSpeed: 12.0,
  maxHealth: 100,
  jumpForce: 7.0,
  gravity: 20.0,
  punchDamage: 25,
  punchRange: 2.5,
};

const economySection = {
  startingDebt: 50000,
  playerCash: 5000,
  hospitalPenalty: 2500,
  carStolenReward: 150,
  sunCoinReward: 500,
  totalSunCoins: 20,
};

const wantedSection = {
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
};

const vehiclesSection = {
  maxSpeed: vehicleTable(0),
  acceleration: vehicleTable(1),
  handling: vehicleTable(2),
  health: 100,
};

const missionsSection = {
  rewardPerJob: 10000,
  storyMissions: [
    storyMission(1, 'First Fare', "Drive Vera's client across town within the time limit."),
    storyMission(2, 'Package Run', 'Collect 3 packages around the downtown core while evading police.'),
    storyMission(3, 'Hot Wheels', 'Steal a high-end sports car from the waterfront and lose a 2-star wanted level.'),
    storyMission(4, 'The Getaway', 'Escape a 4-star dragnet spanning across the downtown bridges.'),
    storyMission(5, 'Neon Heat', 'Final heist: rob the port vault and escape by boat to freedom.'),
  ],
};

const audioSection = {
  masterVolume: 0.8,
  sfxVolume: 1.0,
  musicVolume: 0.6,
};

const cameraSection = {
  orbitSpeed: 0.25,
  followDistance: 14,
  followHeight: 5.5,
  maxPitch: Math.PI / 2.5,
  minPitch: -Math.PI / 6,
};

const environmentSection = {
  timeOfDay: 'goldenHour',
  skyColor: 0xff7b54,
  sunColor: 0xffea85,
  ambientColor: 0x4a3b6c,
  fogDensity: 0.003,
};

export const CONFIG = {
  world: worldSection,
  player: playerSection,
  economy: economySection,
  wanted: wantedSection,
  vehicles: vehiclesSection,
  missions: missionsSection,
  audio: audioSection,
  camera: cameraSection,
  environment: environmentSection,
};
