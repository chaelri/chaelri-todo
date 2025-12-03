// src/components/VoxelBackground.tsx
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

/**
 * VoxelBackground.tsx
 *
 * Full-featured voxel background with:
 * - Overworld / Nether / The End + other biomes
 * - Instanced terrain
 * - Clouds, water, animals, particles
 * - Sun/moon, day-night cycle
 * - Biome selector UI and performance toggles
 *
 * Usage:
 * <VoxelBackground darkMode={darkMode} />
 *
 * Notes:
 * - Requires `three` (npm i three)
 * - Recommended: install @types/three for TS (npm i -D @types/three)
 *
 * Tuning knobs are near the top of the file.
 */

/* ===========================
   TUNABLE CONSTANTS
   ===========================
   Lower GRID_W / GRID_D / MAX_H to improve perf.
*/
const GRID_W_BASE = 100; // base width (will scale with screen)
const GRID_D = 40; // depth rows
const MAX_H = 8; // max height
const BLOCK = 1.0; // cube size
const CAMERA_DIST = 60;
const DAY_CYCLE_MS = 60_000; // 1 minute full cycle (adjust)
const MAX_INSTANCES_SAFE = 18000; // guard for instanced buffers
const MAX_PARTICLES = 200;
const MAX_ANIMALS = 20;

type BiomeKey =
  | "overworld"
  | "desert"
  | "snow"
  | "jungle"
  | "ocean"
  | "nether"
  | "the_end";

const BIOMES: BiomeKey[] = [
  "overworld",
  "desert",
  "snow",
  "jungle",
  "ocean",
  "nether",
  "the_end",
];

const PALETTES: Record<
  BiomeKey,
  { top: number; soil: number; rock: number; water?: number; fog?: number }
> = {
  overworld: {
    top: 0x67b13b,
    soil: 0xa56f3f,
    rock: 0x7f7f7f,
    water: 0x3fa6f0,
    fog: 0x87ceeb,
  },
  desert: {
    top: 0xf0d89f,
    soil: 0xd2b07b,
    rock: 0x9b7a5a,
    water: 0xd4b97a,
    fog: 0xffd8a8,
  },
  snow: {
    top: 0xe8f6ff,
    soil: 0xcfcfcf,
    rock: 0x9aa0a4,
    water: 0xcde6ff,
    fog: 0xdff3ff,
  },
  jungle: {
    top: 0x3b7b2d,
    soil: 0x7c5c32,
    rock: 0x6b6b6b,
    water: 0x4fb7ff,
    fog: 0x9fe8a8,
  },
  ocean: {
    top: 0x7ed2ff,
    soil: 0x6ba1bd,
    rock: 0x626b73,
    water: 0x1a7db8,
    fog: 0x7ed2ff,
  },
  nether: {
    top: 0x8f3a22,
    soil: 0x4a2a17,
    rock: 0x522323,
    water: 0x5a1000,
    fog: 0x2b0a0a,
  },
  the_end: {
    top: 0xe6ddb2,
    soil: 0xd0c6a0,
    rock: 0x2a2030,
    water: 0x000000,
    fog: 0x0a0710,
  },
};

/* =========
   Component
   ========= */
