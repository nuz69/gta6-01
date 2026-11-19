import * as THREE from '../vendor/three.min.js';
import { CONFIG } from './config.js';

export class VehicleManager {
  constructor(world, rng) {
    this.world = world;
    this.rng = rng;
    this.vehicles = [];
    this.group = new THREE.Group();

    this.carTypes = {
      sedan: { color: 0x2563eb, topSpeed: CONFIG.vehicles.maxSpeed.sedan, accel: CONFIG.vehicles.acceleration.sedan * 6.0, handling: CONFIG.vehicles.handling.sedan, size: [2.1, 1.3, 4.4] },
      taxi: { color: 0xfacc15, topSpeed: CONFIG.vehicles.maxSpeed.taxi, accel: CONFIG.vehicles.acceleration.taxi * 6.0, handling: CONFIG.vehicles.handling.taxi, size: [2.1, 1.3, 4.4] },
      sports: { color: 0xdc2626, topSpeed: CONFIG.vehicles.maxSpeed.sports, accel: CONFIG.vehicles.acceleration.sports * 5.0, handling: CONFIG.vehicles.handling.sports, size: [2.0, 1.1, 4.2] },
      pickup: { color: 0x059669, topSpeed: CONFIG.vehicles.maxSpeed.pickup, accel: CONFIG.vehicles.acceleration.pickup * 6.0, handling: CONFIG.vehicles.handling.pickup, size: [2.3, 1.5, 5.0] }
    };

    this.spawnParkedAndTrafficCars();
  }

