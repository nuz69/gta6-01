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
import { HudSystem } from './hud.js';
import { AudioSystem } from './audio.js';
import { SaveSystem } from './save.js';

class Game {
  constructor() {
    this.state = 'attract'; // attract, playing, paused, mission-complete, mission-failed, wasted
    this.cameraMode = 0; // 0: standard chase, 1: far chase
    this.activeCar = null;
    this.crimePos = null;
    this.autopilot = false;
    this.wastedTimer = 0;

    this.saveSystem = new SaveSystem();
    this.cash = this.saveSystem.data.cash;
    this.debt = this.saveSystem.data.debt;

    this.input = {
      keys: {},
      edges: {}
    };

    this.init();
  }

  init() {
    const params = new URLSearchParams(window.location.search);
    const shotName = params.get('shot');
    const seedParam = params.get('seed');
    const seed = seedParam ? parseInt(seedParam, 10) : 1;

    this.rng = new SeederRNG(seed);
    this.renderer = new RenderSystem();
    this.world = new World(seed);
    this.renderer.scene.add(this.world.group);

    this.player = new Player(this.world);
    this.renderer.scene.add(this.player.group);

    this.vehicleManager = new VehicleManager(this.world, this.rng);
    this.renderer.scene.add(this.vehicleManager.group);

    this.pedManager = new PedestrianManager(this.world, this.rng);
    this.renderer.scene.add(this.pedManager.group);

    this.policeSystem = new PoliceSystem(this.world, this.rng);
    this.renderer.scene.add(this.policeSystem.group);

    this.missionSystem = new MissionSystem(this.rng);
    this.hudSystem = new HudSystem();
    this.audioSystem = new AudioSystem();

    this.setupInput();
    this.setupUIHandlers();

    // Set initial mission from save or default 1
    const savedMissionIdx = (this.saveSystem.data.currentMission || 1) - 1;
    this.missionSystem.startMission(savedMissionIdx);

    // Debug handle & extended metrics
    window.__game = {
      getState: () => this.state,
      getPlayer: () => this.player,
      getActiveCar: () => this.activeCar,
      getSpeed: () => this.activeCar ? Math.abs(this.activeCar.speed) : this.player.velocity.length(),
      getPosition: () => this.activeCar ? this.activeCar.position : this.player.position,
      getCash: () => this.cash,
      getDebt: () => this.debt,
      getCurrentMission: () => this.missionSystem.getCurrentMission(),
      getObjectiveText: () => this.missionSystem.getCurrentMission()?.objective || '',
      debug: {
        teleport: (x, y, z) => {
          const pos = new THREE.Vector3(x, y, z);
          if (this.activeCar) {
            this.activeCar.position.copy(pos);
            this.activeCar.mesh.position.copy(pos);
          } else {
            this.player.position.copy(pos);
          }
        },
        placeCar: (typeKey = 'sports') => {
          const mesh = this.vehicleManager.createCarMesh(typeKey);
          const car = {
            mesh,
            typeKey,
            spec: this.vehicleManager.carTypes[typeKey],
            position: this.player.position.clone().add(new THREE.Vector3(3, 0, 0)),
            velocity: new THREE.Vector3(),
            speed: 0,
            rotation: this.player.rotationY,
            isTraffic: false,
            isParked: true,
            health: 100
          };
          mesh.position.copy(car.position);
          this.vehicleManager.group.add(mesh);
          this.vehicleManager.vehicles.push(car);
          return car;
        },
        autopilotStart: () => { this.autopilot = true; },
        autopilotStop: () => { this.autopilot = false; },
        getWorldStats: () => ({
          trafficCount: this.vehicleManager.vehicles.filter(v => v.isTraffic).length,
          pedestrianCount: this.pedManager.peds.length,
          sampleTrafficPos: this.vehicleManager.vehicles.find(v => v.isTraffic)?.position.clone() || null,
          samplePedPos: this.pedManager.peds[0]?.position.clone() || null
        }),
        setWanted: (stars) => this.policeSystem.setWanted(stars),
        spawnPolice: () => this.policeSystem.spawnPoliceNearPlayer(this.player.position),
        damagePlayer: (amt) => this.player.takeDamage(amt),
        healPlayer: (amt) => this.player.health = Math.min(this.player.maxHealth, this.player.health + amt),
        getWantedStars: () => this.policeSystem.stars,
        getPlayerHealth: () => this.player.health,
        getPlayerCash: () => this.cash,
        getPlayerDebt: () => this.debt,
        startMission: (num) => {
          const idx = Math.max(0, Math.min(num - 1, this.missionSystem.missions.length - 1));
          this.missionSystem.startMission(idx);
          this.state = 'playing';
          this.hudSystem.showState('playing');
        },
        teleportToWaypoint: () => {
          const m = this.missionSystem.getCurrentMission();
          if (m && m.waypoint) {
            const wp = m.waypoint.clone();
            wp.y = 0.3;
            if (this.activeCar) {
              this.activeCar.position.copy(wp);
              this.activeCar.mesh.position.copy(wp);
            } else {
              this.player.position.copy(wp);
            }
          }
        },
        completeObjective: () => {
          const m = this.missionSystem.getCurrentMission();
          if (m) {
            m.active = false;
            this.handleMissionCompleted(m);
          }
        }
      }
    };

    if (shotName) {
      this.startGame();
      if (shotName === 'smoke' || shotName === '1-start') {
        this.renderer.snapCamera(new THREE.Vector3(0, 120, 180), new THREE.Vector3(0, 0, 0));
      } else {
        this.renderer.snapCamera(new THREE.Vector3(50, 80, 120), new THREE.Vector3(0, 0, 0));
      }
    } else {
      this.hudSystem.showState('attract');
    }

    this.lastTime = performance.now();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);

