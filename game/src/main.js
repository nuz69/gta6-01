import * as THREE from '../vendor/three.min.js';
import { RenderSystem } from './render.js';
import { World } from './world.js';
import { CONFIG } from './config.js';

class Game {
  constructor() {
    this.state = 'attract'; // attract, playing, paused
    this.orbitAngle = 0;
    this.init();
  }

  init() {
    // Parse URL parameters for shot & seed
    const params = new URLSearchParams(window.location.search);
    const shotName = params.get('shot');
    const seedParam = params.get('seed');
    const seed = seedParam ? parseInt(seedParam, 10) : 1;

    this.renderer = new RenderSystem();
    this.world = new World(seed);
    this.renderer.scene.add(this.world.group);

    // Debug handle
    window.__game = {
      state: this.state,
      renderer: this.renderer,
      world: this.world,
      debug: {
        teleport: (x, y, z) => this.renderer.camera.position.set(x, y, z),
      }
    };

    // If a shot is requested, handle specific camera pose or ready state immediately
    if (shotName) {
      if (shotName === 'smoke' || shotName === '1-start') {
        this.renderer.snapCamera(new THREE.Vector3(0, 120, 180), new THREE.Vector3(0, 0, 0));
      } else {
        this.renderer.snapCamera(new THREE.Vector3(50, 80, 120), new THREE.Vector3(0, 0, 0));
      }
    }

    this.lastTime = performance.now();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);

    // Mark shot ready after first render frame
    requestAnimationFrame(() => {
      window.__shotReady = true;
    });
  }

  animate(currentTime) {
    requestAnimationFrame(this.animate);
    const dt = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    if (this.state === 'attract') {
      // Slowly orbit camera over downtown if no specific shot camera locked
      const params = new URLSearchParams(window.location.search);
      if (!params.get('shot')) {
        this.orbitAngle += CONFIG.camera.orbitSpeed * dt;
        const radius = 180;
        const x = Math.cos(this.orbitAngle) * radius;
        const z = Math.sin(this.orbitAngle) * radius;
        this.renderer.camera.position.set(x, 70, z);
        this.renderer.camera.lookAt(0, 20, 0);
      }
    }

    this.renderer.render();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
