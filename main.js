import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const canvas = document.getElementById("scene");
const loaderStatus = document.getElementById("loader-status");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

try {
  init();
} catch (error) {
  console.error(error);
  document.body.classList.add("is-error");
  loaderStatus.textContent = "This browser could not start the WebGL scene.";
}

function init() {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x06070b);
  scene.fog = new THREE.FogExp2(0x06070b, 0.024);

  const camera = new THREE.PerspectiveCamera(
    40,
    window.innerWidth / window.innerHeight,
    0.1,
    120
  );
  camera.position.set(0.6, 1, 10);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.055;
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.rotateSpeed = 0.45;
  controls.minPolarAngle = Math.PI * 0.24;
  controls.maxPolarAngle = Math.PI * 0.76;

  controls.addEventListener("start", () =>
    document.body.classList.add("is-dragging")
  );
  controls.addEventListener("end", () =>
    document.body.classList.remove("is-dragging")
  );

  // Soft studio reflections, generated in-browser (no HDR file needed).
  scene.environment = makeEnvironment(renderer);
  scene.environmentIntensity = 0.95;

  const hemi = new THREE.HemisphereLight(0xbfd2ff, 0x05060a, 0.32);
  scene.add(hemi);

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.6);
  keyLight.position.set(6, 8, 6);
  scene.add(keyLight);

  const fillLight = new THREE.PointLight(0xdfe9ff, 35, 30, 2);
  fillLight.position.set(1.5, 0.5, 7);
  scene.add(fillLight);

  const mintLight = new THREE.PointLight(0x7dffe0, 90, 30, 2);
  mintLight.position.set(-5, 3, 4.5);
  scene.add(mintLight);

  const violetLight = new THREE.PointLight(0x8b76ff, 110, 30, 2);
  violetLight.position.set(4.5, -3.5, -3);
  scene.add(violetLight);

  const lowerFill = new THREE.PointLight(0xa9c4ff, 45, 32, 2);
  lowerFill.position.set(-4, -4.5, 3.5);
  scene.add(lowerFill);

  const pointer = new THREE.Vector2();

  const glowTexture = makeGlowTexture();

  const world = new THREE.Group();
  world.rotation.y = -0.35;
  scene.add(world);

  // ---- faceted gem ----
  const gemGeometry = new THREE.IcosahedronGeometry(1.6, 0);
  const gemMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x1b2742,
    emissive: 0x050a17,
    metalness: 0.55,
    roughness: 0.24,
    flatShading: true,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    iridescence: 0.65,
    iridescenceIOR: 2,
    iridescenceThicknessRange: [100, 620],
    envMapIntensity: 1.8,
  });
  const gem = new THREE.Mesh(gemGeometry, gemMaterial);
  world.add(gem);

  const edgeMaterial = new THREE.LineBasicMaterial({
    color: 0xa8ffe9,
    transparent: true,
    opacity: 0.55,
  });
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(gemGeometry),
    edgeMaterial
  );
  gem.add(edges);

  // ---- orbital rings ----
  const rings = new THREE.Group();
  world.add(rings);

  const ringA = makeRing(2.5, 0x9db2ff, 0.5);
  ringA.rotation.set(Math.PI / 2 + 0.34, 0.12, 0.18);
  rings.add(ringA);

  const ringB = makeRing(2.95, 0x9dffe6, 0.28);
  ringB.rotation.set(Math.PI / 2 - 0.48, -0.38, 0.85);
  rings.add(ringB);

  const satellite = new THREE.Mesh(
    new THREE.SphereGeometry(0.045, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0xc8fff2, toneMapped: false })
  );
  satellite.position.set(2.5, 0, 0);
  ringA.add(satellite);

  // ---- light drift ----
  const particles = makeParticles(1500, glowTexture);
  world.add(particles);

  // ---- atmospheric halo behind the gem ----
  const halo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture,
      color: 0x5e7bff,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  halo.scale.set(9, 9, 1);
  halo.position.z = -1;
  halo.renderOrder = -1;
  world.add(halo);

  window.addEventListener("resize", layout);
  window.addEventListener("pointermove", (event) => {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (event.clientY / window.innerHeight) * 2 - 1;
  });

  layout();
  renderer.compile(scene, camera);
  renderer.render(scene, camera);
  document.body.classList.remove("is-error");
  document.body.classList.add("is-ready");

  const clock = new THREE.Clock();
  let elapsed = 0;

  renderer.setAnimationLoop(() => {
    const delta = Math.min(clock.getDelta(), 0.05);
    elapsed += delta;

    if (!reduceMotion) {
      world.rotation.y += delta * 0.05;
      gem.rotation.y += delta * 0.16;
      gem.rotation.x = Math.sin(elapsed * 0.21) * 0.1;
      gem.rotation.z = Math.sin(elapsed * 0.13) * 0.05;
      rings.rotation.y = Math.sin(elapsed * 0.12) * 0.06;
      world.position.y = Math.sin(elapsed * 0.34) * 0.05;
      satellite.position.set(
        Math.cos(elapsed * 0.45) * 2.5,
        Math.sin(elapsed * 0.45) * 2.5,
        0
      );
      halo.material.opacity = 0.28 + Math.sin(elapsed * 0.4) * 0.035;
      mintLight.position.x = -5 + pointer.x * 1.8;
      mintLight.position.y = 3 - pointer.y * 1.4;
    }

    controls.update();
    renderer.render(scene, camera);
  });

  function layout() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const wide = width >= 900;
    const compact = !wide && height < 620;
    const aspect = width / height;
    const fov = THREE.MathUtils.degToRad(camera.fov);

    const fitHeight = wide ? 7.4 : compact ? 7.6 : 6.6;
    const fitWidth = wide ? 6.6 : compact ? 7.2 : 6;
    const distance = Math.max(
      fitHeight / 2 / Math.tan(fov / 2),
      fitWidth / 2 / (Math.tan(fov / 2) * aspect)
    );

    controls.target.set(
      wide ? -1.7 : 0,
      wide ? 0.1 : compact ? -1.8 : -1.35,
      0
    );
    const direction = new THREE.Vector3(0.12, 0.1, 1).normalize();
    camera.position
      .copy(controls.target)
      .addScaledVector(direction, distance);

    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height, false);
    controls.update();

    if (reduceMotion) {
      // Keep the scene composed correctly on the first frame.
      renderer.render(scene, camera);
    }
  }
}

