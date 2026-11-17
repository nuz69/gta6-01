import * as THREE from '../vendor/three.min.js';
import { CONFIG } from './config.js';

export class VehicleManager {
  constructor(world, rng) {
    this.world = world;
    this.rng = rng;
    this.vehicles = [];
    this.group = new THREE.Group();

    this.carTypes = {
      sedan: { color: 0x3b82f6, topSpeed: 25, accel: 10, handling: 3.5, size: [2.0, 1.2, 4.2] },
      taxi: { color: 0xeab308, topSpeed: 23, accel: 9, handling: 3.3, size: [2.0, 1.2, 4.2] },
      sports: { color: 0xef4444, topSpeed: 38, accel: 18, handling: 4.5, size: [1.9, 1.0, 4.0] },
      pickup: { color: 0x10b981, topSpeed: 20, accel: 8, handling: 2.8, size: [2.2, 1.4, 4.8] }
    };

    this.spawnParkedAndTrafficCars();
  }

  createCarMesh(typeKey) {
    const spec = this.carTypes[typeKey] || this.carTypes.sedan;
    const group = new THREE.Group();

    const [w, h, l] = spec.size;
    const bodyMat = new THREE.MeshStandardMaterial({ color: spec.color, roughness: 0.3, metalness: 0.4 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.1, metalness: 0.9 });
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 });

    // Main body
    const bodyGeo = new THREE.BoxGeometry(w, h * 0.6, l);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.set(0, h * 0.3, 0);
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Cabin
    const cabinGeo = new THREE.BoxGeometry(w * 0.85, h * 0.5, l * 0.5);
    const cabin = new THREE.Mesh(cabinGeo, glassMat);
    cabin.position.set(0, h * 0.75, -0.1);
    cabin.castShadow = true;
    group.add(cabin);

    // Wheels (4)
    const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.3, 12);
    wheelGeo.rotateZ(Math.PI / 2);
    const wheelOffsets = [
      [-w / 2 - 0.05, 0.35, l * 0.35],
      [w / 2 + 0.05, 0.35, l * 0.35],
      [-w / 2 - 0.05, 0.35, -l * 0.35],
      [w / 2 + 0.05, 0.35, -l * 0.35]
    ];
    for (const off of wheelOffsets) {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.position.set(...off);
      wheel.castShadow = true;
      group.add(wheel);
    }

    group.userData = { typeKey, spec };
    return group;
  }

  spawnParkedAndTrafficCars() {
    const { blocksX, blocksZ, blockSize, roadWidth } = CONFIG.world;
    const totalWidth = blocksX * blockSize;
    const totalDepth = blocksZ * blockSize;

    // Spawn traffic cars along roads
    for (let i = 0; i < 16; i++) {
      const road = this.rng.pick(this.world.roads);
      if (!road) continue;

      const typeKeys = Object.keys(this.carTypes);
      const typeKey = this.rng.pick(typeKeys);
      const mesh = this.createCarMesh(typeKey);

      const car = {
        mesh,
        typeKey,
        spec: this.carTypes[typeKey],
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        speed: 0,
        steering: 0,
        rotation: 0,
        isTraffic: true,
        isParked: false,
        health: 100,
        damaged: false,
        roadIndex: i
      };

      if (road.type === 'vertical') {
        car.position.set(road.x + (this.rng.chance(0.5) ? 2 : -2), 0, this.rng.range(-totalDepth / 2 + 20, totalDepth / 2 - 20));
        car.rotation = car.position.z > 0 ? Math.PI : 0;
      } else {
        car.position.set(this.rng.range(-totalWidth / 2 + 20, totalWidth / 2 - 20), 0, road.z + (this.rng.chance(0.5) ? 2 : -2));
        car.rotation = car.position.x > 0 ? -Math.PI / 2 : Math.PI / 2;
      }

      mesh.position.copy(car.position);
      mesh.rotation.y = car.rotation;
      this.group.add(mesh);
      this.vehicles.push(car);
    }

    // Spawn parked cars along sidewalks
    for (let x = 0; x < blocksX; x++) {
      for (let z = 0; z < blocksZ; z++) {
        if (this.rng.chance(0.4)) {
          const bx = -totalWidth / 2 + blockSize / 2 + x * blockSize;
          const bz = -totalDepth / 2 + blockSize / 2 + z * blockSize;
          const typeKey = this.rng.pick(Object.keys(this.carTypes));
          const mesh = this.createCarMesh(typeKey);

          const car = {
            mesh,
            typeKey,
            spec: this.carTypes[typeKey],
            position: new THREE.Vector3(bx + CONFIG.world.blockSize / 2 - 3, 0, bz),
            velocity: new THREE.Vector3(),
            speed: 0,
            steering: 0,
            rotation: this.rng.chance(0.5) ? 0 : Math.PI,
            isTraffic: false,
            isParked: true,
            health: 100,
            damaged: false
          };

          mesh.position.copy(car.position);
          mesh.rotation.y = car.rotation;
          this.group.add(mesh);
          this.vehicles.push(car);
        }
      }
    }
  }

  update(dt, player, activeCar, input) {
    for (const car of this.vehicles) {
      if (car === activeCar) {
        // Player driving this car
        const spec = car.spec;
        let throttle = 0;
        if (input.keys['KeyW'] || input.keys['ArrowUp']) throttle = 1;
        if (input.keys['KeyS'] || input.keys['ArrowDown']) throttle = -1;

        let steerInput = 0;
        if (input.keys['KeyA'] || input.keys['ArrowLeft']) steerInput = 1;
        if (input.keys['KeyD'] || input.keys['ArrowRight']) steerInput = -1;

        if (throttle !== 0) {
          car.speed += throttle * spec.accel * dt;
        } else {
          car.speed *= 0.95; // friction
        }

        car.speed = Math.max(-spec.topSpeed * 0.4, Math.min(spec.topSpeed, car.speed));

        if (Math.abs(car.speed) > 0.5) {
          car.rotation += steerInput * (spec.handling * 0.03) * (car.speed / spec.topSpeed);
        }

        const forward = new THREE.Vector3(Math.sin(car.rotation), 0, Math.cos(car.rotation));
        car.velocity.copy(forward).multiplyScalar(car.speed);
        car.position.addScaledVector(car.velocity, dt);

        car.mesh.position.copy(car.position);
        car.mesh.rotation.y = car.rotation;

        // Sync player position to car
        player.position.copy(car.position);
        player.group.position.copy(car.position);
      } else if (car.isTraffic) {
        // Simple traffic AI driving forward along roads
        const forward = new THREE.Vector3(Math.sin(car.rotation), 0, Math.cos(car.rotation));
        car.speed = 8.0; // cruising traffic speed
        car.position.addScaledVector(forward, car.speed * dt);

        // Wrap around city limits
        const limit = CONFIG.world.blocksX * CONFIG.world.blockSize / 2;
        if (Math.abs(car.position.x) > limit || Math.abs(car.position.z) > limit) {
          car.position.set(0, 0, 0);
        }

        car.mesh.position.copy(car.position);
        car.mesh.rotation.y = car.rotation;
      }
    }
  }

  findNearestCar(pos, maxDist = 4.0) {
    let nearest = null;
    let minDist = maxDist;
    for (const car of this.vehicles) {
      const dist = car.position.distanceTo(pos);
      if (dist < minDist) {
        minDist = dist;
        nearest = car;
      }
    }
    return nearest;
  }
}
