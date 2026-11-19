import * as THREE from '../vendor/three.min.js';
import { RenderSystem } from './render.js';
import { World } from './world.js';
import { CONFIG } from './config.js';
import { SeederRNG } from './random.js';
import { Player } from './player.js';
import { VehicleManager } from './vehicles.js';

class NeonHeatGame {
  constructor() {
    this.state = 'attract'; // 'attract' | 'playing' | 'paused'
    this.cameraMode = 0; // 0: standard chase, 1: far chase
    this.activeCar = null;
    this.lastTime = performance.now();
    this.orbitAngle = 0;

    this.input = {
      keys: {},
      edges: {}
    };

    this.init();
  }

  init() {
    // Parse URL parameters for deterministic shot rendering & seeding
    const urlParams = new URLSearchParams(window.location.search);
    const shotName = urlParams.get('shot');
    const seedParam = urlParams.get('seed');
    const seed = seedParam ? parseInt(seedParam, 10) : 1337;

    // Initialize RNG, World, RenderSystem, Player, and VehicleManager
    this.rng = new SeederRNG(seed);
    this.renderer = new RenderSystem();
    this.world = new World(seed);
    this.renderer.scene.add(this.world.group);

    this.player = new Player(this.world);
    this.renderer.scene.add(this.player.group);

    this.vehicleManager = new VehicleManager(this.world, this.rng);
    this.renderer.scene.add(this.vehicleManager.group);

    this.setupInput();
    this.setupUIHandlers();

    // Expose debug handle for inspection, driving probe, and testing
    window.__game = {
      getState: () => this.state,
      getSeed: () => seed,
      getWorld: () => this.world,
      getRenderer: () => this.renderer,
      getPlayer: () => this.player,
      getVehicles: () => this.vehicleManager,
      getActiveCar: () => this.activeCar,
      enterExitCar: () => this.handleEnterExitCar(),
      debug: {
        forcePlay: () => {
          this.state = 'playing';
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
          roadsCount: this.world.roads.length,
          spawnPointsCount: this.world.spawnPoints.length,
          vehiclesCount: this.vehicleManager.vehicles.length,
          trafficCount: this.vehicleManager.vehicles.filter(v => v.isTraffic).length
        })
      }
    };

    // If a shot or seed parameter is specified, transition immediately for rendering
    if (shotName || seedParam) {
      this.state = 'playing';
      if (shotName === 'smoke' || shotName === '1-start') {
        this.renderer.snapCamera(new THREE.Vector3(0, 140, 200), new THREE.Vector3(0, 0, 0));
      } else {
        this.renderer.snapCamera(new THREE.Vector3(60, 90, 140), new THREE.Vector3(0, 0, 0));
      }
    }

    // Start render loop & 60fps tick fallback
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);

    setInterval(() => {
      const currentTime = performance.now();
      const deltaTime = Math.min(0.1, (currentTime - this.lastTime) / 1000);
      this.lastTime = currentTime;
      this.tick(deltaTime);
    }, 16);

    // Signal shot readiness on next frame render
    requestAnimationFrame(() => {
      window.__shotReady = true;
    });
  }

  startGame() {
    this.state = 'playing';
    const overlay = document.getElementById('title-overlay');
    if (overlay) overlay.style.display = 'none';
  }

  setupInput() {
    window.addEventListener('keydown', (e) => {
      if (this.state === 'attract') {
        this.startGame();
        return;
      }

      if (e.code === 'Escape' || e.key === 'Escape') {
        if (this.state === 'playing') {
          this.state = 'paused';
        } else if (this.state === 'paused') {
          this.state = 'playing';
        }
        return;
      }

      if (this.state !== 'playing') return;

      if (e.code) this.input.keys[e.code] = true;
      if (e.key) {
        this.input.keys[e.key] = true;
        this.input.keys[e.key.toLowerCase()] = true;
      }

      if (e.code) this.input.edges[e.code] = true;
      if (e.key) this.input.edges[e.key] = true;

      const code = e.code || '';
      const key = (e.key || '').toLowerCase();

      if (code === 'KeyC' || key === 'c') {
        this.cameraMode = (this.cameraMode + 1) % 2;
      }
      if ((code === 'KeyF' || key === 'f') && !this.activeCar) {
        this.player.punch();
      }
      if (code === 'KeyE' || key === 'e') {
        this.handleEnterExitCar();
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code) this.input.keys[e.code] = false;
      if (e.key) {
        this.input.keys[e.key] = false;
        this.input.keys[e.key.toLowerCase()] = false;
      }
    });
  }

  handleEnterExitCar() {
    if (this.activeCar) {
      // Exit car: place player beside car
      const exitPos = this.activeCar.position.clone().add(new THREE.Vector3(2.5, 0, 0));
      this.player.position.copy(exitPos);
      this.player.group.position.copy(exitPos);
      this.player.group.visible = true;
      this.activeCar = null;
    } else {
      // Enter nearest car within ~5 units
      const nearestCar = this.vehicleManager.findNearestCar(this.player.position, 5.0);
      if (nearestCar) {
        this.activeCar = nearestCar;
        // Hide player mesh while driving
        this.player.group.visible = false;
      }
    }
  }

  setupUIHandlers() {
    const startBtn = document.getElementById('start-game-btn');
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        this.startGame();
      });
    }
  }

  tick(deltaTime) {
    // In attract mode, slowly orbit camera over downtown
    if (this.state === 'attract') {
      this.orbitAngle += 0.15 * deltaTime;
      const radius = 180;
      const height = 75;
      const camX = Math.cos(this.orbitAngle) * radius;
      const camZ = Math.sin(this.orbitAngle) * radius;
      
      const targetPos = new THREE.Vector3(camX, height, camZ);
      const centerTarget = new THREE.Vector3(0, 10, 0);
      
      this.renderer.snapCamera(targetPos, centerTarget);
    } else if (this.state === 'playing') {
      if (this.activeCar) {
        // Player is driving active car
        this.player.position.copy(this.activeCar.position);
        this.player.group.position.copy(this.activeCar.position);
      } else {
        // Update player movement and physics on foot
        this.player.update(deltaTime, this.input, this.renderer.camera);
      }

      // Update vehicle simulation (traffic + active car physics)
      this.vehicleManager.update(deltaTime, this.player, this.activeCar, this.input);

      // Drive third-person chase camera from active car or player position and heading
      const targetPos = this.activeCar ? this.activeCar.position : this.player.position;
      const targetRot = this.activeCar ? this.activeCar.rotation : this.player.rotationY;
      this.renderer.updateCamera(targetPos, targetRot, this.cameraMode, deltaTime);
    } else if (this.state === 'paused') {
      // Maintain camera stable while paused
      const targetPos = this.activeCar ? this.activeCar.position : this.player.position;
      const targetRot = this.activeCar ? this.activeCar.rotation : this.player.rotationY;
      this.renderer.updateCamera(targetPos, targetRot, this.cameraMode, 0);
    }

    this.renderer.render();

    // Clear key event edges
    this.input.edges = {};
  }

  animate(currentTime) {
    requestAnimationFrame(this.animate);

    const deltaTime = Math.min(0.1, (currentTime - this.lastTime) / 1000);
    this.lastTime = currentTime;

    this.tick(deltaTime);
  }
}

// Instantiate bootstrap application on DOM content load
window.addEventListener('DOMContentLoaded', () => {
  new NeonHeatGame();
});
