---
name: threejs-webgl
description: High-performance 3D graphics and WebGL rendering with Three.js and React Three Fiber, featuring InstancedMesh optimization, PBR lighting, and strict resource disposal.
---

# Three.js & WebGL 3D Graphics Standards

The `threejs-webgl` skill governs all interactive 3D visualizations, spatial interface representations, and WebGL particle backgrounds in SupportGeniusAI. Every 3D component must deliver steady 60–120 FPS performance, integrate physically based rendering (PBR), and enforce strict GPU memory reclamation.

---

## 1. Scene Scaffolding, Camera & PBR Lighting Setup

A production WebGL canvas must balance realistic physics-based lighting with strict frame-rate targets.

### Standard Scene Architecture (Three.js Vanilla & R3F Equivalent)

```javascript
import * as THREE from 'three';

export function initializeScene(canvasElement) {
  // 1. Renderer with High Dynamic Range & Color Management
  const renderer = new THREE.WebGLRenderer({
    canvas: canvasElement,
    antialias: window.devicePixelRatio < 2, // Enable MSAA only for low-DPI displays
    alpha: true,
    powerPreference: 'high-performance',
    stencil: false,
    depth: true,
  });
  
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap pixel ratio to 2x
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  // 2. Scene & PBR Lighting Scaffolding
  const scene = new THREE.Scene();

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambientLight);

  const keyLight = new THREE.DirectionalLight(0xffedd5, 2.2); // Warm key light
  keyLight.position.set(5, 10, 7.5);
  keyLight.castShadow = false; // Disable heavy shadow maps unless strictly required
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0x38bdf8, 1.2); // Cool cyan fill light
  fillLight.position.set(-5, -5, -5);
  scene.add(fillLight);

  // 3. Perspective Camera Setup
  const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(0, 0, 10);

  return { renderer, scene, camera };
}
```

---

## 2. Mass Particle Systems via `InstancedMesh`

Individual `THREE.Mesh` instances overload the CPU with excessive draw calls. Any multi-particle visual, neural node network, or floating data grid exceeding 50 elements **must** use `THREE.InstancedMesh`.

### High-Performance Instanced Field (10,000 Nodes in a Single Draw Call)

```javascript
import * as THREE from 'three';

export function createParticleField(count = 10000) {
  const geometry = new THREE.SphereGeometry(0.04, 8, 8); // Low-poly base primitive
  const material = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.3,
    metalness: 0.8,
  });

  const instancedMesh = new THREE.InstancedMesh(geometry, material, count);
  instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

  const dummy = new THREE.Object3D();
  const particleData = [];

  // Seed spatial coordinates and velocity vectors
  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * 20;
    const y = (Math.random() - 0.5) * 20;
    const z = (Math.random() - 0.5) * 20;

    dummy.position.set(x, y, z);
    dummy.updateMatrix();
    instancedMesh.setMatrixAt(i, dummy.matrix);

    particleData.push({
      x, y, z,
      vx: (Math.random() - 0.5) * 0.005,
      vy: (Math.random() - 0.5) * 0.005,
      vz: (Math.random() - 0.5) * 0.005,
    });
  }

  instancedMesh.instanceMatrix.needsUpdate = true;

  // Animation update loop handler
  function update() {
    for (let i = 0; i < count; i++) {
      const data = particleData[i];
      data.x += data.vx;
      data.y += data.vy;
      data.z += data.vz;

      // Boundary reflection
      if (Math.abs(data.x) > 10) data.vx *= -1;
      if (Math.abs(data.y) > 10) data.vy *= -1;
      if (Math.abs(data.z) > 10) data.vz *= -1;

      dummy.position.set(data.x, data.y, data.z);
      dummy.updateMatrix();
      instancedMesh.setMatrixAt(i, dummy.matrix);
    }
    instancedMesh.instanceMatrix.needsUpdate = true;
  }

  return { instancedMesh, update };
}
```

---

## 3. Mouse-Coordinate Parallax Linking

Interactive 3D scenes must respond subtly to pointer movements via smoothed lerp calculations rather than raw jarring updates.

```javascript
export function setupParallaxCamera(camera) {
  const target = { x: 0, y: 0 };
  const current = { x: 0, y: 0 };
  const ease = 0.05; // Smooth interpolation coefficient

  function onPointerMove(event) {
    // Normalize coordinates between -1 and +1
    target.x = (event.clientX / window.innerWidth) * 2 - 1;
    target.y = -(event.clientY / window.innerHeight) * 2 + 1;
  }

  window.addEventListener('pointermove', onPointerMove, { passive: true });

  function tick() {
    current.x += (target.x - current.x) * ease;
    current.y += (target.y - current.y) * ease;

    // Apply bounded orbital parallax
    camera.position.x = current.x * 1.5;
    camera.position.y = current.y * 1.0;
    camera.lookAt(0, 0, 0);
  }

  function cleanup() {
    window.removeEventListener('pointermove', onPointerMove);
  }

  return { tick, cleanup };
}
```

---

## 4. Mandatory WebGL Resource Cleanup Protocol

Failure to dispose of geometries, textures, materials, and renderers in WebGL causes catastrophic VRAM leaks that crash browser tabs.

### Comprehensive Disposal Utility

```javascript
export function disposeScene(scene, renderer) {
  // 1. Recursive Scene Graph Traversal
  scene.traverse((object) => {
    if (!object.isMesh && !object.isInstancedMesh && !object.isPoints) return;

    // Dispose Geometries
    if (object.geometry) {
      object.geometry.dispose();
    }

    // Dispose Materials & Attached Texture Buffers
    if (object.material) {
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((mat) => {
        // Dispose all textures attached to the material
        Object.keys(mat).forEach((prop) => {
          if (mat[prop] && typeof mat[prop].dispose === 'function') {
            mat[prop].dispose();
          }
        });
        mat.dispose();
      });
    }
  });

  // 2. Clear Scene
  scene.clear();

  // 3. Renderer Disposal & WebGL Context Release
  if (renderer) {
    renderer.dispose();
    renderer.forceContextLoss();
    if (renderer.domElement && renderer.domElement.parentNode) {
      renderer.domElement.parentNode.removeChild(renderer.domElement);
    }
  }
}
```

---

## 5. Pre-Flight WebGL Checklist

- [ ] High-DPI screens capped to `Math.min(window.devicePixelRatio, 2)`.
- [ ] Tone mapping set to `ACESFilmicToneMapping` with `SRGBColorSpace`.
- [ ] Particle systems exceeding 50 elements use `InstancedMesh`.
- [ ] Pointer parallax uses normalized `(-1 to 1)` coordinates with smooth lerping.
- [ ] All unmount / route changes invoke `disposeScene()` to purge geometries, textures, and context.
