import * as THREE from '../vendor/three.min.js';
import { RenderSystem } from './render.js';
import { World } from './world.js';
import { CONFIG } from './config.js';
import { SeederRNG } from './random.js';
import { Player } from './player.js';

class NeonHeatGame {
  constructor() {
    this.state = 'attract'; // 'attract' | 'playing' | 'paused'
    this.cameraMode = 0; // 0: standard chase, 1: far chase
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

    // Initialize RNG, World, RenderSystem, and Player
    this.rng = new SeederRNG(seed);
    this.renderer = new RenderSystem();
    this.world = new World(seed);
    this.renderer.scene.add(this.world.group);

    this.player = new Player(this.world);
    this.renderer.scene.add(this.player.group);

    this.setupInput();
    this.setupUIHandlers();

    // Expose debug handle for inspection and testing
    window.__game = {
      getState: () => this.state,
      getSeed: () => seed,
      getWorld: () => this.world,
      getRenderer: () => this.renderer,
      getPlayer: () => this.player,
      debug: {
        forcePlay: () => {
          this.state = 'playing';
        },
        teleport: (x, y, z) => {
          this.player.position.set(x, y, z);
          this.player.group.position.set(x, y, z);
        },
        getWorldStats: () => ({
          roadsCount: this.world.roads.length,
          spawnPointsCount: this.world.spawnPoints.length
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

    // Start render loop
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);

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

      if (e.code === 'Escape') {
        if (this.state === 'playing') {
          this.state = 'paused';
        } else if (this.state === 'paused') {
          this.state = 'playing';
        }
        return;
      }

      if (this.state !== 'playing') return;

      this.input.keys[e.code] = true;
      this.input.edges[e.code] = true;

      if (e.code === 'KeyC') {
        this.cameraMode = (this.cameraMode + 1) % 2;
      }
      if (e.code === 'KeyF') {
        this.player.punch();
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
  }

  animate(currentTime) {
    requestAnimationFrame(this.animate);

    const deltaTime = Math.min(0.1, (currentTime - this.lastTime) / 1000);
    this.lastTime = currentTime;

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
      // Update player movement and physics
      this.player.update(deltaTime, this.input, this.renderer.camera);

      // Drive third-person chase camera from player position and heading
      this.renderer.updateCamera(this.player.position, this.player.rotationY, this.cameraMode, deltaTime);
    } else if (this.state === 'paused') {
      // Maintain camera stable while paused
      this.renderer.updateCamera(this.player.position, this.player.rotationY, this.cameraMode, 0);
    }

    this.renderer.render();

    // Clear key event edges
    this.input.edges = {};
  }
}

// Instantiate bootstrap application on DOM content load
window.addEventListener('DOMContentLoaded', () => {
  new NeonHeatGame();
});
