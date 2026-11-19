/**
 * Solmarina: Neon Heat - Procedural World Generation
 * Generates the city grid, roads, districts, buildings, beach, ocean, and foliage deterministically using SeederRNG and CONFIG.
 */

import * as THREE from '../vendor/three.min.js';
import { CONFIG } from './config.js';
import { SeederRNG } from './random.js';

export class World {
  constructor(seed = 1) {
    this.rng = new SeederRNG(seed);
    this.group = new THREE.Group();
    this.roads = [];
    this.spawnPoints = [];
    this.buildCity();
  }

  createWindowTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    
    // Base wall tone
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, 128, 128);

    // Lit windows (golden hour warm reflection)
    ctx.fillStyle = '#fde047';
    for (let x = 12; x < 116; x += 22) {
      for (let y = 14; y < 114; y += 28) {
        if (this.rng.chance(0.75)) {
          ctx.fillRect(x, y, 10, 16);
        }
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  buildCity() {
    const { blocksX, blocksZ, blockSize, roadWidth } = CONFIG.world;
    const totalWidth = blocksX * blockSize;
    const totalDepth = blocksZ * blockSize;

    // Materials
    const roadMaterial = new THREE.MeshStandardMaterial({ color: 0x52525b, roughness: 0.85 });
    const sidewalkMaterial = new THREE.MeshStandardMaterial({ color: 0x71717a, roughness: 0.9 });
    
    const windowTex = this.createWindowTexture();
    windowTex.repeat.set(2, 8);
    const buildingBaseMaterial = new THREE.MeshStandardMaterial({ map: windowTex, roughness: 0.4 });
    
    const beachMaterial = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.95 });
    const oceanMaterial = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.15, metalness: 0.2 });
    const terrainMaterial = new THREE.MeshStandardMaterial({ color: 0x3f6212, roughness: 0.9 });

    // 1. Ocean on the West edge (-X)
    const oceanGeo = new THREE.PlaneGeometry(800, totalDepth + 600);
    const ocean = new THREE.Mesh(oceanGeo, oceanMaterial);
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.set(-totalWidth / 2 - 420, -0.2, 0);
    this.group.add(ocean);

    // 2. Beach along the West edge
    const beachGeo = new THREE.PlaneGeometry(140, totalDepth + 300);
    const beach = new THREE.Mesh(beachGeo, beachMaterial);
    beach.rotation.x = -Math.PI / 2;
    beach.position.set(-totalWidth / 2 - 70, 0.05, 0);
    this.group.add(beach);

    // 3. Main Ground Terrain
    const groundGeo = new THREE.PlaneGeometry(totalWidth + 300, totalDepth + 300);
    const ground = new THREE.Mesh(groundGeo, terrainMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -0.05, 0);
    ground.receiveShadow = true;
    this.group.add(ground);

    // 4. Grid Blocks & Buildings
    const startX = -totalWidth / 2 + blockSize / 2;
    const startZ = -totalDepth / 2 + blockSize / 2;

    for (let x = 0; x < blocksX; x++) {
      for (let z = 0; z < blocksZ; z++) {
        const bx = startX + x * blockSize;
        const bz = startZ + z * blockSize;

        // District classification based on grid position
        // Center: Downtown skyscrapers; East: Port / Warehouses; West/Outer: Suburbs
        const distFromCenter = Math.abs(x - blocksX / 2) + Math.abs(z - blocksZ / 2);
        let bHeight = this.rng.range(12, 30);
        let bWidth = blockSize - roadWidth - 6;
        let bDepth = blockSize - roadWidth - 6;

        if (distFromCenter < 3) {
          // Downtown financial core (tall towers)
          bHeight = this.rng.range(65, 150);
          bWidth -= 8;
          bDepth -= 8;
        } else if (x === blocksX - 1) {
          // East Port area (industrial containers / warehouses)
          bHeight = this.rng.range(8, 20);
        } else {
          // Suburbs / Residential / Commercial
          bHeight = this.rng.range(15, 38);
        }

        // Building Mesh
        const buildingGeo = new THREE.BoxGeometry(bWidth, bHeight, bDepth);
        const mat = buildingBaseMaterial.clone();
        // Varied architectural tints
        mat.color.setHSL(this.rng.range(0.05, 0.18), 0.25, this.rng.range(0.35, 0.65));
        
        const building = new THREE.Mesh(buildingGeo, mat);
        building.position.set(bx, bHeight / 2, bz);
        building.castShadow = true;
        building.receiveShadow = true;
        this.group.add(building);

        // Sidewalk border around block
        const swWidth = bWidth + 6;
        const swDepth = bDepth + 6;
        const sidewalkGeo = new THREE.BoxGeometry(swWidth, 0.35, swDepth);
        const sidewalk = new THREE.Mesh(sidewalkGeo, sidewalkMaterial);
        sidewalk.position.set(bx, 0.175, bz);
        sidewalk.receiveShadow = true;
        this.group.add(sidewalk);

        // Palm trees along beach avenue and select blocks
        if (x === 0 || x === 1 || this.rng.chance(0.25)) {
          this.createPalmTree(bx - bWidth / 2 - 4, bz);
        }

        // Port shipping containers if in east district
        if (x === blocksX - 1 && this.rng.chance(0.6)) {
          this.createShippingContainer(bx + 10, bz);
        }
      }
    }

    // 5. Road Network (Vertical and Horizontal Grids)
    for (let i = 0; i <= blocksX; i++) {
      const rx = -totalWidth / 2 + i * blockSize - blockSize / 2 + roadWidth / 2;
      const rGeo = new THREE.PlaneGeometry(roadWidth, totalDepth + 50);
      const road = new THREE.Mesh(rGeo, roadMaterial);
      road.rotation.x = -Math.PI / 2;
      road.position.set(rx, 0.2, 0);
      road.receiveShadow = true;
      this.group.add(road);

      this.roads.push({
        type: 'vertical',
        x: rx,
        zStart: -totalDepth / 2 - 25,
        zEnd: totalDepth / 2 + 25
      });
    }

    for (let j = 0; j <= blocksZ; j++) {
      const rz = -totalDepth / 2 + j * blockSize - blockSize / 2 + roadWidth / 2;
      const rGeo = new THREE.PlaneGeometry(totalWidth + 50, roadWidth);
      const road = new THREE.Mesh(rGeo, roadMaterial);
      road.rotation.x = -Math.PI / 2;
      road.position.set(0, 0.2, rz);
      road.receiveShadow = true;
      this.group.add(road);

      this.roads.push({
        type: 'horizontal',
        z: rz,
        xStart: -totalWidth / 2 - 25,
        xEnd: totalWidth / 2 + 25
      });
    }

    // Add road markings (pale centre dashes)
    const dashMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    for (const r of this.roads) {
      if (r.type === 'vertical') {
        for (let z = r.zStart; z < r.zEnd; z += 8) {
          const dashGeo = new THREE.PlaneGeometry(0.3, 3);
          const dash = new THREE.Mesh(dashGeo, dashMat);
          dash.rotation.x = -Math.PI / 2;
          dash.position.set(r.x, 0.22, z);
          this.group.add(dash);
        }
      } else {
        for (let x = r.xStart; x < r.xEnd; x += 8) {
          const dashGeo = new THREE.PlaneGeometry(3, 0.3);
          const dash = new THREE.Mesh(dashGeo, dashMat);
          dash.rotation.x = -Math.PI / 2;
          dash.position.set(x, 0.22, r.z);
          this.group.add(dash);
        }
      }
    }

    // 6. Default spawn points
    this.spawnPoints.push(
      { x: 0, y: 0.3, z: 0 },
      { x: 35, y: 0.3, z: 35 },
      { x: -35, y: 0.3, z: -35 }
    );
  }

  createPalmTree(x, z) {
    const trunkGeo = new THREE.CylinderGeometry(0.35, 0.55, 9, 6);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.set(x, 4.5, z);
    trunk.castShadow = true;
    this.group.add(trunk);

    // Fronds cluster
    for (let i = 0; i < 6; i++) {
      const frondGeo = new THREE.BoxGeometry(4.5, 0.12, 1.4);
      const frondMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.7 });
      const frond = new THREE.Mesh(frondGeo, frondMat);
      const angle = (i / 6) * Math.PI * 2;
      frond.position.set(x + Math.cos(angle) * 1.8, 8.5, z + Math.sin(angle) * 1.8);
      frond.rotation.y = angle;
      frond.rotation.z = 0.35;
      this.group.add(frond);
    }
  }

  createShippingContainer(x, z) {
    const colors = [0xef4444, 0x3b82f6, 0xeab308, 0x10b981];
    const color = colors[Math.floor(this.rng.next() * colors.length)];
    const containerGeo = new THREE.BoxGeometry(10, 4, 4.5);
    const containerMat = new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.4 });
    const container = new THREE.Mesh(containerGeo, containerMat);
    container.position.set(x, 2, z);
    container.castShadow = true;
    container.receiveShadow = true;
    this.group.add(container);
  }
}
