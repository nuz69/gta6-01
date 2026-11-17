import * as THREE from '../vendor/three.min.js';
import { CONFIG } from './config.js';
import { SeederRNG } from './random.js';

export class World {
  constructor(seed = 1) {
    this.rng = new SeederRNG(seed);
    this.group = new THREE.Group();
    this.roads = [];
    this.spawnPoints = [];
    this.buildWorld();
  }

  createWindowTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = '#fde047'; // warm lit windows
    for (let x = 10; x < 118; x += 20) {
      for (let y = 10; y < 118; y += 30) {
        if (this.rng.chance(0.7)) {
          ctx.fillRect(x, y, 10, 18);
        }
      }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  buildWorld() {
    const { blocksX, blocksZ, blockSize, roadWidth } = CONFIG.world;
    const totalWidth = blocksX * blockSize;
    const totalDepth = blocksZ * blockSize;

    // Materials
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });
    const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.9 });
    const windowTex = this.createWindowTexture();
    windowTex.repeat.set(2, 6);
    const buildingMat = new THREE.MeshStandardMaterial({ map: windowTex, roughness: 0.5 });
    const beachMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 1.0 });
    const oceanMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.1, metalness: 0.3 });
    const grassMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.9 });

    // Ocean on West edge (-X)
    const oceanGeo = new THREE.PlaneGeometry(600, totalDepth + 400);
    const ocean = new THREE.Mesh(oceanGeo, oceanMat);
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.set(-totalWidth / 2 - 350, 0, 0);
    this.group.add(ocean);

    // Beach on West edge
    const beachGeo = new THREE.PlaneGeometry(120, totalDepth + 200);
    const beach = new THREE.Mesh(beachGeo, beachMat);
    beach.rotation.x = -Math.PI / 2;
    beach.position.set(-totalWidth / 2 - 60, 0.1, 0);
    this.group.add(beach);

    // Ground plane (city base)
    const groundGeo = new THREE.PlaneGeometry(totalWidth + 200, totalDepth + 200);
    const ground = new THREE.Mesh(groundGeo, grassMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -0.1, 0);
    this.group.add(ground);

    // Grid & Buildings
    const startX = -totalWidth / 2 + blockSize / 2;
    const startZ = -totalDepth / 2 + blockSize / 2;

    for (let x = 0; x < blocksX; x++) {
      for (let z = 0; z < blocksZ; z++) {
        const bx = startX + x * blockSize;
        const bz = startZ + z * blockSize;

        // Determine district based on position
        // Center = Downtown (tall), East = Port, West = Beach/Suburbs, North/South = Suburbs
        const distFromCenter = Math.abs(x - blocksX / 2) + Math.abs(z - blocksZ / 2);
        let height = this.rng.range(15, 35);
        let buildingWidth = blockSize - roadWidth - 4;
        let buildingDepth = blockSize - roadWidth - 4;

        if (distFromCenter < 3) {
          // Downtown towers
          height = this.rng.range(60, 140);
          buildingWidth -= 6;
          buildingDepth -= 6;
        } else if (x === blocksX - 1) {
          // Port area on East edge - cargo containers & warehouses
          height = this.rng.range(8, 18);
        } else {
          // Suburbs
          height = this.rng.range(10, 25);
        }

        // Building mesh
        const bGeo = new THREE.BoxGeometry(buildingWidth, height, buildingDepth);
        // Vary building tint per block
        const tintMat = buildingMat.clone();
        tintMat.color.setHSL(this.rng.range(0.05, 0.15), 0.2, this.rng.range(0.4, 0.7));
        const building = new THREE.Mesh(bGeo, tintMat);
        building.position.set(bx, height / 2, bz);
        building.castShadow = true;
        building.receiveShadow = true;
        this.group.add(building);

        // Sidewalk around block
        const swGeo = new THREE.BoxGeometry(buildingWidth + 4, 0.3, buildingDepth + 4);
        const sidewalk = new THREE.Mesh(swGeo, sidewalkMat);
        sidewalk.position.set(bx, 0.15, bz);
        sidewalk.receiveShadow = true;
        this.group.add(sidewalk);

        // Add some palm trees along beach / streets
        if (x === 0 || x === 1 || this.rng.chance(0.3)) {
          this.addPalmTree(bx - buildingWidth / 2 - 3, bz);
        }
      }
    }

    // Roads (Network)
    for (let i = 0; i <= blocksX; i++) {
      const rx = -totalWidth / 2 + i * blockSize - blockSize / 2 + roadWidth / 2;
      const roadGeo = new THREE.PlaneGeometry(roadWidth, totalDepth);
      const road = new THREE.Mesh(roadGeo, roadMat);
      road.rotation.x = -Math.PI / 2;
      road.position.set(rx, 0.2, 0);
      road.receiveShadow = true;
      this.group.add(road);
      this.roads.push({ type: 'vertical', x: rx, zStart: -totalDepth / 2, zEnd: totalDepth / 2 });
    }

    for (let j = 0; j <= blocksZ; j++) {
      const rz = -totalDepth / 2 + j * blockSize - blockSize / 2 + roadWidth / 2;
      const roadGeo = new THREE.PlaneGeometry(totalWidth, roadWidth);
      const road = new THREE.Mesh(roadGeo, roadMat);
      road.rotation.x = -Math.PI / 2;
      road.position.set(0, 0.2, rz);
      road.receiveShadow = true;
      this.group.add(road);
      this.roads.push({ type: 'horizontal', z: rz, xStart: -totalWidth / 2, xEnd: totalWidth / 2 });
    }

    // Default spawn point (player / camera starting spot)
    this.spawnPoints.push({ x: 0, y: 1, z: 0 });
  }

  addPalmTree(x, z) {
    const trunkGeo = new THREE.CylinderGeometry(0.4, 0.6, 8, 6);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.9 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.set(x, 4, z);
    trunk.castShadow = true;
    this.group.add(trunk);

    // Fronds
    for (let i = 0; i < 5; i++) {
      const frondGeo = new THREE.BoxGeometry(4, 0.1, 1.2);
      const frondMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.7 });
      const frond = new THREE.Mesh(frondGeo, frondMat);
      const angle = (i / 5) * Math.PI * 2;
      frond.position.set(x + Math.cos(angle) * 1.5, 7.5, z + Math.sin(angle) * 1.5);
      frond.rotation.y = angle;
      frond.rotation.z = 0.3;
      this.group.add(frond);
    }
  }
}
