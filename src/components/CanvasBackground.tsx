import React, { useEffect, useRef } from "react";

/**
 * Full Biome Cycle Canvas Background
 * - Drop in as <CanvasBackground darkMode={darkMode} />
 * - Procedural, no images
 */

type BiomeKey =
  | "overworld"
  | "desert"
  | "snow"
  | "jungle"
  | "ocean"
  | "nether"
  | "the_end";

type BiomeConfig = {
  id: BiomeKey;
  name: string;
  // sky gradient colors [top, bottom]
  skyTop: string;
  skyBottom: string;
  // cloud & particle color hints
  cloudColor: string;
  particleColor: string;
  // particle mode
  particleMode: "dust" | "snow" | "leaf" | "bubble" | "ember" | "mote" | "none";
  // intensity multipliers
  particleCount: number;
  cloudOpacity: number;
  stars?: boolean;
};

const BIOMES: BiomeConfig[] = [
  {
    id: "overworld",
    name: "Overworld",
    skyTop: "#79c2ff",
    skyBottom: "#6cb8ff",
    cloudColor: "#ffffff",
    particleColor: "rgba(255,255,255,0.35)",
    particleMode: "dust",
    particleCount: 30,
    cloudOpacity: 0.95,
    stars: false,
  },
  {
    id: "desert",
    name: "Desert",
    skyTop: "#ffd27f",
    skyBottom: "#f5b957",
    cloudColor: "rgba(255,240,200,0.85)",
    particleColor: "rgba(255,220,140,0.45)",
    particleMode: "dust",
    particleCount: 22,
    cloudOpacity: 0.85,
    stars: false,
  },
  {
    id: "snow",
    name: "Snow",
    skyTop: "#dff3ff",
    skyBottom: "#bfe9ff",
    cloudColor: "rgba(250,250,255,0.98)",
    particleColor: "rgba(255,255,255,0.95)",
    particleMode: "snow",
    particleCount: 60,
    cloudOpacity: 1,
    stars: false,
  },
  {
    id: "jungle",
    name: "Jungle",
    skyTop: "#9fe8a8",
    skyBottom: "#66b36b",
    cloudColor: "rgba(220,245,210,0.95)",
    particleColor: "rgba(200,255,200,0.45)",
    particleMode: "leaf",
    particleCount: 28,
    cloudOpacity: 0.9,
    stars: false,
  },
  {
    id: "ocean",
    name: "Ocean",
    skyTop: "#7ed2ff",
    skyBottom: "#2fa8d4",
    cloudColor: "rgba(230,250,255,0.98)",
    particleColor: "rgba(200,240,255,0.5)",
    particleMode: "bubble",
    particleCount: 24,
    cloudOpacity: 0.92,
    stars: false,
  },
  {
    id: "nether",
    name: "Nether",
    skyTop: "#60211b",
    skyBottom: "#310b0b",
    cloudColor: "rgba(255,120,80,0.9)",
    particleColor: "rgba(255,140,60,0.9)",
    particleMode: "ember",
    particleCount: 40,
    cloudOpacity: 0.85,
    stars: false,
  },
  {
    id: "the_end",
    name: "The End",
    skyTop: "#160524",
    skyBottom: "#0a0720",
    cloudColor: "rgba(180,120,255,0.85)",
    particleColor: "rgba(200,150,255,0.9)",
    particleMode: "mote",
    particleCount: 36,
    cloudOpacity: 0.9,
    stars: true,
  },
];

