import * as THREE from '../vendor/three.min.js';
import { CONFIG } from './config.js';

const CHASE_SPEED = 35;
const RAM_DISTANCE = 4.0;
const DESPAWN_CAR_DISTANCE = 250;
const DESPAWN_COP_DISTANCE = 150;
const UNSEEN_RANGE = 80;
const UNSEEN_GRACE = 3.0;

export class PoliceSystem {
  constructor(world, rng) {
    this.world = world;
    this.rng = rng;
    this.group = new THREE.Group();
    this.policeCars = [];
    this.footCops = [];

    this.stars = 0;
    this.heat = 0;
    this.unseenTimer = 0;
    this.spawnTimer = 3.5; // Ready to spawn immediately when wanted
  }

  setWanted(stars) {
    const oldStars = this.stars;
    this.stars = Math.max(0, Math.min(CONFIG.wanted.maxStars, stars));
    const thresholds = CONFIG.wanted.starThresholds;
    if (this.stars <= 0) {
      this.heat = 0;
      this.clearAll();
    } else {
      this.heat = thresholds[this.stars] || (this.stars * 20);
      if (oldStars === 0 && this.stars > 0) {
        this.spawnTimer = 3.5; // Force immediate spawn on entering wanted state
      }
    }
  }

  addHeat(amount) {
    this.heat = Math.min(CONFIG.wanted.heatMax, this.heat + amount);
    this.updateStarsFromHeat();
    this.unseenTimer = 0;
  }

  _starsForHeat(heat) {
    const thresholds = CONFIG.wanted.starThresholds; // [0, 20, 45, 70, 90, 100]
    for (let i = thresholds.length - 1; i >= 0; i--) {
      if (heat >= thresholds[i]) {
        return i;
      }
    }
    return 0;
  }

  updateStarsFromHeat() {
    const newStars = this._starsForHeat(this.heat);
    const oldStars = this.stars;
    this.stars = Math.max(0, Math.min(CONFIG.wanted.maxStars, newStars));
    if (this.stars === 0) {
      this.clearAll();
    } else if (oldStars === 0 && this.stars > 0) {
      this.spawnTimer = 3.5;
    }
  }

  clearAll() {
    for (const car of this.policeCars) {
      this.group.remove(car.mesh);
    }
    this.policeCars = [];
    for (const cop of this.footCops) {
      this.group.remove(cop.mesh);
    }
    this.footCops = [];
  }