    requestAnimationFrame(() => {
      window.__shotReady = true;
    });
  }

  startGame() {
    this.state = 'playing';
    this.hudSystem.showState('playing');
    this.audioSystem.init();
    this.audioSystem.playClick();
    // Hide old title overlay if present
    const titleOverlay = document.getElementById('title-overlay');
    if (titleOverlay) titleOverlay.style.display = 'none';
  }

  setupInput() {
    window.addEventListener('keydown', (e) => {
      if (this.state === 'attract') {
        this.startGame();
        return;
      }

      if (e.code === 'Escape') {
        if (this.state === 'playing') {
          this.state = 'paused';
          this.hudSystem.showState('paused');
          this.audioSystem.playClick();
        } else if (this.state === 'paused') {
          this.state = 'playing';
          this.hudSystem.showState('playing');
          this.audioSystem.playClick();
        }
        return;
      }

      if (this.state !== 'playing') return;

      this.input.keys[e.code] = true;
      this.input.edges[e.code] = true;

      if (e.code === 'KeyM') {
        const muted = !this.audioSystem.muted;
        this.audioSystem.setMuted(muted);
        const muteBtn = document.getElementById('pause-mute-btn');
        if (muteBtn) muteBtn.textContent = `MUTE: ${muted ? 'ON' : 'OFF'}`;
      }
      if (e.code === 'KeyC') {
        this.cameraMode = (this.cameraMode + 1) % 2;
      }
      if (e.code === 'KeyE') {
        this.handleEnterExitCar();
      }
      if (e.code === 'KeyF' && !this.activeCar) {
        if (this.player.punch()) {
          this.audioSystem.playPunch();
          this.crimePos = this.player.position.clone();
          const hitPed = this.pedManager.findNearestPed(this.player.position, 2.5);
          if (hitPed) {
            hitPed.state = 'fleeing';
            this.policeSystem.addHeat(CONFIG.wanted.crimeHeat.punchPed);
          }
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      this.input.keys[e.code] = false;
    });
  }

  setupUIHandlers() {
    const startBtn = document.getElementById('start-game-btn');
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        this.startGame();
      });
    }

    const resumeBtn = document.getElementById('pause-resume-btn');
    if (resumeBtn) {
      resumeBtn.addEventListener('click', () => {
        this.state = 'playing';
        this.hudSystem.showState('playing');
        this.audioSystem.playClick();
      });
    }

    const restartBtn = document.getElementById('pause-restart-btn');
    if (restartBtn) {
      restartBtn.addEventListener('click', () => {
        const idx = this.missionSystem.currentMissionIndex;
        this.missionSystem.startMission(idx);
        this.state = 'playing';
        this.hudSystem.showState('playing');
        this.audioSystem.playClick();
      });
    }

    const muteBtn = document.getElementById('pause-mute-btn');
    if (muteBtn) {
      muteBtn.addEventListener('click', () => {
        const muted = !this.audioSystem.muted;
        this.audioSystem.setMuted(muted);
        muteBtn.textContent = `MUTE: ${muted ? 'ON' : 'OFF'}`;
        this.audioSystem.playClick();
      });
    }

    const titleBtn = document.getElementById('pause-title-btn');
    if (titleBtn) {
      titleBtn.addEventListener('click', () => {
        this.state = 'attract';
        this.hudSystem.showState('attract');
        const titleOverlay = document.getElementById('title-overlay');
        if (titleOverlay) titleOverlay.style.display = 'block';
        this.audioSystem.playClick();
      });
    }

    const mcContinueBtn = document.getElementById('mc-continue-btn');
    if (mcContinueBtn) {
      mcContinueBtn.addEventListener('click', () => {
        const nextIdx = this.missionSystem.currentMissionIndex + 1;
        if (nextIdx < this.missionSystem.missions.length) {
          this.missionSystem.startMission(nextIdx);
        }
        this.state = 'playing';
        this.hudSystem.showState('playing');
        this.audioSystem.playClick();
      });
    }

    const mfRetryBtn = document.getElementById('mf-retry-btn');
    if (mfRetryBtn) {
      mfRetryBtn.addEventListener('click', () => {
        const idx = this.missionSystem.currentMissionIndex;
        this.missionSystem.startMission(idx);
        this.state = 'playing';
        this.hudSystem.showState('playing');
        this.audioSystem.playClick();
      });
    }
  }

  handleEnterExitCar() {
    if (this.activeCar) {
      const exitPos = this.activeCar.position.clone().add(new THREE.Vector3(2.5, 0, 0));
      this.player.position.copy(exitPos);
      this.player.group.position.copy(exitPos);
      this.activeCar = null;
      this.audioSystem.playClick();
    } else {
      const targetPos = this.player.position;
      const nearestCar = this.vehicleManager.findNearestCar(targetPos, 5.0);
      if (nearestCar) {
        this.activeCar = nearestCar;
        this.audioSystem.playClick();
        if (nearestCar.isTraffic) {
          window.__stolenCarReported = true;
          this.policeSystem.addHeat(CONFIG.wanted.crimeHeat.carStolen);
          this.crimePos = targetPos.clone();
        }
      }
    }
  }

  triggerWasted() {
    this.cash = Math.max(0, this.cash - CONFIG.economy.hospitalPenalty);
    this.player.health = this.player.maxHealth;
    this.player.isDead = false;
    this.policeSystem.setWanted(0);
    this.player.position.set(0, 0.3, 0);
    if (this.activeCar) {
      this.activeCar = null;
    }
    const wastedBanner = document.getElementById('wasted-banner');
    if (wastedBanner) wastedBanner.style.display = 'block';
    setTimeout(() => {
      if (wastedBanner) wastedBanner.style.display = 'none';
    }, 2500);
  }

  handleMissionCompleted(m) {
    this.audioSystem.playPickup();
    const reward = m.reward || 10000;
    this.cash += reward;
    this.debt = Math.max(0, this.debt - reward);

    // Save progress
    this.saveSystem.save({
      cash: this.cash,
      debt: this.debt,
      currentMission: this.missionSystem.currentMissionIndex + 1
    });

    this.state = 'mission-complete';
    this.hudSystem.showState('mission-complete');

    const mcTitle = document.getElementById('mc-title');
    const mcReward = document.getElementById('mc-reward');
    const mcDebt = document.getElementById('mc-debt');
    if (mcTitle) mcTitle.textContent = `${m.title.toUpperCase()} COMPLETE`;
    if (mcReward) mcReward.textContent = `+$${reward.toLocaleString()}`;
    if (mcDebt) mcDebt.textContent = `$${this.debt.toLocaleString()}`;
  }

  handleMissionFailed(reason) {
    this.state = 'mission-failed';
    this.hudSystem.showState('mission-failed');
    const mfReason = document.getElementById('mf-reason');
    if (mfReason) mfReason.textContent = reason || 'Mission objective failed.';
  }

  animate(currentTime) {
    requestAnimationFrame(this.animate);

    const dt = Math.min(0.1, (currentTime - this.lastTime) / 1000);
    this.lastTime = currentTime;

    if (this.state === 'playing') {
      // Update player / vehicle
      if (this.activeCar) {
        this.player.position.copy(this.activeCar.position);
        this.player.group.position.copy(this.activeCar.position);
        this.audioSystem.updateEngine(this.activeCar.speed, true);
      } else {
        this.player.update(dt, this.input, this.renderer.camera);
        this.audioSystem.updateEngine(0, false);
      }

      this.vehicleManager.update(dt, this.player, this.activeCar, this.input);
      this.pedManager.update(dt, this.player.position, this.crimePos);
      this.policeSystem.update(dt, this.player.position, this.activeCar, this.vehicleManager, this.player);
      if (this.policeSystem.stars > 0) {
        this.crimePos = null;
      }

      // Update missions
      const playerPos = this.activeCar ? this.activeCar.position : this.player.position;
      const missionResult = this.missionSystem.update(dt, playerPos, this.activeCar, this.policeSystem.stars);
      if (missionResult.status === 'completed') {
        this.handleMissionCompleted(missionResult.mission);
      } else if (missionResult.status === 'failed') {
        this.handleMissionFailed(missionResult.reason);
      } else if (missionResult.status === 'coin_collected') {
        this.audioSystem.playPickup();
        this.cash += 500;
        this.saveSystem.save({ cash: this.cash });
      }

      // Check player health / death
      if (this.player.health <= 0 || (this.activeCar && this.activeCar.health <= 0)) {
        this.triggerWasted();
      }

      // Update Audio siren
      const policeCars = this.policeSystem.policeCars.map(u => ({ position: u.position }));
      const hasActivePolice = this.policeSystem.stars > 0 && policeCars.length > 0;
      this.audioSystem.updateSiren(hasActivePolice, dt);

      // Update HUD and minimap
      const curMission = this.missionSystem.getCurrentMission();
      const speedVal = this.activeCar ? Math.abs(this.activeCar.speed) : this.player.velocity.length();
      this.hudSystem.updateHUD({
        health: this.player.health,
        cash: this.cash,
        debt: this.debt,
        speed: speedVal,
        policeStars: this.policeSystem.stars,
        mission: curMission
      });

      this.hudSystem.updateMinimap(
        playerPos,
        this.activeCar ? this.activeCar.rotation : this.player.rotationY,
        curMission ? curMission.waypoint : null,
        policeCars,
        this.missionSystem.sunCoins
      );
    }

    // Render scene
    const targetPos = this.activeCar ? this.activeCar.position : this.player.position;
    const targetRot = this.activeCar ? this.activeCar.rotation : this.player.rotationY;
    this.renderer.updateCamera(targetPos, targetRot, this.cameraMode, dt);
    this.renderer.render();

    // Clear key edges
    this.input.edges = {};
  }
}

new Game();