// helper lerp
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
// color lerp for hex-ish rgb strings (assumes valid #rrggbb)
function hexToRgb(hex: string) {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return { r, g, b };
}
function rgbToHex(r: number, g: number, b: number) {
  const toHex = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
function mixColorHex(a: string, b: string, t: number) {
  // allow rgba(...) too: try to parse; fallback to hex
  try {
    if (
      a.startsWith("rgba") ||
      a.startsWith("rgb") ||
      b.startsWith("rgba") ||
      b.startsWith("rgb")
    ) {
      // quick parse rgba -> rgba components
      const parse = (s: string) => {
        const nums = s
          .replace(/[^\d.,]/g, "")
          .split(",")
          .map(Number);
        return {
          r: nums[0] ?? 0,
          g: nums[1] ?? 0,
          b: nums[2] ?? 0,
          a: nums[3] ?? 1,
        };
      };
      const ca = parse(a);
      const cb = parse(b);
      const r = lerp(ca.r, cb.r, t);
      const g = lerp(ca.g, cb.g, t);
      const b2 = lerp(ca.b, cb.b, t);
      const a2 = lerp(ca.a, cb.a, t);
      return `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b2)},${a2})`;
    }
    const A = hexToRgb(a);
    const B = hexToRgb(b);
    const r = lerp(A.r, B.r, t);
    const g = lerp(A.g, B.g, t);
    const bl = lerp(A.b, B.b, t);
    return rgbToHex(r, g, bl);
  } catch (e) {
    return a;
  }
}

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

    // Cycle settings
    const biomeOrder = BIOMES;
    const biomeDurationMs = 30_000; // each biome shown ~30s
    const transitionMs = 2500; // blend time between biomes
    const totalCycle = biomeOrder.length * biomeDurationMs;

    // Clouds - blocky chunk patterns
    type Cloud = {
      x: number;
      y: number;
      speed: number;
      scale: number;
      layer: number;
      id: number;
    };
    const clouds: Cloud[] = [];
    let cloudIdCounter = 0;

    function initClouds() {
      clouds.length = 0;
      const base = 10; // number of clouds (will be spread across layers)
      for (let i = 0; i < base; i++) {
        clouds.push({
          x: Math.random() * w,
          y: Math.random() * h * 0.45,
          speed: 0.15 + Math.random() * 0.4,
          scale: 0.8 + Math.random() * 2.2,
          layer: Math.floor(Math.random() * 3),
          id: cloudIdCounter++,
        });
      }
    }

    // Particles
    type Particle = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      life: number;
      maxLife: number;
      color?: string;
    };
    const particles: Particle[] = [];

    // Stars (for night biomes)
    const stars: { x: number; y: number; size: number; alpha: number }[] = [];
    function initStars() {
      stars.length = 0;
      for (let i = 0; i < 120; i++) {
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h * 0.6,
          size: Math.random() * 2.2,
          alpha: 0.3 + Math.random() * 0.9,
        });
      }
    }

    initClouds();
    initStars();

    // lightning
    let lightningTimer = 0;

    // resize handling
    function onResize() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
      // regenerate stars to fill new size
      initStars();
    }
    window.addEventListener("resize", onResize);

    // helpers: draw blocky cloud chunk at (x,y) with scale
    function drawBlockCloud(
      x: number,
      y: number,
      scale: number,
      blockSize = 16,
      color = "#fff"
    ) {
      ctx.fillStyle = color;
      // define simple chunk pattern (5x3-ish)
      const pattern = [
        [0, 1, 1, 1, 0],
        [1, 1, 1, 1, 1],
        [0, 1, 1, 1, 0],
      ];
      const bs = Math.round(blockSize * scale);
      for (let ry = 0; ry < pattern.length; ry++) {
        for (let rx = 0; rx < pattern[0].length; rx++) {
          if (pattern[ry][rx]) {
            ctx.fillRect(x + rx * bs, y + ry * bs, bs, bs);
          }
        }
      }
    }

    // spawn particles for current biome
    function spawnParticleForBiome(b: BiomeConfig) {
      // limit total
      if (particles.length > 220) return;
      const base = {
        dust: () => {
          particles.push({
            x: Math.random() * w,
            y: Math.random() * h,
            vx: -0.1 + Math.random() * 0.2,
            vy: -0.15 - Math.random() * 0.3,
            size: 1 + Math.random() * 2.5,
            life: 0,
            maxLife: 200 + Math.random() * 300,
            color: b.particleColor,
          });
        },
        snow: () => {
          particles.push({
            x: Math.random() * w,
            y: -10,
            vx: -0.3 + Math.random() * 0.6,
            vy: 0.5 + Math.random() * 1.2,
            size: 1 + Math.random() * 3.5,
            life: 0,
            maxLife: 600 + Math.random() * 600,
            color: b.particleColor,
          });
        },
        leaf: () => {
          particles.push({
            x: Math.random() * w,
            y: -10,
            vx: -0.8 + Math.random() * 1.6,
            vy: 0.2 + Math.random() * 0.8,
            size: 2 + Math.random() * 3,
            life: 0,
            maxLife: 400 + Math.random() * 600,
            color: b.particleColor,
          });
        },
        bubble: () => {
          particles.push({
            x: Math.random() * w,
            y: h + 10,
            vx: -0.2 + Math.random() * 0.4,
            vy: -0.3 - Math.random() * 0.5,
            size: 1 + Math.random() * 2.5,
            life: 0,
            maxLife: 300 + Math.random() * 300,
            color: b.particleColor,
          });
        },
        ember: () => {
          particles.push({
            x: Math.random() * w,
            y: Math.random() * h * 0.5,
            vx: -0.2 + Math.random() * 0.6,
            vy: -0.5 - Math.random() * 0.6,
            size: 1 + Math.random() * 3.5,
            life: 0,
            maxLife: 160 + Math.random() * 160,
            color: b.particleColor,
          });
        },
        mote: () => {
          particles.push({
            x: Math.random() * w,
            y: Math.random() * h * 0.6,
            vx: -0.1 + Math.random() * 0.2,
            vy: -0.05 + Math.random() * 0.1,
            size: 0.6 + Math.random() * 2,
            life: 0,
            maxLife: 400 + Math.random() * 500,
            color: b.particleColor,
          });
        },
      } as any;

      const fn = base[b.particleMode] || base.dust;
      // spawn a few
      for (let i = 0; i < Math.max(1, Math.round(b.particleCount / 6)); i++)
        fn();
    }

    // main render loop
    let rafId = 0;
    function render() {
      const now = Date.now();
      const cyclePos = (now % totalCycle) / totalCycle; // 0..1 across full cycle
      // determine current biome index and progress into it
      const totalBiomes = biomeOrder.length;
      const raw = (now % (totalBiomes * biomeDurationMs)) / biomeDurationMs; // [0..n)
      const idx = Math.floor(raw) % totalBiomes;
      const innerT = raw - Math.floor(raw); // 0..1 progress inside biome
      // transition factor for blending between this biome and next
      const blendT = Math.min(
        1,
        Math.max(0, (innerT * biomeDurationMs) / transitionMs)
      );
      const cur = biomeOrder[idx];
      const next = biomeOrder[(idx + 1) % totalBiomes];

      // clear
      ctx.clearRect(0, 0, w, h);

      // blended sky gradient
      const topColor = mixColorHex(cur.skyTop, next.skyTop, blendT);
      const bottomColor = mixColorHex(cur.skyBottom, next.skyBottom, blendT);

      const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
      skyGrad.addColorStop(0, topColor);
      skyGrad.addColorStop(1, bottomColor);
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h);

      // stars if either biome supports stars (blended)
      const starVisible =
        (cur.stars ? 1 : 0) * (1 - blendT) + (next.stars ? 1 : 0) * blendT;
      if (starVisible > 0.05) {
        const alpha = Math.min(1, starVisible);
        stars.forEach((s, i) => {
          ctx.fillStyle = `rgba(255,255,255,${s.alpha * alpha * 0.9})`;
          ctx.fillRect(s.x, s.y, s.size, s.size);
        });
      }

      // sky vignette subtle
      ctx.fillStyle = "rgba(0,0,0,0.02)";
      ctx.fillRect(0, h * 0.78, w, h * 0.22);

      // move clouds - per-layer parallax; color blends
      const cloudColor = mixColorHex(cur.cloudColor, next.cloudColor, blendT);
      clouds.forEach((c) => {
        // layer affects vertical parallax and size
        const layerFactor = 1 + c.layer * 0.25;
        c.x += c.speed * (0.9 + c.layer * 0.6); // foreground faster
        if (c.x > w + 300) c.x = -300 - Math.random() * 200;
        // draw block cloud (three rows)
        const opacity =
          (cur.cloudOpacity * (1 - blendT) + next.cloudOpacity * blendT) * 0.9;
        // apply alpha by drawing onto offscreen or using rgba if cloudColor is hex
        let drawColor = cloudColor;
        if (!drawColor.startsWith("rgba") && !drawColor.startsWith("rgb")) {
          // convert hex to rgba with opacity
          const { r, g, b } = hexToRgb(drawColor);
          drawColor = `rgba(${r},${g},${b},${opacity})`;
        } else {
          // mix rgba
          drawColor = mixColorHex(
            drawColor,
            "rgba(255,255,255,0.0)",
            1 - opacity
          );
        }
        drawBlockCloud(
          c.x,
          c.y + c.layer * 18,
          c.scale * (1 + c.layer * 0.2),
          14,
          drawColor
        );
      });

      // spawn particles occasionally
      if (Math.random() < 0.25) spawnParticleForBiome(cur);

      // update & draw particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life++;
        // life-based alpha
        const alpha = 1 - p.life / p.maxLife;
        if (
          alpha <= 0 ||
          p.x < -50 ||
          p.x > w + 50 ||
          p.y < -80 ||
          p.y > h + 80
        ) {
          particles.splice(i, 1);
          continue;
        }
        ctx.fillStyle = p.color ?? "rgba(255,255,255,0.6)";
        // particle rendering differs per mode: rounded or square
        if (cur.particleMode === "snow") {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,255,255,${Math.max(0.12, alpha * 0.95)})`;
          ctx.fill();
        } else if (cur.particleMode === "bubble") {
          ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.6})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, Math.max(1, p.size), 0, Math.PI * 2);
          ctx.stroke();
        } else if (cur.particleMode === "ember") {
          ctx.fillStyle = `rgba(255,${120 + Math.random() * 80},0,${alpha})`;
          ctx.fillRect(p.x, p.y, p.size, p.size);
        } else if (cur.particleMode === "leaf") {
          ctx.fillStyle = `rgba(90,140,60,${alpha})`;
          ctx.fillRect(
            p.x,
            p.y,
            Math.max(1.5, p.size),
            Math.max(1.5, p.size * 0.7)
          );
        } else if (cur.particleMode === "mote") {
          ctx.fillStyle = `rgba(200,150,255,${alpha})`;
          ctx.fillRect(p.x, p.y, p.size, p.size);
        } else {
          // dust default: tiny rectangles
          ctx.fillStyle = `rgba(210,200,180,${alpha * 0.7})`;
          ctx.fillRect(p.x, p.y, p.size, p.size);
        }
      }

      // lightning: small chance during overworld/nether storms; give subtle flash sometimes
      if (
        Math.random() < 0.0006 &&
        (cur.id === "overworld" || cur.id === "nether")
      ) {
        lightningTimer = 8 + Math.floor(Math.random() * 10);
      }
      if (lightningTimer > 0) {
        ctx.fillStyle = `rgba(255,255,255,${Math.max(
          0.03,
          lightningTimer / 20
        )})`;
        ctx.fillRect(0, 0, w, h);
        lightningTimer--;
      }

      rafId = requestAnimationFrame(render);
    }

    rafId = requestAnimationFrame(render);

    // cleanup
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
    };
  }, [darkMode]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: -1,
        display: "block",
        pointerEvents: "none",
      }}
    />
  );
}
