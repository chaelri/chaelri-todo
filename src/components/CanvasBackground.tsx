import React, { useEffect, useRef } from "react";

/**
 * CanvasBackground: Block-texture, parallax Minecraft-like background
 * Usage: <CanvasBackground darkMode={darkMode} />
 *
 * Key knobs:
 * - blockSize: pixel size of one block (try 12,16,20)
 * - layers: number of parallax terrain layers
 * - layerGap: vertical separation between layers
 */

export default function CanvasBackground({
  darkMode = false,
}: {
  darkMode?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);

    // TUNABLES
    const blockSize = 16; // size of a single block pixel (increase for chunkier look)
    const layers = 3; // foreground -> mid -> far
    const layerGap = 48; // vertical spacing between layers
    const baseSpeed = 0.2; // base horizontal speed (pixels per frame-ish)
    const terrainWidthBlocks = Math.ceil(w / blockSize) + 40; // width in blocks for generation
    const seaLevel = Math.round(h * 0.56); // baseline height in px where terrain sits

    // Offscreen tiles (grass, dirt, stone)
    function createGrassTile(blockSize: number, dark = false) {
      const oc = document.createElement("canvas");
      oc.width = blockSize;
      oc.height = blockSize;
      const octx = oc.getContext("2d")!;
      // Grass top: two-tone
      const grassTopA = dark ? "#3b7a3b" : "#60a84b";
      const grassTopB = dark ? "#2f6a2f" : "#4a8a39";
      // dirt base
      const dirtA = dark ? "#3b2f22" : "#b18a58";
      const dirtB = dark ? "#4a382b" : "#9b6f44";

      // draw pixel rows (top-down for a little 3D effect)
      // top row (grass edge)
      octx.fillStyle = grassTopA;
      octx.fillRect(0, 0, blockSize, Math.max(2, Math.floor(blockSize * 0.18)));
      // second row (grass shade)
      octx.fillStyle = grassTopB;
      octx.fillRect(
        0,
        Math.floor(blockSize * 0.18),
        blockSize,
        Math.max(1, Math.floor(blockSize * 0.16))
      );
      // dirt rows
      octx.fillStyle = dirtA;
      octx.fillRect(
        0,
        Math.floor(blockSize * 0.34),
        blockSize,
        Math.floor(blockSize * 0.66)
      );
      // add small pixel noise for "texture"
      for (let i = 0; i < Math.round(blockSize * 1.2); i++) {
        const x = Math.floor(Math.random() * blockSize);
        const y = Math.floor(
          Math.random() * blockSize * 0.66 + Math.floor(blockSize * 0.34)
        );
        octx.fillStyle = Math.random() > 0.6 ? dirtB : dirtA;
        octx.fillRect(x, y, 1, 1);
      }
      return oc;
    }

    function createStoneTile(blockSize: number, dark = false) {
      const oc = document.createElement("canvas");
      oc.width = blockSize;
      oc.height = blockSize;
      const octx = oc.getContext("2d")!;
      const stoneA = dark ? "#3b3b3b" : "#a0a0a0";
      const stoneB = dark ? "#2f2f2f" : "#8a8a8a";

      octx.fillStyle = stoneA;
      octx.fillRect(0, 0, blockSize, blockSize);
      // pixel noise
      for (let i = 0; i < Math.round(blockSize * 1.5); i++) {
        const x = Math.floor(Math.random() * blockSize);
        const y = Math.floor(Math.random() * blockSize);
        octx.fillStyle = Math.random() > 0.7 ? stoneB : stoneA;
        octx.fillRect(x, y, 1, 1);
      }
      return oc;
    }

    // Generate tiles
    let grassTile = createGrassTile(blockSize, darkMode);
    let stoneTile = createStoneTile(blockSize, darkMode);

    // utility height generator (block units) - combines sines + random
    function generateHeightArray(
      widthBlocks: number,
      amplitudeBlocks: number,
      seed = Math.random() * 1000
    ) {
      const arr: number[] = new Array(widthBlocks);
      for (let x = 0; x < widthBlocks; x++) {
        const t = x / widthBlocks;
        // combine several sine waves + pseudo-random jitter
        const val =
          Math.sin((x + seed) * 0.02) * (amplitudeBlocks * 0.45) +
          Math.sin((x + seed) * 0.007) * (amplitudeBlocks * 0.25) +
          Math.sin((x + seed) * 0.04) * (amplitudeBlocks * 0.15) +
          Math.sin(x * 12 + seed) * 0.5;
        // small random jitter per position (stable)
        const jitter =
          (Math.abs(Math.sin(x * 7.13 + seed)) - 0.5) * (amplitudeBlocks * 0.2);
        arr[x] = Math.max(1, Math.round(amplitudeBlocks + val + jitter));
      }
      return arr;
    }

    // Build per-layer terrain data
    type Layer = {
      speed: number;
      offset: number;
      heightBlocks: number; // rough amplitude in blocks
      heights: number[]; // block heights per column
      yBase: number; // pixel baseline for this layer
      scale: number; // scale multiplier for block size (near layers bigger)
    };

    const layerArr: Layer[] = [];
    function buildLayers() {
      layerArr.length = 0;
      for (let i = 0; i < layers; i++) {
        const near = i === 0; // 0 = nearest (foreground)
        const depthFactor = 1 + i * 0.6;
        const scale = 1 - i * 0.12; // farther layers slightly smaller blocks visually
        const speed = baseSpeed * (1 + i * 0.35) * (near ? 1.4 : 1);
        const heightBlocks = Math.round(6 + (layers - i) * 3); // amplitude in blocks
        const heights = generateHeightArray(
          terrainWidthBlocks,
          heightBlocks,
          1000 + i * 13
        );
        const yBase = seaLevel + i * layerGap * (1 + i * 0.12);
        layerArr.push({
          speed,
          offset: Math.random() * 1000,
          heightBlocks,
          heights,
          yBase,
          scale,
        });
      }
    }
    buildLayers();

    // redraw offscreen tiles on darkMode toggle
    function regenTiles() {
      grassTile = createGrassTile(blockSize, darkMode);
      stoneTile = createStoneTile(blockSize, darkMode);
    }

    // draw one layer
    function drawLayer(layer: Layer) {
      const tile = grassTile; // reuse grass for top + dirt below (we used grass tile that includes dirt)
      const cols = layer.heights.length;
      const bs = Math.round(blockSize * layer.scale);
      const offsetBlocks = Math.floor(layer.offset / bs);

      // draw columns spanning canvas width (extra buffer)
      for (let i = -20; i < Math.ceil(w / bs) + 20; i++) {
        const colIndex = (i + offsetBlocks) % cols;
        const idx = colIndex < 0 ? colIndex + cols : colIndex;
        const heightBlocks = layer.heights[idx];
        // compute top-left pixel for block stack
        const x = i * bs - (layer.offset % bs);
        const topY = Math.round(layer.yBase - heightBlocks * bs);
        // draw stacked tiles for this column (block-by-block to preserve pixelated look)
        for (let b = 0; b < heightBlocks; b++) {
          const y = topY + b * bs;
          // decide tile type: top block = grass, below maybe dirt/stone
          // topmost block gets grass tile; deeper blocks use stone tile occasionally
          if (b === 0) {
            // draw grass tile
            ctx.drawImage(tile, Math.round(x), Math.round(y), bs, bs);
          } else {
            // draw dirt/stone mix: use grassTile but overlay darker for variety
            if (b > heightBlocks - 2 && Math.random() > 0.85) {
              ctx.drawImage(stoneTile, Math.round(x), Math.round(y), bs, bs);
            } else {
              ctx.drawImage(tile, Math.round(x), Math.round(y), bs, bs);
            }
          }
        }
        // optional silhouette smoothing: simple shadow below column (tiny darker rect)
        ctx.fillStyle = "rgba(0,0,0,0.03)";
        ctx.fillRect(x, layer.yBase + 2, Math.max(0, bs), 4);
      }
    }

    // sun / moon (pixel square)
    function drawSunMoon(t: number) {
      // t is 0..1 within the full day cycle. We'll place sun across top
      const cycle = (Date.now() / 20000) % 1;
      const cx = w * (0.2 + 0.6 * cycle);
      const cy = h * 0.2 + Math.sin(cycle * Math.PI * 2) * 40;
      const size = blockSize * 1.4;
      ctx.fillStyle = darkMode ? "#d0d0ff" : "#ffd94a";
      ctx.fillRect(
        Math.round(cx - size / 2),
        Math.round(cy - size / 2),
        Math.round(size),
        Math.round(size)
      );
    }

    // main render loop
    let raf = 0;
    function render() {
      // background gradient (subtle)
      const top = darkMode ? "#050607" : "#8fd1ff";
      const bottom = darkMode ? "#080809" : "#5fb0ff";
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, top);
      g.addColorStop(1, bottom);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      // slight pixelated fog overlay (optional)
      ctx.fillStyle = darkMode ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.02)";
      ctx.fillRect(0, 0, w, h);

      // update layer offsets and draw from farthest to nearest
      for (let li = layerArr.length - 1; li >= 0; li--) {
        const L = layerArr[li];
        // update offset for parallax
        L.offset += L.speed;
        // clamp offset to avoid huge numbers
        if (L.offset > 1e6)
          L.offset = L.offset % (terrainWidthBlocks * blockSize);
        // draw layer with slight vertical offset based on depth
        ctx.save();
        // apply slight parallax vertical shift based on offset for small wobble
        ctx.translate(0, -li * (li * 2));
        drawLayer(L);
        ctx.restore();
      }

      // draw sun/moon
      drawSunMoon((Date.now() % 60000) / 60000);

      raf = requestAnimationFrame(render);
    }

    // handle window resize: regenerate heights and tiles to fit new size
    function handleResize() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
      // rebuild terrain width & heights
      const newWidthBlocks = Math.ceil(w / blockSize) + 40;
      for (let i = 0; i < layerArr.length; i++) {
        layerArr[i].heights = generateHeightArray(
          newWidthBlocks,
          layerArr[i].heightBlocks,
          1000 + i * 13
        );
      }
      // regen stars or other large precomputed items if we had
      regenTiles();
    }
    window.addEventListener("resize", handleResize);

    // re-generate the layers if blockSize or darkMode changes (simple approach)
    function rebuildAll() {
      buildLayers();
      regenTiles();
    }

    // Kick off
    render();

    // cleanup
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", handleResize);
    };
  }, [darkMode]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: -1,
        pointerEvents: "none",
        imageRendering: "pixelated",
      }}
    />
  );
}