function makeEnvironment(renderer) {
  const environmentScene = new THREE.Scene();

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(13, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        topColor: { value: new THREE.Color(0x1a2a4d) },
        bottomColor: { value: new THREE.Color(0x010206) },
      },
      vertexShader: `
        varying vec3 vDirection;
        void main() {
          vDirection = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vDirection;
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        void main() {
          float h = smoothstep(-0.55, 0.75, vDirection.y);
          gl_FragColor = vec4(mix(bottomColor, topColor, h), 1.0);
        }
      `,
    })
  );
  environmentScene.add(dome);

  function addPanel(color, intensity, width, height, position, rotation) {
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color).multiplyScalar(intensity),
      side: THREE.DoubleSide,
    });
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
    panel.position.set(...position);
    panel.rotation.set(...rotation);
    environmentScene.add(panel);
  }

  addPanel(0xffffff, 9, 7, 3, [0, 9, 0], [Math.PI / 2, 0, 0]);
  addPanel(0x6affd8, 7, 6, 9, [-9, 1.5, 0], [0, Math.PI / 2, 0]);
  addPanel(0x8d7bff, 7, 7, 9, [9, 1, -1], [0, -Math.PI / 2, 0]);
  addPanel(0xff9ad6, 3.5, 8, 6, [0, 2, -10], [0, 0, 0]);
  addPanel(0xffe4b8, 2.5, 5, 4, [4, 4, -8], [0, -0.5, 0]);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const texture = pmrem.fromScene(environmentScene, 0.035).texture;
  pmrem.dispose();

  environmentScene.traverse((child) => {
    if (child.isMesh) {
      child.geometry.dispose();
      child.material.dispose();
    }
  });

  return texture;
}

function makeRing(radius, color, opacity) {
  const geometry = new THREE.TorusGeometry(radius, 0.0045, 6, 260);
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  return new THREE.Mesh(geometry, material);
}

function makeParticles(count, texture) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const palette = [
    new THREE.Color(0x8efce4),
    new THREE.Color(0x93a7ff),
    new THREE.Color(0xd3b3ff),
    new THREE.Color(0xffffff),
  ];

  for (let i = 0; i < count; i += 1) {
    const radius = 3.3 + Math.pow(Math.random(), 0.62) * 7.8;
    const theta = Math.random() * Math.PI * 2;
    const z = Math.random() * 2 - 1;
    const r = Math.sqrt(1 - z * z);

    positions[i * 3] = radius * r * Math.cos(theta);
    positions[i * 3 + 1] = radius * z;
    positions[i * 3 + 2] = radius * r * Math.sin(theta);

    const color = palette[Math.floor(Math.random() * palette.length)];
    const brightness = 0.35 + Math.random() * 0.65;
    colors[i * 3] = color.r * brightness;
    colors[i * 3 + 1] = color.g * brightness;
    colors[i * 3 + 2] = color.b * brightness;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.08,
    map: texture,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });

  return new THREE.Points(geometry, material);
}

function makeGlowTexture() {
  const size = 128;
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = size;
  textureCanvas.height = size;
  const context = textureCanvas.getContext("2d");
  const gradient = context.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2
  );
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.18, "rgba(255,255,255,0.55)");
  gradient.addColorStop(0.5, "rgba(255,255,255,0.12)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
