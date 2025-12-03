import React, { useEffect, useRef } from "react";
import * as THREE from "three";

interface Props {
  darkMode: boolean;
}

export default function VoxelBackground({ darkMode }: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const container = mountRef.current!;
    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });

    // NEW Three.js API — no more outputEncoding
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // Scene
    const scene = new THREE.Scene();

    // Fog (TS-safe)
    const fog = new THREE.FogExp2(0x000000, 0.005);
    scene.fog = fog;

    // Camera
    const camera = new THREE.PerspectiveCamera(60, 2, 0.1, 1500);
    camera.position.set(0, 18, 55);

    // Lights
    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.9);
    scene.add(hemi);

    const dir = new THREE.DirectionalLight(0xffffff, 0.7);
    dir.position.set(-20, 40, 30);
    scene.add(dir);

    // Terrain parameters
    const GRID_W = 120;
    const GRID_D = 60;
    const MAX_H = 7;

    const blockGeo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshStandardMaterial({ flatShading: true });

    const instCount = GRID_W * GRID_D * MAX_H;
    const instanced = new THREE.InstancedMesh(blockGeo, mat, instCount);
    instanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    instanced.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(instCount * 3),
      3
    );

    scene.add(instanced);

    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    // Colors
    const grass = new THREE.Color("#7FBF3F");
    const dirt = new THREE.Color("#8A5A30");
    const stone = new THREE.Color("#8a8a8a");

    const endstone = new THREE.Color("#d9d6a4");
    const enddirt = new THREE.Color("#c7c48e");
    const enddeep = new THREE.Color("#8e8b5e");

    // Height generation
    function generateHeights(seed: number): number[] {
      const arr: number[] = new Array(GRID_W * GRID_D);
      for (let z = 0; z < GRID_D; z++) {
        for (let x = 0; x < GRID_W; x++) {
          const h =
            Math.floor(
              2 +
                3 * Math.abs(Math.sin((x + seed) * 0.12)) +
                2 * Math.abs(Math.sin((z + seed) * 0.09)) +
                1 * Math.abs(Math.sin((x + z + seed) * 0.07))
            ) %
            (MAX_H + 1);

          arr[z * GRID_W + x] = Math.max(1, h);
        }
      }
      return arr;
    }

    let heights = generateHeights(darkMode ? 5000 : 42);

    // Fill mesh
    function fillTerrain() {
      let i = 0;
      for (let z = 0; z < GRID_D; z++) {
        for (let x = 0; x < GRID_W; x++) {
          const h = heights[z * GRID_W + x];

          for (let y = 0; y < h; y++) {
            dummy.position.set(x - GRID_W * 0.5, y - 2, z - GRID_D * 0.5);

            dummy.updateMatrix();
            instanced.setMatrixAt(i, dummy.matrix);

            if (!darkMode) {
              if (y === h - 1) color.copy(grass);
              else if (y > h - 3) color.copy(dirt);
              else color.copy(stone);
            } else {
              if (y === h - 1) color.copy(endstone);
              else if (y > h - 3) color.copy(enddirt);
              else color.copy(enddeep);
            }

            instanced.instanceColor!.setXYZ(i, color.r, color.g, color.b);
            i++;
          }
        }
      }

      instanced.instanceMatrix.needsUpdate = true;
      instanced.instanceColor!.needsUpdate = true;
    }

    fillTerrain();

    // Resize
    function onResize() {
      const w = container.clientWidth;
      const h = container.clientHeight;

      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }

    onResize();
    window.addEventListener("resize", onResize);

    // Animate
    let t = 0;
    function animate() {
      t += 0.003;

      // Camera sway
      camera.position.x = Math.sin(t) * 4;
      camera.position.y = 16 + Math.cos(t * 0.7) * 1.5;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
      rafRef.current = requestAnimationFrame(animate);
    }

    animate();

    // Watch dark mode change
    let prev = darkMode;
    const interval = setInterval(() => {
      if (prev !== darkMode) {
        prev = darkMode;

        heights = generateHeights(darkMode ? 5000 : 42);
        fillTerrain();

        // Fog change
        if (scene.fog instanceof THREE.FogExp2) {
          scene.fog.color.set(darkMode ? "#0a051a" : "#87CEEB");
          scene.fog.density = darkMode ? 0.01 : 0.003;
        }

        hemi.intensity = darkMode ? 0.4 : 0.9;
        dir.intensity = darkMode ? 0.3 : 0.7;
        scene.background = new THREE.Color(darkMode ? "#0a051a" : "#87CEEB");
      }
    }, 200);

    return () => {
      cancelAnimationFrame(rafRef.current!);
      clearInterval(interval);
      window.removeEventListener("resize", onResize);
      instanced.geometry.dispose();
      mat.dispose();
      renderer.dispose();
      container.innerHTML = "";
    };
  }, [darkMode]);

  return (
    <div
      ref={mountRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: -10,
        pointerEvents: "none",
      }}
    />
  );
}
