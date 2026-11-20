import * as THREE from '../vendor/three.min.js';
import { RenderSystem } from './render.js';
import { World } from './world.js';
import { CONFIG } from './config.js';
import { SeederRNG } from './random.js';
import { Player } from './player.js';
import { VehicleManager } from './vehicles.js';
import { PedestrianManager } from './peds.js';
import { PoliceSystem } from './police.js';
import { MissionSystem } from './missions.js';
import { HeadsUpDisplay } from './hud.js';
import { AudioSystem } from './audio.js';
import { SaveSystem } from './save.js';
import { stageShot } from './shots.js';

// How long the WASTED screen stays up before play resumes (ms).
const WASTED_PAUSE_MS = 2000;
// Cash docked from the player every time they get wasted.
const WASTED_PENALTY = 2500;
// How far beside a car the player steps out when leaving it.
const EXIT_OFFSET_X = 2.5;
// Reach used when grabbing the nearest car / ped.
const ENTER_CAR_REACH = 5.0;
const PUNCH_REACH = 2.5;
// Attract-mode camera: radius + height of the slow downtown orbit.
const ATTRACT_RADIUS = 180;
const ATTRACT_HEIGHT = 75;
const ATTRACT_SPEED = 0.15;
// Longest frame delta the sim ever consumes (seconds).
const MAX_FRAME_DT = 0.1;
// Fallback tick rate when requestAnimationFrame stalls (ms).
const TICK_FALLBACK_MS = 16;

class SolmarinaGame {
  constructor() {
    // 'attract' | 'playing' | 'paused'
    this.state = 'attract';
    // 0: standard chase cam, 1: far chase cam
    this.chaseCam = 0;
    this.activeCar = null;
    this.previousTickAt = performance.now();
    this.attractOrbit = 0;
    this.wastedCooldown = false;
    this.shotFrozen = false;

    this.input = {
      keys: {},
      edges: {}
    };

    this.boot();
  }

  boot() {
    const launch = this.readLaunchParams();
    this.buildSystems(launch.seed);
    this.restoreProgress();
    this.bindControls();
    this.publishDebugHandle(launch.seed);
    this.enterLaunchScene(launch);
    this.startLoops();
  }

  // ?shot=<name>&seed=<n> — deterministic staging for screenshots & probes.
  readLaunchParams() {
    const params = new URLSearchParams(window.location.search);
    const shot = params.get('shot');
    const seedText = params.get('seed');
    return {
      shot,
      hasSeed: seedText !== null,
      seed: seedText ? parseInt(seedText, 10) : 1337
    };
  }

  buildSystems(seed) {
    this.seededRng = new SeederRNG(seed);
    this.renderer = new RenderSystem();
    this.city = new World(seed);
    this.renderer.scene.add(this.city.group);

    this.player = new Player(this.city);
    this.renderer.scene.add(this.player.group);

    this.vehicleManager = new VehicleManager(this.city, this.seededRng);
    this.renderer.scene.add(this.vehicleManager.group);

    this.pedestrians = new PedestrianManager(this.city, this.seededRng);
    this.renderer.scene.add(this.pedestrians.group);
    // shots.js stages the sim through `game.pedManager` — keep that name
    // pointing at the same manager so the staging contract holds.
    this.pedManager = this.pedestrians;

    this.police = new PoliceSystem(this.city, this.seededRng);
    this.renderer.scene.add(this.police.group);

    this.missions = new MissionSystem(this.seededRng);
    this.hud = new HeadsUpDisplay();
    this.audio = new AudioSystem();
    this.saveSystem = new SaveSystem();
  }

  restoreProgress() {
    const saved = this.saveSystem.load();
    if (!saved || typeof saved.cash !== 'number' || saved.cash < 0) return;

    this.missions.cash = saved.cash;
    this.missions.debt = typeof saved.debt === 'number'
      ? saved.debt
      : CONFIG.economy.startingDebt;
    if (typeof saved.currentMission === 'number'
      && saved.currentMission > 1
      && saved.currentMission <= this.missions.missions.length) {
      this.missions.currentMissionIndex = saved.currentMission - 1;
    }
  }

