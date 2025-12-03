// src/components/VoxelWorldAdvanced.tsx
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

/**
 * VoxelWorldAdvanced
 * - darkMode: maps to End (true = End) by default unless manual biome selected
 * - Provides Biome selector UI overlay (top-right)
 *
 * Integrate: <VoxelWorldAdvanced darkMode={darkMode} />
 *
 * Performance notes: reduce GRID_W, GRID_D, MAX_HEIGHT, or particle counts if slow.
 */

type BiomeKey =
  | "overworld"
  | "desert"
  | "snow"
  | "jungle"
  | "ocean"
  | "nether"
  | "the_end";

const BIOME_PRESETS: Record<BiomeKey, { label: string }> = {
  overworld: { label: "Overworld" },
  desert: { label: "Desert" },
  snow: { label: "Snow" },
  jungle: { label: "Jungle" },
  ocean: { label: "Ocean" },
  nether: { label: "Nether" },
  the_end: { label: "The End" },
};

export default function VoxelWorldAdvanced({
  darkMode = false,
}: {
  darkMode?: boolean;
}) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const threeRef = useRef<any>(null);
  const [selectedBiome, setSelectedBiome] = useState<BiomeKey | "auto">(
    darkMode ? "the_end" : "auto"
  );
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    // CONFIG (tweak for performance/visual)
    const GRID_W_BASE = 80; // base columns for "mid" screen; scaled by width
    const GRID_D = 36; // depth rows
    const MAX_HEIGHT = 8;
    const BLOCK_SIZE = 1.0;
    const CAMERA_DIST = 60;
    const CLOUD_LAYERS = 2;

    // particles limits
    const MAX_ENDER_PARTICLES = 140;
    const MAX_EMBERS = 120;
    const MAX_ANIMALS = 24;

    // Helpers
    function pickBiome(): BiomeKey {
      if (selectedBiome === "auto") return darkMode ? "the_end" : "overworld";
      return selectedBiome as BiomeKey;
    }

    const container = mountRef.current!;
    if (!container) return;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.outputEncoding = (THREE as any).sRGBEncoding
      ? (THREE as any).sRGBEncoding
      : undefined; // safe
    renderer.domElement.style.display = "block";
    renderer.domElement.style.position = "absolute";
    renderer.domElement.style.inset = "0px";
    renderer.domElement.style.zIndex = "-10";
    container.appendChild(renderer.domElement);

    // Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1500
    );
    camera.position.set(0, 12, CAMERA_DIST);

    // Lighting
    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.9);
    scene.add(hemi);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(-40, 100, 40);
    scene.add(dirLight);

    // Fog
    scene.fog = new THREE.FogExp2(0x000000, darkMode ? 0.006 : 0.002);

    // Determine dynamic GRID_W relative to width so terrain fills screen
    const GRID_W = Math.max(
      60,
      Math.ceil((container.clientWidth / 16) * (GRID_W_BASE / 100))
    );

    // Instanced meshes: allocate reasonably sized instance buffers
    const maxInstances = GRID_W * GRID_D * MAX_HEIGHT + 400; // some spare
    const boxGeo = new THREE.BoxGeometry(BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    const standardMat = new THREE.MeshStandardMaterial({ flatShading: true });
    const instancedMesh = new THREE.InstancedMesh(
      boxGeo,
      standardMat,
      maxInstances
    );
    instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    // per-instance color attribute
    (instancedMesh as any).instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(maxInstances * 3),
      3
    );
    scene.add(instancedMesh);

    // Small helper object for instance transforms
    const proto = new THREE.Object3D();
    const tmpColor = new THREE.Color();

    // Additional groups
    const animalsGroup = new THREE.Group();
    scene.add(animalsGroup);

    const cloudsGroup = new THREE.Group();
    scene.add(cloudsGroup);

    const particleGroup = new THREE.Group();
    scene.add(particleGroup);

    const enderGroup = new THREE.Group();
    scene.add(enderGroup);

    // Sun/Moon cube
    const sunMat = new THREE.MeshStandardMaterial({
      emissive: 0xffffff,
      emissiveIntensity: 0.35,
    });
    const sunCube = new THREE.Mesh(new THREE.BoxGeometry(4, 4, 4), sunMat);
    scene.add(sunCube);

    // Dragon simple model (group of boxes)
    const dragonGroup = new THREE.Group();
    scene.add(dragonGroup);
    const dragonMaterial = new THREE.MeshStandardMaterial({
      color: 0x222222,
      emissive: 0x111111,
      flatShading: true,
    });

    // create a very simple dragon-ish form (body + wings)
    (function createDragon() {
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(10, 2.5, 3),
        dragonMaterial
      );
      body.position.set(0, 8, -20);
      dragonGroup.add(body);
      const wingL = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 6, 12),
        dragonMaterial
      );
      wingL.position.set(-5, 0, 0);
      wingL.rotation.set(0, 0, 0.5);
      body.add(wingL);
      const wingR = wingL.clone();
      wingR.position.set(5, 0, 0);
      wingR.rotation.set(0, 0, -0.5);
      body.add(wingR);
    })();

    // Utility: color palettes (approximate Minecraft-ish)
    const PALETTES: Record<
      BiomeKey,
      { top: number; soil: number; stone: number; water?: number }
    > = {
      overworld: {
        top: 0x6db64a,
        soil: 0xb07a3b,
        stone: 0x8b8b8b,
        water: 0x3fa6f0,
      },
      desert: {
        top: 0xe7cf8a,
        soil: 0xe1b06b,
        stone: 0x9b7a5a,
        water: 0xd4b97a,
      },
      snow: { top: 0xd7f1ff, soil: 0xbdbdbd, stone: 0x9aa0a4, water: 0xcde6ff },
      jungle: {
        top: 0x4daa2f,
        soil: 0x7c5c32,
        stone: 0x6b6b6b,
        water: 0x4fb7ff,
      },
      ocean: {
        top: 0x7ed2ff,
        soil: 0x7aa6c4,
        stone: 0x626b73,
        water: 0x1a7db8,
      },
      nether: {
        top: 0x8f3a22,
        soil: 0x4a2a17,
        stone: 0x522323,
        water: 0x5a1000,
      },
      the_end: {
        top: 0xe6ddb2,
        soil: 0xd0c6a0,
        stone: 0x2a2030,
        water: 0x000000,
      },
    };

    // Terrain generator returns heights grid (width x depth)
    function generateHeights(
      seed: number,
      width: number,
      depth: number,
      maxH: number
    ) {
      const arr = new Array(width * depth);
      for (let z = 0; z < depth; z++) {
        for (let x = 0; x < width; x++) {
          // combine multiple sine waves + pseudo random for more natural-looking chunks
          const nx = (x + seed) * 0.12;
          const nz = (z + seed) * 0.09;
          const h =
            Math.abs(Math.sin(nx) * 3) +
            Math.abs(Math.cos(nz) * 2.5) +
            Math.abs(Math.sin((x + z + seed) * 0.04));
          const jitter =
            Math.abs(Math.sin((x * 13 + z * 7 + seed) * 0.017)) * 1.2;
          const val = Math.round(Math.min(maxH, Math.max(1, h + jitter)));
          arr[z * width + x] = val;
        }
      }
      return arr;
    }

    // Fill instanced mesh according to biome palette and heights
    function fillTerrainInstances(biome: BiomeKey) {
      const palette = PALETTES[biome];
      const heights = generateHeights(
        biome === "the_end" ? 777 : 42,
        GRID_W,
        GRID_D,
        MAX_HEIGHT
      );

      let idx = 0;
      for (let z = 0; z < GRID_D; z++) {
        for (let x = 0; x < GRID_W; x++) {
          const h = heights[z * GRID_W + x];
          // stack cubes from 0..h-1
          for (let y = 0; y < h; y++) {
            proto.position.set(
              (x - GRID_W / 2) * BLOCK_SIZE * 1.0,
              y * BLOCK_SIZE - 1,
              (z - GRID_D / 2) * BLOCK_SIZE * 1.0
            );
            proto.updateMatrix();
            instancedMesh.setMatrixAt(idx, proto.matrix);
            // color:
            if (biome === "the_end") {
              // endstone top, obsidian/stone below
              if (y === h - 1) tmpColor.setHex(PALETTES.the_end.top);
              else tmpColor.setHex(PALETTES.the_end.stone);
            } else {
              if (y === h - 1) tmpColor.setHex(palette.top);
              else if (y > h - 3) tmpColor.setHex(palette.soil);
              else tmpColor.setHex(palette.stone);
            }
            (instancedMesh as any).instanceColor.setXYZ(
              idx,
              tmpColor.r,
              tmpColor.g,
              tmpColor.b
            );
            idx++;
            if (idx >= maxInstances) break;
          }
          if (idx >= maxInstances) break;
        }
        if (idx >= maxInstances) break;
      }
      // clear rest
      for (; idx < maxInstances; idx++) {
        proto.position.set(9999, 9999, 9999);
        proto.updateMatrix();
        instancedMesh.setMatrixAt(idx, proto.matrix);
        (instancedMesh as any).instanceColor.setXYZ(idx, 0, 0, 0);
      }
      instancedMesh.instanceMatrix.needsUpdate = true;
      (instancedMesh as any).instanceColor.needsUpdate = true;
    }

    // Simple floating cloud generator: stacks of white cubes in planes
    function createClouds(biome: BiomeKey) {
      cloudsGroup.clear();
      const cloudCount = 8;
      for (let i = 0; i < cloudCount; i++) {
        const cloud = new THREE.Group();
        const cx = (Math.random() - 0.5) * GRID_W * BLOCK_SIZE * 1.3;
        const cz = -Math.random() * GRID_D * BLOCK_SIZE * 0.7 - 10;
        const cy = 16 + Math.random() * 8;
        const blocks = 6 + Math.floor(Math.random() * 12);
        for (let b = 0; b < blocks; b++) {
          const cube = new THREE.Mesh(
            new THREE.BoxGeometry(BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE),
            new THREE.MeshStandardMaterial({
              color: 0xffffff,
              flatShading: true,
              opacity: 0.95,
              transparent: true,
            })
          );
          cube.position.set(
            cx + (Math.random() - 0.5) * 6,
            cy + (Math.random() - 0.5) * 2,
            cz + (Math.random() - 0.5) * 6
          );
          cloud.add(cube);
        }
        cloud.userData = { speed: 0.01 + Math.random() * 0.03, startX: cx };
        cloudsGroup.add(cloud);
      }
    }

    // Ender particles (glowing motes) using small cubes for consistency
    const enderParticles: THREE.Mesh[] = [];
    function createEnderParticles() {
      enderGroup.clear();
      enderParticles.length = 0;
      for (let i = 0; i < Math.min(MAX_ENDER_PARTICLES, 140); i++) {
        const geom = new THREE.BoxGeometry(0.2, 0.2, 0.2);
        const mat = new THREE.MeshBasicMaterial({
          color: new THREE.Color(0xaf6fff),
          transparent: true,
          opacity: 0.9,
        });
        const m = new THREE.Mesh(geom, mat);
        m.position.set(
          (Math.random() - 0.5) * GRID_W * 0.6,
          4 + Math.random() * 12,
          (Math.random() - 0.5) * GRID_D * 0.6
        );
        m.userData = {
          vx: (Math.random() - 0.5) * 0.02,
          vy: (Math.random() - 0.5) * 0.02,
        };
        enderGroup.add(m);
        enderParticles.push(m);
      }
    }

    // Ember particles (nether)
    const emberParticles: THREE.Mesh[] = [];
    function createEmbers() {
      particleGroup.clear();
      emberParticles.length = 0;
      for (let i = 0; i < Math.min(MAX_EMBERS, 120); i++) {
        const g = new THREE.BoxGeometry(0.2, 0.2, 0.2);
        const m = new THREE.Mesh(
          g,
          new THREE.MeshBasicMaterial({
            color: 0xff7a3a,
            transparent: true,
            opacity: 0.85,
          })
        );
        m.position.set(
          (Math.random() - 0.5) * GRID_W * 0.6,
          Math.random() * 8,
          (Math.random() - 0.5) * GRID_D * 0.6
        );
        m.userData = {
          vy: 0.02 + Math.random() * 0.06,
          vx: (Math.random() - 0.5) * 0.02,
        };
        particleGroup.add(m);
        emberParticles.push(m);
      }
    }

    // Animals (simple voxel shapes): spawn a few and animate across terrain
    const animals: { mesh: THREE.Mesh; speed: number; dir: number }[] = [];
    function spawnAnimals() {
      animalsGroup.clear();
      animals.length = 0;
      const animalCount = Math.min(MAX_ANIMALS, 12);
      for (let i = 0; i < animalCount; i++) {
        const g = new THREE.BoxGeometry(1.4, 1.0, 0.8);
        const mat = new THREE.MeshStandardMaterial({
          color: Math.random() > 0.5 ? 0xffc0cb : 0xffffff,
          flatShading: true,
        }); // pinkish pig or white
        const m = new THREE.Mesh(g, mat);
        m.position.set(
          (Math.random() - 0.5) * GRID_W * 0.6,
          2 + Math.random() * 2,
          (Math.random() - 0.5) * GRID_D * 0.6
        );
        animalsGroup.add(m);
        animals.push({
          mesh: m,
          speed: 0.01 + Math.random() * 0.03,
          dir: Math.random() > 0.5 ? 1 : -1,
        });
      }
    }

    // Water blocks: We'll create a translucent instanced plane grid overlay for water pockets
    const waterGroup = new THREE.Group();
    scene.add(waterGroup);

    function createWater(biome: BiomeKey) {
      waterGroup.clear();
      if (biome !== "ocean" && biome !== "overworld") return;
      const waterMat = new THREE.MeshStandardMaterial({
        color: PALETTES[biome].water || 0x3fa6f0,
        transparent: true,
        opacity: 0.85,
        flatShading: true,
      });
      for (let i = 0; i < 6; i++) {
        const wmesh = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), waterMat);
        wmesh.rotation.x = -Math.PI / 2;
        wmesh.position.set(
          (Math.random() - 0.5) * GRID_W * 0.6,
          1.4,
          (Math.random() - 0.5) * GRID_D * 0.6
        );
        waterGroup.add(wmesh);
      }
    }

    // Initial population
    function populateForBiome(biome: BiomeKey) {
      fillTerrainInstances(biome);
      createClouds(biome);
      createEnderParticles();
      createEmbers();
      spawnAnimals();
      createWater(biome);
      // Dragon: hide unless End
      dragonGroup.visible = biome === "the_end";
      pillarGroupClear(); // we'll manage additional end pillars
      if (biome === "the_end") createEndPillars();
    }

    // End pillars (simple stacked boxes) group
    const pillars = new THREE.Group();
    scene.add(pillars);
    function pillarGroupClear() {
      pillars.clear();
    }
    function createEndPillars() {
      pillars.clear();
      const np = 12;
      for (let i = 0; i < np; i++) {
        const px = (Math.random() - 0.5) * GRID_W * 0.6;
        const pz = (Math.random() - 0.5) * GRID_D * 0.6;
        const h = 6 + Math.floor(Math.random() * 12);
        for (let s = 0; s < h; s++) {
          const g = new THREE.Mesh(
            new THREE.BoxGeometry(1.0, 1.0, 1.0),
            new THREE.MeshStandardMaterial({
              color: 0x0b0610,
              flatShading: true,
            })
          );
          g.position.set(px, s, pz);
          pillars.add(g);
        }
      }
    }

    // Begin with current selection
    let activeBiome = pickBiome();
    populateForBiome(activeBiome);

    // animate loop
    let last = performance.now();
    let animId = 0;
    let camT = 0;

    function animate() {
      if (paused) {
        animId = requestAnimationFrame(animate);
        return;
      }
      const now = performance.now();
      const dt = (now - last) / 1000;
      last = now;

      camT += dt * 0.05;

      // camera slow orbit / sway
      const cx = Math.sin(camT * 0.6) * 6;
      const cy = 12 + Math.cos(camT * 0.3) * 1.2;
      camera.position.set(cx, cy, CAMERA_DIST);
      camera.lookAt(new THREE.Vector3(0, 4, 0));

      // move clouds
      cloudsGroup.children.forEach((c: any) => {
        c.position.x += c.userData.speed * dt * 60;
        if (c.position.x > GRID_W) c.position.x = -GRID_W;
      });

      // animate ender motes
      enderParticles.forEach((p) => {
        p.position.x += (p.userData.vx as number) * dt * 60;
        p.position.y += (p.userData.vy as number) * Math.sin(now * 0.002);
        if (p.position.y < 2) p.position.y = 2 + Math.random() * 8;
        if (p.position.x > GRID_W * 0.6 || p.position.x < -GRID_W * 0.6)
          p.position.x = (Math.random() - 0.5) * GRID_W * 0.6;
      });

      // embers
      emberParticles.forEach((ep) => {
        ep.position.y += ep.userData.vy * dt * 60;
        ep.position.x += ep.userData.vx * dt * 60;
        if (ep.position.y > 20) ep.position.y = Math.random() * 6;
      });

      // animals
      animals.forEach((a) => {
        a.mesh.position.x += a.speed * a.dir * dt * 60;
        if (a.mesh.position.x > GRID_W * 0.5) a.mesh.position.x = -GRID_W * 0.5;
        if (a.mesh.position.x < -GRID_W * 0.5) a.mesh.position.x = GRID_W * 0.5;
      });

      // animate dragon on End
      if (activeBiome === "the_end") {
        dragonGroup.position.x = Math.sin(now * 0.0007) * GRID_W * 0.3;
        dragonGroup.position.y = 8 + Math.sin(now * 0.0009) * 2;
        dragonGroup.position.z = -10 + Math.cos(now * 0.0004) * 10;
        dragonGroup.rotation.y = Math.sin(now * 0.0005) * 0.8;
        dragonGroup.visible = true;
      } else {
        dragonGroup.visible = false;
      }

      // sun / moon cube motion
      const cycle = (now / 20000) % 1; // 20s day/night cycle for demo
      const sunX = Math.cos(cycle * Math.PI * 2) * GRID_W * 0.4;
      const sunY = Math.sin(cycle * Math.PI * 2) * 10 + 18;
      sunCube.position.set(sunX, sunY, -GRID_D * 0.6);
      if (activeBiome === "the_end") {
        sunCube.material = new THREE.MeshStandardMaterial({
          color: 0xe0d7b0,
          emissive: 0x6a3df6,
          emissiveIntensity: 0.6,
        });
      } else {
        sunCube.material = new THREE.MeshStandardMaterial({
          color: 0xffdd66,
          emissive: 0xffa844,
          emissiveIntensity: 0.2,
        });
      }

      renderer.render(scene, camera);
      animId = requestAnimationFrame(animate);
    }

    animId = requestAnimationFrame(animate);

    // handle resize
    function onResize() {
      renderer.setSize(container.clientWidth, container.clientHeight);
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
    }
    window.addEventListener("resize", onResize);

    // UI: watch selectedBiome changes
    const selectionWatcher = setInterval(() => {
      const target = pickBiome();
      if (target !== activeBiome) {
        activeBiome = target;
        populateForBiome(activeBiome);
      }
    }, 300);

    // cleanup
    threeRef.current = { renderer, scene, camera };
    return () => {
      cancelAnimationFrame(animId);
      clearInterval(selectionWatcher);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, [darkMode, selectedBiome, paused]);

  // Minimal UI overlay for biome selection and toggles
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: -5, pointerEvents: "none" }}
      ref={mountRef}
    >
      {/* Top-right biome selector (pointer events allowed) */}
      <div
        style={{
          position: "fixed",
          right: 18,
          top: 18,
          zIndex: 1001,
          pointerEvents: "auto",
          display: "flex",
          gap: 8,
          alignItems: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 6,
            background: "rgba(0,0,0,0.18)",
            padding: 6,
            borderRadius: 10,
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
          {Object.keys(BIOME_PRESETS).map((k) => {
            const key = k as BiomeKey;
            return (
              <button
                key={k}
                onClick={() => setSelectedBiome(key)}
                style={{
                  padding: "6px 8px",
                  borderRadius: 8,
                  border: "none",
                  background:
                    selectedBiome === key
                      ? "#7c5cff"
                      : "rgba(255,255,255,0.06)",
                  color: "white",
                  cursor: "pointer",
                }}
              >
                {BIOME_PRESETS[key].label}
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={() => setPaused((p) => !p)}
            style={{
              borderRadius: 8,
              padding: "6px 10px",
              border: "none",
              background: paused ? "#ff9b9b" : "rgba(255,255,255,0.06)",
              color: "white",
              cursor: "pointer",
            }}
          >
            {paused ? "Resume" : "Pause"}
          </button>
        </div>
      </div>
    </div>
  );
}
