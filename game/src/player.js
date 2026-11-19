import * as THREE from '../vendor/three.min.js';
import { CONFIG } from './config.js';

export class Player {
  constructor(envWorld) {
    this.world = envWorld;
    this.group = new THREE.Group();
    this.position = new THREE.Vector3(0, 0, 0);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.rotationY = 0;

    this.health = 100;
    this.maxHealth = 100;
    this.invulnCooldown = 0;
    this.isDead = false;

    this.grounded = true;
    this.running = false;
    this.punching = false;
    this.punchTimer = 0;

    this.strideCycle = 0;
    this.collisionRadius = 0.75;

    this._constructRexMesh();
  }

  _constructRexMesh() {
    // Rex Dalton protagonist character model (original geometry composition)
    const jacketMat = new THREE.MeshStandardMaterial({ color: 0xe65c00, roughness: 0.6 }); // vibrant neon orange jacket
    const trousersMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.8 }); // dark slate pants
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.5 }); // warm skin tone
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.9 });

    // Torso
    const torsoGeo = new THREE.BoxGeometry(0.75, 0.95, 0.35);
    this.torsoMesh = new THREE.Mesh(torsoGeo, jacketMat);
    this.torsoMesh.position.set(0, 1.15, 0);
    this.torsoMesh.castShadow = true;
    this.group.add(this.torsoMesh);

    // Head
    const headGeo = new THREE.BoxGeometry(0.45, 0.45, 0.45);
    this.headMesh = new THREE.Mesh(headGeo, skinMat);
    this.headMesh.position.set(0, 1.80, 0);
    this.headMesh.castShadow = true;
    this.group.add(this.headMesh);

    // Arms
    const armGeo = new THREE.BoxGeometry(0.22, 0.75, 0.22);
    this.leftArm = new THREE.Mesh(armGeo, jacketMat);
    this.leftArm.position.set(-0.52, 1.15, 0);
    this.group.add(this.leftArm);

    this.rightArm = new THREE.Mesh(armGeo, jacketMat);
    this.rightArm.position.set(0.52, 1.15, 0);
    this.group.add(this.rightArm);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.28, 0.85, 0.28);
    this.leftLeg = new THREE.Mesh(legGeo, trousersMat);
    this.leftLeg.position.set(-0.22, 0.42, 0);
    this.group.add(this.leftLeg);

    this.rightLeg = new THREE.Mesh(legGeo, trousersMat);
    this.rightLeg.position.set(0.22, 0.42, 0);
    this.group.add(this.rightLeg);

    this.group.position.copy(this.position);
  }

  update(dt, inputState, activeCamera) {
    if (this.invulnCooldown > 0) {
      this.invulnCooldown -= dt;
    }

    // Handle punch animation decay
    if (this.punching) {
      this.punchTimer -= dt;
      this.rightArm.rotation.x = -Math.PI * 0.5 + Math.sin(this.punchTimer * 18) * 0.6;
      if (this.punchTimer <= 0) {
        this.punching = false;
      }
    } else {
      this.rightArm.rotation.x = 0;
    }

    // Determine movement direction vector aligned with camera orientation
    const movementDir = new THREE.Vector3();
    const forwardCamVec = new THREE.Vector3();
    activeCamera.getWorldDirection(forwardCamVec);
    forwardCamVec.y = 0;
    forwardCamVec.normalize();

    const rightCamVec = new THREE.Vector3(-forwardCamVec.z, 0, forwardCamVec.x);

    const keys = inputState.keys || {};
    if (keys['KeyW'] || keys['ArrowUp']) movementDir.add(forwardCamVec);
    if (keys['KeyS'] || keys['ArrowDown']) movementDir.sub(forwardCamVec);
    if (keys['KeyD'] || keys['ArrowRight']) movementDir.add(rightCamVec);
    if (keys['KeyA'] || keys['ArrowLeft']) movementDir.sub(rightCamVec);

    this.running = !!(keys['ShiftLeft'] || keys['ShiftRight']);
    const activeSpeed = this.running ? CONFIG.player.runSpeed : CONFIG.player.walkSpeed;

    if (movementDir.lengthSq() > 0) {
      movementDir.normalize();
      const targetAngle = Math.atan2(movementDir.x, movementDir.z);
      
      // Interpolate heading rotation smoothly
      let angleDelta = targetAngle - this.rotationY;
      while (angleDelta < -Math.PI) angleDelta += Math.PI * 2;
      while (angleDelta > Math.PI) angleDelta -= Math.PI * 2;
      this.rotationY += angleDelta * Math.min(1, (CONFIG.player.turnSpeed || 10) * dt);
      this.group.rotation.y = this.rotationY;

      this.velocity.x = movementDir.x * activeSpeed;
      this.velocity.z = movementDir.z * activeSpeed;

      // Leg & arm stride animation cycle
      this.strideCycle += dt * (this.running ? 15 : 10);
      const strideVal = Math.sin(this.strideCycle) * 0.55;
      this.leftLeg.rotation.x = strideVal;
      this.rightLeg.rotation.x = -strideVal;
      if (!this.punching) {
        this.leftArm.rotation.x = -strideVal;
      }
    } else {
      // Friction damping when idle
      this.velocity.x *= 0.75;
      this.velocity.z *= 0.75;
      this.leftLeg.rotation.x = 0;
      this.rightLeg.rotation.x = 0;
      if (!this.punching) {
        this.leftArm.rotation.x = 0;
      }
    }

    // Jump & gravity dynamics
    if (this.grounded && (keys['Space'] || (inputState.edges && inputState.edges['Space']))) {
      this.velocity.y = 7.5;
      this.grounded = false;
    }

    this.velocity.y -= 22.0 * dt; // gravity pull

    // Calculate proposed next position
    const candidateX = this.position.x + this.velocity.x * dt;
    const candidateZ = this.position.z + this.velocity.z * dt;
    const candidateY = this.position.y + this.velocity.y * dt;

    // Boundary constraints based on world configuration
    const worldBounds = CONFIG.world;
    const limitMax = (worldBounds.blocksX * worldBounds.blockSize) / 2 - 3;
    
    if (candidateX >= -limitMax && candidateX <= limitMax) {
      this.position.x = candidateX;
    }
    if (candidateZ >= -limitMax && candidateZ <= limitMax) {
      this.position.z = candidateZ;
    }

    // Floor collision detection
    if (candidateY <= 0.3) {
      this.position.y = 0.3;
      this.velocity.y = 0;
      this.grounded = true;
    } else {
      this.position.y = candidateY;
    }

    this.group.position.copy(this.position);
  }

  punch() {
    if (!this.punching) {
      this.punching = true;
      this.punchTimer = 0.35;
      return true;
    }
    return false;
  }

  takeDamage(amount) {
    if (this.invulnCooldown > 0) return;
    this.health = Math.max(0, this.health - amount);
    this.invulnCooldown = 1.0;
    if (this.health <= 0) {
      this.isDead = true;
    }
  }
}
