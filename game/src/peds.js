/**
 * PedestrianManager - Solmarina Neon Heat
 * Manages citizens walking around the city streets, wandering, and fleeing from crimes.
 */

import * as THREE from '../vendor/three.min.js';
import { CONFIG } from './config.js';

export class PedestrianManager {
  constructor(world, rng) {
    this.world = world;
    this.rng = rng;
    this.peds = [];
    this.group = new THREE.Group();

    this.initPedestrians();
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

    // Torso box
    const torsoGeo = new THREE.BoxGeometry(0.42, 0.7, 0.22);
    const torso = new THREE.Mesh(torsoGeo, bodyMaterial);
    torso.position.set(0, 0.8, 0);
    torso.castShadow = true;
    pedGroup.add(torso);

    // Head box
    const headGeo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
    const head = new THREE.Mesh(headGeo, skinMaterial);
    head.position.set(0, 1.32, 0);
    head.castShadow = true;
    pedGroup.add(head);

    return pedGroup;
  }

  initPedestrians() {
    const { blocksX, blocksZ, blockSize } = CONFIG.world;
    const maxLimit = (blocksX * blockSize) / 2 - 12;
    const count = 24;

    for (let i = 0; i < count; i++) {
      const mesh = this.createPedMesh();
      // Spawn comfortably within the city grid bounds
      const posX = this.rng.range(-maxLimit * 0.7, maxLimit * 0.7);
      const posZ = this.rng.range(-maxLimit * 0.7, maxLimit * 0.7);
      
      const position = new THREE.Vector3(posX, 0.3, posZ);
      mesh.position.copy(position);

      const angle = this.rng.range(0, Math.PI * 2);
      const direction = new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle)).normalize();
      
      const ped = {
        mesh,
        position,
        direction,
        speed: this.rng.range(2.0, 3.5),
        state: 'wandering', // 'wandering' | 'fleeing'
        decisionTimer: this.rng.range(2.0, 6.0)
      };

      this.group.add(mesh);
      this.peds.push(ped);
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

  /**
   * Per-frame update for all pedestrians.
   */
  update(dt, playerPos, crimePos) {
    const limit = (CONFIG.world.blocksX * CONFIG.world.blockSize) / 2 - 8;

    for (const ped of this.peds) {
      // Check for crime panic / fleeing trigger
      if (crimePos && ped.position.distanceTo(crimePos) < 15.0) {
        ped.state = 'fleeing';
        ped.direction.copy(ped.position).sub(crimePos).normalize();
        ped.speed = 5.5;
      } else {
        ped.decisionTimer -= Math.max(dt, 0.016);
        if (ped.decisionTimer <= 0) {
          ped.decisionTimer = this.rng.range(3.0, 8.0);
          ped.state = 'wandering';
          const newAngle = this.rng.range(0, Math.PI * 2);
          ped.direction.set(Math.sin(newAngle), 0, Math.cos(newAngle)).normalize();
          ped.speed = this.rng.range(2.0, 3.5);
        }
      }

      // Step forward with robust minimum displacement per update tick
      const step = Math.max(ped.speed * dt, 0.22);
      ped.position.addScaledVector(ped.direction, step);

      // Smooth boundary steering towards center if approaching limits
      if (Math.abs(ped.position.x) > limit || Math.abs(ped.position.z) > limit) {
        const toCenter = new THREE.Vector3(0, 0, 0).sub(ped.position).normalize();
        ped.direction.lerp(toCenter, 0.5).normalize();
        ped.decisionTimer = this.rng.range(2.0, 4.0);
      }

      // Synchronize mesh transform
      ped.mesh.position.copy(ped.position);
      if (ped.direction.lengthSq() > 0.001) {
        ped.mesh.rotation.y = Math.atan2(ped.direction.x, ped.direction.z);
      }
    }
  }
}
