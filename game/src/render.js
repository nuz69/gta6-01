/**
 * Solmarina: Neon Heat - Render System
 * Manages Three.js scene, golden hour lighting, gradient sky shader, shadow mapping,
 * and camera rig (chase cam + instant snap).
 */

import * as THREE from '../vendor/three.min.js';

export class RenderSystem {
  constructor() {
    this.container = document.body;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xfdba74); // Golden hour sun-kissed background
    this.scene.fog = new THREE.FogExp2(0xfca5a5, 0.0028); // Warm sunset atmospheric haze

    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1500);
    this.camera.position.set(0, 40, 90);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    const canvasContainer = document.getElementById('canvas-container');
    if (canvasContainer) {
      canvasContainer.appendChild(this.renderer.domElement);
    } else {
      document.body.appendChild(this.renderer.domElement);
    }

    this.setupLighting();
    this.setupSky();

    window.addEventListener('resize', () => this.onWindowResize());
  }

  setupLighting() {
    // Soft ambient fill with warm orange/purple undertones
    const ambientLight = new THREE.AmbientLight(0xffedd5, 0.65);
    this.scene.add(ambientLight);

    // Warm low sun for dramatic golden-hour long shadows
    const sunLight = new THREE.DirectionalLight(0xff781f, 2.8);
    sunLight.position.set(-180, 95, 120);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 1.0;
    sunLight.shadow.camera.far = 600;
    
    const d = 220;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0004;
    this.scene.add(sunLight);

    // Secondary subtle fill light from opposite angle
    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.4);
    fillLight.position.set(150, 60, -100);
    this.scene.add(fillLight);
  }

  setupSky() {
    // Large dome with sunset gradient shader (dusky blue top to warm orange horizon)
    const skyGeometry = new THREE.SphereGeometry(900, 32, 16);
    const skyMaterial = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x1e1b4b) }, // Dusky night blue
        bottomColor: { value: new THREE.Color(0xf97316) }, // Sunset orange
        offset: { value: 35 },
        exponent: { value: 0.55 }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition + offset).y;
          gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
        }
      `,
      side: THREE.BackSide
    });

    const skyDome = new THREE.Mesh(skyGeometry, skyMaterial);
    this.scene.add(skyDome);
  }

  snapCamera(position, target) {
    this.camera.position.copy(position);
    this.camera.lookAt(target);
  }

  updateCamera(targetPosition, targetRotation, cameraMode, deltaTime) {
    // cameraMode 0: standard close chase, cameraMode 1: far chase
    const dist = cameraMode === 1 ? 22 : 13;
    const height = cameraMode === 1 ? 7.5 : 4.5;

    const offsetX = -Math.sin(targetRotation) * dist;
    const offsetZ = -Math.cos(targetRotation) * dist;
    const desiredPosition = new THREE.Vector3(
      targetPosition.x + offsetX,
      targetPosition.y + height,
      targetPosition.z + offsetZ
    );

    // Smooth lerp chase
    const lerpFactor = Math.min(1.0, 12.0 * deltaTime);
    this.camera.position.lerp(desiredPosition, lerpFactor);

    const lookTarget = targetPosition.clone().add(new THREE.Vector3(0, 1.6, 0));
    
    // Smooth camera lookAt interpolation for fluid cinematic feel
    const currentLook = new THREE.Vector3();
    this.camera.getWorldDirection(currentLook);
    this.camera.lookAt(lookTarget);
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
