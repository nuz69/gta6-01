import * as THREE from '../vendor/three.min.js';
import { RenderSystem } from './render.js';
import { World } from './world.js';
import { CONFIG } from './config.js';
import { SeederRNG } from './random.js';
import { Player } from './player.js';
import { VehicleManager } from './vehicles.js';
import { PedestrianManager } from './peds.js';
import { PoliceSystem } from './police.js';

class Game {
  constructor() {
    this.state = 'attract'; // attract, playing
    this.orbitAngle = 0;
    this.cameraMode = 0; // 0: standard chase, 1: far chase
    this.activeCar = null;
    this.muted = false;
    this.crimePos = null;
    this.autopilot = false;
    this.cash = CONFIG.economy.playerCash;
    this.wastedTimer = 0;

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

    this.setupInput();

    // Debug handle & extended metrics per session 2 and 3 requirements
    window.__game = {
      getState: () => this.state,
      getPlayer: () => this.player,
      getActiveCar: () => this.activeCar,
      getSpeed: () => this.activeCar ? Math.abs(this.activeCar.speed) : this.player.velocity.length(),
      getPosition: () => this.activeCar ? this.activeCar.position : this.player.position,
      debug: {
        teleport: (x, y, z) => this.player.position.set(x, y, z),
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
        getPlayerCash: () => this.cash
      }
    };

    if (shotName) {
      this.state = 'playing';
      document.getElementById('title-overlay').style.display = 'none';
      document.getElementById('hud-stars').style.display = 'block';
      document.getElementById('hud-stats').style.display = 'block';
      if (shotName === 'smoke' || shotName === '1-start') {
        this.renderer.snapCamera(new THREE.Vector3(0, 120, 180), new THREE.Vector3(0, 0, 0));
      } else {
        this.renderer.snapCamera(new THREE.Vector3(50, 80, 120), new THREE.Vector3(0, 0, 0));
      }
    }

    this.lastTime = performance.now();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);

    requestAnimationFrame(() => {
      window.__shotReady = true;
    });
  }

  setupInput() {
    window.addEventListener('keydown', (e) => {
      if (this.state === 'attract') {
        this.state = 'playing';
        document.getElementById('title-overlay').style.display = 'none';
        document.getElementById('hud-stars').style.display = 'block';
        document.getElementById('hud-stats').style.display = 'block';
      }
      this.input.keys[e.code] = true;
      this.input.edges[e.code] = true;

      if (e.code === 'KeyM') {
        this.muted = !this.muted;
      }
      if (e.code === 'KeyC') {
        this.cameraMode = (this.cameraMode + 1) % 2;
      }
      if (e.code === 'KeyE') {
        this.handleEnterExitCar();
      }
      if (e.code === 'KeyF' && !this.activeCar) {
        if (this.player.punch()) {
          this.crimePos = this.player.position.clone();
          // Check if hitting a pedestrian or foot cop
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

  handleEnterExitCar() {
    if (this.activeCar) {
      // Exit car
      const exitPos = this.activeCar.position.clone().add(new THREE.Vector3(2.5, 0, 0));
      this.player.position.copy(exitPos);
      this.player.group.position.copy(exitPos);
      this.activeCar = null;
    } else {
      // Enter nearest car
      const targetPos = this.player.position;
      const nearestCar = this.vehicleManager.findNearestCar(targetPos, 5.0);
      if (nearestCar) {
        this.activeCar = nearestCar;
        if (nearestCar.isTraffic) {
          // Stolen traffic car crime event
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
    wastedBanner.style.display = 'block';
    setTimeout(() => {
      wastedBanner.style.display = 'none';
    }, 2500);
  }

  animate(currentTime) {
    requestAnimationFrame(this.animate);
    const dt = Math.min((currentTime - this.lastTime) / 1000, 0.1);
    this.lastTime = currentTime;

    // Autopilot override for testing
    if (this.autopilot) {
      this.input.keys['KeyW'] = true;
    }

    if (this.state === 'attract') {
      document.getElementById('title-overlay').style.display = 'block';
      document.getElementById('hud-stars').style.display = 'none';
      document.getElementById('hud-stats').style.display = 'none';

      const params = new URLSearchParams(window.location.search);
      if (!params.get('shot')) {
        this.orbitAngle += CONFIG.camera.orbitSpeed * dt;
        const radius = 180;
        const x = Math.cos(this.orbitAngle) * radius;
        const z = Math.sin(this.orbitAngle) * radius;
        this.renderer.camera.position.set(x, 70, z);
        this.renderer.camera.lookAt(0, 20, 0);
      }
    } else {
      // Playing state updates
      this.player.update(dt, this.input, this.renderer.camera);
      if (this.player.health <= 0 || this.player.isDead) {
        this.triggerWasted();
      }

      this.vehicleManager.update(dt, this.player, this.activeCar, this.input);
      this.pedManager.update(dt, this.player.position, this.crimePos);
      this.policeSystem.update(dt, this.player.position, this.activeCar, this.vehicleManager, this.player);

      // Check pedestrian hit by activeCar
      if (this.activeCar && Math.abs(this.activeCar.speed) > 5.0) {
        const hitPed = this.pedManager.findNearestPed(this.activeCar.position, 2.5);
        if (hitPed) {
          hitPed.state = 'fleeing';
          this.policeSystem.addHeat(CONFIG.wanted.crimeHeat.pedHit);
        }
      }

      // Check speeding past police or ramming police
      for (const pCar of this.policeSystem.policeCars) {
        const dist = (this.activeCar ? this.activeCar.position : this.player.position).distanceTo(pCar.position);
        if (dist < 4.0 && this.activeCar && Math.abs(this.activeCar.speed) > 10.0) {
          this.policeSystem.addHeat(CONFIG.wanted.crimeHeat.policeRam);
          pCar.health -= 25;
        }
      }

      // Update HUD elements
      const stars = this.policeSystem.stars;
      const starStr = '★'.repeat(stars) + '☆'.repeat(5 - stars);
      document.getElementById('hud-stars').textContent = starStr;
      document.getElementById('hud-health-val').textContent = Math.round(this.player.health);
      document.getElementById('hud-cash-val').textContent = this.cash;

      // Camera follow
      const targetPos = this.activeCar ? this.activeCar.position : this.player.position;
      const followDist = this.cameraMode === 0 ? CONFIG.camera.followDistance : CONFIG.camera.followDistance * 1.8;
      const followHeight = this.cameraMode === 0 ? CONFIG.camera.followHeight : CONFIG.camera.followHeight * 1.5;

      if (this.activeCar) {
        const carForward = new THREE.Vector3(Math.sin(this.activeCar.rotation), 0, Math.cos(this.activeCar.rotation));
        const desiredCamPos = targetPos.clone().sub(carForward.clone().multiplyScalar(followDist)).add(new THREE.Vector3(0, followHeight, 0));
        this.renderer.camera.position.lerp(desiredCamPos, 5 * dt);
      } else {
        const desiredCamPos = targetPos.clone().add(new THREE.Vector3(0, followHeight, followDist));
        this.renderer.camera.position.lerp(desiredCamPos, 5 * dt);
      }
      this.renderer.camera.lookAt(targetPos.clone().add(new THREE.Vector3(0, 1.5, 0)));
    }

    // Clear edge input queue at end of frame
    this.input.edges = {};

    this.renderer.render();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
