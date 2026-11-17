import * as THREE from '../vendor/three.min.js';
import { CONFIG } from './config.js';

export class Player {
  constructor(world) {
    this.world = world;
    this.group = new THREE.Group();
    this.position = new THREE.Vector3(0, 0, 0);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.rotationY = 0;

    this.health = 100;
    this.maxHealth = 100;
    this.invulnTimer = 0;

    this.isGrounded = true;
    this.isRun = false;
    this.isPunching = false;
    this.punchTimer = 0;

    this.walkCycle = 0;
    this.radius = 0.8; // collision radius

    this.buildMesh();
  }

  buildMesh() {
    // Rex Dalton character model (geometry)
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xff781f, roughness: 0.7 }); // orange jacket
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 }); // dark trousers
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.6 }); // head/skin

    // Torso
    const torsoGeo = new THREE.BoxGeometry(0.8, 1.0, 0.4);
    this.torso = new THREE.Mesh(torsoGeo, bodyMat);
    this.torso.position.set(0, 1.2, 0);
    this.torso.castShadow = true;
    this.group.add(this.torso);

    // Head
    const headGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    this.head = new THREE.Mesh(headGeo, skinMat);
    this.head.position.set(0, 1.9, 0);
    this.head.castShadow = true;
    this.group.add(this.head);

    // Limbs
    const limbMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });
    const armGeo = new THREE.BoxGeometry(0.25, 0.8, 0.25);
    const legGeo = new THREE.BoxGeometry(0.3, 0.9, 0.3);

    this.leftArm = new THREE.Mesh(armGeo, bodyMat);
    this.leftArm.position.set(-0.55, 1.2, 0);
    this.group.add(this.leftArm);

    this.rightArm = new THREE.Mesh(armGeo, bodyMat);
    this.rightArm.position.set(0.55, 1.2, 0);
    this.group.add(this.rightArm);

    this.leftLeg = new THREE.Mesh(legGeo, pantsMat);
    this.leftLeg.position.set(-0.25, 0.45, 0);
    this.group.add(this.leftLeg);

    this.rightLeg = new THREE.Mesh(legGeo, pantsMat);
    this.rightLeg.position.set(0.25, 0.45, 0);
    this.group.add(this.rightLeg);

    this.group.position.copy(this.position);
  }

  update(dt, input, camera) {
    if (this.invulnTimer > 0) {
      this.invulnTimer -= dt;
    }

    // Punch timer & animation
    if (this.isPunching) {
      this.punchTimer -= dt;
      this.rightArm.rotation.x = -Math.PI / 2 + Math.sin(this.punchTimer * 15) * 0.5;
      if (this.punchTimer <= 0) {
        this.isPunching = false;
      }
    } else {
      this.rightArm.rotation.x = 0;
    }

    // Movement input relative to camera
    const moveDir = new THREE.Vector3();
    const camForward = new THREE.Vector3();
    camera.getWorldDirection(camForward);
    camForward.y = 0;
    camForward.normalize();

    const camRight = new THREE.Vector3(-camForward.z, 0, camForward.x);

    if (input.keys['KeyW'] || input.keys['ArrowUp']) moveDir.add(camForward);
    if (input.keys['KeyS'] || input.keys['ArrowDown']) moveDir.sub(camForward);
    if (input.keys['KeyD'] || input.keys['ArrowRight']) moveDir.add(camRight);
    if (input.keys['KeyA'] || input.keys['ArrowLeft']) moveDir.sub(camRight);

    this.isRun = input.keys['ShiftLeft'] || input.keys['ShiftRight'];
    const speed = this.isRun ? CONFIG.player.runSpeed : CONFIG.player.walkSpeed;

    if (moveDir.lengthSq() > 0) {
      moveDir.normalize();
      const targetRotation = Math.atan2(moveDir.x, moveDir.z);
      // Smooth rotation towards move direction
      let diff = targetRotation - this.rotationY;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      this.rotationY += diff * Math.min(1, CONFIG.player.turnSpeed * dt);
      this.group.rotation.y = this.rotationY;

      this.velocity.x = moveDir.x * speed;
      this.velocity.z = moveDir.z * speed;

      // Walk animation (limb swinging)
      this.walkCycle += dt * (this.isRun ? 14 : 9);
      const swing = Math.sin(this.walkCycle) * 0.5;
      this.leftLeg.rotation.x = swing;
      this.rightLeg.rotation.x = -swing;
      if (!this.isPunching) {
        this.leftArm.rotation.x = -swing;
      }
    } else {
      this.velocity.x *= 0.8;
      this.velocity.z *= 0.8;
      this.leftLeg.rotation.x = 0;
      this.rightLeg.rotation.x = 0;
      if (!this.isPunching) {
        this.leftArm.rotation.x = 0;
      }
    }

    // Jump & Gravity
    if (this.isGrounded && (input.keys['Space'] || input.edges['Space'])) {
      this.velocity.y = 7.0;
      this.isGrounded = false;
    }

    this.velocity.y -= 20.0 * dt; // gravity

    // Apply movement with collision sliding against buildings
    const nextX = this.position.x + this.velocity.x * dt;
    const nextZ = this.position.z + this.velocity.z * dt;
    const nextY = this.position.y + this.velocity.y * dt;

    // Check collisions
    this.position.x = this.resolveCollisionX(nextX, this.position.z);
    this.position.z = this.resolveCollisionZ(this.position.x, nextZ);

    // Ground collision
    if (nextY <= 0.3) {
      this.position.y = 0.3;
      this.velocity.y = 0;
      this.isGrounded = true;
    } else {
      this.position.y = nextY;
    }

    this.group.position.copy(this.position);
  }

  resolveCollisionX(targetX, currentZ) {
    // Check city bounds
    const { blocksX, blocksZ, blockSize } = CONFIG.world;
    const maxBound = (blocksX * blockSize) / 2 - 2;
    if (targetX < -maxBound || targetX > maxBound) {
      return this.position.x;
    }
    // Check building collisions (approximate based on world grid blocks)
    // For simplicity, buildings are spaced by blockSize
    return targetX;
  }

  resolveCollisionZ(currentX, targetZ) {
    const { blocksX, blocksZ, blockSize } = CONFIG.world;
    const maxBound = (blocksZ * blockSize) / 2 - 2;
    if (targetZ < -maxBound || targetZ > maxBound) {
      return this.position.z;
    }
    return targetZ;
  }

  punch() {
    if (!this.isPunching) {
      this.isPunching = true;
      this.punchTimer = 0.4;
      return true;
    }
    return false;
  }

  takeDamage(amount) {
    if (this.invulnTimer > 0) return;
    this.health = Math.max(0, this.health - amount);
    this.invulnTimer = 1.0;
    if (this.health <= 0) {
      this.isDead = true;
    }
  }
}
