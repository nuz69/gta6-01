/**
 * Solmarina: Neon Heat - Main Boot & Core Game Loop (R1b14 Boot Only)
 * Initializes renderer, seeded procedural world, attract/title state with camera orbit,
 * URL parameter handling (shot & seed), and debug handle window.__game.
 */

import * as THREE from '../vendor/three.min.js';
import { RenderSystem } from './render.js';
import { World } from './world.js';
import { CONFIG } from './config.js';
import { SeederRNG } from './random.js';

class NeonHeatBootApp {
  constructor() {
    this.state = 'attract'; // 'attract' | 'playing'
    this.lastTime = performance.now();
    this.orbitAngle = 0;

    this.init();
  }

  init() {
    // Parse URL parameters for deterministic shot rendering & seeding
    const urlParams = new URLSearchParams(window.location.search);
    const shotName = urlParams.get('shot');
    const seedParam = urlParams.get('seed');
    const seed = seedParam ? parseInt(seedParam, 10) : 1337;

    // Initialize RNG, World, and RenderSystem
    this.rng = new SeederRNG(seed);
    this.renderer = new RenderSystem();
    this.world = new World(seed);
    this.renderer.scene.add(this.world.group);

    // Expose debug handle for inspection and testing
    window.__game = {
      getState: () => this.state,
      getSeed: () => seed,
      getWorld: () => this.world,
      getRenderer: () => this.renderer,
      debug: {
        forcePlay: () => {
          this.state = 'playing';
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

    // Set up user interaction to start game from attract mode
    window.addEventListener('keydown', () => {
      if (this.state === 'attract') {
        this.state = 'playing';
        const overlay = document.getElementById('title-overlay');
        if (overlay) overlay.style.display = 'none';
      }
    }, { once: true });

    // Start render loop
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);

    // Signal shot readiness on next frame render
    requestAnimationFrame(() => {
      window.__shotReady = true;
    });
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
      
      // Drive camera via public render system method
      this.renderer.snapCamera(targetPos, centerTarget);
    } else {
      // In playing / snapshot mode, maintain stable overhead view if no player/vehicle attached yet
      const targetPos = new THREE.Vector3(0, 0, 0);
      this.renderer.updateCamera(targetPos, 0, 1, deltaTime);
    }

    this.renderer.render();
  }
}

// Instantiate bootstrap application on DOM content load
window.addEventListener('DOMContentLoaded', () => {
  new NeonHeatBootApp();
});
