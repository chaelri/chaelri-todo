// src/components/VoxelBackground.tsx
import React, { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * VoxelBackground
 * Props:
 *  - darkMode: boolean (false -> Overworld (A); true -> The End (C))
 *
 * Drop into App: <VoxelBackground darkMode={darkMode}/>
 *
 * Notes:
 *  - Install `three` first: npm i three
 *  - Tweak GRID_W / GRID_D / MAX_HEIGHT / BLOCK_SIZE for performance/looks
 */

export default function VoxelBackground({ darkMode = false }: { darkMode?: boolean }) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    // ---- Config knobs ----
    const GRID_W = 120; // number of columns (x)
    const GRID_D = 40; // number of rows (z)
    const MAX_HEIGHT = 7; // max stacked blocks per column
    const BLOCK_SIZE = 1; // size of a single cube unit
    const INSTANCE_PADDING = 2; // extra space around the grid
    const CAMERA_DIST = 60; // camera z distance
    // -----------------------

    const container = mountRef.current!;
    if (!container) return;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio ? Math.min(1.5, window.devicePixelRatio) : 1);
    renderer.shadowMap.enabled = false;
    renderer.outputEncoding = THREE.sRGBEncoding;
    container.appendChild(renderer.domElement);

    // Scene & camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, 2, 0.1, 1000);
    camera.position.set(GRID_W * 0.5 * BLOCK_SIZE, 18, CAMERA_DIST);
    camera.lookAt(new THREE.Vector3(GRID_W * 0.5 * BLOCK_SIZE, 6, 0));

    // Lighting (directional soft)
    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8);
    scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xffffff, 0.6);
    dir.position.set(-30, 60, 20);
    scene.add(dir);

    // Fog + initial sky color (updated per mode)
    scene.fog = new THREE.FogExp2(0x000000, darkMode ? 0.008 : 0.002);

    // Instanced mesh: one InstancedMesh containing all cubes with per-instance color
    // estimate instances: GRID_W * GRID_D * MAX_HEIGHT
    const instanceCount = GRID_W * GRID_D * MAX_HEIGHT;
    const boxGeo = new THREE.BoxGeometry(BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);

    // Material must support vertexColors to let per-instance color work
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true });
    const instanced = new THREE.InstancedMesh(boxGeo, mat, instanceCount);
    instanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    // create instanceColor attribute
    instanced.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(instanceCount * 3), 3, false);
    scene.add(instanced);

    // helper vector/matrix
    const dummyMat = new THREE.Object3D();
    const color = new THREE.Color();

    // deterministic height generator (sine + random jitter)
    function generateHeights(seed = 1) {
      const heights: number[] = new Array(GRID_W * GRID_D);
      for (let z = 0; z < GRID_D; z++) {
        for (let x = 0; x < GRID_W; x++) {
          const i = z * GRID_W + x;
          // combine sines + pseudo-random jitter based on coordinates to create stable terrain
          const nx = x / GRID_W;
          const nz = z / GRID_D;
          const h =
            Math.floor(
              2 +
                3 * Math.abs(Math.sin((x + seed) * 0.12)) +
                2 * Math.abs(Math.sin((z + seed) * 0.09)) +
                1 * (Math.abs(Math.sin((x + z) * 0.07))) +
                (Math.abs(Math.cos((x * 3 + z) * 0.02)) > 0.9 ? 2 : 0)
            ) % (MAX_HEIGHT + 1);
          // clamp
          heights[i] = Math.max(1, Math.min(MAX_HEIGHT, Math.round(h)));
        }
      }
      return heights;
    }

    // two modes: Overworld (A) and The End (C)
    // Overworld palette:
    const overworldTop = new THREE.Color("#6db64a"); // grass
    const overworldSoil = new THREE.Color("#b07a3b"); // dirt
    const overworldStone = new THREE.Color("#8b8b8b");

    // The End palette:
    const endTop = new THREE.Color("#8a58ff"); // end stone top-ish (purple)
    const endSoil = new THREE.Color("#36203c");
    const endStone = new THREE.Color("#0a0710");

    // function to set scene params per mode
    function applyMode(isDark: boolean) {
      if (isDark) {
        // The End
        scene.background = new THREE.Color(0x070011);
        scene.fog.color.set(0x070011);
        scene.fog.density = 0.008;
        hemi.intensity = 0.4;
        dir.intensity = 0.2;
      } else {
        // Overworld
        scene.background = new THREE.Color(0x87CEEB);
        scene.fog.color.set(0x87CEEB);
        scene.fog.density = 0.002;
        hemi.intensity = 0.9;
        dir.intensity = 0.8;
      }
    }
    applyMode(darkMode);

    // Prepare heights and fill instances
    let heights = generateHeights(darkMode ? 999 : 42);

    // Fill instanced mesh with cubes stacked per column
    function fillInstances() {
      let idx = 0;
      for (let z = 0; z < GRID_D; z++) {
        for (let x = 0; x < GRID_W; x++) {
          const h = heights[z * GRID_W + x];
          for (let y = 0; y < h; y++) {
            // world position
            const px = (x - GRID_W * 0.5) * BLOCK_SIZE * 1.0;
            const py = y * BLOCK_SIZE - 1; // slight offset to center
            const pz = (z - GRID_D * 0.5) * BLOCK_SIZE * 1.0;

            dummyMat.position.set(px, py, pz);
            // small random rotation jitter for natural feel (but keep blocks axis-aligned)
            dummyMat.rotation.set(0, 0, 0);
            dummyMat.scale.set(1, 1, 1);
            dummyMat.updateMatrix();

            instanced.setMatrixAt(idx, dummyMat.matrix);

            // color selection by layer: top block green/purple, deeper blocks dirt/stone
            if (!darkMode) {
              // overworld
              if (y === h - 1) {
                color.copy(overworldTop);
              } else if (y > h - 3) {
                color.copy(overworldSoil);
              } else {
                color.copy(overworldStone);
              }
            } else {
              // end
              if (y === h - 1) {
                color.copy(endTop);
              } else if (y > h - 3) {
                color.copy(endSoil);
              } else {
                color.copy(endStone);
              }
            }

            instanced.instanceColor!.setXYZ(idx, color.r, color.g, color.b);
            idx++;
            if (idx >= instanceCount) break;
          }
          if (idx >= instanceCount) break;
        }
        if (idx >= instanceCount) break;
      }

      // zero out any remaining instances
      for (; idx < instanceCount; idx++) {
        dummyMat.position.set(9999, 9999, 9999);
        dummyMat.updateMatrix();
        instanced.setMatrixAt(idx, dummyMat.matrix);
        instanced.instanceColor!.setXYZ(idx, 0, 0, 0);
      }
      instanced.instanceMatrix.needsUpdate = true;
      if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true;
    }

    fillInstances();

    // small set of floating "end pillars" for the end mode (we'll add some tall columns when dark)
    const pillarGroup = new THREE.Group();
    scene.add(pillarGroup);
    function createPillarsIfEnd() {
      pillarGroup.clear();
      if (!darkMode) return;
      const np = 18;
      for (let i = 0; i < np; i++) {
        const gx = (Math.random() - 0.5) * GRID_W * BLOCK_SIZE * 0.6;
        const gz = (Math.random() - 0.5) * GRID_D * BLOCK_SIZE * 0.6;
        const gh = 10 + Math.floor(Math.random() * 18);
        for (let s = 0; s < gh; s++) {
          const box = new THREE.Mesh(
            new THREE.BoxGeometry(BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE),
            new THREE.MeshStandardMaterial({ color: new THREE.Color(0x0b0610), flatShading: true })
          );
          box.position.set(gx, s * BLOCK_SIZE - 1, gz);
          pillarGroup.add(box);
        }
      }
    }
    createPillarsIfEnd();

    // camera sway variables
    let camAngle = 0;
    let camOffset = 0;

    // resize handling
    function onResize() {
      const width = container.clientWidth;
      const height = container.clientHeight;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }
    onResize();
    window.addEventListener("resize", onResize);

    // animate loop
    let last = performance.now();
    function animate() {
      const t = performance.now();
      const dt = (t - last) / 1000;
      last = t;

      // subtle camera bob / orbit
      camAngle += dt * 0.05;
      camOffset = Math.sin(camAngle) * 6;
      camera.position.x = GRID_W * 0.5 * BLOCK_SIZE + camOffset;
      camera.position.y = 14 + Math.cos(camAngle * 0.6) * 1.8;
      camera.lookAt(new THREE.Vector3(GRID_W * 0.5 * BLOCK_SIZE, 6, 0));

      // slight rotation of directional light for richer shading
      dir.position.x = -30 + Math.sin(t * 0.0003) * 10;

      renderer.render(scene, camera);
      rafRef.current = requestAnimationFrame(animate);
    }
    rafRef.current = requestAnimationFrame(animate);

    // watch for darkMode prop changes to rebuild visuals
    let lastMode = darkMode;
    const modeWatcher = setInterval(() => {
      if (lastMode !== darkMode) {
        lastMode = darkMode;
        // re-apply
        applyMode(darkMode);
        heights = generateHeights(darkMode ? 999 : 42);
        fillInstances();
        createPillarsIfEnd();
      }
    }, 300);

    // cleanup
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
      clearInterval(modeWatcher);
      // dispose resources
      instanced.geometry.dispose();
      (mat as any).dispose && (mat as any).dispose();
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, [darkMode]);

  return <div ref={mountRef} style={{ position: "fixed", inset: 0, zIndex: -2, pointerEvents: "none" }} />;
}