export default function VoxelBackground({
  darkMode = false,
}: {
  darkMode?: boolean;
}) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const threeRef = useRef<{ renderer?: THREE.WebGLRenderer } | null>(null);
  const [selectedBiome, setSelectedBiome] = useState<BiomeKey | "auto">(
    darkMode ? "the_end" : "auto"
  );
  const [paused, setPaused] = useState(false);
  const [perfMode, setPerfMode] = useState(false);

  useEffect(() => {
    const container = mountRef.current!;
    if (!container) return;

    // Dynamic GRID_W based on container width so it fills screen
    const GRID_W = Math.max(
      60,
      Math.round((container.clientWidth / 12) * (GRID_W_BASE / 100))
    );

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
    // modern API: outputColorSpace, fallback safely if missing
    try {
      if ("outputColorSpace" in renderer) {
        // @ts-ignore
        renderer.outputColorSpace = THREE.SRGBColorSpace;
      } else if ((THREE as any).sRGBEncoding) {
        // fallback older API
        // @ts-ignore
        renderer.outputEncoding = (THREE as any).sRGBEncoding;
      }
    } catch {
      // ignore if not present (some environments)
    }
    renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.domElement.style.display = "block";
    renderer.domElement.style.position = "absolute";
    renderer.domElement.style.inset = "0px";
    renderer.domElement.style.zIndex = "-20";
    renderer.domElement.style.pointerEvents = "none";
    container.appendChild(renderer.domElement);

    // Scene and camera
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1500
    );
    camera.position.set(0, 16, CAMERA_DIST);
    camera.lookAt(new THREE.Vector3(0, 4, 0));

    // Lights
    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.9);
    scene.add(hemi);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.75);
    dirLight.position.set(-40, 80, 40);
    scene.add(dirLight);

    // Fog
    scene.fog = new THREE.FogExp2(PALETTES.overworld.fog || 0x87ceeb, 0.002);

    // Guard instance count
    let estInstances = GRID_W * GRID_D * MAX_H;
    if (estInstances > MAX_INSTANCES_SAFE) {
      estInstances = MAX_INSTANCES_SAFE;
    }

    // Base block geometry + instanced mesh for terrain
    const boxGeo = new THREE.BoxGeometry(BLOCK, BLOCK, BLOCK);
    const matStandard = new THREE.MeshStandardMaterial({ flatShading: true });
    const instancedTerrain = new THREE.InstancedMesh(
      boxGeo,
      matStandard,
      estInstances
    );
    instancedTerrain.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    // per-instance color attr
    (instancedTerrain as any).instanceColor =
      new THREE.InstancedBufferAttribute(new Float32Array(estInstances * 3), 3);
    scene.add(instancedTerrain);

    // Groups for extras
    const cloudsGroup = new THREE.Group();
    scene.add(cloudsGroup);

    const waterGroup = new THREE.Group();
    scene.add(waterGroup);

    const animalsGroup = new THREE.Group();
    scene.add(animalsGroup);

    const particlesGroup = new THREE.Group();
    scene.add(particlesGroup);

    const pillarsGroup = new THREE.Group();
    scene.add(pillarsGroup);

    const dragonGroup = new THREE.Group();
    scene.add(dragonGroup);

    // Sun/moon cube
    const sunMat = new THREE.MeshStandardMaterial({
      emissive: 0xffffff,
      emissiveIntensity: 0.2,
    });
    const sunCube = new THREE.Mesh(new THREE.BoxGeometry(4, 4, 4), sunMat);
    scene.add(sunCube);

    // Helper dummy
    const dummy = new THREE.Object3D();
    const tmpColor = new THREE.Color();

    // PARTICLES & ENTITIES state
    const enderParticles: THREE.Mesh[] = [];
    const emberParticles: THREE.Mesh[] = [];
    const animals: { mesh: THREE.Mesh; speed: number; dir: number }[] = [];

    // utility: generate stable terrain heights using combined sines + jitter
    function generateHeights(
      seed = 42,
      width = GRID_W,
      depth = GRID_D,
      maxH = MAX_H
    ) {
      const out: number[] = new Array(width * depth);
      for (let z = 0; z < depth; z++) {
        for (let x = 0; x < width; x++) {
          const nx = (x + seed) * 0.12;
          const nz = (z + seed) * 0.09;
          const val =
            Math.abs(Math.sin(nx) * 3) +
            Math.abs(Math.cos(nz) * 2.2) +
            Math.abs(Math.sin((x + z + seed) * 0.04)) * 0.9 +
            (Math.abs(Math.cos((x * 7 + z * 3 + seed) * 0.02)) > 0.85
              ? 1.3
              : 0);
          const jitter =
            Math.abs(Math.sin((x * 13 + z * 7 + seed) * 0.017)) * 0.8;
          const h = Math.max(1, Math.round(Math.min(maxH, val + jitter)));
          out[z * width + x] = h;
        }
      }
      return out;
    }

    // Fill instanced terrain based on biome palette
    function fillTerrain(biome: BiomeKey) {
      const pal = PALETTES[biome];
      const heights = generateHeights(
        biome === "the_end" ? 777 : 42,
        GRID_W,
        GRID_D,
        MAX_H
      );
      let idx = 0;
      for (let z = 0; z < GRID_D; z++) {
        for (let x = 0; x < GRID_W; x++) {
          const h = heights[z * GRID_W + x];
          for (let y = 0; y < h; y++) {
            if (idx >= estInstances) break;
            dummy.position.set(
              (x - GRID_W / 2) * BLOCK,
              y * BLOCK - 1.2,
              (z - GRID_D / 2) * BLOCK
            );
            dummy.rotation.set(0, 0, 0);
            dummy.updateMatrix();
            instancedTerrain.setMatrixAt(idx, dummy.matrix);

            // color logic
            if (biome === "the_end") {
              if (y === h - 1) tmpColor.setHex(PALETTES.the_end.top);
              else if (y > h - 3) tmpColor.setHex(PALETTES.the_end.soil);
              else tmpColor.setHex(PALETTES.the_end.rock);
            } else if (biome === "nether") {
              if (y === h - 1) tmpColor.setHex(PALETTES.nether.top);
              else if (y > h - 3) tmpColor.setHex(PALETTES.nether.soil);
              else tmpColor.setHex(PALETTES.nether.rock);
            } else {
              if (y === h - 1) tmpColor.setHex(pal.top);
              else if (y > h - 3) tmpColor.setHex(pal.soil);
              else tmpColor.setHex(pal.rock);
            }

            (instancedTerrain as any).instanceColor.setXYZ(
              idx,
              tmpColor.r,
              tmpColor.g,
              tmpColor.b
            );
            idx++;
          }
        }
      }

      // zero out remaining instances
      for (; idx < estInstances; idx++) {
        dummy.position.set(9999, 9999, 9999);
        dummy.updateMatrix();
        instancedTerrain.setMatrixAt(idx, dummy.matrix);
        (instancedTerrain as any).instanceColor.setXYZ(idx, 0, 0, 0);
      }
      instancedTerrain.instanceMatrix.needsUpdate = true;
      (instancedTerrain as any).instanceColor.needsUpdate = true;
    }

    // Clouds: group of little cubes
    function createClouds(biome: BiomeKey) {
      cloudsGroup.clear();
      const cloudCount = Math.max(6, Math.round((GRID_W * GRID_D) / 800));
      for (let i = 0; i < cloudCount; i++) {
        const group = new THREE.Group();
        const baseX = (Math.random() - 0.5) * GRID_W * BLOCK * 1.4;
        const baseZ = -Math.random() * GRID_D * BLOCK * 0.6 - 10;
        const baseY = 12 + Math.random() * 8;
        const parts = 4 + Math.floor(Math.random() * 10);
        for (let p = 0; p < parts; p++) {
          const cube = new THREE.Mesh(
            new THREE.BoxGeometry(1.0, 1.0, 1.0),
            new THREE.MeshStandardMaterial({
              color: 0xffffff,
              flatShading: true,
              transparent: true,
              opacity: 0.95,
            })
          );
          cube.position.set(
            baseX + (Math.random() - 0.5) * 6,
            baseY + (Math.random() - 0.5) * 2,
            baseZ + (Math.random() - 0.5) * 6
          );
          group.add(cube);
        }
        group.userData = { speed: 0.005 + Math.random() * 0.02, startX: baseX };
        cloudsGroup.add(group);
      }
      cloudsGroup.position.y = 1;
    }

    // Water: simple translucent planes
    function createWater(biome: BiomeKey) {
      waterGroup.clear();
      if (biome !== "ocean" && biome !== "overworld") return;
      const count = 6;
      for (let i = 0; i < count; i++) {
        const geo = new THREE.PlaneGeometry(10, 10);
        const mat = new THREE.MeshStandardMaterial({
          color: PALETTES[biome].water || 0x3fa6f0,
          transparent: true,
          opacity: 0.65,
          flatShading: true,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(
          (Math.random() - 0.5) * GRID_W * BLOCK * 0.6,
          1.1 + Math.random() * 1.2,
          (Math.random() - 0.5) * GRID_D * BLOCK * 0.6
        );
        waterGroup.add(mesh);
      }
    }

    // End pillars
    function createEndPillars() {
      pillarsGroup.clear();
      const n = 10;
      for (let i = 0; i < n; i++) {
        const baseX = (Math.random() - 0.5) * GRID_W * 0.6;
        const baseZ = (Math.random() - 0.5) * GRID_D * 0.6;
        const height = 6 + Math.floor(Math.random() * 14);
        for (let y = 0; y < height; y++) {
          const cube = new THREE.Mesh(
            new THREE.BoxGeometry(1, 1, 1),
            new THREE.MeshStandardMaterial({
              color: 0x0b0610,
              flatShading: true,
            })
          );
          cube.position.set(baseX, y, baseZ);
          pillarsGroup.add(cube);
        }
      }
    }

    // Particles: ender motes
    function createEnderParticles() {
      // clear existing
      enderParticles.splice(0, enderParticles.length);
      // generate
      const count = Math.min(MAX_PARTICLES, 120);
      for (let i = 0; i < count; i++) {
        const m = new THREE.Mesh(
          new THREE.BoxGeometry(0.18, 0.18, 0.18),
          new THREE.MeshBasicMaterial({
            color: 0xaf6fff,
            transparent: true,
            opacity: 0.95,
          })
        );
        m.position.set(
          (Math.random() - 0.5) * GRID_W * 0.6,
          2 + Math.random() * 12,
          (Math.random() - 0.5) * GRID_D * 0.6
        );
        (m as any).userData = {
          vx: (Math.random() - 0.5) * 0.02,
          vy: (Math.random() - 0.5) * 0.02,
        };
        particlesGroup.add(m);
        enderParticles.push(m);
      }
    }

    // Ember particles for nether
    function createEmbers() {
      emberParticles.splice(0, emberParticles.length);
      const count = Math.min(MAX_PARTICLES, 100);
      for (let i = 0; i < count; i++) {
        const m = new THREE.Mesh(
          new THREE.BoxGeometry(0.16, 0.16, 0.16),
          new THREE.MeshBasicMaterial({
            color: 0xff8a36,
            transparent: true,
            opacity: 0.9,
          })
        );
        m.position.set(
          (Math.random() - 0.5) * GRID_W * 0.6,
          Math.random() * 8,
          (Math.random() - 0.5) * GRID_D * 0.6
        );
        (m as any).userData = {
          vy: 0.02 + Math.random() * 0.06,
          vx: (Math.random() - 0.5) * 0.02,
        };
        particlesGroup.add(m);
        emberParticles.push(m);
      }
    }

    // Simple voxel animals (boxes) walking
    function spawnAnimalsForBiome() {
      animalsGroup.clear();
      animals.splice(0, animals.length);
      const count = Math.min(MAX_ANIMALS, 12);
      for (let i = 0; i < count; i++) {
        const geo = new THREE.BoxGeometry(1.4, 1.0, 0.8);
        const mat = new THREE.MeshStandardMaterial({
          color: Math.random() > 0.6 ? 0xffc0cb : 0xffffff,
          flatShading: true,
        });
        const m = new THREE.Mesh(geo, mat);
        m.position.set(
          (Math.random() - 0.5) * GRID_W * 0.6,
          2 + Math.random() * 2,
          (Math.random() - 0.5) * GRID_D * 0.6
        );
        animalsGroup.add(m);
        animals.push({
          mesh: m,
          speed: 0.003 + Math.random() * 0.01,
          dir: Math.random() > 0.5 ? 1 : -1,
        });
      }
    }

    // Dragon (very lightweight proxy)
    function createDragonProxy() {
      dragonGroup.clear();
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(8, 2.2, 3),
        new THREE.MeshStandardMaterial({
          color: 0x111111,
          emissive: 0x110000,
          flatShading: true,
        })
      );
      body.position.set(0, 8, -20);
      dragonGroup.add(body);
      const wingL = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 5, 10),
        new THREE.MeshStandardMaterial({ color: 0x111111, flatShading: true })
      );
      wingL.position.set(-5, 0, 0);
      wingL.rotation.set(0, 0, 0.5);
      body.add(wingL);
      const wingR = wingL.clone();
      wingR.position.set(5, 0, 0);
      wingR.rotation.set(0, 0, -0.5);
      body.add(wingR);
      dragonGroup.visible = false;
      dragonGroup.position.set(0, 8, -10);
    }

    createDragonProxy();

    // Populate scene for biome
    function populateBiome(biome: BiomeKey) {
      // colors + fog
      const bg = PALETTES[biome].fog ?? PALETTES[biome].top;
      scene.background = new THREE.Color(bg);
      if (scene.fog instanceof THREE.FogExp2) {
        (scene.fog as THREE.FogExp2).color.set(bg);
        // density tuned by biome
        (scene.fog as THREE.FogExp2).density =
          biome === "the_end"
            ? 0.01
            : biome === "nether"
            ? 0.007
            : 0.002 + (biome === "snow" ? 0.001 : 0);
      }

      // rebuild major elements
      fillTerrain(biome);
      createClouds(biome);
      createWater(biome);
      spawnAnimalsForBiome();

      particlesGroup.clear();
      if (biome === "the_end") {
        createEnderParticles();
        createEndPillars(); // pillars function below
        dragonGroup.visible = true;
      } else {
        dragonGroup.visible = false;
      }
      if (biome === "nether") {
        createEmbers();
      }
    }

    // End pillars
    function createEndPillars() {
      pillarsGroup.clear();
      const n = 12;
      for (let i = 0; i < n; i++) {
        const x = (Math.random() - 0.5) * GRID_W * 0.6;
        const z = (Math.random() - 0.5) * GRID_D * 0.6;
        const height = 6 + Math.floor(Math.random() * 16);
        for (let y = 0; y < height; y++) {
          const cube = new THREE.Mesh(
            new THREE.BoxGeometry(1, 1, 1),
            new THREE.MeshStandardMaterial({
              color: 0x0b0610,
              flatShading: true,
            })
          );
          cube.position.set(x, y, z);
          pillarsGroup.add(cube);
        }
      }
    }

    // initial biome
    let activeBiome: BiomeKey = darkMode ? "the_end" : "overworld";
    if (selectedBiome !== "auto") activeBiome = selectedBiome as BiomeKey;

    populateBiome(activeBiome);

    // animation loop
    let last = performance.now();
    let t = 0;
    function animate() {
      if (!paused) {
        const now = performance.now();
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        t += dt;

        // camera sway
        const camX = Math.sin(t * 0.6) * 6;
        const camY = 12 + Math.cos(t * 0.3) * 1.6;
        camera.position.set(camX, camY, CAMERA_DIST);
        camera.lookAt(0, 4, 0);

        // update clouds movement
        cloudsGroup.children.forEach((c: any) => {
          c.position.x += (c.userData?.speed ?? 0.01) * dt * 60;
          if (c.position.x > GRID_W * 0.6) c.position.x = -GRID_W * 0.6;
        });

        // update particles
        enderParticles.forEach((p) => {
          (p as any).position.x += ((p as any).userData.vx || 0) * dt * 60;
          (p as any).position.y +=
            ((p as any).userData.vy || 0) * Math.sin(now * 0.002);
          if ((p as any).position.y < 2)
            (p as any).position.y = 2 + Math.random() * 8;
        });
        emberParticles.forEach((p) => {
          (p as any).position.y += (p as any).userData.vy * dt * 60;
          (p as any).position.x += (p as any).userData.vx * dt * 60;
          if ((p as any).position.y > 20)
            (p as any).position.y = Math.random() * 6;
        });

        // animals movement
        animals.forEach((a) => {
          a.mesh.position.x += a.speed * a.dir * dt * 60;
          if (a.mesh.position.x > GRID_W * 0.5)
            a.mesh.position.x = -GRID_W * 0.5;
          if (a.mesh.position.x < -GRID_W * 0.5)
            a.mesh.position.x = GRID_W * 0.5;
        });

        // dragon float in End
        if (activeBiome === "the_end") {
          dragonGroup.position.x = Math.sin(t * 0.2) * GRID_W * 0.25;
          dragonGroup.position.y = 8 + Math.sin(t * 0.15) * 2.2;
          dragonGroup.position.z = -10 + Math.cos(t * 0.08) * 10;
          dragonGroup.rotation.y = Math.sin(t * 0.06) * 0.6;
        }

        // sun & moon movement
        const cycle = (performance.now() % DAY_CYCLE_MS) / DAY_CYCLE_MS;
        const sunX = Math.cos(cycle * Math.PI * 2) * GRID_W * 0.35;
        const sunY = Math.sin(cycle * Math.PI * 2) * 10 + 18;
        sunCube.position.set(sunX, sunY, -GRID_D * 0.6);
        if (activeBiome === "the_end") {
          (sunCube.material as THREE.Material).dispose &&
            (sunCube.material as any).dispose();
          sunCube.material = new THREE.MeshStandardMaterial({
            color: 0xe0d7b0,
            emissive: 0x6a3df6,
            emissiveIntensity: 0.65,
          });
        } else if (activeBiome === "nether") {
          sunCube.material = new THREE.MeshStandardMaterial({
            color: 0xff8844,
            emissive: 0xff2200,
            emissiveIntensity: 0.8,
          });
        } else {
          sunCube.material = new THREE.MeshStandardMaterial({
            color: 0xffdd66,
            emissive: 0xffa844,
            emissiveIntensity: 0.2,
          });
        }
      }

      renderer.render(scene, camera);
      rafId = requestAnimationFrame(animate);
    }
    let rafId = requestAnimationFrame(animate);

    // Handle UI-driven changes: selectedBiome state might be updated outside
    const watcher = setInterval(() => {
      const desired =
        selectedBiome === "auto"
          ? darkMode
            ? "the_end"
            : "overworld"
          : (selectedBiome as BiomeKey);
      if (desired !== activeBiome) {
        activeBiome = desired;
        particlesGroup.clear(); // remove previous particles
        // remove arrays
        enderParticles.splice(0, enderParticles.length);
        emberParticles.splice(0, emberParticles.length);
        animals.splice(0, animals.length);
        // repopulate
        populateBiome(activeBiome);
      }
    }, 300);

    // resize handling
    function onResize() {
      renderer.setSize(container.clientWidth, container.clientHeight);
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
    }
    window.addEventListener("resize", onResize);

    // performance mode: reduce particle counts if needed (simple)
    if (perfMode) {
      // small example: remove half of particles
      // we rely on MAX_PARTICLES being reasonable earlier
    }

    // store reference for possible external cleanup
    threeRef.current = { renderer };

    // cleanup
    return () => {
      cancelAnimationFrame(rafId);
      clearInterval(watcher);
      window.removeEventListener("resize", onResize);
      // dispose geometry/materials
      instancedTerrain.geometry.dispose();
      (instancedTerrain.material as any).dispose &&
        (instancedTerrain.material as any).dispose();
      renderer.dispose();
      try {
        if (container.contains(renderer.domElement))
          container.removeChild(renderer.domElement);
      } catch {}
    };
    // dependencies: only on mount/unmount or when selectedBiome changes via closure? we use selectedBiome in watcher
  }, [darkMode, selectedBiome, paused, perfMode]);

  // simple UI overlay (pointer events enabled)
  return (
    <>
      <div
        ref={mountRef}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: -20,
          pointerEvents: "none",
        }}
      />
      {/* UI overlay */}
      <div
        style={{
          position: "fixed",
          right: 16,
          top: 16,
          zIndex: 1200,
          pointerEvents: "auto",
          display: "flex",
          gap: 8,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            background: "rgba(0,0,0,0.16)",
            padding: 6,
            borderRadius: 10,
            display: "flex",
            gap: 6,
          }}
        >
          <button
            onClick={() => setSelectedBiome("auto")}
            style={{
              padding: "6px 8px",
              borderRadius: 8,
              border: "none",
              background:
                selectedBiome === "auto" ? "#7c5cff" : "rgba(255,255,255,0.06)",
              color: "white",
              cursor: "pointer",
            }}
          >
            Auto
          </button>
          {BIOMES.map((b) => (
            <button
              key={b}
              onClick={() => setSelectedBiome(b)}
              style={{
                padding: "6px 8px",
                borderRadius: 8,
                border: "none",
                background:
                  selectedBiome === b ? "#7c5cff" : "rgba(255,255,255,0.06)",
                color: "white",
                cursor: "pointer",
              }}
            >
              {b.replace("_", " ")}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={() => setPaused((p) => !p)}
            style={{
              padding: "6px 8px",
              borderRadius: 8,
              border: "none",
              background: paused ? "#ff9b9b" : "rgba(255,255,255,0.06)",
              color: "white",
              cursor: "pointer",
            }}
          >
            {paused ? "Resume" : "Pause"}
          </button>
          <button
            onClick={() => setPerfMode((p) => !p)}
            style={{
              padding: "6px 8px",
              borderRadius: 8,
              border: "none",
              background: perfMode ? "#ffd36f" : "rgba(255,255,255,0.06)",
              color: "white",
              cursor: "pointer",
            }}
          >
            {perfMode ? "Perf Low" : "Perf High"}
          </button>
        </div>
      </div>
    </>
  );
}
