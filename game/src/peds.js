import * as THREE from '../vendor/three.min.js';
import { CONFIG } from './config.js';

export class PedestrianManager {
  constructor(world, rng) {
    this.world = world;
    this.rng = rng;
    this.peds = [];
    this.group = new THREE.Group();

    this.spawnPeds();
  }

  createPedMesh() {
    const group = new THREE.Group();
    const outfitColor = new THREE.Color().setHSL(this.rng.next(), 0.5, 0.5);
    const bodyMat = new THREE.MeshStandardMaterial({ color: outfitColor, roughness: 0.8 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.6 });

    // Torso
    const torsoGeo = new THREE.BoxGeometry(0.5, 0.8, 0.3);
    const torso = new THREE.Mesh(torsoGeo, bodyMat);
    torso.position.set(0, 0.9, 0);
    torso.castShadow = true;
    group.add(torso);

    // Head
    const headGeo = new THREE.BoxGeometry(0.35, 0.35, 0.35);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.set(0, 1.45, 0);
    head.castShadow = true;
    group.add(head);

    return group;
  }

  spawnPeds() {
    const { blocksX, blocksZ, blockSize } = CONFIG.world;
    const totalWidth = blocksX * blockSize;
    const totalDepth = blocksZ * blockSize;

    for (let i = 0; i < 24; i++) {
      const mesh = this.createPedMesh();
      const ped = {
        mesh,
        position: new THREE.Vector3(
          this.rng.range(-totalWidth / 2 + 10, totalWidth / 2 - 10),
          0.3,
          this.rng.range(-totalDepth / 2 + 10, totalDepth / 2 - 10)
        ),
        velocity: new THREE.Vector3(),
        speed: this.rng.range(1.2, 2.2),
        direction: new THREE.Vector3(this.rng.range(-1, 1), 0, this.rng.range(-1, 1)).normalize(),
        state: 'wandering', // wandering, fleeing
        timer: this.rng.range(3, 8)
      };

      mesh.position.copy(ped.position);
      this.group.add(mesh);
      this.peds.push(ped);
    }
  }

  findNearestPed(pos, maxDist = 3.0) {
    let nearest = null;
    let minDist = maxDist;
    for (const ped of this.peds) {
      const dist = ped.position.distanceTo(pos);
      if (dist < minDist) {
        minDist = dist;
        nearest = ped;
      }
    }
    return nearest;
  }

  update(dt, playerPos, crimePos) {
    const limit = CONFIG.world.blocksX * CONFIG.world.blockSize / 2 - 5;

    for (const ped of this.peds) {
      // Check crime reaction (fleeing)
      if (crimePos && ped.position.distanceTo(crimePos) < 15) {
        ped.state = 'fleeing';
        ped.direction.copy(ped.position).sub(crimePos).normalize();
        ped.speed = 4.0;
      } else {
        ped.timer -= dt;
        if (ped.timer <= 0) {
          ped.timer = this.rng.range(4, 10);
          ped.state = 'wandering';
          ped.direction.set(this.rng.range(-1, 1), 0, this.rng.range(-1, 1)).normalize();
          ped.speed = this.rng.range(1.2, 2.2);
        }
      }

      ped.position.addScaledVector(ped.direction, ped.speed * dt);

      // Boundary check
      if (Math.abs(ped.position.x) > limit || Math.abs(ped.position.z) > limit) {
        ped.direction.negate();
      }

      ped.mesh.position.copy(ped.position);
      if (ped.direction.lengthSq() > 0) {
        ped.mesh.rotation.y = Math.atan2(ped.direction.x, ped.direction.z);
      }
    }
  }
}