  /** Adds a box mesh to a group at the given offset. */
  _boxPart(group, size, material, x, y, z, shadow = false) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = shadow;
    group.add(mesh);
    return mesh;
  }

  createPoliceCarMesh() {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.3, metalness: 0.6 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1, metalness: 0.9 });

    const w = 2.1, h = 1.3, l = 4.5;
    this._boxPart(group, [w, h * 0.55, l], bodyMat, 0, h * 0.3, 0, true);
    this._boxPart(group, [w + 0.02, h * 0.3, l * 0.45], whiteMat, 0, h * 0.32, 0);
    this._boxPart(group, [w * 0.82, h * 0.5, l * 0.48], glassMat, 0, h * 0.75, -0.05);

    const lightBarMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 1.2 });
    const lightBar = this._boxPart(group, [1.1, 0.18, 0.35], lightBarMat, 0, h * 1.15, 0);
    group.userData.lightBarMesh = lightBar;

    return group;
  }

  createFootCopMesh() {
    const group = new THREE.Group();
    const uniformMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.7 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.6 });
    const capMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.5 });

    this._boxPart(group, [0.55, 0.85, 0.35], uniformMat, 0, 0.9, 0, true);
    this._boxPart(group, [0.35, 0.35, 0.35], skinMat, 0, 1.45, 0);
    this._boxPart(group, [0.4, 0.15, 0.45], capMat, 0, 1.65, 0.02);
    this._boxPart(
      group,
      [0.1, 0.55, 0.1],
      new THREE.MeshStandardMaterial({ color: 0x1f2937 }),
      0.38, 0.85, 0.2
    );

    return group;
  }

  /** Random spawn offset around the target at a distance within [minDist, maxDist]. */
  _ringOffset(targetPos, minDist, maxDist) {
    const angle = this.rng.range(0, Math.PI * 2);
    const dist = this.rng.range(minDist, maxDist);
    return targetPos.clone().add(new THREE.Vector3(Math.cos(angle) * dist, 0, Math.sin(angle) * dist));
  }

  spawnPoliceCar(targetPos) {
    const mesh = this.createPoliceCarMesh();
    const spawnPos = this._ringOffset(targetPos, 25, 50);
    spawnPos.y = 0;

    mesh.position.copy(spawnPos);
    this.group.add(mesh);

    this.policeCars.push({
      mesh,
      position: spawnPos.clone(),
      velocity: new THREE.Vector3(),
      speed: this.rng.range(20, 30),
      rotation: this.rng.range(0, Math.PI * 2),
      health: 100,
      smoked: false
    });
  }

  spawnFootCop(targetPos) {
    const mesh = this.createFootCopMesh();
    const pos = this._ringOffset(targetPos, 12, 25);
    pos.y = 0.3;

    mesh.position.copy(pos);
    this.group.add(mesh);

    this.footCops.push({
      mesh,
      position: pos.clone(),
      speed: 3.6,
      attackTimer: 0
    });
  }

  _nearestUnitDistance(targetPos) {
    let nearestDist = 9999;
    for (const car of this.policeCars) {
      const d = car.position.distanceTo(targetPos);
      if (d < nearestDist) nearestDist = d;
    }
    for (const cop of this.footCops) {
      const d = cop.position.distanceTo(targetPos);
      if (d < nearestDist) nearestDist = d;
    }
    return nearestDist;
  }

  _decayHeatIfUnseen(dt, nearestDist) {
    if (nearestDist > UNSEEN_RANGE) {
      this.unseenTimer += dt;
      if (this.unseenTimer > UNSEEN_GRACE) {
        this.heat = Math.max(0, this.heat - CONFIG.wanted.decayRate * dt);
        this.updateStarsFromHeat();
      }
    } else {
      this.unseenTimer = 0;
    }
  }

  _spawnReinforcements(dt, targetPos) {
    this.spawnTimer += dt;
    const maxPoliceCars = Math.min(6, this.stars * 2);
    if (this.spawnTimer >= 3.5 && this.policeCars.length < maxPoliceCars) {
      this.spawnTimer = 0;
      this.spawnPoliceCar(targetPos);
    }
    if (this.footCops.length < this.stars && this.rng.chance(0.08)) {
      this.spawnFootCop(targetPos);
    }
  }

  /** Wraps an angle difference into [-PI, PI]. */
  _wrapAngle(angleDiff) {
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    return angleDiff;
  }

  _flashLightBar(car, dt) {
    const lb = car.mesh.userData.lightBarMesh;
    if (!lb) return;
    car.flashPhase = (car.flashPhase || 0) + dt;
    const red = Math.floor(car.flashPhase / 0.15) % 2 === 0;
    lb.material.color.setHex(red ? 0xef4444 : 0x3b82f6);
    lb.material.emissive.setHex(red ? 0xef4444 : 0x3b82f6);
  }

  _scorchIfDamaged(car) {
    if (car.health >= 60 || car.smoked) return;
    car.smoked = true;
    const lb = car.mesh.userData.lightBarMesh;
    car.mesh.traverse(child => {
      if (child.isMesh && child.material && child !== lb) {
        child.material.color.setHex(0x374151); // Darkened / scorched
      }
    });
  }

  _updatePoliceCar(car, dt, targetPos, activeCar, player) {
    if (car.health <= 0) {
      car.speed = 0;
      return true; // keep
    }

    const toTarget = targetPos.clone().sub(car.position);
    const dist = toTarget.length();

    if (dist > DESPAWN_CAR_DISTANCE) {
      this.group.remove(car.mesh);
      return false; // drop
    }

    // Steer toward target
    const targetAngle = Math.atan2(toTarget.x, toTarget.z);
    car.rotation += this._wrapAngle(targetAngle - car.rotation) * Math.min(1, 4.5 * dt);

    // Accelerate towards ~35 speed when chasing
    car.speed = THREE.MathUtils.lerp(car.speed, CHASE_SPEED, 2.0 * dt);
    const forward = new THREE.Vector3(Math.sin(car.rotation), 0, Math.cos(car.rotation));
    car.position.addScaledVector(forward, car.speed * dt);

    car.mesh.position.copy(car.position);
    car.mesh.rotation.y = car.rotation;

    // Alternating emergency siren light bar (red / blue strobe)
    this._flashLightBar(car, dt);

    // Damage / smoke appearance if hurt
    this._scorchIfDamaged(car);

    // Ram on contact
    if (dist < RAM_DISTANCE) {
      if (activeCar) {
        activeCar.speed *= 0.7;
        player.takeDamage(15);
        this.addHeat(2);
      } else {
        player.takeDamage(20);
      }
    }
    return true; // keep
  }

  _updateFootCop(cop, dt, playerPos, player) {
    const toPlayer = playerPos.clone().sub(cop.position);
    toPlayer.y = 0;
    const dist = toPlayer.length();

    if (dist > DESPAWN_COP_DISTANCE) {
      this.group.remove(cop.mesh);
      return false; // drop
    }

    if (dist > 1.8) {
      toPlayer.normalize();
      cop.position.addScaledVector(toPlayer, cop.speed * dt);
      cop.mesh.rotation.y = Math.atan2(toPlayer.x, toPlayer.z);
    } else {
      cop.attackTimer += dt;
      if (cop.attackTimer >= 0.8) {
        cop.attackTimer = 0;
        player.takeDamage(10);
      }
    }
    cop.mesh.position.copy(cop.position);
    return true; // keep
  }

  update(dt, playerPos, activeCar, vehicleManager, player) {
    if (this.stars <= 0) {
      if (this.policeCars.length > 0 || this.footCops.length > 0) {
        this.clearAll();
      }
      return;
    }

    const currentTargetPos = activeCar ? activeCar.position : playerPos;

    // Check distance to nearest police unit for decay / unseen timer
    this._decayHeatIfUnseen(dt, this._nearestUnitDistance(currentTargetPos));

    // Spawning timer
    this._spawnReinforcements(dt, currentTargetPos);

    // Update Police Cars
    for (let i = this.policeCars.length - 1; i >= 0; i--) {
      const car = this.policeCars[i];
      if (!this._updatePoliceCar(car, dt, currentTargetPos, activeCar, player)) {
        this.policeCars.splice(i, 1);
      }
    }

    // Update Foot Cops
    for (let i = this.footCops.length - 1; i >= 0; i--) {
      const cop = this.footCops[i];
      if (!this._updateFootCop(cop, dt, playerPos, player)) {
        this.footCops.splice(i, 1);
      }
    }
  }
}