  createCarMesh(typeKey) {
    const spec = this.carTypes[typeKey] || this.carTypes.sedan;
    const group = new THREE.Group();

    const [w, h, l] = spec.size;
    const bodyMat = new THREE.MeshStandardMaterial({ color: spec.color, roughness: 0.25, metalness: 0.5 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1, metalness: 0.9 });
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });

    // Main body
    const bodyGeo = new THREE.BoxGeometry(w, h * 0.55, l);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.set(0, h * 0.35, 0);
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Cabin / roof
    const cabinGeo = new THREE.BoxGeometry(w * 0.82, h * 0.45, l * 0.52);
    const cabin = new THREE.Mesh(cabinGeo, glassMat);
    cabin.position.set(0, h * 0.75, -0.05);
    cabin.castShadow = true;
    group.add(cabin);

    // Taxi sign if taxi
    if (typeKey === 'taxi') {
      const signGeo = new THREE.BoxGeometry(0.6, 0.2, 0.3);
      const signMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfacc15, emissiveIntensity: 0.8 });
      const sign = new THREE.Mesh(signGeo, signMat);
      sign.position.set(0, h * 1.05, 0);
      group.add(sign);
    }

    // Wheels (4)
    const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.32, 16);
    wheelGeo.rotateZ(Math.PI / 2);
    const wheelOffsets = [
      [-w / 2 - 0.04, 0.38, l * 0.32],
      [w / 2 + 0.04, 0.38, l * 0.32],
      [-w / 2 - 0.04, 0.38, -l * 0.32],
      [w / 2 + 0.04, 0.38, -l * 0.32]
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
    const { blocksX, blocksZ, blockSize } = CONFIG.world;
    const totalWidth = blocksX * blockSize;
    const totalDepth = blocksZ * blockSize;

    // Spawn 16 traffic cars along roads
    const typeKeys = Object.keys(this.carTypes);
    for (let i = 0; i < 16; i++) {
      const road = this.rng.pick(this.world.roads);
      if (!road) continue;

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
        health: CONFIG.vehicles.health,
        roadIndex: i
      };

      if (road.type === 'vertical') {
        car.position.set(road.x + (this.rng.chance(0.5) ? 2.5 : -2.5), 0, this.rng.range(-totalDepth / 2 + 30, totalDepth / 2 - 30));
        car.rotation = car.position.z > 0 ? Math.PI : 0;
      } else {
        car.position.set(this.rng.range(-totalWidth / 2 + 30, totalWidth / 2 - 30), 0, road.z + (this.rng.chance(0.5) ? 2.5 : -2.5));
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
        if (this.rng.chance(0.45)) {
          const bx = -totalWidth / 2 + blockSize / 2 + x * blockSize;
          const bz = -totalDepth / 2 + blockSize / 2 + z * blockSize;
          const typeKey = this.rng.pick(typeKeys);
          const mesh = this.createCarMesh(typeKey);

          const car = {
            mesh,
            typeKey,
            spec: this.carTypes[typeKey],
            position: new THREE.Vector3(bx + blockSize / 2 - 4.5, 0, bz),
            velocity: new THREE.Vector3(),
            speed: 0,
            steering: 0,
            rotation: this.rng.chance(0.5) ? 0 : Math.PI,
            isTraffic: false,
            isParked: true,
            health: CONFIG.vehicles.health
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
    const worldLimit = (CONFIG.world.blocksX * CONFIG.world.blockSize) / 2;
    const keys = input.keys || {};

    for (const car of this.vehicles) {
      if (car === activeCar) {
        // Player driving input (supporting KeyW, w, W, ArrowUp, etc.)
        const spec = car.spec;
        let throttle = 0;
        if (keys['KeyW'] || keys['w'] || keys['W'] || keys['ArrowUp']) throttle = 1;
        if (keys['KeyS'] || keys['s'] || keys['S'] || keys['ArrowDown']) throttle = -1;

        let steerInput = 0;
        if (keys['KeyA'] || keys['a'] || keys['A'] || keys['ArrowLeft']) steerInput = 1;
        if (keys['KeyD'] || keys['d'] || keys['D'] || keys['ArrowRight']) steerInput = -1;

        const isHandbrake = keys['Space'] || keys[' '];

        if (throttle !== 0) {
          car.speed += throttle * spec.accel * dt;
        } else {
          car.speed *= isHandbrake ? Math.pow(0.85, dt * 60) : Math.pow(0.96, dt * 60); // friction / handbrake
        }

        car.speed = Math.max(-spec.topSpeed * 0.35, Math.min(spec.topSpeed, car.speed));

        if (Math.abs(car.speed) > 0.4) {
          const turnRate = spec.handling * 0.035 * (car.speed / spec.topSpeed);
          car.rotation += steerInput * turnRate * (dt * 60);
        }

        const forward = new THREE.Vector3(Math.sin(car.rotation), 0, Math.cos(car.rotation));
        car.velocity.copy(forward).multiplyScalar(car.speed);
        car.position.addScaledVector(car.velocity, dt);

        // Clamp within world limits
        car.position.x = Math.max(-worldLimit + 10, Math.min(worldLimit - 10, car.position.x));
        car.position.z = Math.max(-worldLimit + 10, Math.min(worldLimit - 10, car.position.z));

        car.mesh.position.copy(car.position);
        car.mesh.rotation.y = car.rotation;

        // Sync player position to active car
        player.position.copy(car.position);
        player.group.position.copy(car.position);
      } else if (car.isTraffic) {
        // Traffic AI cruising along roads
        const forward = new THREE.Vector3(Math.sin(car.rotation), 0, Math.cos(car.rotation));
        car.speed = 10.0;
        car.position.addScaledVector(forward, car.speed * dt);

        // Wrap around world boundaries
        if (Math.abs(car.position.x) > worldLimit || Math.abs(car.position.z) > worldLimit) {
          car.position.set(
            this.rng.range(-worldLimit + 50, worldLimit - 50),
            0,
            this.rng.range(-worldLimit + 50, worldLimit - 50)
          );
          car.rotation = this.rng.chance(0.5) ? 0 : Math.PI;
        }

        car.mesh.position.copy(car.position);
        car.mesh.rotation.y = car.rotation;
      }
    }
  }

  findNearestCar(pos, maxDist = 5.0) {
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
