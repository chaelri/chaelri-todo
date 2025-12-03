// src/components/VoxelBackground.tsx
import React, { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * VoxelBackground (Option C - Full World)
 * - Fills whole viewport vertically (sky, terrain, underground)
 * - Light mode => Overworld, Dark mode => The End
 * - No biome selector or UI controls (you requested fixed mapping)
 *
 * Usage:
 *    <VoxelBackground darkMode={darkMode} />
 *
 * Requirements:
 *    npm i three
 *    npm i -D @types/three   (recommended)
 *
 * Tuning (top constants) — lower values for better perf.
 */

/* ---------------------- TUNABLES ---------------------- */
const GRID_W_BASE = 110; // base horizontal blocks (scales with width)
const GRID_D = 48; // depth rows (z)
const MAX_H = 12; // max above-ground stack
const UNDERGROUND_DEPTH = 8; // blocks below ground surface (how deep the earth goes)
const BLOCK = 1.0; // cube size
const CAMERA_DIST = 55; // camera distance
const DAY_CYCLE_MS = 90_000; // day length in ms
const INST_CAP = 24000; // safe maximum instances globally (reduce if slow)
const PARTICLE_COUNT = 120; // ender/ember particles (capped) */
/* ----------------------------------------------------- */

type Props = { darkMode?: boolean };

export default function VoxelBackground({ darkMode = false }: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const container = mountRef.current!;
    if (!container) return;

    // compute GRID_W relative to container width so terrain covers screen
    const GRID_W = Math.max(
      64,
      Math.round((container.clientWidth / 12) * (GRID_W_BASE / 100))
    );

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
    // modern / legacy compatibility
    try {
      if ("outputColorSpace" in renderer) {
        // @ts-ignore
        renderer.outputColorSpace =
          (THREE as any).SRGBColorSpace ?? (THREE as any).SRGBColorSpace;
      } else if ((THREE as any).sRGBEncoding) {
        // @ts-ignore
        renderer.outputEncoding = (THREE as any).sRGBEncoding;
      }
    } catch {
      // ignore
    }

    renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.domElement.style.position = "absolute";
    renderer.domElement.style.inset = "0px";
    renderer.domElement.style.zIndex = "-100";
    renderer.domElement.style.pointerEvents = "none";
    container.appendChild(renderer.domElement);

    // Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1500
    );
    camera.position.set(0, 18, CAMERA_DIST);
    camera.lookAt(0, 4, 0);

    // Lights
    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.95);
    scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xffffff, 0.7);
    dir.position.set(-40, 60, 40);
    scene.add(dir);

    // Fog default (will be updated for mode)
    scene.fog = new THREE.FogExp2(0x87ceeb, 0.002);

    // Estimate required instances: width * depth * (MAX_H + UNDERGROUND_DEPTH)
    let estimated = GRID_W * GRID_D * (MAX_H + UNDERGROUND_DEPTH);
    if (estimated > INST_CAP) estimated = INST_CAP; // cap
    // create instanced mesh for all terrain cubes
    const boxGeo = new THREE.BoxGeometry(BLOCK, BLOCK, BLOCK);
    const baseMat = new THREE.MeshStandardMaterial({ flatShading: true });
    const terrainInst = new THREE.InstancedMesh(boxGeo, baseMat, estimated);
    terrainInst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    // per-instance color buffer
    (terrainInst as any).instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(estimated * 3),
      3
    );
    scene.add(terrainInst);

    // Groups for extras
    const cloudGroup = new THREE.Group();
    scene.add(cloudGroup);

    const waterGroup = new THREE.Group();
    scene.add(waterGroup);

    const particleGroup = new THREE.Group();
    scene.add(particleGroup);

    const pillarsGroup = new THREE.Group();
    scene.add(pillarsGroup);

    const dragonGroup = new THREE.Group();
    scene.add(dragonGroup);

    // Sun / Moon cube
    const sunMesh = new THREE.Mesh(
      new THREE.BoxGeometry(4, 4, 4),
      new THREE.MeshStandardMaterial({
        emissive: 0xffffff,
        emissiveIntensity: 0.2,
      })
    );
    scene.add(sunMesh);

    // helper object for transforms and temporary color
    const tmp = new THREE.Object3D();
    const tmpColor = new THREE.Color();

    /* ----------------- color palettes ----------------- */
    const PALETTES = {
      overworld: {
        top: 0x67b13b,
        soil: 0xa56f3f,
        rock: 0x7f7f7f,
        water: 0x3fa6f0,
        fog: 0x87ceeb,
      },
      the_end: {
        top: 0xd9d6a4,
        soil: 0xc7c48e,
        rock: 0x2a2030,
        water: 0x000000,
        fog: 0x0a0710,
      },
    } as const;

    /* ---------- height generator (over/underground) ---------- */
    function generateHeights(
      seed: number,
      width: number,
      depth: number,
      maxH: number
    ) {
      const out: number[] = new Array(width * depth);
      for (let z = 0; z < depth; z++) {
        for (let x = 0; x < width; x++) {
          // combination of sines and jitter for stable, natural hills
          const nx = (x + seed) * 0.12;
          const nz = (z + seed) * 0.09;
          const base =
            Math.abs(Math.sin(nx) * 3) +
            Math.abs(Math.cos(nz) * 2.2) +
            Math.abs(Math.sin((x + z + seed) * 0.04)) * 0.9 +
            (Math.abs(Math.cos((x * 7 + z * 3 + seed) * 0.02)) > 0.88
              ? 1.2
              : 0);
          const jitter =
            Math.abs(Math.sin((x * 13 + z * 7 + seed) * 0.017)) * 0.8;
          const h = Math.max(1, Math.round(Math.min(maxH, base + jitter)));
          out[z * width + x] = h;
        }
      }
      return out;
    }

    // fill terrain instanced mesh with stacked blocks (including underground)
    function fillTerrain(isEnd: boolean) {
      const palette = isEnd ? PALETTES.the_end : PALETTES.overworld;
      const heights = generateHeights(isEnd ? 7777 : 42, GRID_W, GRID_D, MAX_H);

      let idx = 0;
      for (let z = 0; z < GRID_D; z++) {
        for (let x = 0; x < GRID_W; x++) {
          const h = heights[z * GRID_W + x]; // above-ground stack height
          // stack top -> underground: from y = -UNDERGROUND_DEPTH .. h-1
          for (let y = -UNDERGROUND_DEPTH; y < h; y++) {
            if (idx >= estimated) break;
            tmp.position.set(
              (x - GRID_W / 2) * BLOCK,
              y * BLOCK - 1.0,
              (z - GRID_D / 2) * BLOCK
            );
            tmp.rotation.set(0, 0, 0);
            tmp.updateMatrix();
            terrainInst.setMatrixAt(idx, tmp.matrix);

            // color selection: top block uses top color, near-top uses soil, deeper uses rock
            if (isEnd) {
              if (y === h - 1) tmpColor.setHex(PALETTES.the_end.top);
              else if (y > h - 3) tmpColor.setHex(PALETTES.the_end.soil);
              else tmpColor.setHex(PALETTES.the_end.rock);
            } else {
              if (y === h - 1) tmpColor.setHex(PALETTES.overworld.top);
              else if (y > h - 3) tmpColor.setHex(PALETTES.overworld.soil);
              else tmpColor.setHex(PALETTES.overworld.rock);
            }

            (terrainInst as any).instanceColor.setXYZ(
              idx,
              tmpColor.r,
              tmpColor.g,
              tmpColor.b
            );
            idx++;
          }
        }
      }

      // clear remaining instances
      for (; idx < estimated; idx++) {
        tmp.position.set(9999, 9999, 9999);
        tmp.updateMatrix();
        terrainInst.setMatrixAt(idx, tmp.matrix);
        (terrainInst as any).instanceColor.setXYZ(idx, 0, 0, 0);
      }

      terrainInst.instanceMatrix.needsUpdate = true;
      (terrainInst as any).instanceColor.needsUpdate = true;
    }

    /* ------------------ clouds (floating chunky blocks) ------------------ */
    function makeClouds(isEnd: boolean) {
      cloudGroup.clear();
      const count = Math.max(6, Math.round((GRID_W * GRID_D) / 1100));
      for (let i = 0; i < count; i++) {
        const g = new THREE.Group();
        const baseX = (Math.random() - 0.5) * GRID_W * BLOCK * 1.4;
        const baseZ = -Math.random() * GRID_D * BLOCK * 0.6 - 8;
        const baseY = 18 + Math.random() * 6;
        const parts = 3 + Math.floor(Math.random() * 8);
        for (let p = 0; p < parts; p++) {
          const cube = new THREE.Mesh(
            new THREE.BoxGeometry(1, 1, 1),
            new THREE.MeshStandardMaterial({
              color: isEnd ? 0xaaaaaa : 0xffffff,
              transparent: true,
              opacity: isEnd ? 0.48 : 0.95,
              flatShading: true,
            })
          );
          cube.position.set(
            baseX + (Math.random() - 0.5) * 6,
            baseY + (Math.random() - 0.5) * 2,
            baseZ + (Math.random() - 0.5) * 6
          );
          g.add(cube);
        }
        (g as any).userData = { speed: 0.004 + Math.random() * 0.018 };
        cloudGroup.add(g);
      }
    }

    /* ------------------ water (planes) ------------------ */
    function makeWater(isEnd: boolean) {
      waterGroup.clear();
      if (isEnd) return; // no water in The End
      const count = 6;
      for (let i = 0; i < count; i++) {
        const geom = new THREE.PlaneGeometry(10, 10);
        const mat = new THREE.MeshStandardMaterial({
          color: PALETTES.overworld.water,
          transparent: true,
          opacity: 0.65,
          flatShading: true,
        });
        const m = new THREE.Mesh(geom, mat);
        m.rotation.x = -Math.PI / 2;
        m.position.set(
          (Math.random() - 0.5) * GRID_W * BLOCK * 0.6,
          1.1 + Math.random() * 0.6,
          (Math.random() - 0.5) * GRID_D * BLOCK * 0.6
        );
        waterGroup.add(m);
      }
    }

    /* ------------------ end pillars ------------------ */
    function makeEndPillars() {
      pillarsGroup.clear();
      const n = 12;
      for (let i = 0; i < n; i++) {
        const px = (Math.random() - 0.5) * GRID_W * 0.6;
        const pz = (Math.random() - 0.5) * GRID_D * 0.6;
        const h = 6 + Math.floor(Math.random() * 18);
        for (let y = 0; y < h; y++) {
          const cube = new THREE.Mesh(
            new THREE.BoxGeometry(1, 1, 1),
            new THREE.MeshStandardMaterial({
              color: 0x0b0610,
              flatShading: true,
            })
          );
          cube.position.set(px, y, pz);
          pillarsGroup.add(cube);
        }
      }
    }

    /* ------------------ particles: ender / ember ------------------ */
    const enderParticles: THREE.Mesh[] = [];
    const emberParticles: THREE.Mesh[] = [];
    function createEnderMotives() {
      // clear group
      particleGroup.clear();
      enderParticles.length = 0;
      const c = Math.min(PARTICLE_COUNT, 140);
      for (let i = 0; i < c; i++) {
        const m = new THREE.Mesh(
          new THREE.BoxGeometry(0.18, 0.18, 0.18),
          new THREE.MeshBasicMaterial({
            color: 0xaf6fff,
            transparent: true,
            opacity: 0.9,
          })
        );
        m.position.set(
          (Math.random() - 0.5) * GRID_W * 0.6,
          2 + Math.random() * 14,
          (Math.random() - 0.5) * GRID_D * 0.6
        );
        (m as any).userData = {
          vx: (Math.random() - 0.5) * 0.02,
          vy: (Math.random() - 0.5) * 0.02,
        };
        particleGroup.add(m);
        enderParticles.push(m);
      }
    }
    function createEmbers() {
      emberParticles.length = 0;
      particleGroup.clear();
      const c = Math.min(PARTICLE_COUNT, 120);
      for (let i = 0; i < c; i++) {
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
        particleGroup.add(m);
        emberParticles.push(m);
      }
    }

    /* ------------------ dragon proxy (lightweight) ------------------ */
    function createDragon() {
      dragonGroup.clear();
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(8, 2.6, 3),
        new THREE.MeshStandardMaterial({
          color: 0x101010,
          emissive: 0x110000,
          flatShading: true,
        })
      );
      body.position.set(0, 8, -20);
      dragonGroup.add(body);
      const wl = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 5, 10),
        new THREE.MeshStandardMaterial({ color: 0x101010, flatShading: true })
      );
      wl.position.set(-5, 0, 0);
      wl.rotation.set(0, 0, 0.45);
      body.add(wl);
      const wr = wl.clone();
      wr.position.set(5, 0, 0);
      wr.rotation.set(0, 0, -0.45);
      body.add(wr);
      dragonGroup.visible = false;
    }

    createDragon();

    /* ------------------ populate for mode ------------------ */
    function populateMode(isEnd: boolean) {
      // textures/colors/fog
      const pal: {
        top: number;
        soil: number;
        rock: number;
        water: number;
        fog: number;
      } = isEnd ? PALETTES.the_end : PALETTES.overworld;

      scene.background = new THREE.Color(pal.fog ?? pal.top);
      if (scene.fog instanceof THREE.FogExp2) {
        (scene.fog as THREE.FogExp2).color.set(pal.fog ?? pal.top);
        (scene.fog as THREE.FogExp2).density = isEnd ? 0.01 : 0.0025;
      }

      // main elements
      fillTerrain(isEnd);
      makeClouds(isEnd);
      makeWater(isEnd);

      // particles/structures
      particleGroup.clear();
      pillarGroupClear();
      if (isEnd) {
        createEnderMotives();
        makeEndPillars();
        dragonGroup.visible = true;
      } else {
        createEmbers(); // lightweight ember effect in overworld used sparingly
        dragonGroup.visible = false;
      }
    }

    function pillarGroupClear() {
      pillarsGroup.clear();
    }

    // initial populate based on darkMode
    populateMode(!!darkMode);

    /* ------------------ resize handling ------------------ */
    function onResize() {
      const w = container.clientWidth;
      const h = container.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    window.addEventListener("resize", onResize);
    onResize();

    /* ------------------ animate loop ------------------ */
    let last = performance.now();
    let time = 0;
    function animate() {
      const now = performance.now();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      time += dt;

      // camera gentle roam
      const cx = Math.sin(time * 0.42) * 6;
      const cy = 14 + Math.cos(time * 0.28) * 1.8;
      camera.position.set(cx, cy, CAMERA_DIST);
      camera.lookAt(0, 4, 0);

      // move clouds
      cloudGroup.children.forEach((c: any) => {
        c.position.x += (c.userData?.speed ?? 0.01) * dt * 60;
        if (c.position.x > GRID_W * 0.6) c.position.x = -GRID_W * 0.6;
      });

      // animate particles
      particleGroup.children.forEach((p: any) => {
        if ((p as any).material && (p as any).material.color) {
          // move each particle gently
        }
        if ((p as any).userData && (p as any).userData.vy) {
          p.position.y += (p.userData.vy || 0) * dt * 60;
          p.position.x += (p.userData.vx || 0) * dt * 60;
        }
      });

      // dragon float if visible
      if (dragonGroup.visible) {
        dragonGroup.position.x = Math.sin(time * 0.2) * GRID_W * 0.24;
        dragonGroup.position.y = 7 + Math.sin(time * 0.15) * 1.6;
        dragonGroup.position.z = -10 + Math.cos(time * 0.07) * 10;
        dragonGroup.rotation.y = Math.sin(time * 0.06) * 0.6;
      }

      // sun / moon cycle
      const cycle = (performance.now() % DAY_CYCLE_MS) / DAY_CYCLE_MS;
      const sunX = Math.cos(cycle * Math.PI * 2) * GRID_W * 0.35;
      const sunY = Math.sin(cycle * Math.PI * 2) * 10 + 18;
      sunMesh.position.set(sunX, sunY, -GRID_D * 0.6);
      // change sun material by mode
      if (darkMode) {
        sunMesh.material = new THREE.MeshStandardMaterial({
          color: 0xe0d7b0,
          emissive: 0x6a3df6,
          emissiveIntensity: 0.7,
        });
      } else {
        sunMesh.material = new THREE.MeshStandardMaterial({
          color: 0xffdd66,
          emissive: 0xffa844,
          emissiveIntensity: 0.25,
        });
      }

      renderer.render(scene, camera);
      rafRef.current = requestAnimationFrame(animate);
    }

    rafRef.current = requestAnimationFrame(animate);

    /* ------------------ watch for darkMode prop changes ------------------ */
    let previous = darkMode;
    const watchInterval = setInterval(() => {
      if (previous !== darkMode) {
        previous = darkMode;
        populateMode(!!darkMode);
      }
    }, 220);

    // cleanup
    return () => {
      clearInterval(watchInterval);
      cancelAnimationFrame(rafRef.current!);
      window.removeEventListener("resize", onResize);
      try {
        terrainInst.geometry.dispose();
        (terrainInst.material as any).dispose &&
          (terrainInst.material as any).dispose();
        renderer.dispose();
        if (container.contains(renderer.domElement))
          container.removeChild(renderer.domElement);
      } catch (e) {
        // ignore
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [darkMode]);

  // Render wrapper (canvas is attached inside mountRef)
  return (
    <div
      ref={mountRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: -100,
        pointerEvents: "none",
      }}
    />
  );
}
