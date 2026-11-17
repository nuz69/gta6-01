import * as THREE from '../vendor/three.min.js';
import { RenderSystem } from './render.js';
import { World } from './world.js';
import { CONFIG } from './config.js';
import { SeederRNG } from './random.js';
import { Player } from './player.js';
import { VehicleManager } from './vehicles.js';
import { PedestrianManager } from './peds.js';

class Game {
  constructor() {
    this.state = 'attract'; // attract, playing
    this.orbitAngle = 0;
    this.cameraMode = 0; // 0: standard chase, 1: far chase
    this.activeCar = null;
    this.muted = false;
    this.crimePos = null;
    this.autopilot = false;

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

    this.setupInput();

    // Debug handle
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
        autopilotStop: () => { this.autopilot = false; }
      }
    };

    if (shotName) {
      this.state = 'playing';
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
        this.player.punch();
        this.crimePos = this.player.position.clone();
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
          // Stolen car hook / wanted level trigger
          window.__stolenCarReported = true;
          this.crimePos = targetPos.clone();
        }
      }
    }
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
      this.vehicleManager.update(dt, this.player, this.activeCar, this.input);
      this.pedManager.update(dt, this.player.position, this.crimePos);

      // Camera follow
      const targetPos = this.activeCar ? this.activeCar.position : this.player.position;
      const followDist = this.cameraMode === 0 ? CONFIG.camera.followDistance : CONFIG.camera.followDistance * 1.8;
      const followHeight = this.cameraMode === 0 ? CONFIG.camera.followHeight : CONFIG.camera.followHeight * 1.5;

      const camOffset = new THREE.Vector3(0, followHeight, followDist);
      if (this.activeCar) {
        const carForward = new THREE.Vector3(Math.sin(this.activeCar.rotation), 0, Math.cos(this.activeCar.rotation));
        camOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.activeCar.rotation);
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
