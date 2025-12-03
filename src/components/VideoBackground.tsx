import React from "react";

interface Props {
  darkMode: boolean;
}

export default function VideoBackground({ darkMode }: Props) {
  const videoSrc = darkMode ? "/videos/dark.mp4" : "/videos/light.mp4";

  return (
    <video
      key={videoSrc}
      autoPlay
      loop
      muted
      playsInline
      preload="auto"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        objectFit: "cover",
        zIndex: -20,
        pointerEvents: "none",
        filter: darkMode ? "brightness(0.8)" : "brightness(1)",
      }}
    >
      <source src={videoSrc} type="video/mp4" />
    </video>
  );
}
