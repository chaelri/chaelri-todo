import React, { useEffect, useRef } from "react";

export default function CanvasBackground({ darkMode }: { darkMode: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Cloud layers
    const clouds = [
      { x: 0, y: 60, speed: 0.12, size: 140 },
      { x: -200, y: 140, speed: 0.06, size: 200 },
      { x: 50, y: 220, speed: 0.09, size: 160 },
    ];

    function drawCloud(x: number, y: number, size: number) {
      ctx.beginPath();
      ctx.fillStyle = darkMode ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.9)";
      ctx.arc(x, y, size * 0.4, 0, Math.PI * 2);
      ctx.arc(x + size * 0.3, y - size * 0.15, size * 0.35, 0, Math.PI * 2);
      ctx.arc(x + size * 0.55, y, size * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }

    let frameId: number;

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Background sky
      ctx.fillStyle = darkMode ? "#0f0f0f" : "#87ceeb";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Clouds
      clouds.forEach((c) => {
        c.x += c.speed;
        if (c.x > canvas.width + 300) c.x = -300;
        drawCloud(c.x, c.y, c.size);
      });

      frameId = requestAnimationFrame(animate);
    }

    animate();

    // Resize handler
    function handleResize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleResize);
    };
  }, [darkMode]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: -1, // behind everything
      }}
    />
  );
}
