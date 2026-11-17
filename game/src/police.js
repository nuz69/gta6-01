import * as THREE from '../vendor/three.min.js';
import { CONFIG } from './config.js';

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
    this.spawnTimer = 0;
  }

  setWanted(stars) {
    this.stars = Math.max(0, Math.min(CONFIG.wanted.maxStars, stars));
    this.heat = this.stars * 20;
    if (this.stars === 0) {
      this.clearAll();
    }
  }

  addHeat(amount) {
    this.heat = Math.min(CONFIG.wanted.heatMax, this.heat + amount);
    this.updateStarsFromHeat();
    this.unseenTimer = 0;
  }

  updateStarsFromHeat() {
    if (this.heat >= 80) this.stars = 5;
    else if (this.heat >= 60) this.stars = 4;
    else if (this.heat >= 40) this.stars = 3;
    else if (this.heat >= 20) this.stars = 2;
    else if (this.heat > 5) this.stars = 1;
    else {
      this.stars = 0;
      this.clearAll();
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

  createPoliceCarMesh() {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3, metalness: 0.5 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1, metalness: 0.9 });

    const w = 2.0, h = 1.2, l = 4.4;
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h * 0.6, l), bodyMat);
    body.position.set(0, h * 0.3, 0);
    body.castShadow = true;
    group.add(body);

    const door = new THREE.Mesh(new THREE.BoxGeometry(w + 0.02, h * 0.5, l * 0.4), whiteMat);
    door.position.set(0, h * 0.35, 0);
    group.add(door);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(w * 0.85, h * 0.5, l * 0.5), glassMat);
    cabin.position.set(0, h * 0.75, -0.1);
    group.add(cabin);

    const lightBarGeo = new THREE.BoxGeometry(1.0, 0.15, 0.3);
    const lightBarMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 1.0 });
    this.lightBar = new THREE.Mesh(lightBarGeo, lightBarMat);
    this.lightBar.position.set(0, h * 1.1, 0);
    group.add(this.lightBar);

    return group;
  }

  createFootCopMesh() {
    const group = new THREE.Group();
    const uniformMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.7 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.6 });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.85, 0.35), uniformMat);
    torso.position.set(0, 0.9, 0);
    torso.castShadow = true;
    group.add(torso);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.35), skinMat);
    head.position.set(0, 1.45, 0);
    group.add(head);

    const baton = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.1), new THREE.MeshStandardMaterial({ color: 0x334155 }));
    baton.position.set(0.4, 0.9, 0.2);
    group.add(baton);

    return group;
  }

  spawnPoliceCar(targetPos) {
    const road = this.rng.pick(this.world.roads);
    if (!road) return;

    const mesh = this.createPoliceCarMesh();
    const car = {
      mesh,
      position: new THREE.Vector3(road.type === 'vertical' ? road.x : this.rng.range(-100, 100), 0, road.type === 'horizontal' ? road.z : this.rng.range(-100, 100)),
      velocity: new THREE.Vector3(),
      speed: 0,
      rotation: 0,
      health: 100,
      sirenOn: true
    };
    car.position.add(new THREE.Vector3(50, 0, 50));
    mesh.position.copy(car.position);
    this.group.add(mesh);
    this.policeCars.push(car);
  }

  spawnFootCop(targetPos) {
    const mesh = this.createFootCopMesh();
    const offset = new THREE.Vector3(this.rng.range(-12, 12), 0, this.rng.range(-12, 12));
    const position = targetPos.clone().add(offset);
    position.y = 0.3;
    mesh.position.copy(position);
    this.group.add(mesh);
    this.footCops.push({
      mesh,
      position,
      speed: 3.5,
      attackTimer: 0
    });
  }

  spawnPoliceNearPlayer(playerPos) {
    this.spawnPoliceCar(playerPos);
    this.spawnFootCop(playerPos);
  }

  update(dt, playerPos, activeCar, vehicleManager, player) {
    if (this.stars > 0) {
      let nearestPoliceDist = 999;
      for (const car of this.policeCars) {
        const d = car.position.distanceTo(activeCar ? activeCar.position : playerPos);
        if (d < nearestPoliceDist) nearestPoliceDist = d;
      }
      for (const cop of this.footCops) {
        const d = cop.position.distanceTo(playerPos);
        if (d < nearestPoliceDist) nearestPoliceDist = d;
      }

      if (nearestPoliceDist > 80) {
        this.unseenTimer += dt;
        if (this.unseenTimer > 3.0) {
          this.heat = Math.max(0, this.heat - CONFIG.wanted.decayRate * dt * 2);
          this.updateStarsFromHeat();
        }
      } else {
        this.unseenTimer = 0;
      }

      this.spawnTimer += dt;
      const targetPoliceCount = Math.min(6, this.stars * 2);
      if (this.spawnTimer > 3.5 && this.policeCars.length < targetPoliceCount) {
        this.spawnTimer = 0;
        this.spawnPoliceCar(activeCar ? activeCar.position : playerPos);
      }
      if (this.footCops.length < this.stars) {
        if (this.rng.chance(0.05)) {
          this.spawnFootCop(playerPos);
        }
      }
    } else {
      if (this.policeCars.length > 0 || this.footCops.length > 0) {
        this.clearAll();
      }
      return;
    }

    const currentPos = activeCar ? activeCar.position : playerPos;

    for (let i = this.policeCars.length - 1; i >= 0; i--) {
      const car = this.policeCars[i];
      if (car.health <= 0) {
        car.speed = 0;
        continue;
      }

      const toTarget = currentPos.clone().sub(car.position);
      const dist = toTarget.length();

      if (dist > 250) {
        this.group.remove(car.mesh);
        this.policeCars.splice(i, 1);
        continue;
      }

      const targetAngle = Math.atan2(toTarget.x, toTarget.z);
      let diff = targetAngle - car.rotation;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      car.rotation += diff * Math.min(1, 5.0 * dt);

      car.speed = Math.min(35, car.speed + 18 * dt);
      const forward = new THREE.Vector3(Math.sin(car.rotation), 0, Math.cos(car.rotation));
      car.position.addScaledVector(forward, car.speed * dt);

      car.mesh.position.copy(car.position);
      car.mesh.rotation.y = car.rotation;

      if (this.lightBar) {
        const flash = Math.floor(performance.now() / 150) % 2 === 0;
        this.lightBar.material.color.setHex(flash ? 0xef4444 : 0x3b82f6);
        this.lightBar.material.emissive.setHex(flash ? 0xef4444 : 0x3b82f6);
      }

      // Smoke indication when damaged
      if (car.health < 50 && !car.smoked) {
        car.smoked = true;
        car.mesh.traverse(child => {
          if (child.isMesh && child.material) {
            child.material.color.setHex(0x64748b); // darkened/scorched
          }
        });
      }

      if (dist < 3.5) {
        if (activeCar) {
          activeCar.speed *= 0.75;
          player.takeDamage(12);
          this.addHeat(3);
        } else {
          player.takeDamage(20);
        }
      }
    }

    for (let i = this.footCops.length - 1; i >= 0; i--) {
      const cop = this.footCops[i];
      const toPlayer = playerPos.clone().sub(cop.position);
      toPlayer.y = 0;
      const dist = toPlayer.length();

      if (dist > 150) {
        this.group.remove(cop.mesh);
        this.footCops.splice(i, 1);
        continue;
      }

      if (dist > 1.5) {
        toPlayer.normalize();
        cop.position.addScaledVector(toPlayer, cop.speed * dt);
        cop.mesh.rotation.y = Math.atan2(toPlayer.x, toPlayer.z);
      } else {
        cop.attackTimer += dt;
        if (cop.attackTimer >= 0.8) {
          cop.attackTimer = 0;
          player.takeDamage(12);
        }
      }
      cop.mesh.position.copy(cop.position);
    }
  }
}
