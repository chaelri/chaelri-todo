import React, { useRef, useEffect } from "react";

export default function CanvasBackground({ darkMode }: { darkMode: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    // --- Minecraft blocky clouds ---
    function drawBlockCloud(x: number, y: number, scale: number, color: string) {
      const block = 16 * scale;
      ctx.fillStyle = color;

      // Chunk-based block clouds
      const pattern = [
        [1,1,1,0,0],
        [1,1,1,1,0],
        [1,1,1,1,1],
        [0,1,1,1,1],
        [0,0,1,1,1],
      ];

      pattern.forEach((row, ry) => {
        row.forEach((cell, rx) => {
          if (cell) {
            ctx.fillRect(x + rx * block, y + ry * block, block, block);
          }
        });
      });
    }

    // cloud layers
    const clouds = Array.from({ length: 8 }).map(() => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height * 0.4,
      speed: 0.2 + Math.random() * 0.3,
      scale: 1 + Math.random(),
    }));

    // floating particles
    const particles = Array.from({ length: 40 }).map(() => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: 2 + Math.random() * 3,
      speed: 0.2 + Math.random(),
    }));

    // night stars
    const stars = Array.from({ length: 80 }).map(() => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height * 0.6,
      size: 1 + Math.random() * 2,
      alpha: Math.random(),
    }));

    // lightning
    let lightningTimer = 0;

    function drawSky(time: number) {
      // time is 0–1
      // 0 = night, 0.5 = noon, 1 = night again

      let grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      
      if (time < 0.25) {
        // morning
        grad.addColorStop(0, "#ffb347");
        grad.addColorStop(1, "#87ceeb");
      } else if (time < 0.5) {
        // day
        grad.addColorStop(0, "#87ceeb");
        grad.addColorStop(1, "#6bb5ff");
      } else if (time < 0.75) {
        // sunset
        grad.addColorStop(0, "#ff5e62");
        grad.addColorStop(1, "#ffa07a");
      } else {
        // night
        grad.addColorStop(0, "#0a0a23");
        grad.addColorStop(1, "#000000");
      }

      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const time = ((Date.now() / 100000) % 1); // slow cycle
      drawSky(time);

      // stars (only visible at night)
      if (time > 0.75 || time < 0.1) {
        stars.forEach((s) => {
          ctx.fillStyle = `rgba(255,255,255,${s.alpha})`;
          ctx.fillRect(s.x, s.y, s.size, s.size);
        });
      }

      // clouds
      clouds.forEach((c) => {
        c.x += c.speed;
        if (c.x > canvas.width + 200) c.x = -200;

        drawBlockCloud(
          c.x,
          c.y,
          c.scale,
          darkMode ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.9)"
        );
      });

      // floating particles
      particles.forEach((p) => {
        p.y -= p.speed;
        if (p.y < -10) p.y = canvas.height + 10;

        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.fillRect(p.x, p.y, p.size, p.size);
      });

      // lightning flash
      lightningTimer--;
      if (Math.random() < 0.0008) lightningTimer = 6;

      if (lightningTimer > 0) {
        ctx.fillStyle = `rgba(255,255,255,${lightningTimer / 10})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      requestAnimationFrame(animate);
    }

    animate();

    return () => {
      window.removeEventListener("resize", resize);
    };
  }, [darkMode]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: -1,
      }}
    />
  );
}
