/**
 * PedestrianManager - Solmarina Neon Heat
 * Manages citizens walking around the city streets, wandering, and fleeing from crimes.
 */

import * as THREE from '../vendor/three.min.js';
import { CONFIG } from './config.js';

const PED_COUNT = 24;
const FLEE_RADIUS = 15.0;
const FLEE_SPEED = 5.5;
const WANDER_SPEED_MIN = 2.0;
const WANDER_SPEED_MAX = 3.5;

export class PedestrianManager {
  constructor(world, rng) {
    this.world = world;
    this.rng = rng;
    this.peds = [];
    this.group = new THREE.Group();

    this.initPedestrians();
  }

  /**
   * Adds one box part (torso/head) to a pedestrian figure.
   */
  _addBoxPart(figure, size, material, height) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    mesh.position.set(0, height, 0);
    mesh.castShadow = true;
    figure.add(mesh);
    return mesh;
  }

  /**
   * Constructs a procedural box-art pedestrian figure with randomized clothing hues.
   */
  createPedMesh() {
    const pedGroup = new THREE.Group();

    // Vibrant tropical / neon heat clothing palette via RNG
    const hue = this.rng.next();
    const outfitColor = new THREE.Color().setHSL(hue, 0.75, 0.5);
    const skinColor = new THREE.Color(0xfde047); // sun-kissed tone

    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: outfitColor,
      roughness: 0.7
    });
    const skinMaterial = new THREE.MeshStandardMaterial({
      color: skinColor,
      roughness: 0.5
    });

    // Torso box, then head box — same parts, same order as before.
    this._addBoxPart(pedGroup, [0.42, 0.7, 0.22], bodyMaterial, 0.8);
    this._addBoxPart(pedGroup, [0.3, 0.3, 0.3], skinMaterial, 1.32);

    return pedGroup;
  }

  _randomHeading() {
    const angle = this.rng.range(0, Math.PI * 2);
    return new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle)).normalize();
  }

  _spawnPedestrian() {
    const { blocksX, blocksZ, blockSize } = CONFIG.world;
    const maxLimit = (blocksX * blockSize) / 2 - 12;

    const mesh = this.createPedMesh();
    // Spawn comfortably within the city grid bounds
    const posX = this.rng.range(-maxLimit * 0.7, maxLimit * 0.7);
    const posZ = this.rng.range(-maxLimit * 0.7, maxLimit * 0.7);

    const position = new THREE.Vector3(posX, 0.3, posZ);
    mesh.position.copy(position);

    const ped = {
      mesh,
      position,
      direction: this._randomHeading(),
      speed: this.rng.range(WANDER_SPEED_MIN, WANDER_SPEED_MAX),
      state: 'wandering', // 'wandering' | 'fleeing'
      decisionTimer: this.rng.range(2.0, 6.0)
    };

    this.group.add(mesh);
    this.peds.push(ped);
    return ped;
  }

  initPedestrians() {
    for (let i = 0; i < PED_COUNT; i++) {
      this._spawnPedestrian();
    }
  }

  /**
   * Finds the nearest pedestrian within maxDist of given position.
   */
  findNearestPed(pos, maxDist = 3.5) {
    let nearest = null;
    let minDistance = maxDist;

    for (const ped of this.peds) {
      const dist = ped.position.distanceTo(pos);
      if (dist < minDistance) {
        minDistance = dist;
        nearest = ped;
      }
    }

    return nearest;
  }

  /** Switches a ped to fleeing when a crime happens nearby; returns true if triggered. */
  _maybeFlee(ped, crimePos) {
    if (crimePos && ped.position.distanceTo(crimePos) < FLEE_RADIUS) {
      ped.state = 'fleeing';
      ped.direction.copy(ped.position).sub(crimePos).normalize();
      ped.speed = FLEE_SPEED;
      return true;
    }
    return false;
  }

  /** Picks a fresh wandering heading/speed when the decision timer runs out. */
  _reconsider(ped, dt) {
    ped.decisionTimer -= Math.max(dt, 0.016);
    if (ped.decisionTimer <= 0) {
      ped.decisionTimer = this.rng.range(3.0, 8.0);
      ped.state = 'wandering';
      ped.direction.copy(this._randomHeading());
      ped.speed = this.rng.range(WANDER_SPEED_MIN, WANDER_SPEED_MAX);
    }
  }

  /** Steers back toward the center when a ped approaches the city limits. */
  _steerInside(ped, limit) {
    if (Math.abs(ped.position.x) > limit || Math.abs(ped.position.z) > limit) {
      const toCenter = new THREE.Vector3(0, 0, 0).sub(ped.position).normalize();
      ped.direction.lerp(toCenter, 0.5).normalize();
      ped.decisionTimer = this.rng.range(2.0, 4.0);
    }
  }

  /**
   * Per-frame update for all pedestrians.
   */
  update(dt, playerPos, crimePos) {
    const limit = (CONFIG.world.blocksX * CONFIG.world.blockSize) / 2 - 8;

    for (const ped of this.peds) {
      // Check for crime panic / fleeing trigger
      if (!this._maybeFlee(ped, crimePos)) {
        this._reconsider(ped, dt);
      }

      // Step forward with robust minimum displacement per update tick
      const step = Math.max(ped.speed * dt, 0.22);
      ped.position.addScaledVector(ped.direction, step);

      // Smooth boundary steering towards center if approaching limits
      this._steerInside(ped, limit);

      // Synchronize mesh transform
      ped.mesh.position.copy(ped.position);
      if (ped.direction.lengthSq() > 0.001) {
        ped.mesh.rotation.y = Math.atan2(ped.direction.x, ped.direction.z);
      }
    }
  }
}
