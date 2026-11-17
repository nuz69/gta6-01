import * as THREE from '../vendor/three.min.js';

export class RenderSystem {
  constructor() {
    this.container = document.body;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xfdba74); // golden hour sunset tint
    this.scene.fog = new THREE.FogExp2(0xfca5a5, 0.003);

    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 50, 100);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    document.getElementById('canvas-container').appendChild(this.renderer.domElement);

    this.setupLighting();
    this.setupSky();

    window.addEventListener('resize', () => this.onWindowResize());
  }

  setupLighting() {
    // Ambient warm fill
    const ambient = new THREE.AmbientLight(0xffedd5, 0.6);
    this.scene.add(ambient);

    // Warm low sun (directional light for golden hour long shadows)
    const sun = new THREE.DirectionalLight(0xff781f, 2.5);
    sun.position.set(-150, 80, 100);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 500;
    const d = 200;
    sun.shadow.camera.left = -d;
    sun.shadow.camera.right = d;
    sun.shadow.camera.top = d;
    sun.shadow.camera.bottom = -d;
    sun.shadow.bias = -0.0005;
    this.scene.add(sun);
  }

  setupSky() {
    // Large hemisphere / dome with gradient or sunset atmosphere
    const skyGeo = new THREE.SphereGeometry(800, 32, 15);
    const skyMat = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x1e1b4b) }, // dusky blue
        bottomColor: { value: new THREE.Color(0xf97316) }, // warm orange
        offset: { value: 33 },
        exponent: { value: 0.6 }
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
    const sky = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(sky);
  }

  snapCamera(pos, target) {
    this.camera.position.copy(pos);
    this.camera.lookAt(target);
  }

  updateCamera(targetPos, targetRot, cameraMode, dt) {
    const dist = cameraMode === 1 ? 20 : 12;
    const height = cameraMode === 1 ? 7 : 4;

    const offsetX = -Math.sin(targetRot) * dist;
    const offsetZ = -Math.cos(targetRot) * dist;
    const desiredPos = new THREE.Vector3(
      targetPos.x + offsetX,
      targetPos.y + height,
      targetPos.z + offsetZ
    );

    this.camera.position.lerp(desiredPos, Math.min(1, 10 * dt));
    const lookTarget = targetPos.clone().add(new THREE.Vector3(0, 1.5, 0));
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