  bindControls() {
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));
    this.bindMenuButtons();
  }

  // Shared core of every "start playing" path: state + HUD + mission kickoff.
  beginPlay() {
    this.state = 'playing';
    this.hud.showState('playing');
    const current = this.missions.getCurrentMission();
    if (!current || !current.active) {
      this.missions.startMission(this.missions.currentMissionIndex);
    }
  }

  startGame() {
    this.audio.init();
    this.audio.playClick();
    this.beginPlay();
    const overlay = document.getElementById('title-overlay');
    if (overlay) overlay.style.display = 'none';
  }

  completedMissionNumbers() {
    const done = [];
    for (let i = 0; i < this.missions.currentMissionIndex; i++) {
      done.push(i + 1);
    }
    return done;
  }

  saveProgress() {
    this.saveSystem.save({
      cash: this.missions.getCash(),
      debt: this.missions.getDebt(),
      currentMission: this.missions.currentMissionIndex + 1,
      completedMissions: this.completedMissionNumbers(),
      respect: 0,
      bestCar: this.activeCar ? this.activeCar.typeKey : 'standard',
      sunCoinsCollected: []
    });
  }

  onKeyDown(e) {
    this.audio.init();

    if (this.state === 'attract') {
      this.audio.playClick();
      this.startGame();
      return;
    }

    const code = e.code || '';
    const key = (e.key || '').toLowerCase();

    if (code === 'KeyM' || key === 'm') {
      this.audio.setMuted(!this.audio.isMuted());
      return;
    }

    if (code === 'Escape' || key === 'escape') {
      this.togglePause();
      return;
    }

    if (this.state !== 'playing') return;

    this.recordKeyPress(e);
    this.handlePlayKey(code, key);
  }

  togglePause() {
    this.audio.playClick();
    if (this.state === 'playing') {
      this.state = 'paused';
      this.hud.showState('paused');
      this.saveProgress();
    } else if (this.state === 'paused') {
      this.state = 'playing';
      this.hud.showState('playing');
    }
  }

  recordKeyPress(e) {
    if (e.code) {
      this.input.keys[e.code] = true;
      this.input.edges[e.code] = true;
    }
    if (e.key) {
      this.input.keys[e.key] = true;
      this.input.keys[e.key.toLowerCase()] = true;
      this.input.edges[e.key] = true;
    }
  }

  handlePlayKey(code, key) {
    if (code === 'KeyC' || key === 'c') {
      this.chaseCam = (this.chaseCam + 1) % 2;
      return;
    }
    if (code === 'KeyE' || key === 'e') {
      this.handleEnterExitCar();
      return;
    }
    if ((code === 'KeyF' || key === 'f') && !this.activeCar) {
      this.punchNearestPed();
    }
  }

  punchNearestPed() {
    this.player.punch();
    this.audio.playPunch();
    const victim = this.pedestrians.findNearestPed(this.player.position, PUNCH_REACH);
    if (victim) victim.state = 'fleeing';
  }

  onKeyUp(e) {
    if (e.code) this.input.keys[e.code] = false;
    if (e.key) {
      this.input.keys[e.key] = false;
      this.input.keys[e.key.toLowerCase()] = false;
    }
  }

  handleEnterExitCar() {
    if (this.activeCar) {
      this.stepOutOfCar();
    } else {
      this.stepIntoNearestCar();
    }
  }

  stepOutOfCar() {
    const exitPos = this.activeCar.position.clone()
      .add(new THREE.Vector3(EXIT_OFFSET_X, 0, 0));
    this.player.position.copy(exitPos);
    this.player.group.position.copy(exitPos);
    this.player.group.visible = true;
    this.activeCar = null;
    this.audio.playClick();
  }

  stepIntoNearestCar() {
    const nearest = this.vehicleManager.findNearestCar(this.player.position, ENTER_CAR_REACH);
    if (!nearest) return;
    this.activeCar = nearest;
    this.player.group.visible = false;
    this.police.addHeat(CONFIG.wanted.crimeHeat.carStolen);
    this.audio.playClick();
  }

  // One small helper so every menu button wires up the same way.
  bindButton(id, onClick) {
    const button = document.getElementById(id);
    if (button) button.addEventListener('click', onClick);
  }

  resumeFromPause() {
    this.audio.playClick();
    this.state = 'playing';
    this.hud.showState('playing');
  }

  restartCurrentMission() {
    this.audio.playClick();
    this.missions.startMission(this.missions.currentMissionIndex);
    this.state = 'playing';
    this.hud.hideOverlays();
    this.hud.showState('playing');
  }

  returnToTitle() {
    this.audio.playClick();
    this.state = 'attract';
    this.hud.showState('attract');
  }

  dismissOverlay() {
    this.audio.playClick();
    this.hud.hideOverlays();
    this.hud.showState('playing');
  }

  bindMenuButtons() {
    this.bindButton('start-game-btn', () => {
      this.audio.init();
      this.audio.playClick();
      this.startGame();
    });
    this.bindButton('pause-resume-btn', () => this.resumeFromPause());
    this.bindButton('pause-restart-btn', () => this.restartCurrentMission());
    this.bindButton('pause-title-btn', () => this.returnToTitle());
    this.bindButton('mc-continue-btn', () => this.dismissOverlay());
    this.bindButton('mf-retry-btn', () => {
      this.audio.playClick();
      this.hud.hideOverlays();
      this.hud.showState('playing');
      this.missions.startMission(this.missions.currentMissionIndex);
    });
  }

  // Debug + probe handle. Shape is a public contract: probes and shots.js
  // rely on every getter below, so keep the names exactly as they are.
  publishDebugHandle(seed) {
    window.__game = {
      getState: () => this.state,
      getSeed: () => seed,
      getWorld: () => this.city,
      getRenderer: () => this.renderer,
      getPlayer: () => this.player,
      getVehicles: () => this.vehicleManager,
      getPeds: () => this.pedestrians,
      getActiveCar: () => this.activeCar,
      getPolice: () => this.police,
      getMissions: () => this.missions,
      getHud: () => this.hud,
      getAudio: () => this.audio,
      getSave: () => this.saveSystem,
      enterExitCar: () => this.handleEnterExitCar(),
      debug: {
        forcePlay: () => {
          this.audio.init();
          this.beginPlay();
        },
        enterExitCar: () => this.handleEnterExitCar(),
        setInputKey: (k, v) => {
          this.input.keys[k] = v;
        },
        teleport: (x, y, z) => {
          if (this.activeCar) {
            this.activeCar.position.set(x, y, z);
            this.activeCar.mesh.position.set(x, y, z);
          } else {
            this.player.position.set(x, y, z);
            this.player.group.position.set(x, y, z);
          }
        },
        getWorldStats: () => ({
          roadsCount: this.city.roads.length,
          spawnPointsCount: this.city.spawnPoints.length,
          vehiclesCount: this.vehicleManager.vehicles.length,
          trafficCount: this.vehicleManager.vehicles.filter(v => v.isTraffic).length,
          pedestriansCount: this.pedestrians.peds.length
        })
      }
    };
  }

  enterLaunchScene(launch) {
    const { shot, hasSeed, seed } = launch;
    const knownShot = ['cover', 'onfoot', 'chase', 'beach'].includes(shot);

    if (shot || hasSeed) {
      if (knownShot) {
        stageShot(this, shot, seed);
        return;
      }
      this.state = 'playing';
      this.hud.showState('playing');
      const farView = shot === 'smoke' || shot === '1-start';
      const camPos = farView
        ? new THREE.Vector3(0, 140, 200)
        : new THREE.Vector3(60, 90, 140);
      this.renderer.snapCamera(camPos, new THREE.Vector3(0, 0, 0));
    } else {
      this.hud.showState('attract');
    }

    requestAnimationFrame(() => {
      window.__shotReady = true;
    });
  }

  startLoops() {
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);

    setInterval(() => {
      const now = performance.now();
      const deltaTime = Math.min(MAX_FRAME_DT, (now - this.previousTickAt) / 1000);
      this.previousTickAt = now;
      if (this.shotFrozen) return;
      this.tick(deltaTime);
    }, TICK_FALLBACK_MS);
  }

  tick(deltaTime) {
    switch (this.state) {
      case 'attract':
        this.updateAttractCamera(deltaTime);
        break;
      case 'playing':
        this.updatePlaying(deltaTime);
        break;
      case 'paused':
        this.updatePausedCamera();
        break;
    }

    this.renderer.render();

    // Clear key event edges
    this.input.edges = {};
  }

  updateAttractCamera(deltaTime) {
    this.attractOrbit += ATTRACT_SPEED * deltaTime;
    const camX = Math.cos(this.attractOrbit) * ATTRACT_RADIUS;
    const camZ = Math.sin(this.attractOrbit) * ATTRACT_RADIUS;
    this.renderer.snapCamera(
      new THREE.Vector3(camX, ATTRACT_HEIGHT, camZ),
      new THREE.Vector3(0, 10, 0)
    );
  }

  updatePausedCamera() {
    this.followChaseTarget(0);
  }

  // Chase cam target: the car when driving, the player on foot.
  chaseTarget() {
    return {
      position: this.activeCar ? this.activeCar.position : this.player.position,
      heading: this.activeCar ? this.activeCar.rotation : this.player.rotationY
    };
  }

  followChaseTarget(deltaTime) {
    const target = this.chaseTarget();
    this.renderer.updateCamera(target.position, target.heading, this.chaseCam, deltaTime);
  }

  updatePlaying(deltaTime) {
    this.audio.updateEngine(this.activeCar ? this.activeCar.speed : 0, !!this.activeCar);
    this.audio.updateSiren(this.police.stars > 0, deltaTime);

    if (this.player.health <= 0) {
      if (!this.wastedCooldown) this.handleWasted();
      return;
    }

    this.driveOrWalk(deltaTime);
    this.updateWorld(deltaTime);
    this.updateMissionOutcome(deltaTime);
    this.refreshHud();
    this.followChaseTarget(deltaTime);
  }

  handleWasted() {
    this.wastedCooldown = true;
    this.audio.playClick();
    this.hud.showWasted();
    this.police.setWanted(0);
    this.missions.cash = Math.max(0, this.missions.cash - WASTED_PENALTY);
    this.player.health = 100;
    if (this.activeCar) {
      this.activeCar = null;
      this.player.group.visible = true;
    }
    const spawn = (this.city.spawnPoints && this.city.spawnPoints[0])
      ? this.city.spawnPoints[0]
      : new THREE.Vector3(0, 0, 0);
    this.player.position.copy(spawn);
    this.player.group.position.copy(spawn);
    this.saveProgress();
    setTimeout(() => {
      this.wastedCooldown = false;
      this.hud.hideOverlays();
      this.hud.showState('playing');
    }, WASTED_PAUSE_MS);
  }

  driveOrWalk(deltaTime) {
    if (this.activeCar) {
      // Driving: the player rides along with the car.
      this.player.position.copy(this.activeCar.position);
      this.player.group.position.copy(this.activeCar.position);
    } else {
      this.player.update(deltaTime, this.input, this.renderer.camera);
    }
  }

  updateWorld(deltaTime) {
    this.vehicleManager.update(deltaTime, this.player, this.activeCar, this.input);
    this.pedestrians.update(deltaTime, this.player.position, null);
    this.police.update(deltaTime, this.player.position, this.activeCar, this.vehicleManager, this.player);
  }

  updateMissionOutcome(deltaTime) {
    const result = this.missions.update(
      deltaTime,
      this.player.position,
      this.activeCar,
      this.police.stars
    );
    if (result.status === 'completed') {
      this.onMissionCompleted(result.mission);
    } else if (result.status === 'failed') {
      this.audio.playClick();
      this.hud.showMissionFailed(result.reason || 'Mission failed');
    }
  }

  onMissionCompleted(mission) {
    this.audio.playPickup();
    this.missions.collectReward(mission);
    this.hud.showMissionComplete(mission.reward, this.missions.getDebt());
    this.saveProgress();
    const nextIdx = this.missions.currentMissionIndex + 1;
    if (nextIdx < this.missions.missions.length) {
      this.missions.startMission(nextIdx);
    }
  }

  refreshHud() {
    const current = this.missions.getCurrentMission();
    const waypoint = (current && current.active) ? current.targetPosition : null;
    this.hud.updateHUD({
      health: this.player.health,
      cash: this.missions.getCash(),
      debt: this.missions.getDebt(),
      speed: this.activeCar ? this.activeCar.speed : 0,
      policeStars: this.police.stars,
      mission: current
    });
    this.hud.updateMinimap(
      this.player.position,
      this.activeCar ? this.activeCar.rotation : this.player.rotationY,
      waypoint,
      this.police.policeCars,
      this.missions.sunCoins
    );
  }

  animate(currentTime) {
    requestAnimationFrame(this.animate);

    if (this.shotFrozen) {
      this.renderer.render();
      return;
    }

    const deltaTime = Math.min(MAX_FRAME_DT, (currentTime - this.previousTickAt) / 1000);
    this.previousTickAt = currentTime;

    this.tick(deltaTime);
  }
}

// Instantiate bootstrap application on DOM content load
window.addEventListener('DOMContentLoaded', () => {
  new SolmarinaGame();
});
