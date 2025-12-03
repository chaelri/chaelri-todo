import React, { useEffect, useRef } from "react";
import * as THREE from "three";

export default function VoxelBackground({
  darkMode = false,
}: {
  darkMode?: boolean;
}) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const GRID_W = 120;
    const GRID_D = 40;
    const MAX_HEIGHT = 7;
    const BLOCK_SIZE = 1;
    const CAMERA_DIST = 60;

    const container = mountRef.current!;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

    renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));

    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(60, 2, 0.1, 1500);
    camera.position.set(GRID_W * 0.5, 18, CAMERA_DIST);
    camera.lookAt(new THREE.Vector3(GRID_W * 0.5, 6, 0));

    // Fog (TS-safe)
    const fog = new THREE.FogExp2(0x000000, darkMode ? 0.008 : 0.002);
    scene.fog = fog;

    // Lights
    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8);
    scene.add(hemi);

    const dir = new THREE.DirectionalLight(0xffffff, 0.6);
    dir.position.set(-30, 60, 20);
    scene.add(dir);

    // Instanced mesh
    const instanceCount = GRID_W * GRID_D * MAX_HEIGHT;
    const boxGeo = new THREE.BoxGeometry(BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    const mat = new THREE.MeshStandardMaterial({ flatShading: true });
    const instanced = new THREE.InstancedMesh(boxGeo, mat, instanceCount);
    instanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    instanced.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(instanceCount * 3),
      3
    );

    scene.add(instanced);

    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    const overworldTop = new THREE.Color("#6db64a");
    const overworldSoil = new THREE.Color("#b07a3b");
    const overworldStone = new THREE.Color("#8b8b8b");

    const endTop = new THREE.Color("#8a58ff");
    const endSoil = new THREE.Color("#36203c");
    const endStone = new THREE.Color("#0a0710");

    function applyMode(isDark: boolean) {
      if (isDark) {
        scene.background = new THREE.Color(0x070011);
        (scene.fog as THREE.FogExp2).color.set(0x070011);
        (scene.fog as THREE.FogExp2).density = 0.008;
        hemi.intensity = 0.4;
        dir.intensity = 0.2;
      } else {
        scene.background = new THREE.Color(0x87ceeb);
        (scene.fog as THREE.FogExp2).color.set(0x87ceeb);
        (scene.fog as THREE.FogExp2).density = 0.002;
        hemi.intensity = 0.9;
        dir.intensity = 0.8;
      }
    }

    applyMode(darkMode);

    function generateHeights(seed = 1) {
      const heights = new Array(GRID_W * GRID_D);
      for (let z = 0; z < GRID_D; z++) {
        for (let x = 0; x < GRID_W; x++) {
          const i = z * GRID_W + x;
          const h =
            Math.floor(
              2 +
                3 * Math.abs(Math.sin((x + seed) * 0.12)) +
                2 * Math.abs(Math.sin((z + seed) * 0.09)) +
                1 * Math.abs(Math.sin((x + z) * 0.07))
            ) %
            (MAX_HEIGHT + 1);
          heights[i] = Math.max(1, Math.min(MAX_HEIGHT, h));
        }
      }
      return heights;
    }

    let heights = generateHeights(darkMode ? 999 : 42);

    function fillInstances() {
      let idx = 0;

      for (let z = 0; z < GRID_D; z++) {
        for (let x = 0; x < GRID_W; x++) {
          const h = heights[z * GRID_W + x];

          for (let y = 0; y < h; y++) {
            dummy.position.set(
              (x - GRID_W * 0.5) * BLOCK_SIZE,
              y * BLOCK_SIZE - 1,
              (z - GRID_D * 0.5) * BLOCK_SIZE
            );
            dummy.updateMatrix();
            instanced.setMatrixAt(idx, dummy.matrix);

            if (!darkMode) {
              if (y === h - 1) color.copy(overworldTop);
              else if (y > h - 3) color.copy(overworldSoil);
              else color.copy(overworldStone);
            } else {
              if (y === h - 1) color.copy(endTop);
              else if (y > h - 3) color.copy(endSoil);
              else color.copy(endStone);
            }

            instanced.instanceColor!.setXYZ(idx, color.r, color.g, color.b);
            idx++;
          }
        }
      }

      instanced.instanceMatrix.needsUpdate = true;
      instanced.instanceColor!.needsUpdate = true;
    }

    fillInstances();

    function resize() {
      const w = container.clientWidth;
      const h = container.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }

    resize();
    window.addEventListener("resize", resize);

    let camOffset = 0;
    function animate() {
      camOffset += 0.003;
      camera.position.x = GRID_W * 0.5 + Math.sin(camOffset) * 4;
      camera.position.y = 14 + Math.cos(camOffset * 0.6) * 1.5;

      renderer.render(scene, camera);
      rafRef.current = requestAnimationFrame(animate);
    }

    animate();

    // Watch mode change
    let lastMode = darkMode;
    const watch = setInterval(() => {
      if (lastMode !== darkMode) {
        lastMode = darkMode;
        applyMode(darkMode);
        heights = generateHeights(darkMode ? 999 : 42);
        fillInstances();
      }
    }, 300);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      clearInterval(watch);
      window.removeEventListener("resize", resize);

      instanced.geometry.dispose();
      mat.dispose();
      renderer.dispose();

      container.removeChild(renderer.domElement);
    };
  }, [darkMode]);

  return (
    <div
      ref={mountRef}
      style={{ position: "fixed", inset: 0, zIndex: -2, pointerEvents: "none" }}
    />
  );
}
